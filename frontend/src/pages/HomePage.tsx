import { motion } from "framer-motion";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { identifyObjects } from "../lib/api";
import { useAppStore } from "../stores/appStore";

export default function HomePage() {
	const navigate = useNavigate();
	const { resetAll, setCapturedImage, setObjects, setLoading, isLoading } = useAppStore();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [error, setError] = useState<string | null>(null);

	const handleStart = () => {
		resetAll();
		navigate("/camera");
	};

	const handleImportPhoto = () => {
		resetAll();
		setError(null);
		fileInputRef.current?.click();
	};

	const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		// Reset input so the same file can be re-selected
		e.target.value = "";

		setLoading(true);
		setError(null);

		try {
			const dataUrl = await readFileAsDataUrl(file);
			const base64 = dataUrl.split(",")[1];

			setCapturedImage(dataUrl);
			const objects = await identifyObjects(base64);
			setObjects(objects);
			navigate("/play");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to identify objects");
		} finally {
			setLoading(false);
		}
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

				{error && <p className="mb-4 text-sm text-error">{error}</p>}

				<div className="flex flex-col gap-3">
					<motion.button
						type="button"
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
						onClick={handleStart}
						disabled={isLoading}
						className="rounded-xl bg-neon-cyan/10 px-10 py-4 text-lg font-semibold text-neon-cyan ring-1 ring-neon-cyan/30 transition-all hover:bg-neon-cyan/20 hover:ring-neon-cyan/60 disabled:opacity-50"
					>
						Start Creating
					</motion.button>

					<motion.button
						type="button"
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
						onClick={handleImportPhoto}
						disabled={isLoading}
						className="rounded-xl bg-neon-yellow/10 px-10 py-4 text-lg font-semibold text-neon-yellow ring-1 ring-neon-yellow/30 transition-all hover:bg-neon-yellow/20 hover:ring-neon-yellow/60 disabled:opacity-50"
					>
						{isLoading ? "Identifying..." : "Import Photo"}
					</motion.button>

					<motion.button
						type="button"
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
						onClick={() => navigate("/collab?join")}
						disabled={isLoading}
						className="rounded-xl bg-neon-magenta/10 px-10 py-4 text-lg font-semibold text-neon-magenta ring-1 ring-neon-magenta/30 transition-all hover:bg-neon-magenta/20 hover:ring-neon-magenta/60 disabled:opacity-50"
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

			<input
				ref={fileInputRef}
				type="file"
				accept="image/*"
				onChange={handleFileSelected}
				className="hidden"
			/>
		</div>
	);
}

function readFileAsDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(new Error("Failed to read file"));
		reader.readAsDataURL(file);
	});
}
