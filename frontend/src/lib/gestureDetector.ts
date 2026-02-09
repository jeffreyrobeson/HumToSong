export type GestureType = "fist" | "open_palm" | "pinch" | "none";

export interface NormalizedLandmark {
	x: number;
	y: number;
	z: number;
}

export interface GestureResult {
	gesture: GestureType;
	palmX: number;
	palmY: number;
	screenX: number;
	screenY: number;
}

// MediaPipe Hand Landmark indices
const WRIST = 0;
const THUMB_TIP = 4;
const INDEX_TIP = 8;
const MIDDLE_TIP = 12;
const RING_TIP = 16;
const PINKY_TIP = 20;
const MIDDLE_MCP = 9; // Palm center approximation

const FINGERTIPS = [INDEX_TIP, MIDDLE_TIP, RING_TIP, PINKY_TIP];

const FIST_THRESHOLD = 0.23;
const OPEN_PALM_THRESHOLD = 0.4;
const PINCH_THRESHOLD = 0.06;

function distance(a: NormalizedLandmark, b: NormalizedLandmark): number {
	return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function avgFingertipDistance(landmarks: NormalizedLandmark[]): number {
	const wrist = landmarks[WRIST];
	let total = 0;
	for (const idx of FINGERTIPS) {
		total += distance(landmarks[idx], wrist);
	}
	return total / FINGERTIPS.length;
}

export function isFist(landmarks: NormalizedLandmark[]): boolean {
	return avgFingertipDistance(landmarks) < FIST_THRESHOLD;
}

export function isOpenPalm(landmarks: NormalizedLandmark[]): boolean {
	return avgFingertipDistance(landmarks) > OPEN_PALM_THRESHOLD;
}

export function isPinch(landmarks: NormalizedLandmark[]): boolean {
	return distance(landmarks[THUMB_TIP], landmarks[INDEX_TIP]) < PINCH_THRESHOLD;
}

export function detectGesture(landmarks: NormalizedLandmark[]): GestureResult {
	const palm = landmarks[MIDDLE_MCP];
	const screenX = (1 - palm.x) * window.innerWidth;
	const screenY = palm.y * window.innerHeight;

	let gesture: GestureType = "none";
	if (isPinch(landmarks)) {
		gesture = "pinch";
	} else if (isFist(landmarks)) {
		gesture = "fist";
	} else if (isOpenPalm(landmarks)) {
		gesture = "open_palm";
	}

	return {
		gesture,
		palmX: palm.x,
		palmY: palm.y,
		screenX,
		screenY,
	};
}
