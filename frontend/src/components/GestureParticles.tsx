import { useEffect, useRef } from "react";

interface GestureParticlesProps {
	active: boolean;
	/** Center X position for particle origin */
	originX: number;
	/** Center Y position for particle origin */
	originY: number;
	/** Spawn intensity 0..1 */
	intensity: number;
}

export function GestureParticles({ active, originX, originY, intensity }: GestureParticlesProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const intervalRef = useRef(0);

	useEffect(() => {
		if (!active || intensity <= 0) {
			clearInterval(intervalRef.current);
			return;
		}

		const spawnRate = Math.max(50, 150 - intensity * 100);

		intervalRef.current = window.setInterval(() => {
			const container = containerRef.current;
			if (!container) return;

			const count = Math.ceil(intensity * 3);
			for (let i = 0; i < count; i++) {
				const p = document.createElement("div");
				const size = 2 + Math.random() * 6;
				const ox = (Math.random() - 0.5) * 80;
				const oy = (Math.random() - 0.5) * 80;

				p.className = "gesture-particle";
				p.style.cssText = `
					position: absolute;
					left: ${originX + ox}px;
					top: ${originY + oy}px;
					width: ${size}px;
					height: ${size}px;
					background: ${Math.random() > 0.5 ? "#ffffff" : "#00ffff"};
					border-radius: 50%;
					pointer-events: none;
					box-shadow: 0 0 ${size * 2}px ${Math.random() > 0.5 ? "#ffffff" : "#00ffff"};
					animation: riseAndFade 0.8s ease-out forwards;
				`;

				container.appendChild(p);
				setTimeout(() => p.remove(), 800);
			}

			// Limit particles
			while (container.children.length > 50) {
				container.children[0].remove();
			}
		}, spawnRate);

		return () => clearInterval(intervalRef.current);
	}, [active, originX, originY, intensity]);

	return <div ref={containerRef} className="pointer-events-none fixed inset-0 z-[9997]" />;
}
