import { useCallback, useEffect, useRef } from "react";
import type { MusicCard } from "../lib/cardStorage";

interface Card3DCarouselProps {
	cards: MusicCard[];
	currentIndex: number;
	onIndexChange: (index: number) => void;
	onSelect: (card: MusicCard) => void;
	/** External velocity input from gesture zone-scrolling */
	gestureVelocity: number;
	/** Charge progress 0..1 on the center card */
	chargeProgress: number;
}

// Physics constants (from tarot project)
const FRICTION = 0.92;
const MAX_VELOCITY = 0.25;

export function Card3DCarousel({
	cards,
	currentIndex,
	onIndexChange,
	onSelect,
	gestureVelocity,
	chargeProgress,
}: Card3DCarouselProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const positionRef = useRef(currentIndex);
	const velocityRef = useRef(0);
	const rafRef = useRef(0);
	const isDraggingRef = useRef(false);
	const dragStartXRef = useRef(0);
	const dragStartPosRef = useRef(0);

	// Sync external index changes
	useEffect(() => {
		positionRef.current = currentIndex;
	}, [currentIndex]);

	const getCardGap = useCallback(() => {
		const width = window.innerWidth;
		const cardWidth = Math.min(Math.max(width * 0.35, 140), 220);
		return Math.min(Math.max(cardWidth * 1.1, width * 0.16), cardWidth * 1.8);
	}, []);

	const updateCards = useCallback(() => {
		const container = containerRef.current;
		if (!container) return;

		const gap = getCardGap();
		const children = container.children;

		for (let i = 0; i < children.length; i++) {
			const card = children[i] as HTMLElement;
			const dist = i - positionRef.current;
			const absDist = Math.abs(dist);

			// Hide far away cards
			if (absDist > 5) {
				card.style.display = "none";
				continue;
			}
			card.style.display = "block";

			const x = dist * gap;
			const z = -(absDist ** 1.3) * 50;
			const rotateY = Math.min(Math.max(dist * 5, -45), 45);

			let scale: number;
			const isCenter = absDist < 0.5;
			if (isCenter) {
				scale = 1.15 - absDist * 0.3;
				card.style.zIndex = "1000";
			} else {
				scale = Math.max(1 - absDist * 0.08, 0.6);
				card.style.zIndex = String(1000 - Math.floor(absDist * 10));
			}

			// Charge effect on center card
			if (isCenter && chargeProgress > 0) {
				scale *= 1 + chargeProgress * 0.15;
				const glowSize = 30 + chargeProgress * 100;
				const brightness = 1 + chargeProgress * 1.5;
				card.style.boxShadow = `0 0 ${glowSize}px rgba(0, 255, 255, ${0.3 + chargeProgress * 0.5})`;
				card.style.filter = `brightness(${brightness})`;
				card.style.zIndex = "2000";
			} else {
				card.style.boxShadow = isCenter ? "0 0 30px rgba(0, 255, 255, 0.2)" : "";
				card.style.filter = "";
			}

			card.style.transform = `translateX(${x}px) translateZ(${z}px) rotateY(${rotateY}deg) scale(${scale})`;
		}
	}, [getCardGap, chargeProgress]);

	// Physics loop
	useEffect(() => {
		const loop = () => {
			rafRef.current = requestAnimationFrame(loop);

			if (isDraggingRef.current) {
				updateCards();
				return;
			}

			// Apply gesture velocity (smooth interpolation)
			if (gestureVelocity !== 0) {
				velocityRef.current = velocityRef.current * 0.8 + gestureVelocity * 0.2;
			}

			// Apply friction
			velocityRef.current *= FRICTION;
			if (Math.abs(velocityRef.current) < 0.001) velocityRef.current = 0;

			// Clamp velocity
			if (velocityRef.current > MAX_VELOCITY) velocityRef.current = MAX_VELOCITY;
			if (velocityRef.current < -MAX_VELOCITY) velocityRef.current = -MAX_VELOCITY;

			// Update position
			positionRef.current += velocityRef.current;

			// Boundary bounce
			if (positionRef.current < 0) {
				positionRef.current = 0;
				velocityRef.current = -velocityRef.current * 0.5;
			}
			const maxIdx = cards.length - 1;
			if (positionRef.current > maxIdx) {
				positionRef.current = maxIdx;
				velocityRef.current = -velocityRef.current * 0.5;
			}

			// Snap when nearly stopped
			if (velocityRef.current === 0 && gestureVelocity === 0 && !isDraggingRef.current) {
				const snapped = Math.round(positionRef.current);
				positionRef.current += (snapped - positionRef.current) * 0.15;
				if (Math.abs(positionRef.current - snapped) < 0.01) {
					positionRef.current = snapped;
				}
			}

			// Report index change
			const roundedIdx = Math.round(positionRef.current);
			if (roundedIdx !== currentIndex && roundedIdx >= 0 && roundedIdx < cards.length) {
				onIndexChange(roundedIdx);
			}

			updateCards();
		};

		rafRef.current = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(rafRef.current);
	}, [cards.length, currentIndex, gestureVelocity, onIndexChange, updateCards]);

	// Touch/mouse drag support
	const handlePointerDown = useCallback((e: React.PointerEvent) => {
		isDraggingRef.current = true;
		dragStartXRef.current = e.clientX;
		dragStartPosRef.current = positionRef.current;
		(e.target as HTMLElement).setPointerCapture(e.pointerId);
	}, []);

	const handlePointerMove = useCallback(
		(e: React.PointerEvent) => {
			if (!isDraggingRef.current) return;
			const dx = e.clientX - dragStartXRef.current;
			const gap = getCardGap();
			positionRef.current = dragStartPosRef.current - dx / gap;
		},
		[getCardGap],
	);

	const handlePointerUp = useCallback(() => {
		if (!isDraggingRef.current) return;
		isDraggingRef.current = false;

		// Snap to nearest card
		const target = Math.round(positionRef.current);
		const clamped = Math.max(0, Math.min(target, cards.length - 1));
		velocityRef.current = (clamped - positionRef.current) * 0.3;
	}, [cards.length]);

	const handleDoubleClick = useCallback(() => {
		const idx = Math.round(positionRef.current);
		if (idx >= 0 && idx < cards.length) {
			onSelect(cards[idx]);
		}
	}, [cards, onSelect]);

	return (
		<div
			role="listbox"
			className="relative flex-1 overflow-hidden"
			style={{ perspective: "1000px" }}
			onPointerDown={handlePointerDown}
			onPointerMove={handlePointerMove}
			onPointerUp={handlePointerUp}
			onPointerCancel={handlePointerUp}
			onDoubleClick={handleDoubleClick}
		>
			<div
				ref={containerRef}
				className="absolute inset-0 flex items-center justify-center"
				style={{ transformStyle: "preserve-3d" }}
			>
				{cards.map((card) => (
					<div
						key={card.id}
						className="absolute h-[70%] w-[35vw] max-w-[220px] min-w-[140px] cursor-pointer overflow-hidden rounded-2xl ring-1 ring-white/10"
						style={{
							transformStyle: "preserve-3d",
							transition: "box-shadow 0.2s, filter 0.2s",
						}}
					>
						{card.thumbnailImage ? (
							<img
								src={card.thumbnailImage}
								alt=""
								className="h-full w-full object-cover"
								draggable={false}
							/>
						) : (
							<div className="flex h-full w-full items-center justify-center bg-bg-card text-5xl">
								🎵
							</div>
						)}
						{/* Gradient info overlay */}
						<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3 pt-12 pb-3">
							<p className="text-sm font-bold text-white">{card.genre}</p>
							<p className="mt-0.5 line-clamp-1 text-[10px] text-white/60">
								{card.mood} · {card.tempo} BPM
							</p>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
