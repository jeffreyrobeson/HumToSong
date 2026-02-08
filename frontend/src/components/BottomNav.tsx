import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";

const NAV_ITEMS = [
	{
		path: "/",
		label: "Home",
		icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
	},
	{
		path: "/collab",
		label: "Collab",
		icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
	},
	{
		path: "/collection",
		label: "Collection",
		icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
	},
];

export default function BottomNav() {
	const navigate = useNavigate();
	const location = useLocation();

	// Hide on camera/play/result pages
	const hiddenPaths = ["/camera", "/play", "/result"];
	if (hiddenPaths.some((p) => location.pathname.startsWith(p))) return null;

	return (
		<nav className="fixed inset-x-0 bottom-0 z-50 border-white/5 border-t bg-bg-dark/80 backdrop-blur-lg">
			<div className="mx-auto flex max-w-md justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
				{NAV_ITEMS.map((item) => {
					const isActive = location.pathname === item.path;
					return (
						<motion.button
							key={item.path}
							type="button"
							whileTap={{ scale: 0.9 }}
							onClick={() => navigate(item.path)}
							className={`flex flex-col items-center gap-0.5 px-4 py-1 transition-colors ${
								isActive ? "text-neon-cyan" : "text-white/30 hover:text-white/50"
							}`}
						>
							<svg
								className="h-5 w-5"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								strokeWidth={1.5}
								aria-hidden="true"
							>
								<path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
							</svg>
							<span className="text-[10px] font-medium">{item.label}</span>
						</motion.button>
					);
				})}
			</div>
		</nav>
	);
}
