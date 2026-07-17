import json

from app.services import openai_client


async def _gen(prompt: str, provider_id: str) -> str:
    """统一文本生成入口: 走 OpenAI 兼容供应商 (provider_id 必填).返回已清围栏的文本."""
    # OpenAI 兼容路径已自行剥离围栏
    return await openai_client.generate_content(provider_id, prompt)


def _build_describe_prompt(objects: list[dict], emotion: dict) -> str:
    return f"""
你是一位专业的音乐制作人。

输入：
- 物体：{json.dumps(objects, ensure_ascii=False)}
- 用户情绪：{json.dumps(emotion, ensure_ascii=False)}

创作一段音乐描述，将这些物体转化为音乐元素。
将物体属性映射到音乐：
- 材质 → 乐器音色（陶瓷→钢琴，金属→合成器，木头→吉他）
- 颜色 → 和声特质（棕色→温暖，蓝色→清凉）
- 尺寸 → 音域/音高（大→低音，小→高音）

输出 JSON（不要 markdown，只输出 JSON）：
{{
  "genre": "具体的音乐流派名称（中文）",
  "tempo": {emotion.get("tempo", 100)},
  "key": "音乐调性（中文）",
  "instruments": ["乐器1", "乐器2"],
  "mood": "{emotion.get("emotion", "calm")}",
  "energy_level": "低/中/高",
  "description": "50-100字的自然语言描述（必须用中文）",
  "matching_tags": ["标签1", "标签2", "标签3"]
}}
"""


async def generate_music_description(
    objects: list[dict], emotion: dict, provider_id: str
) -> dict:
    """生成音乐描述.走 OpenAI 兼容供应商 (provider_id 必填)."""
    prompt = _build_describe_prompt(objects, emotion)

    text = await _gen(prompt, provider_id)

    return json.loads(text)


def _build_rerank_prompt(
    candidates: list[dict],
    objects: list[dict],
    emotion: dict,
    gemini_description: dict,
) -> str:
    return f"""你是一位富有创造力的音乐策展人，深谙联觉——将视觉/触觉体验映射到声音。

背景：
- 用户拍摄的物体：{json.dumps(objects, ensure_ascii=False)}
- 用户敲击节奏所表达的情绪：{json.dumps(emotion, ensure_ascii=False)}
- AI 生成的音乐描述：{json.dumps(gemini_description, ensure_ascii=False)}

以下是排名前 {len(candidates)} 的候选曲目，由算法排序。
请选择 ONE 首曲目，在物理物体与音乐之间创造最令人惊喜且情感共鸣最强的关联。
不要只是确认算法——寻找有创意的联觉关联。

候选曲目：
{json.dumps(candidates, indent=2, ensure_ascii=False)}

输出 JSON（不要 markdown，只输出 JSON）：
{{
  "chosen_index": 0,
  "creative_reason": "2-3句富有诗意的中文解释，说明为什么这首曲目能与这些特定的物体和情感产生共鸣"
}}
"""


async def rerank_matches(
    candidates: list[dict],
    objects: list[dict],
    emotion: dict,
    gemini_description: dict,
    provider_id: str,
) -> dict:
    """Re-rank top candidates; 走 OpenAI 兼容供应商 (provider_id 必填)."""
    prompt = _build_rerank_prompt(candidates, objects, emotion, gemini_description)

    text = await _gen(prompt, provider_id)

    result = json.loads(text)
    idx = result.get("chosen_index", 0)
    if idx < 0 or idx >= len(candidates):
        idx = 0

    chosen = candidates[idx]
    chosen["creative_reason"] = result.get("creative_reason", "")
    return chosen


