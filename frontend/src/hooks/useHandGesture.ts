import { useCallback, useEffect, useRef, useState } from "react";
import { detectGesture, type GestureResult, type NormalizedLandmark } from "../lib/gestureDetector";

const WASM_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm";
const DETECT_INTERVAL_MS = 33; // ~30fps

interface UseHandGestureOptions {
	enabled: boolean;
	videoRef: React.RefObject<HTMLVideoElement | null>;
	onGestureDetected?: (result: GestureResult) => void;
}

interface UseHandGestureReturn {
	isLoading: boolean;
	isReady: boolean;
	error: string | null;
}

export function useHandGesture({
	enabled,
	videoRef,
	onGestureDetected,
}: UseHandGestureOptions): UseHandGestureReturn {
	const [isLoading, setIsLoading] = useState(false);
	const [isReady, setIsReady] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Use refs for mutable state in animation loop
	const handLandmarkerRef = useRef<{
		detectForVideo: (
			video: HTMLVideoElement,
			timestamp: number,
		) => { landmarks: NormalizedLandmark[][] };
		close: () => void;
	} | null>(null);
	const rafIdRef = useRef(0);
	const lastDetectTimeRef = useRef(0);
	const onGestureRef = useRef(onGestureDetected);
	onGestureRef.current = onGestureDetected;

	const startDetectionLoop = useCallback(() => {
		const loop = () => {
			rafIdRef.current = requestAnimationFrame(loop);

			const video = videoRef.current;
			const landmarker = handLandmarkerRef.current;
			if (!video || !landmarker || video.readyState < 2) return;

			const now = performance.now();
			if (now - lastDetectTimeRef.current < DETECT_INTERVAL_MS) return;
			lastDetectTimeRef.current = now;

			try {
				const results = landmarker.detectForVideo(video, now);
				if (results.landmarks && results.landmarks.length > 0) {
					const gestureResult = detectGesture(results.landmarks[0] as NormalizedLandmark[]);
					onGestureRef.current?.(gestureResult);
				}
			} catch {
				// Skip frame on detection error
			}
		};

		rafIdRef.current = requestAnimationFrame(loop);
	}, [videoRef]);

	useEffect(() => {
		if (!enabled) {
			// Cleanup when disabled
			cancelAnimationFrame(rafIdRef.current);
			if (handLandmarkerRef.current) {
				handLandmarkerRef.current.close();
				handLandmarkerRef.current = null;
			}
			setIsReady(false);
			setIsLoading(false);
			return;
		}

		let cancelled = false;

		async function init() {
			setIsLoading(true);
			setError(null);

			try {
				// Dynamic import to avoid bundling WASM at build time
				const vision = await import("@mediapipe/tasks-vision");
				if (cancelled) return;

				const filesetResolver = await vision.FilesetResolver.forVisionTasks(WASM_CDN);
				if (cancelled) return;

				const handLandmarker = await vision.HandLandmarker.createFromOptions(filesetResolver, {
					baseOptions: {
						modelAssetPath:
							"https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
						delegate: "GPU",
					},
					runningMode: "VIDEO",
					numHands: 1,
					minHandDetectionConfidence: 0.7,
					minTrackingConfidence: 0.7,
				});
				if (cancelled) return;

				handLandmarkerRef.current = handLandmarker as unknown as typeof handLandmarkerRef.current;
				setIsReady(true);
				setIsLoading(false);
				startDetectionLoop();
			} catch (e) {
				if (!cancelled) {
					setError(e instanceof Error ? e.message : "Failed to load hand detection");
					setIsLoading(false);
				}
			}
		}

		init();

		return () => {
			cancelled = true;
			cancelAnimationFrame(rafIdRef.current);
			if (handLandmarkerRef.current) {
				handLandmarkerRef.current.close();
				handLandmarkerRef.current = null;
			}
		};
	}, [enabled, startDetectionLoop]);

	return { isLoading, isReady, error };
}
