import type { EmotionData } from "./api";

/** Analyze tap timestamps to derive emotion, BPM, energy, and regularity. */
export function analyzeEmotion(tapTimestamps: number[]): EmotionData {
	if (tapTimestamps.length < 3) {
		return { emotion: "neutral", tempo: 120, regularity: 0, energy: 0.5, confidence: 0.3 };
	}

	// Calculate intervals, filtering out pauses > 5s
	const intervals: number[] = [];
	for (let i = 0; i < tapTimestamps.length - 1; i++) {
		const interval = tapTimestamps[i + 1] - tapTimestamps[i];
		if (interval < 5.0) {
			intervals.push(interval);
		}
	}

	if (intervals.length === 0) {
		return { emotion: "neutral", tempo: 120, regularity: 0, energy: 0.5, confidence: 0.2 };
	}

	// Average tempo (BPM)
	const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
	const tempo = Math.round(60 / avgInterval);

	// Regularity (1 - coefficient of variation)
	const variance = intervals.reduce((sum, v) => sum + (v - avgInterval) ** 2, 0) / intervals.length;
	const stdDev = Math.sqrt(variance);
	const regularity = Math.max(0, Math.min(1, 1 - stdDev / avgInterval));

	// Energy (normalized tempo)
	const energy = Math.min(tempo / 180, 1.0);

	// Emotion classification
	let emotion: string;
	let confidence: number;

	if (tempo > 140) {
		if (regularity > 0.7) {
			emotion = "excited";
			confidence = 0.85;
		} else {
			emotion = "anxious";
			confidence = 0.75;
		}
	} else if (tempo < 80) {
		if (regularity > 0.65) {
			emotion = "calm";
			confidence = 0.8;
		} else {
			emotion = "melancholic";
			confidence = 0.7;
		}
	} else {
		if (regularity > 0.75) {
			emotion = "focused";
			confidence = 0.75;
		} else {
			emotion = "contemplative";
			confidence = 0.65;
		}
	}

	return {
		emotion,
		tempo: Math.max(40, Math.min(220, tempo)),
		regularity: Math.round(regularity * 100) / 100,
		energy: Math.round(energy * 100) / 100,
		confidence,
	};
}
