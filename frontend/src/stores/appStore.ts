import { create } from "zustand";
import type { EmotionData, IdentifiedObject, MatchResult, MusicDescription } from "../lib/api";
import type { Layer } from "../lib/collaboration";

interface AppState {
	// Camera -> Identify
	capturedImage: string | null;
	objects: IdentifiedObject[];
	setCapturedImage: (image: string) => void;
	setObjects: (objects: IdentifiedObject[]) => void;

	// Play -> Emotion
	tapTimestamps: number[];
	emotion: EmotionData | null;
	addTap: (timestamp: number) => void;
	resetTaps: () => void;
	setEmotion: (emotion: EmotionData) => void;

	// Result
	musicDescription: MusicDescription | null;
	matchResult: MatchResult | null;
	setMusicDescription: (desc: MusicDescription) => void;
	setMatchResult: (result: MatchResult) => void;

	// Collaboration
	roomCode: string | null;
	layers: Layer[];
	isCollabMode: boolean;
	userName: string;
	setRoomCode: (code: string | null) => void;
	setLayers: (layers: Layer[]) => void;
	addLayer: (layer: Layer) => void;
	setCollabMode: (isCollab: boolean) => void;
	setUserName: (name: string) => void;

	// Loading states
	isLoading: boolean;
	setLoading: (loading: boolean) => void;

	// Reset
	resetAll: () => void;
	resetCollab: () => void;
}

export const useAppStore = create<AppState>((set) => ({
	capturedImage: null,
	objects: [],
	setCapturedImage: (image) => set({ capturedImage: image }),
	setObjects: (objects) => set({ objects }),

	tapTimestamps: [],
	emotion: null,
	addTap: (timestamp) => set((s) => ({ tapTimestamps: [...s.tapTimestamps, timestamp] })),
	resetTaps: () => set({ tapTimestamps: [], emotion: null }),
	setEmotion: (emotion) => set({ emotion }),

	musicDescription: null,
	matchResult: null,
	setMusicDescription: (desc) => set({ musicDescription: desc }),
	setMatchResult: (result) => set({ matchResult: result }),

	// Collaboration
	roomCode: null,
	layers: [],
	isCollabMode: false,
	userName: "",
	setRoomCode: (code) => set({ roomCode: code }),
	setLayers: (layers) => set({ layers }),
	addLayer: (layer) => set((s) => ({ layers: [...s.layers, layer] })),
	setCollabMode: (isCollab) => set({ isCollabMode: isCollab }),
	setUserName: (name) => set({ userName: name }),

	isLoading: false,
	setLoading: (loading) => set({ isLoading: loading }),

	resetAll: () =>
		set({
			capturedImage: null,
			objects: [],
			tapTimestamps: [],
			emotion: null,
			musicDescription: null,
			matchResult: null,
			isLoading: false,
			roomCode: null,
			layers: [],
			isCollabMode: false,
		}),

	resetCollab: () =>
		set({
			roomCode: null,
			layers: [],
			isCollabMode: false,
		}),
}));
