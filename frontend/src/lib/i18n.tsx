import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

export type Lang = "en" | "zh";

type Dict = Record<string, { en: string; zh: string }>;

// 全部 user-facing 文案的字典。新增文案在此追加一行即可。
const dict: Dict = {
	"app.tagline": { en: "Life Live Loop", zh: "Life Live Loop" },
	"app.subtitle": { en: "Turn the World into Your Music Studio", zh: "把世界变成你的音乐工作室" },

	"nav.home": { en: "Home", zh: "首页" },
	"nav.collection": { en: "Collection", zh: "收藏" },
	"nav.gesture": { en: "Gesture control", zh: "手势控制" },

	"home.start": { en: "Start Creating", zh: "开始创作" },
	"home.import": { en: "Import Photo", zh: "导入照片" },
	"home.join": { en: "Join Session", zh: "加入房间" },
	"home.identifying": { en: "Identifying...", zh: "识别中..." },
	"home.failedIdentify": { en: "Failed to identify objects", zh: "识别物体失败" },

	"camera.title": { en: "Capture Your Scene", zh: "拍下你的场景" },
	"camera.open": { en: "Open Camera", zh: "打开相机" },
	"camera.capture": { en: "Capture & Identify", zh: "拍照并识别" },
	"camera.identifying": { en: "Identifying...", zh: "识别中..." },
	"camera.back": { en: "Back", zh: "返回" },
	"camera.denied": {
		en: "Camera permission denied. Please allow camera access in your browser settings.",
		zh: "相机权限被拒，请在浏览器设置中允许访问相机。",
	},
	"camera.noCamera": { en: "No camera found on this device.", zh: "此设备未找到相机。" },
	"camera.busy": {
		en: "Camera is busy. Close other apps using the camera and retry.",
		zh: "相机被占用，请关闭其他使用相机的应用后重试。",
	},
	"camera.failed": {
		en: "Camera access failed. Please allow camera permission and retry.",
		zh: "相机访问失败，请允许相机权限后重试。",
	},
	"camera.identifyFailed": { en: "Identification failed", zh: "识别失败" },

	"play.mood": { en: "Mood", zh: "情绪" },
	"play.bpm": { en: "BPM", zh: "节拍" },
	"play.tapToPlay": { en: "Tap to Play", zh: "点击演奏" },
	"play.tapHint": { en: "Tap the objects to express your rhythm", zh: "点击物体来表达你的节奏" },
	"play.taps": { en: "Taps", zh: "点击次数" },
	"play.generateMusic": { en: "Generate Music", zh: "生成音乐" },
	"play.retake": { en: "Retake Photo", zh: "重新拍照" },
	"play.generating": { en: "Generating music description...", zh: "生成音乐描述中..." },
	"play.matching": { en: "Matching music...", zh: "匹配音乐中..." },
	"play.generatingShort": { en: "Generating...", zh: "生成中..." },
	"play.confidence": { en: "Confidence", zh: "置信度" },

	"result.yourMusic": { en: "Your Music", zh: "你的音乐" },
	"result.save": { en: "Save to Collection", zh: "保存到收藏" },
	"result.saved": { en: "Saved!", zh: "已保存!" },
	"result.invite": { en: "Invite Friends", zh: "邀请朋友" },
	"result.regenerate": { en: "Regenerate", zh: "重新生成" },
	"result.newSession": { en: "New Session", zh: "开始新创作" },

	"collection.title": { en: "My Collection", zh: "我的收藏" },
	"collection.empty": { en: "No cards yet", zh: "还没有卡片" },
	"collection.emptyHint": { en: "Create music and save it to build your collection", zh: "创作音乐并保存，建立你的收藏" },
	"collection.disableGesture": { en: "Disable gesture", zh: "关闭手势" },
	"collection.enableGesture": { en: "Enable gesture", zh: "开启手势" },
	"collection.loadingHand": { en: "Loading hand detection...", zh: "加载手部检测中..." },

	"collab.title": { en: "Collaborate", zh: "协作" },
	"collab.create": { en: "Create music together with friends", zh: "和朋友一起创作音乐" },
	"collab.createRoom": { en: "Create Room", zh: "创建房间" },
	"collab.joinRoom": { en: "Join Room", zh: "加入房间" },
	"collab.joinRoomBtn": { en: "Join", zh: "加入" },
	"collab.backToHome": { en: "Back to Home", zh: "返回首页" },
	"collab.joinTitle": { en: "Join Room", zh: "加入房间" },
	"collab.enterCode": { en: "Enter the 6-character room code", zh: "输入 6 位房间码" },
	"collab.roomCode": { en: "Room Code", zh: "房间号" },
	"collab.enter": { en: "Enter the 6-character room code", zh: "输入 6 位房间码" },
	"collab.codeMust": { en: "Room code must be 6 characters", zh: "房间码必须是 6 位" },
	"collab.notFound": { en: "Room not found", zh: "房间未找到" },
	"collab.failedCreate": { en: "Failed to create room", zh: "创建房间失败" },
	"collab.failedJoin": { en: "Failed to join room", zh: "加入房间失败" },
	"collab.layers": { en: "Layers", zh: "音层" },
	"collab.noLayers": { en: "No layers yet. Be the first!", zh: "还没有音层，来添加第一个吧!" },
	"collab.failedMix": { en: "Failed to generate mix", zh: "生成混音失败" },
	"collab.generateMix": { en: "Generate Full Mix", zh: "生成完整混音" },
	"collab.shareCode": { en: "Share this code with friends to collaborate", zh: "分享此码给朋友，一起协作" },
	"collab.addMyLayer": { en: "Add My Layer", zh: "添加我的音层" },
	"collab.leaveRoom": { en: "Leave Room", zh: "离开房间" },
	"collab.objects": { en: "objects", zh: "个物体" },
	"collab.back": { en: "Back", zh: "返回" },
	"collab.copied": { en: "Copied!", zh: "已复制!" },
	"collab.copy": { en: "Copy", zh: "复制" },

	"common.copy": { en: "Copy", zh: "复制" },
	"common.copied": { en: "Copied!", zh: "已复制!" },
	"common.unknownError": { en: "Unknown error", zh: "未知错误" },
	"common.readFileError": { en: "Failed to read file", zh: "读取文件失败" },
	"common.chargeProgress": { en: "Charge progress", zh: "充能进度" },
	"common.busy": { en: "AI service is busy, please try again later.", zh: "AI 服务繁忙，请稍后再试。" },
	"common.timeout": { en: "Request timed out, please check your network and retry.", zh: "请求超时，请检查网络后重试。" },
	"common.identifyError": { en: "Identify failed", zh: "识别失败，请重试" },
	"common.describeError": { en: "Generate description failed", zh: "生成描述失败，请重试" },
	"common.matchError": { en: "Match music failed", zh: "匹配音乐失败，请重试" },
	"common.mergeError": { en: "Merge layers failed", zh: "合成音层失败，请重试" },

	"nav.settings": { en: "Settings", zh: "设置" },

	"settings.title": { en: "AI Provider", zh: "AI 模型设置" },
	"settings.subtitle": { en: "Choose the AI provider used for recognition and generation.", zh: "选择用于识别与生成的 AI 供应商。" },
	"settings.provider": { en: "Provider", zh: "供应商" },
	"settings.baseUrl": { en: "Base URL", zh: "接口地址" },
	"settings.model": { en: "Model", zh: "模型" },
	"settings.save": { en: "Save", zh: "保存" },
	"settings.clear": { en: "Clear", zh: "清除" },
	"settings.saved": { en: "Saved!", zh: "已保存！" },
	"settings.cleared": { en: "Cleared, using default.", zh: "已清除，使用默认。" },
	"settings.noProviders": { en: "No custom providers yet. Add one in admin.", zh: "还没有自定义供应商，请在管理后台添加。" },

	"settings.admin": { en: "Admin", zh: "管理后台" },
	"settings.adminHint": { en: "Manage providers and API keys.", zh: "管理供应商与 API 密钥。" },
	"settings.loginTitle": { en: "Admin Login", zh: "管理登录" },
	"settings.password": { en: "Password", zh: "管理密码" },
	"settings.login": { en: "Login", zh: "登录" },
	"settings.logout": { en: "Logout", zh: "退出" },
	"settings.wrongPassword": { en: "Wrong password", zh: "密码错误" },
	"settings.addTitle": { en: "Add Provider", zh: "添加供应商" },
	"settings.addKey": { en: "Add Key", zh: "添加密钥" },
	"settings.name": { en: "Name", zh: "名称" },
	"settings.apiKey": { en: "API Key", zh: "API 密钥" },
	"settings.add": { en: "Add", zh: "添加" },
	"settings.delete": { en: "Delete", zh: "删除" },
	"settings.fillAll": { en: "Please fill all fields", zh: "请填完整" },
	"settings.added": { en: "Added!", zh: "已添加！" },
	"settings.deleted": { en: "Deleted", zh: "已删除" },
	"settings.changePassword": { en: "Change Password", zh: "修改密码" },
	"settings.oldPassword": { en: "Current Password", zh: "当前密码" },
	"settings.newPassword": { en: "New Password", zh: "新密码" },
	"settings.confirmNew": { en: "Confirm New Password", zh: "确认新密码" },
	"settings.change": { en: "Change", zh: "修改" },
	"settings.wrongOld": { en: "Wrong current password", zh: "当前密码错误" },
	"settings.mismatch": { en: "Passwords do not match", zh: "两次密码不一致" },
	"settings.tooShort": { en: "New password must be at least 6 characters", zh: "新密码至少 6 位" },
	"settings.changed": { en: "Password changed!", zh: "密码已修改！" },

	"result.showOriginal": { en: "🌐 Show Original", zh: "🌐 显示原文" },
	"result.showChinese": { en: "🌐 Chinese Translation", zh: "🌐 中文翻译" },
};

interface I18nCtx {
	lang: Lang;
	setLang: (l: Lang) => void;
	t: (key: string) => string;
}

const Ctx = createContext<I18nCtx | null>(null);

function detectInitial(): Lang {
	if (typeof localStorage !== "undefined") {
		const saved = localStorage.getItem("lll-lang");
		if (saved === "en" || saved === "zh") return saved;
	}
	// 默认中文
	return "zh";
}

export function I18nProvider({ children }: { children: ReactNode }) {
	const [lang, setLangState] = useState<Lang>(detectInitial);

	const setLang = (l: Lang) => {
		setLangState(l);
		localStorage.setItem("lll-lang", l);
		document.documentElement.lang = l;
	};

	useEffect(() => {
		document.documentElement.lang = lang;
	}, [lang]);

	const t = (key: string) => dict[key]?.[lang] ?? key;

	return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nCtx {
	const c = useContext(Ctx);
	if (!c) throw new Error("useI18n must be used within I18nProvider");
	return c;
}
