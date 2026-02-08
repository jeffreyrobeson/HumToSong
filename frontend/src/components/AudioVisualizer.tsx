import { useEffect, useRef } from "react";

interface AudioVisualizerProps {
	audioElement: HTMLAudioElement | null;
	isPlaying: boolean;
}

const BAR_COUNT = 32;
const NEON_COLORS = ["#00FFE5", "#FF00FF", "#FFE500"];

export default function AudioVisualizer({ audioElement, isPlaying }: AudioVisualizerProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const analyserRef = useRef<AnalyserNode | null>(null);
	const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
	const animFrameRef = useRef<number>(0);
	const ctxRef = useRef<AudioContext | null>(null);

	useEffect(() => {
		if (!audioElement || !isPlaying) return;

		const canvas = canvasRef.current;
		if (!canvas) return;

		// Create or reuse AudioContext
		if (!ctxRef.current) {
			ctxRef.current = new AudioContext();
		}
		const audioCtx = ctxRef.current;

		// Create source node only once per audio element
		if (!sourceRef.current) {
			sourceRef.current = audioCtx.createMediaElementSource(audioElement);
		}

		// Create analyser
		if (!analyserRef.current) {
			analyserRef.current = audioCtx.createAnalyser();
			analyserRef.current.fftSize = 128;
			sourceRef.current.connect(analyserRef.current);
			analyserRef.current.connect(audioCtx.destination);
		}

		const analyser = analyserRef.current;
		const bufferLength = analyser.frequencyBinCount;
		const dataArray = new Uint8Array(bufferLength);

		const drawCtx = canvas.getContext("2d");
		if (!drawCtx) return;

		const draw = () => {
			const w = canvas.width;
			const h = canvas.height;

			analyser.getByteFrequencyData(dataArray);

			drawCtx.clearRect(0, 0, w, h);

			const barWidth = w / BAR_COUNT;
			const step = Math.floor(bufferLength / BAR_COUNT);

			for (let i = 0; i < BAR_COUNT; i++) {
				const value = dataArray[i * step] / 255;
				const barHeight = value * h * 0.9;
				const x = i * barWidth;
				const color = NEON_COLORS[i % NEON_COLORS.length];

				drawCtx.fillStyle = color;
				drawCtx.globalAlpha = 0.3 + value * 0.7;
				drawCtx.fillRect(x + 1, h - barHeight, barWidth - 2, barHeight);

				// Glow effect
				drawCtx.shadowColor = color;
				drawCtx.shadowBlur = 8;
				drawCtx.fillRect(x + 1, h - barHeight, barWidth - 2, 2);
				drawCtx.shadowBlur = 0;
			}

			drawCtx.globalAlpha = 1;
			animFrameRef.current = requestAnimationFrame(draw);
		};

		if (audioCtx.state === "suspended") {
			audioCtx.resume();
		}

		draw();

		return () => {
			cancelAnimationFrame(animFrameRef.current);
		};
	}, [audioElement, isPlaying]);

	return (
		<canvas
			ref={canvasRef}
			width={320}
			height={80}
			className="mx-auto w-full max-w-xs rounded-lg"
		/>
	);
}
