interface ChargeEffectProps {
	active: boolean;
	progress: number; // 0..1
}

const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ChargeEffect({ active, progress }: ChargeEffectProps) {
	if (!active || progress <= 0) return null;

	const offset = CIRCUMFERENCE * (1 - progress);

	return (
		<div className="pointer-events-none fixed inset-0 z-[9996] flex items-center justify-center">
			{/* SVG ring progress */}
			<svg
				width="100"
				height="100"
				className="drop-shadow-[0_0_20px_rgba(0,255,255,0.6)]"
				role="img"
				aria-label="Charge progress"
			>
				<circle
					cx="50"
					cy="50"
					r={RADIUS}
					fill="none"
					stroke="rgba(255,255,255,0.15)"
					strokeWidth="3"
				/>
				<circle
					cx="50"
					cy="50"
					r={RADIUS}
					fill="none"
					stroke="#00ffff"
					strokeWidth="3"
					strokeLinecap="round"
					strokeDasharray={CIRCUMFERENCE}
					strokeDashoffset={offset}
					className="transition-[stroke-dashoffset] duration-100"
					style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
				/>
			</svg>

			{/* Pulse ring on completion */}
			{progress >= 1 && (
				<div
					className="absolute h-[100px] w-[100px] rounded-full border-4 border-white"
					style={{ animation: "pulseRing 0.5s ease-out forwards" }}
				/>
			)}
		</div>
	);
}
