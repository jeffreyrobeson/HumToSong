import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	adminAddKey,
	adminChangePassword,
	adminCheck,
	adminCreateProvider,
	adminDeleteProvider,
	adminLogin,
	adminLogout,
	getProviders,
	type Provider,
} from "../lib/api";
import { useI18n } from "../lib/i18n";
import { useAppStore } from "../stores/appStore";

export default function SettingsPage() {
	const navigate = useNavigate();
	const { t } = useI18n();
	const { providerId, setProviderId } = useAppStore();
	const [providers, setProviders] = useState<Provider[]>([]);
	const [loadingList, setLoadingList] = useState(true);
	const [flash, setFlash] = useState<string | null>(null);

	// Admin state
	const [isAdmin, setIsAdmin] = useState(false);
	const [password, setPassword] = useState("");
	const [adminMsg, setAdminMsg] = useState<string | null>(null);
	const [newName, setNewName] = useState("");
	const [newBaseUrl, setNewBaseUrl] = useState("");
	const [newModel, setNewModel] = useState("");
	const [newKey, setNewKey] = useState("");
	const [addKeyId, setAddKeyId] = useState<string | null>(null);
	const [extraKey, setExtraKey] = useState("");
	// Change password state
	const [showChangePwd, setShowChangePwd] = useState(false);
	const [oldPwd, setOldPwd] = useState("");
	const [newPwd, setNewPwd] = useState("");
	const [confirmPwd, setConfirmPwd] = useState("");

	const refresh = async () => {
		setLoadingList(true);
		try {
			setProviders(await getProviders());
		} finally {
			setLoadingList(false);
		}
	};

	useEffect(() => {
		refresh();
		adminCheck().then(setIsAdmin);
	}, []);

	const flashMsg = (m: string) => {
		setFlash(m);
		setTimeout(() => setFlash(null), 1600);
	};

	const handleSave = () => {
		flashMsg(t("settings.saved"));
	};
	const handleClear = () => {
		setProviderId(null);
		flashMsg(t("settings.cleared"));
	};

	const handleLogin = async () => {
		try {
			await adminLogin(password);
			setIsAdmin(true);
			setPassword("");
			setAdminMsg(null);
		} catch {
			setAdminMsg(t("settings.wrongPassword"));
		}
	};

	const handleLogout = async () => {
		await adminLogout();
		setIsAdmin(false);
	};

	const handleAdd = async () => {
		if (!newName || !newBaseUrl || !newModel || !newKey) {
			setAdminMsg(t("settings.fillAll"));
			return;
		}
		try {
			await adminCreateProvider({
				name: newName,
				base_url: newBaseUrl,
				model: newModel,
				api_key: newKey,
			});
			setNewName("");
			setNewBaseUrl("");
			setNewModel("");
			setNewKey("");
			setAdminMsg(t("settings.added"));
			await refresh();
		} catch {
			setAdminMsg(t("settings.wrongPassword"));
		}
	};

	const handleChangePwd = async () => {
		if (!newPwd || newPwd.length < 6) {
			setAdminMsg(t("settings.tooShort"));
			return;
		}
		if (newPwd !== confirmPwd) {
			setAdminMsg(t("settings.mismatch"));
			return;
		}
		try {
			await adminChangePassword(oldPwd, newPwd);
			setOldPwd("");
			setNewPwd("");
			setConfirmPwd("");
			setShowChangePwd(false);
			setAdminMsg(t("settings.changed"));
		} catch (e) {
			setAdminMsg(e instanceof Error ? e.message : t("settings.wrongOld"));
		}
	};

	const handleDelete = async (id: string) => {
		await adminDeleteProvider(id);
		if (providerId === id) setProviderId(null);
		await refresh();
		setAdminMsg(t("settings.deleted"));
	};

	const handleAddKey = async (pid: string) => {
		if (!extraKey) return;
		try {
			await adminAddKey(pid, extraKey);
			setExtraKey("");
			setAddKeyId(null);
			setAdminMsg(t("settings.added"));
		} catch {
			setAdminMsg(t("settings.wrongPassword"));
		}
	};

	const selected = providers.find((p) => p.id === providerId);
	const baseUrl = selected?.base_url ?? "";
	const model = selected?.model ?? "";

	return (
		<div className="flex min-h-dvh flex-col bg-bg-dark px-5 pt-6 pb-24">
			<a
				href="/"
				className="mb-4 text-sm text-white/40 hover:text-white/70"
				onClick={(e) => {
					e.preventDefault();
					navigate("/");
				}}
			>
				← {t("collab.backToHome")}
			</a>

			<h1 className="mb-1 text-xl font-bold text-white/90">{t("settings.title")}</h1>
			<p className="mb-5 text-sm text-white/40">{t("settings.subtitle")}</p>

			{/* Provider 选择 */}
			<div className="mb-4 rounded-2xl bg-bg-card p-5 ring-1 ring-white/10">
				<label className="mb-2 block text-sm font-medium text-white/70">
					{t("settings.provider")}
				</label>
				{loadingList ? (
					<p className="text-sm text-white/30">{t("play.processing")}</p>
				) : providers.length === 0 ? (
					<p className="mb-3 text-sm text-white/30">{t("settings.noProviders")}</p>
				) : (
					<select
						value={providerId ?? ""}
						onChange={(e) => {
							setProviderId(e.target.value || null);
						}}
						className="mb-3 w-full rounded-lg bg-bg-dark px-4 py-3 text-sm text-white/90 ring-1 ring-white/10 focus:outline-none focus:ring-neon-cyan/50"
					>
						{providers.map((p) => (
							<option key={p.id} value={p.id}>
								{p.name} ({p.model})
							</option>
						))}
					</select>
				)}

				{selected && (
					<div className="mb-3 space-y-1 text-xs text-white/40">
						<p>
							<span className="text-white/30">{t("settings.baseUrl")}：</span>
							{baseUrl}
						</p>
						<p>
							<span className="text-white/30">{t("settings.model")}：</span>
							{model}
						</p>
					</div>
				)}

				<div className="flex gap-3">
					<motion.button
						type="button"
						whileTap={{ scale: 0.95 }}
						onClick={handleSave}
						className="rounded-lg bg-neon-cyan/10 px-5 py-2 text-sm font-medium text-neon-cyan ring-1 ring-neon-cyan/30"
					>
						{t("settings.save")}
					</motion.button>
					<motion.button
						type="button"
						whileTap={{ scale: 0.95 }}
						onClick={handleClear}
						className="rounded-lg bg-white/5 px-5 py-2 text-sm text-white/60 ring-1 ring-white/10"
					>
						{t("settings.clear")}
					</motion.button>
					{flash && <span className="self-center text-xs text-neon-cyan/70">{flash}</span>}
				</div>
			</div>

			{/* 管理后台 */}
			<div className="rounded-2xl bg-bg-card p-5 ring-1 ring-white/10">
				<h2 className="mb-1 text-base font-semibold text-white/80">{t("settings.admin")}</h2>
				<p className="mb-4 text-xs text-white/40">{t("settings.adminHint")}</p>

				{!isAdmin ? (
					<div className="space-y-2">
						<input
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							placeholder={t("settings.password")}
							className="w-full rounded-lg bg-bg-dark px-4 py-3 text-sm text-white/90 ring-1 ring-white/10 focus:outline-none focus:ring-neon-magenta/50"
						/>
						<motion.button
							type="button"
							whileTap={{ scale: 0.95 }}
							onClick={handleLogin}
							className="w-full rounded-lg bg-neon-magenta/10 px-5 py-2.5 text-sm font-medium text-neon-magenta ring-1 ring-neon-magenta/30"
						>
							{t("settings.login")}
						</motion.button>
						{adminMsg && <p className="text-xs text-red-400">{adminMsg}</p>}
					</div>
				) : (
					<div className="space-y-4">
						<div className="flex items-center gap-3">
							<button
								type="button"
								onClick={handleLogout}
								className="text-xs text-white/40 hover:text-white/60"
							>
								{t("settings.logout")}
							</button>
							<button
								type="button"
								onClick={() => setShowChangePwd(!showChangePwd)}
								className="text-xs text-neon-cyan/70 hover:text-neon-cyan"
							>
								{t("settings.changePassword")}
							</button>
						</div>

						{showChangePwd && (
							<div className="space-y-2 rounded-lg bg-bg-dark/50 p-3 ring-1 ring-white/5">
								<input
									type="password"
									value={oldPwd}
									onChange={(e) => setOldPwd(e.target.value)}
									placeholder={t("settings.oldPassword")}
									className="w-full rounded-md bg-bg-card px-3 py-2 text-sm text-white/90 ring-1 ring-white/10"
								/>
								<input
									type="password"
									value={newPwd}
									onChange={(e) => setNewPwd(e.target.value)}
									placeholder={t("settings.newPassword")}
									className="w-full rounded-md bg-bg-card px-3 py-2 text-sm text-white/90 ring-1 ring-white/10"
								/>
								<input
									type="password"
									value={confirmPwd}
									onChange={(e) => setConfirmPwd(e.target.value)}
									placeholder={t("settings.confirmNew")}
									className="w-full rounded-md bg-bg-card px-3 py-2 text-sm text-white/90 ring-1 ring-white/10"
								/>
								<motion.button
									type="button"
									whileTap={{ scale: 0.95 }}
									onClick={handleChangePwd}
									className="w-full rounded-md bg-neon-magenta/10 px-4 py-2 text-sm font-medium text-neon-magenta ring-1 ring-neon-magenta/30"
								>
									{t("settings.change")}
								</motion.button>
							</div>
						)}

						{/* 添加供应商 */}
						<div className="space-y-2 rounded-lg bg-bg-dark/50 p-3 ring-1 ring-white/5">
							<p className="text-xs font-medium text-white/50">{t("settings.addTitle")}</p>
							<input
								value={newName}
								onChange={(e) => setNewName(e.target.value)}
								placeholder={t("settings.name")}
								className="w-full rounded-md bg-bg-card px-3 py-2 text-sm text-white/90 ring-1 ring-white/10"
							/>
							<input
								value={newBaseUrl}
								onChange={(e) => setNewBaseUrl(e.target.value)}
								placeholder={t("settings.baseUrl")}
								className="w-full rounded-md bg-bg-card px-3 py-2 text-sm text-white/90 ring-1 ring-white/10"
							/>
							<input
								value={newModel}
								onChange={(e) => setNewModel(e.target.value)}
								placeholder={t("settings.model")}
								className="w-full rounded-md bg-bg-card px-3 py-2 text-sm text-white/90 ring-1 ring-white/10"
							/>
							<input
								type="password"
								value={newKey}
								onChange={(e) => setNewKey(e.target.value)}
								placeholder={t("settings.apiKey")}
								className="w-full rounded-md bg-bg-card px-3 py-2 text-sm text-white/90 ring-1 ring-white/10"
							/>
							<motion.button
								type="button"
								whileTap={{ scale: 0.95 }}
								onClick={handleAdd}
								className="w-full rounded-md bg-neon-cyan/10 px-4 py-2 text-sm font-medium text-neon-cyan ring-1 ring-neon-cyan/30"
							>
								{t("settings.add")}
							</motion.button>
						</div>

						{/* 已有供应商列表 + 加 key + 删 */}
						<div className="space-y-2">
							{providers.map((p) => (
								<div key={p.id} className="rounded-lg bg-bg-dark/50 p-3 ring-1 ring-white/5">
									<div className="mb-1 flex items-center justify-between">
										<span className="text-sm font-medium text-white/80">{p.name}</span>
										<button
											type="button"
											onClick={() => handleDelete(p.id)}
											className="text-xs text-red-400/80 hover:text-red-400"
										>
											{t("settings.delete")}
										</button>
									</div>
									<p className="text-xs text-white/30">
										{p.model} · {p.base_url}
									</p>
									{addKeyId === p.id ? (
										<div className="mt-2 flex gap-2">
											<input
												type="password"
												value={extraKey}
												onChange={(e) => setExtraKey(e.target.value)}
												placeholder={t("settings.apiKey")}
												className="flex-1 rounded-md bg-bg-card px-3 py-1.5 text-xs text-white/90 ring-1 ring-white/10"
											/>
											<button
												type="button"
												onClick={() => handleAddKey(p.id)}
												className="rounded-md bg-neon-cyan/10 px-3 py-1.5 text-xs text-neon-cyan ring-1 ring-neon-cyan/30"
											>
												{t("settings.add")}
											</button>
										</div>
									) : (
										<button
											type="button"
											onClick={() => {
												setAddKeyId(p.id);
												setExtraKey("");
											}}
											className="mt-1 text-xs text-neon-cyan/70 hover:text-neon-cyan"
										>
											+ {t("settings.addKey")}
										</button>
									)}
								</div>
							))}
						</div>

						{adminMsg && <p className="text-xs text-neon-cyan/70">{adminMsg}</p>}
					</div>
				)}
			</div>
		</div>
	);
}