def _build_story_prompt(
    objects: list[dict],
    emotion: dict,
    music_description: dict,
    match_metadata: dict,
) -> str:
    return f"""你是一位富有诗意的叙述者，能将日常物体变成音乐故事。

用户拍摄了这些物体：{json.dumps(objects, ensure_ascii=False)}
他们的敲击揭示了这种情绪状态：{json.dumps(emotion, ensure_ascii=False)}
AI 将理想音乐描述为：{json.dumps(music_description, ensure_ascii=False)}
匹配的曲目是：{json.dumps(match_metadata, ensure_ascii=False)}

写一个 2-3 句的中文诗意故事，要求：
1. 描述每个物体如何"转化"为音乐元素（乐器、节奏、质感）
2. 将用户的情绪编织进叙事，作为指挥/催化剂
3. 让听众感觉这段音乐诞生于他们特定的瞬间

输出 JSON（不要 markdown，只输出 JSON）：
{{
  "story": "你的 2-3 句中文诗意故事"
}}
"""


async def generate_music_story(
    objects: list[dict],
    emotion: dict,
    music_description: dict,
    match_metadata: dict,
    provider_id: str,
) -> str:
    """Generate a poetic story; 走 OpenAI 兼容供应商 (provider_id 必填)."""
    prompt = _build_story_prompt(objects, emotion, music_description, match_metadata)

    text = await _gen(prompt, provider_id)

    result = json.loads(text)
    return result.get("story", "")


def _build_merge_prompt(layers: list[dict]) -> str:
    return f"""你是一位协作音乐制作人，正在分析多位音乐人的贡献。

每一层代表一个人的创意输入——他们看到的物体和感受的情绪：
{json.dumps(layers, indent=2, ensure_ascii=False)}

分析这些音层如何在和声上融合：
- 寻找互补的音色（例如陶瓷的温暖 + 金属的明亮）
- 将节奏差异化解为一个尊重每位贡献者的律动
- 将不同的情绪编织成统一的情绪弧线

输出 JSON（不要 markdown，只输出 JSON）：
{{
  "genre": "一个能桥接所有贡献者的音乐流派（中文）",
  "tempo": <适合所有人的整数 BPM>,
  "key": "音乐调性",
  "instruments": ["融合后的乐器列表"],
  "mood": "统一的情绪",
  "energy_level": "低/中/高",
  "description": "50-100字的中文描述，描述融合后的音乐",
  "matching_tags": ["标签1", "标签2", "标签3"],
  "blend_story": "2-3句中文叙述，讲述这些不同的视角如何融合为一首作品"
}}
"""


async def merge_layers_smart(layers: list[dict], provider_id: str) -> dict:
    """Intelligently merge collaboration layers; 走 OpenAI 兼容供应商 (provider_id 必填)."""
    prompt = _build_merge_prompt(layers)

    text = await _gen(prompt, provider_id)

    return json.loads(text)


def _build_query_prompt(objects: list[dict], emotion: dict, music_description: dict) -> str:
    return f"""你要为一段 AI 生成的音乐找一个能在「QQ音乐」搜到的真实歌曲.
QQ 音乐以华语流行曲库为主.

背景:
- 用户拍摄的物体: {json.dumps(objects, ensure_ascii=False)}
- 用户情绪: {json.dumps(emotion, ensure_ascii=False)}
- AI 生成的理想音乐描述: {json.dumps(music_description, ensure_ascii=False)}

根据音乐的风格、情绪、标签, 给出一个最可能在QQ音乐搜到契合歌曲的【中文搜索词】.
要求:
- 2-8 个字, 中文
- 可以是: 风格关键词(如"安静钢琴""忧伤吉他""轻快民谣"), 或某个风格相近的歌手名+歌名(如"周杰伦 晴天")
- 不要英文, 不要标点

输出 JSON (不要 markdown, 只输出 JSON):
{{
  "query": "你的搜索词"
}}
"""


async def generate_search_query(
    objects: list[dict],
    emotion: dict,
    music_description: dict,
    provider_id: str,
) -> str:
    """让 AI 生成一句适合在 QQ 音乐搜索的中文关键词."""
    prompt = _build_query_prompt(objects, emotion, music_description)
    text = await _gen(prompt, provider_id)
    try:
        result = json.loads(text)
        return result.get("query", "").strip()
    except (json.JSONDecodeError, AttributeError):
        # 兜底: 直接用描述里的 mood 或流派做搜索词
        return music_description.get("genre", "") or music_description.get("mood", "") or "纯音乐"
