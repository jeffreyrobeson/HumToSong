import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { I18nProvider } from "./lib/i18n";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import BottomNav from "./components/BottomNav";
import { getProviders } from "./lib/api";
import CameraPage from "./pages/CameraPage";
import CollabPage from "./pages/CollabPage";
import CollectionPage from "./pages/CollectionPage";
import HomePage from "./pages/HomePage";
import PlayPage from "./pages/PlayPage";
import ResultPage from "./pages/ResultPage";
import SettingsPage from "./pages/SettingsPage";
import { useAppStore } from "./stores/appStore";

const pageVariants = {
	initial: { opacity: 0, y: 12 },
	animate: { opacity: 1, y: 0 },
	exit: { opacity: 0, y: -12 },
};

function AnimatedRoutes() {
	const location = useLocation();
	return (
		<AnimatePresence mode="wait">
			<motion.div
				key={location.pathname}
				variants={pageVariants}
				initial="initial"
				animate="animate"
				exit="exit"
				transition={{ duration: 0.2 }}
			>
				<Routes location={location}>
					<Route path="/" element={<HomePage />} />
					<Route path="/camera" element={<CameraPage />} />
					<Route path="/play" element={<PlayPage />} />
					<Route path="/result" element={<ResultPage />} />
					<Route path="/collab" element={<CollabPage />} />
					<Route path="/collection" element={<CollectionPage />} />
				<Route path="/settings" element={<SettingsPage />} />
				</Routes>
			</motion.div>
		</AnimatePresence>
	);
}

// 启动时保证有可用供应商: 后端 provider_id 必填, 为空或失效会导致生成/播放整条 422。
function ProviderBootstrap() {
	const providerId = useAppStore((s) => s.providerId);
	const setProviderId = useAppStore((s) => s.setProviderId);
	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const providers = await getProviders();
				if (cancelled || providers.length === 0) return;
				const valid = providers.some((p) => p.id === providerId);
				if (!valid) setProviderId(providers[0].id);
			} catch {
				// 拉取失败(后端不可达)则保持现状, 不阻塞渲染
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [providerId, setProviderId]);
	return null;
}

export default function App() {
	return (
		<I18nProvider>
			<ProviderBootstrap />
			<BrowserRouter>
				<AnimatedRoutes />
				<BottomNav />
			</BrowserRouter>
		</I18nProvider>
	);
}
