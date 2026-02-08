import { AnimatePresence, motion } from "framer-motion";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import BottomNav from "./components/BottomNav";
import CameraPage from "./pages/CameraPage";
import CollabPage from "./pages/CollabPage";
import CollectionPage from "./pages/CollectionPage";
import HomePage from "./pages/HomePage";
import PlayPage from "./pages/PlayPage";
import ResultPage from "./pages/ResultPage";

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
				</Routes>
			</motion.div>
		</AnimatePresence>
	);
}

export default function App() {
	return (
		<BrowserRouter>
			<AnimatedRoutes />
			<BottomNav />
		</BrowserRouter>
	);
}
