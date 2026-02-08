import json

from google import genai

from app.config import settings


def _build_describe_prompt(objects: list[dict], emotion: dict) -> str:
    return f"""
You are a professional music producer.

Input:
- Objects: {json.dumps(objects)}
- User emotion: {json.dumps(emotion)}

Create a music description that translates these objects into musical elements.
Map object properties to music:
- Material → Instrument timbre (ceramic→piano, metal→synth, wood→guitar)
- Color → Harmonic quality (brown→warm, blue→cool)
- Size → Register/pitch (large→bass, small→treble)

Output JSON (no markdown, just JSON):
{{
  "genre": "specific genre name",
  "tempo": {emotion.get("tempo", 100)},
  "key": "musical key",
  "instruments": ["inst1", "inst2"],
  "mood": "{emotion.get("emotion", "calm")}",
  "energy_level": "low/medium/high",
  "description": "50-100 word natural language description",
  "matching_tags": ["tag1", "tag2", "tag3"]
}}
"""


async def generate_music_description(objects: list[dict], emotion: dict) -> dict:
    """Call Gemini Text API to generate a music description from objects and emotion."""
    client = genai.Client(api_key=settings.gemini_api_key)

    prompt = _build_describe_prompt(objects, emotion)

    response = await client.aio.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt,
    )

    text = response.text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
        text = text.rsplit("```", 1)[0].strip()

    return json.loads(text)


def _build_rerank_prompt(
    candidates: list[dict],
    objects: list[dict],
    emotion: dict,
    gemini_description: dict,
) -> str:
    return f"""You are a creative music curator with deep understanding \
of synesthesia — mapping visual/tactile experiences to sound.

Context:
- Objects the user photographed: {json.dumps(objects)}
- User's emotional state from tapping rhythm: {json.dumps(emotion)}
- AI-generated music description: {json.dumps(gemini_description)}

Below are the top {len(candidates)} candidate tracks, ranked by algorithm.
Pick the ONE track that creates the most surprising and emotionally \
resonant connection between the physical objects and the music. \
Don't just confirm the algorithm — look for creative synesthetic links.

Candidates:
{json.dumps(candidates, indent=2)}

Output JSON (no markdown, just JSON):
{{
  "chosen_index": 0,
  "creative_reason": "2-3 sentence poetic explanation of WHY this \
track resonates with these specific objects and emotion"
}}
"""


async def rerank_matches(
    candidates: list[dict],
    objects: list[dict],
    emotion: dict,
    gemini_description: dict,
) -> dict:
    """Use Gemini to re-rank top candidates and pick the most creatively resonant match."""
    client = genai.Client(api_key=settings.gemini_api_key)

    prompt = _build_rerank_prompt(candidates, objects, emotion, gemini_description)

    response = await client.aio.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt,
    )

    text = response.text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
        text = text.rsplit("```", 1)[0].strip()

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
    return f"""You are a poetic narrator who turns everyday objects into a musical story.

The user photographed these objects: {json.dumps(objects)}
Their tapping revealed this emotional state: {json.dumps(emotion)}
The AI described the ideal music as: {json.dumps(music_description)}
The matched track is: {json.dumps(match_metadata)}

Write a 2-3 sentence poetic story that:
1. Describes how each object "transforms" into a musical element (instrument, rhythm, texture)
2. Weaves the user's emotion into the narrative as the conductor/catalyst
3. Makes the listener feel like this music was born from THEIR specific moment

Output JSON (no markdown, just JSON):
{{
  "story": "Your 2-3 sentence poetic story here"
}}
"""


async def generate_music_story(
    objects: list[dict],
    emotion: dict,
    music_description: dict,
    match_metadata: dict,
) -> str:
    """Generate a poetic story explaining how the objects became music."""
    client = genai.Client(api_key=settings.gemini_api_key)

    prompt = _build_story_prompt(objects, emotion, music_description, match_metadata)

    response = await client.aio.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt,
    )

    text = response.text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
        text = text.rsplit("```", 1)[0].strip()

    result = json.loads(text)
    return result.get("story", "")


def _build_merge_prompt(layers: list[dict]) -> str:
    return f"""You are a collaborative music producer analyzing multiple musicians' contributions.

Each layer represents one person's creative input — what objects they saw and how they felt:
{json.dumps(layers, indent=2)}

Analyze how these layers can harmonically blend together:
- Find complementary timbres (e.g., ceramic warmth + metal brightness)
- Resolve tempo differences into a groove that honors each contributor
- Weave the different emotions into a unified mood arc

Output JSON (no markdown, just JSON):
{{
  "genre": "a genre that bridges all contributors",
  "tempo": <integer BPM that works for everyone>,
  "key": "musical key",
  "instruments": ["blended instrument list"],
  "mood": "unified mood",
  "energy_level": "low/medium/high",
  "description": "50-100 word description of the blended music",
  "matching_tags": ["tag1", "tag2", "tag3"],
  "blend_story": "2-3 sentence narrative about how these different perspectives fused into one piece"
}}
"""


async def merge_layers_smart(layers: list[dict]) -> dict:
    """Use Gemini to intelligently merge multiple collaboration layers."""
    client = genai.Client(api_key=settings.gemini_api_key)

    prompt = _build_merge_prompt(layers)

    response = await client.aio.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt,
    )

    text = response.text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
        text = text.rsplit("```", 1)[0].strip()

    return json.loads(text)
