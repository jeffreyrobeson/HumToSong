import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { useI18n } from "../lib/i18n";

const NAV_ITEMS = [
	{
		path: "/",
		key: "nav.home",
		icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
	},
	{
		path: "/collab",
		key: "nav.collection.collab",
		icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
	},
	{
		path: "/collection",
		key: "nav.collection",
		icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
	},
	{
		path: "/settings",
		key: "nav.settings",
		icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z",
	},
];

// 翻译 Collab 标签复用同一个 key
const LABEL_KEY: Record<string, string> = {
	"/": "nav.home",
	"/collab": "collab.title",
	"/collection": "nav.collection",
	"/settings": "nav.settings",
};

export default function BottomNav() {
	const navigate = useNavigate();
	const location = useLocation();
	const { t, lang, setLang } = useI18n();

	// Hide on camera/play/result pages
	const hiddenPaths = ["/camera", "/play", "/result"];
	if (hiddenPaths.some((p) => location.pathname.startsWith(p))) return null;

	const toggleLang = () => setLang(lang === "en" ? "zh" : "en");

	return (
		<nav className="fixed inset-x-0 bottom-0 z-50 border-white/5 border-t bg-bg-dark/80 backdrop-blur-lg">
			<div className="mx-auto flex max-w-md items-center justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
				{NAV_ITEMS.map((item) => {
					const isActive = location.pathname === item.path;
					const labelKey = LABEL_KEY[item.path] ?? item.key;
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
							<span className="text-[10px] font-medium">{t(labelKey)}</span>
						</motion.button>
					);
				})}
				<motion.button
					type="button"
					whileTap={{ scale: 0.9 }}
					onClick={toggleLang}
					className="flex flex-col items-center gap-0.5 px-4 py-1 text-white/40 transition-colors hover:text-white/70"
					title={lang === "en" ? "切换到中文" : "Switch to English"}
				>
					<span className="text-sm font-semibold leading-none">{lang === "en" ? "中" : "EN"}</span>
					<span className="text-[10px] font-medium opacity-70">
						{lang === "en" ? "中文" : "English"}
					</span>
				</motion.button>
			</div>
		</nav>
	);
}
