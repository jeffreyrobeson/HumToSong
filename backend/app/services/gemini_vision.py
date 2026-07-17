import json
import time

from app.services import openai_client

IDENTIFY_PROMPT = """
Analyze this photo and identify 3-5 main objects that would make interesting musical elements.

For each object, provide:
1. name: Clear object name
2. color: Primary color
3. material: One of [wood, metal, glass, ceramic, fabric, plastic, organic]
4. size: One of [small, medium, large]
5. musical_quality: Describe sound this object might make
6. confidence: 0-1

Return as JSON array. Only JSON, no additional text.

Example output:
[
  {
    "name": "Coffee Cup",
    "color": "brown",
    "material": "ceramic",
    "size": "medium",
    "musical_quality": "warm, percussive",
    "confidence": 0.95
  }
]
"""


async def identify_objects(image_base64: str, provider_id: str) -> list[dict]:
    """识别图片中的物体.走 OpenAI 兼容自定义供应商 (provider_id 必填)."""
    text = await openai_client.generate_content(
        provider_id,
        IDENTIFY_PROMPT,
        image_data_url=openai_client.ensure_data_url(image_base64),
    )

    objects = json.loads(text)

    timestamp = int(time.time())
    for i, obj in enumerate(objects):
        obj["id"] = f"obj_{timestamp}_{i}"

    return objects
