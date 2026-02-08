import json
import time

from google import genai

from app.config import settings

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


async def identify_objects(image_base64: str) -> list[dict]:
    """Call Gemini Vision API to identify objects in an image."""
    client = genai.Client(api_key=settings.gemini_api_key)

    response = await client.aio.models.generate_content(
        model="gemini-2.0-flash",
        contents=[
            IDENTIFY_PROMPT,
            {"inline_data": {"mime_type": "image/jpeg", "data": image_base64}},
        ],
    )

    text = response.text.strip()
    # Strip markdown code fences if present
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
        text = text.rsplit("```", 1)[0].strip()

    objects = json.loads(text)

    timestamp = int(time.time())
    for i, obj in enumerate(objects):
        obj["id"] = f"obj_{timestamp}_{i}"

    return objects
