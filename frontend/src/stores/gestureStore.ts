import { create } from "zustand";
import type { GestureType } from "../lib/gestureDetector";

const STORAGE_KEY = "lll_gesture_enabled";

interface GestureState {
	gestureEnabled: boolean;
	toggleGesture: () => void;

	currentGesture: GestureType;
	cursorX: number;
	cursorY: number;
	setGestureData: (gesture: GestureType, x: number, y: number) => void;

	chargeProgress: number;
	isCharging: boolean;
	setChargeProgress: (progress: number) => void;
	setCharging: (charging: boolean) => void;
	resetCharge: () => void;
}

export const useGestureStore = create<GestureState>((set) => ({
	gestureEnabled: localStorage.getItem(STORAGE_KEY) === "true",
	toggleGesture: () =>
		set((s) => {
			const next = !s.gestureEnabled;
			localStorage.setItem(STORAGE_KEY, String(next));
			return { gestureEnabled: next };
		}),

	currentGesture: "none",
	cursorX: 0,
	cursorY: 0,
	setGestureData: (gesture, x, y) => set({ currentGesture: gesture, cursorX: x, cursorY: y }),

	chargeProgress: 0,
	isCharging: false,
	setChargeProgress: (progress) => set({ chargeProgress: progress }),
	setCharging: (charging) => set({ isCharging: charging }),
	resetCharge: () => set({ chargeProgress: 0, isCharging: false }),
}));
