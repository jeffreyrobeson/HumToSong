const API_BASE = "/api";

export interface IdentifiedObject {
	id: string;
	name: string;
	color: string;
	material: string;
	size: string;
	musical_quality: string;
	confidence: number;
}

export interface EmotionData {
	emotion: string;
	tempo: number;
	regularity: number;
	energy: number;
	confidence: number;
}

export interface MusicDescription {
	genre: string;
	tempo: number;
	key: string;
	instruments: string[];
	mood: string;
	energy_level: string;
	description: string;
	matching_tags: string[];
}

export interface MatchResult {
	music_id: string;
	audio_url: string;
	confidence: number;
	reasoning: string;
	metadata: Record<string, unknown>;
	creative_reason: string;
	story: string;
}

export interface MergeLayerInput {
	user_name: string;
	objects: IdentifiedObject[];
	emotion: EmotionData;
	gemini_description: MusicDescription | null;
}

export interface MergeResult {
	description: MusicDescription;
	blend_story: string;
}

export interface Provider {
	id: string;
	name: string;
	base_url: string;
	model: string;
}

const REQUEST_TIMEOUT_MS = 30_000; // 比 nginx proxy_read_timeout(120s) 早，避免手机干等到断连

/**带超时的 fetch 包装。超时抛 "timeout"，避免 fetch 无限挂着把客户端熬断。*/
async function fetchWithTimeout(
	input: string,
	init: RequestInit,
	timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<Response> {
	const ctrl = new AbortController();
	const timer = setTimeout(() => ctrl.abort(), timeoutMs);
	try {
		return await fetch(input, { ...init, signal: ctrl.signal });
	} catch (e) {
		if (e instanceof DOMException && e.name === "AbortError") {
			throw new Error("timeout");
		}
		throw e;
	} finally {
		clearTimeout(timer);
	}
}

export async function identifyObjects(
	imageBase64: string,
	errorMessage = "Identify failed",
	providerId?: string,
): Promise<IdentifiedObject[]> {
	const pid = await resolveProviderId(providerId);
	const res = await fetchWithTimeout(`${API_BASE}/identify-objects`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ image: imageBase64, provider_id: pid }),
	});
	if (!res.ok) throw new Error(errorMessage);
	const data = await res.json();
	return data.objects;
}

export async function generateDescription(
	objects: IdentifiedObject[],
	emotion: EmotionData,
	errorMessage = "Description failed",
	providerId?: string,
): Promise<MusicDescription> {
	const pid = await resolveProviderId(providerId);
	const res = await fetchWithTimeout(`${API_BASE}/generate-description`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ objects, emotion, provider_id: pid }),
	});
	if (!res.ok) throw new Error(errorMessage);
	const data = await res.json();
	return data.description;
}

export async function matchMusic(
	geminiDescription: MusicDescription,
	userEmotion: EmotionData,
	userObjects: IdentifiedObject[],
	errorMessage = "Match failed",
	providerId?: string,
): Promise<MatchResult> {
	const pid = await resolveProviderId(providerId);
	const res = await fetchWithTimeout(`${API_BASE}/match-music`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			gemini_description: geminiDescription,
			user_emotion: userEmotion,
			user_objects: userObjects,
			provider_id: pid,
		}),
	});
	if (!res.ok) throw new Error(errorMessage);
	return res.json();
}

/**按 QQ 歌曲 mid 实时取新鲜播放链接 (vkey 有时效, 长期缓存的 audio_url 会过期)。*/
export async function getPlayableUrl(mid: string, errorMessage = "Play link failed"): Promise<string> {
	const res = await fetchWithTimeout(`${API_BASE}/playable-url?mid=${encodeURIComponent(mid)}`);
	if (!res.ok) throw new Error(errorMessage);
	const data = await res.json();
	return data.audio_url as string;
}

/**协作模式: 智能合并多层乐思, 走后端 /merge-layers.失败抛错. */
export async function mergeLayersSmart(
	layers: MergeLayerInput[],
	errorMessage = "Merge failed",
	providerId?: string,
): Promise<MergeResult> {
	const pid = await resolveProviderId(providerId);
	const res = await fetchWithTimeout(`${API_BASE}/merge-layers`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ layers, provider_id: pid }),
	});
	if (!res.ok) throw new Error(errorMessage);
	return res.json();
}

// --- 供应商与管理后台 -------------------------------------------------------

/**普通用户：列出可选供应商（脱敏，无 api_key）。*/
export async function getProviders(): Promise<Provider[]> {
	const res = await fetchWithTimeout(`${API_BASE}/providers`, { method: "GET" });
	if (!res.ok) throw new Error("Failed to load providers");
	return res.json();
}

/**provider_id 必填：后端空值会直接 422。这里兜底，缺省时取第一个可用供应商。*/
async function resolveProviderId(providerId?: string): Promise<string> {
	if (providerId) return providerId;
	const providers = await getProviders();
	if (providers.length === 0) throw new Error("no provider available");
	return providers[0].id;
}

/**管理：登录，成功后浏览器持有 HttpOnly cookie。*/
export async function adminLogin(password: string): Promise<void> {
	const res = await fetchWithTimeout(`${API_BASE}/admin/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ password }),
		credentials: "include",
	});
	if (!res.ok) throw new Error("wrong password");
}

export async function adminLogout(): Promise<void> {
	await fetchWithTimeout(`${API_BASE}/admin/logout`, {
		method: "POST",
		credentials: "include",
	});
}

export async function adminCheck(): Promise<boolean> {
	try {
		const res = await fetchWithTimeout(`${API_BASE}/admin/check`, {
			method: "GET",
			credentials: "include",
		});
		return res.ok;
	} catch {
		return false;
	}
}

export async function adminCreateProvider(input: {
	name: string;
	base_url: string;
	model: string;
	api_key: string;
}): Promise<string> {
	const res = await fetchWithTimeout(`${API_BASE}/admin/providers`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(input),
		credentials: "include",
	});
	if (!res.ok) throw new Error("create failed");
	const data = await res.json();
	return data.id;
}

export async function adminDeleteProvider(id: string): Promise<void> {
	const res = await fetchWithTimeout(`${API_BASE}/admin/providers/${id}`, {
		method: "DELETE",
		credentials: "include",
	});
	if (!res.ok) throw new Error("delete failed");
}

export async function adminAddKey(providerId: string, apiKey: string): Promise<void> {
	const res = await fetchWithTimeout(`${API_BASE}/admin/providers/${providerId}/keys`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ api_key: apiKey }),
		credentials: "include",
	});
	if (!res.ok) throw new Error("add key failed");
}

export async function adminChangePassword(oldPassword: string, newPassword: string): Promise<void> {
	const res = await fetchWithTimeout(`${API_BASE}/admin/change-password`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
		credentials: "include",
	});
	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new Error(data.detail ?? "change password failed");
	}
}
