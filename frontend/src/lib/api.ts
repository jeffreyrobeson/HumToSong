const API_BASE = "/api";

export interface IdentifiedObject {
	id: string;
	name: string;
	color: string;
	material: string;
	size: string;
	musical_quality: string;
	confidence: number;
}

export interface EmotionData {
	emotion: string;
	tempo: number;
	regularity: number;
	energy: number;
	confidence: number;
}

export interface MusicDescription {
	genre: string;
	tempo: number;
	key: string;
	instruments: string[];
	mood: string;
	energy_level: string;
	description: string;
	matching_tags: string[];
}

export interface MatchResult {
	music_id: string;
	audio_url: string;
	confidence: number;
	reasoning: string;
	metadata: Record<string, unknown>;
	creative_reason: string;
	story: string;
}

export interface MergeLayerInput {
	user_name: string;
	objects: IdentifiedObject[];
	emotion: EmotionData;
	gemini_description: MusicDescription | null;
}

export interface MergeResult {
	description: MusicDescription;
	blend_story: string;
}

export async function identifyObjects(imageBase64: string): Promise<IdentifiedObject[]> {
	const res = await fetch(`${API_BASE}/identify-objects`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ image: imageBase64 }),
	});
	if (!res.ok) throw new Error(`Identify failed: ${res.status}`);
	const data = await res.json();
	return data.objects;
}

export async function generateDescription(
	objects: IdentifiedObject[],
	emotion: EmotionData,
): Promise<MusicDescription> {
	const res = await fetch(`${API_BASE}/generate-description`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ objects, emotion }),
	});
	if (!res.ok) throw new Error(`Description failed: ${res.status}`);
	const data = await res.json();
	return data.description;
}

export async function matchMusic(
	geminiDescription: MusicDescription,
	userEmotion: EmotionData,
	userObjects: IdentifiedObject[],
): Promise<MatchResult> {
	const res = await fetch(`${API_BASE}/match-music`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			gemini_description: geminiDescription,
			user_emotion: userEmotion,
			user_objects: userObjects,
		}),
	});
	if (!res.ok) throw new Error(`Match failed: ${res.status}`);
	return res.json();
}

export async function mergeLayersSmart(layers: MergeLayerInput[]): Promise<MergeResult> {
	const res = await fetch(`${API_BASE}/merge-layers`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ layers }),
	});
	if (!res.ok) throw new Error(`Merge failed: ${res.status}`);
	return res.json();
}
