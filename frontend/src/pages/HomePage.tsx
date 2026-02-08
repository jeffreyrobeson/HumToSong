import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../stores/appStore";

export default function HomePage() {
	const navigate = useNavigate();
	const resetAll = useAppStore((s) => s.resetAll);

	const handleStart = () => {
		resetAll();
		navigate("/camera");
	};

	return (
		<div className="flex min-h-dvh flex-col items-center justify-center px-6">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.6 }}
				className="text-center"
			>
				<h1 className="mb-2 text-5xl font-bold tracking-tight">
					<span className="text-neon-cyan">L</span>
					<span className="text-neon-magenta">L</span>
					<span className="text-neon-yellow">L</span>
				</h1>
				<p className="mb-1 text-lg text-white/60">Life Live Loop</p>
				<p className="mb-12 text-sm text-white/40 italic">Turn the World into Your Music Studio</p>

				<div className="flex flex-col gap-3">
					<motion.button
						type="button"
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
						onClick={handleStart}
						className="rounded-xl bg-neon-cyan/10 px-10 py-4 text-lg font-semibold text-neon-cyan ring-1 ring-neon-cyan/30 transition-all hover:bg-neon-cyan/20 hover:ring-neon-cyan/60"
					>
						Start Creating
					</motion.button>

					<motion.button
						type="button"
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
						onClick={() => navigate("/collab?join")}
						className="rounded-xl bg-neon-magenta/10 px-10 py-4 text-lg font-semibold text-neon-magenta ring-1 ring-neon-magenta/30 transition-all hover:bg-neon-magenta/20 hover:ring-neon-magenta/60"
					>
						Join Session
					</motion.button>
				</div>

				<button
					type="button"
					onClick={() => navigate("/collection")}
					className="mt-6 text-sm text-white/40 hover:text-white/60"
				>
					My Collection
				</button>
			</motion.div>
		</div>
	);
}
