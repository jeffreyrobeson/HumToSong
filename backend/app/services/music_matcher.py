import json
from pathlib import Path


class MusicMatcher:
    """Multi-dimensional music matching algorithm using Gemini-driven descriptions."""

    def __init__(self, library_path: str | Path | None = None):
        if library_path is None:
            library_path = Path(__file__).parent.parent.parent / "data" / "music_library.json"
        with open(library_path) as f:
            self.library: dict[str, dict] = json.load(f)

    def match(
        self,
        gemini_description: dict,
        user_emotion: dict,
        user_objects: list[dict],
    ) -> dict:
        """Match music using 5-dimensional weighted scoring.

        Weights: Tempo(30%) + Mood(25%) + Material(20%) + Tags(15%) + Energy(10%)
        """
        scores: dict[str, dict] = {}

        for music_id, music_data in self.library.items():
            score = 0.0
            reasoning: list[str] = []

            # 1. Tempo matching (30%)
            tempo_score = self._tempo_similarity(
                gemini_description.get("tempo", 100),
                music_data["features"]["tempo_range"],
            )
            score += tempo_score * 0.3
            if tempo_score > 0.7:
                reasoning.append(f"Tempo matches ({gemini_description.get('tempo')} BPM)")

            # 2. Mood matching (25%)
            desc_mood = gemini_description.get("mood", "").lower().split(",")[0].strip()
            music_mood = music_data["features"]["mood"].lower()
            if desc_mood == music_mood:
                score += 0.25
                reasoning.append(f"Mood: {music_mood}")
            elif desc_mood in music_mood or music_mood in desc_mood:
                score += 0.15
                reasoning.append(f"Mood partial: {music_mood}")

            # 3. Material affinity (20%)
            material_score = self._material_affinity(user_objects, music_data["material_affinity"])
            score += material_score * 0.2
            if material_score > 0.5:
                materials = {obj.get("material", "") for obj in user_objects}
                reasoning.append(f"Material: {', '.join(materials)}")

            # 4. Tag similarity (15%)
            tag_score = self._tag_similarity(
                gemini_description.get("matching_tags", []),
                music_data["tags"],
            )
            score += tag_score * 0.15

            # 5. Energy matching (10%)
            energy_score = 1 - abs(user_emotion.get("energy", 0.5) - music_data["features"]["energy"])
            score += energy_score * 0.1

            scores[music_id] = {
                "score": score,
                "music_data": music_data,
                "reasoning": reasoning,
            }

        top = self.get_top_n(scores, n=1)
        return top[0]

    def get_top_n(
        self,
        scores: dict[str, dict] | None = None,
        gemini_description: dict | None = None,
        user_emotion: dict | None = None,
        user_objects: list[dict] | None = None,
        n: int = 3,
    ) -> list[dict]:
        """Return the top N scored results.

        Can accept pre-computed scores or compute them from raw inputs.
        """
        if scores is None:
            if gemini_description is None or user_emotion is None or user_objects is None:
                msg = "Must provide either scores or (gemini_description, user_emotion, user_objects)"
                raise ValueError(msg)
            scores = {}
            for music_id, music_data in self.library.items():
                score = 0.0
                reasoning: list[str] = []

                tempo_score = self._tempo_similarity(
                    gemini_description.get("tempo", 100),
                    music_data["features"]["tempo_range"],
                )
                score += tempo_score * 0.3
                if tempo_score > 0.7:
                    reasoning.append(f"Tempo matches ({gemini_description.get('tempo')} BPM)")

                desc_mood = gemini_description.get("mood", "").lower().split(",")[0].strip()
                music_mood = music_data["features"]["mood"].lower()
                if desc_mood == music_mood:
                    score += 0.25
                    reasoning.append(f"Mood: {music_mood}")
                elif desc_mood in music_mood or music_mood in desc_mood:
                    score += 0.15
                    reasoning.append(f"Mood partial: {music_mood}")

                material_score = self._material_affinity(user_objects, music_data["material_affinity"])
                score += material_score * 0.2
                if material_score > 0.5:
                    materials = {obj.get("material", "") for obj in user_objects}
                    reasoning.append(f"Material: {', '.join(materials)}")

                tag_score = self._tag_similarity(
                    gemini_description.get("matching_tags", []),
                    music_data["tags"],
                )
                score += tag_score * 0.15

                energy_score = 1 - abs(user_emotion.get("energy", 0.5) - music_data["features"]["energy"])
                score += energy_score * 0.1

                scores[music_id] = {
                    "score": score,
                    "music_data": music_data,
                    "reasoning": reasoning,
                }

        sorted_ids = sorted(scores, key=lambda k: scores[k]["score"], reverse=True)[:n]
        return [
            {
                "music_id": mid,
                "file": scores[mid]["music_data"]["file"],
                "confidence": round(scores[mid]["score"], 2),
                "reasoning": " | ".join(scores[mid]["reasoning"]) if scores[mid]["reasoning"] else "Best overall match",
                "metadata": scores[mid]["music_data"],
            }
            for mid in sorted_ids
        ]

    @staticmethod
    def _tempo_similarity(target_tempo: int, tempo_range: list[int]) -> float:
        min_t, max_t = tempo_range
        if min_t <= target_tempo <= max_t:
            return 1.0
        distance = min_t - target_tempo if target_tempo < min_t else target_tempo - max_t
        return max(0.0, 1 - (distance / 20))

    @staticmethod
    def _material_affinity(objects: list[dict], affinity_list: list[str]) -> float:
        materials = [obj.get("material", "") for obj in objects]
        if not materials:
            return 0.0
        matches = sum(1 for m in materials if m in affinity_list)
        return matches / len(materials)

    @staticmethod
    def _tag_similarity(gemini_tags: list[str], music_tags: list[str]) -> float:
        if not gemini_tags or not music_tags:
            return 0.0
        g_set = {t.lower() for t in gemini_tags}
        m_set = {t.lower() for t in music_tags}
        intersection = g_set & m_set
        union = g_set | m_set
        return len(intersection) / len(union) if union else 0.0
