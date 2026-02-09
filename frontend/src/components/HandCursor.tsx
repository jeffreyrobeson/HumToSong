import { useEffect, useRef } from "react";
import type { GestureType } from "../lib/gestureDetector";

interface HandCursorProps {
	x: number;
	y: number;
	gesture: GestureType;
	visible: boolean;
}

const MAX_TRAILS = 20;
const TRAIL_MIN_DISTANCE = 5;

export function HandCursor({ x, y, gesture, visible }: HandCursorProps) {
	const cursorRef = useRef<HTMLDivElement>(null);
	const trailContainerRef = useRef<HTMLDivElement>(null);
	const lastPosRef = useRef({ x: 0, y: 0 });
	const hueRef = useRef(0);

	useEffect(() => {
		if (!visible || !cursorRef.current) return;

		cursorRef.current.style.left = `${x}px`;
		cursorRef.current.style.top = `${y}px`;

		// Spawn trail if moved enough
		const dx = x - lastPosRef.current.x;
		const dy = y - lastPosRef.current.y;
		const dist = Math.sqrt(dx * dx + dy * dy);

		if (dist > TRAIL_MIN_DISTANCE && trailContainerRef.current) {
			const trail = document.createElement("div");
			hueRef.current = (hueRef.current + 3) % 360;
			const hue = hueRef.current;

			trail.style.cssText = `
				position: fixed;
				left: ${x}px;
				top: ${y}px;
				width: 6px;
				height: 6px;
				border-radius: 50%;
				pointer-events: none;
				background: hsla(${hue}, 80%, 60%, 0.8);
				box-shadow: 0 0 8px hsla(${hue}, 80%, 60%, 0.6);
				transform: translate(-50%, -50%);
				animation: fadeTrail 0.5s ease-out forwards;
			`;

			trailContainerRef.current.appendChild(trail);
			setTimeout(() => trail.remove(), 500);

			// Limit trail count
			const trails = trailContainerRef.current.children;
			while (trails.length > MAX_TRAILS) {
				trails[0].remove();
			}

			lastPosRef.current = { x, y };
		}
	}, [x, y, visible]);

	if (!visible) return null;

	const isFist = gesture === "fist";
	const isPinch = gesture === "pinch";

	return (
		<>
			<div ref={trailContainerRef} className="pointer-events-none fixed inset-0 z-[9998]" />
			<div
				ref={cursorRef}
				className="pointer-events-none fixed z-[9999] -translate-x-1/2 -translate-y-1/2 rounded-full transition-[width,height,background,border-color,box-shadow] duration-150"
				style={{
					width: isFist ? 12 : isPinch ? 24 : 20,
					height: isFist ? 12 : isPinch ? 24 : 20,
					border: isFist ? "none" : isPinch ? "2px solid #ff00ff" : "2px solid #00ffff",
					background: isFist ? "#ff00ff" : "transparent",
					boxShadow: isFist
						? "0 0 15px #ff00ff, 0 0 30px #ff00ff"
						: isPinch
							? "0 0 15px #ff00ff, 0 0 8px #ff00ff"
							: "0 0 15px #00ffff, 0 0 8px #00ffff",
				}}
			/>
		</>
	);
}
