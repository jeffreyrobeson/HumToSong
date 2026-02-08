import {
	type DataSnapshot,
	get,
	onValue,
	push,
	ref,
	serverTimestamp,
	set,
	type Unsubscribe,
} from "firebase/database";
import type { EmotionData, IdentifiedObject, MusicDescription } from "./api";
import { db } from "./firebase";

// --- Types ---

export interface Layer {
	id: string;
	user_id: string;
	user_name: string;
	timestamp: number;
	objects: IdentifiedObject[];
	emotion: EmotionData;
	gemini_description: MusicDescription | null;
	taps: number[];
}

export interface RoomData {
	created_at: number;
	created_by: string;
	creator_name: string;
	status: "active" | "closed";
	layers: Record<string, Omit<Layer, "id">>;
}

// --- Anonymous Identity ---

const USER_ID_KEY = "lll_user_id";
const USER_NAME_KEY = "lll_user_name";

const adjectives = [
	"Cool",
	"Happy",
	"Chill",
	"Funky",
	"Dreamy",
	"Cosmic",
	"Neon",
	"Groovy",
	"Mellow",
	"Radiant",
];
const animals = [
	"Panda",
	"Fox",
	"Cat",
	"Owl",
	"Wolf",
	"Bear",
	"Dolphin",
	"Falcon",
	"Tiger",
	"Rabbit",
];

function generateRandomName(): string {
	const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
	const animal = animals[Math.floor(Math.random() * animals.length)];
	return `${adj}${animal}`;
}

export function getOrCreateUserId(): string {
	let id = localStorage.getItem(USER_ID_KEY);
	if (!id) {
		id = `user_${crypto.randomUUID().slice(0, 12)}`;
		localStorage.setItem(USER_ID_KEY, id);
	}
	return id;
}

export function getOrCreateUserName(): string {
	let name = localStorage.getItem(USER_NAME_KEY);
	if (!name) {
		name = generateRandomName();
		localStorage.setItem(USER_NAME_KEY, name);
	}
	return name;
}

// --- Room Code ---

const ROOM_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no O, I, L, 0, 1

function generateRoomCode(): string {
	let code = "";
	for (let i = 0; i < 6; i++) {
		code += ROOM_CHARS[Math.floor(Math.random() * ROOM_CHARS.length)];
	}
	return code;
}

// --- Room Operations ---

export async function createRoom(initialLayer: Omit<Layer, "id">): Promise<string> {
	const userId = getOrCreateUserId();
	const userName = getOrCreateUserName();
	const code = generateRoomCode();

	const roomRef = ref(db, `rooms/${code}`);
	await set(roomRef, {
		created_at: serverTimestamp(),
		created_by: userId,
		creator_name: userName,
		status: "active",
	});

	// Add the creator's layer
	const layersRef = ref(db, `rooms/${code}/layers`);
	await push(layersRef, initialLayer);

	return code;
}

export async function joinRoom(roomCode: string): Promise<RoomData | null> {
	const roomRef = ref(db, `rooms/${roomCode}`);
	const snapshot = await get(roomRef);
	if (!snapshot.exists()) return null;
	return snapshot.val() as RoomData;
}

export async function addLayer(roomCode: string, layerData: Omit<Layer, "id">): Promise<string> {
	const layersRef = ref(db, `rooms/${roomCode}/layers`);
	const newLayerRef = push(layersRef);
	await set(newLayerRef, layerData);
	return newLayerRef.key!;
}

function parseLayers(snapshot: DataSnapshot): Layer[] {
	if (!snapshot.exists()) return [];
	const data = snapshot.val() as Record<string, Omit<Layer, "id">>;
	return Object.entries(data).map(([key, value]) => ({
		id: key,
		...value,
	}));
}

// --- Real-time Observation ---

let currentUnsubscribe: Unsubscribe | null = null;

export function observeRoom(roomCode: string, onLayersChange: (layers: Layer[]) => void): void {
	stopObserving();
	const layersRef = ref(db, `rooms/${roomCode}/layers`);
	currentUnsubscribe = onValue(layersRef, (snapshot) => {
		const layers = parseLayers(snapshot);
		onLayersChange(layers);
	});
}

export function stopObserving(): void {
	if (currentUnsubscribe) {
		currentUnsubscribe();
		currentUnsubscribe = null;
	}
}

// --- Merge Layers for Combined Match ---

export function mergeLayers(layers: Layer[]): {
	objects: IdentifiedObject[];
	emotion: EmotionData;
} {
	const allObjects = layers.flatMap((l) => l.objects);

	// Average emotion values across all layers
	const avgTempo = layers.reduce((sum, l) => sum + l.emotion.tempo, 0) / layers.length;
	const avgRegularity = layers.reduce((sum, l) => sum + l.emotion.regularity, 0) / layers.length;
	const avgEnergy = layers.reduce((sum, l) => sum + l.emotion.energy, 0) / layers.length;
	const avgConfidence = layers.reduce((sum, l) => sum + l.emotion.confidence, 0) / layers.length;

	// Most common emotion
	const emotionCounts = new Map<string, number>();
	for (const l of layers) {
		emotionCounts.set(l.emotion.emotion, (emotionCounts.get(l.emotion.emotion) ?? 0) + 1);
	}
	let dominantEmotion = layers[0].emotion.emotion;
	let maxCount = 0;
	for (const [emotion, count] of emotionCounts) {
		if (count > maxCount) {
			dominantEmotion = emotion;
			maxCount = count;
		}
	}

	return {
		objects: allObjects,
		emotion: {
			emotion: dominantEmotion,
			tempo: Math.round(avgTempo),
			regularity: Number(avgRegularity.toFixed(2)),
			energy: Number(avgEnergy.toFixed(2)),
			confidence: Number(avgConfidence.toFixed(2)),
		},
	};
}
