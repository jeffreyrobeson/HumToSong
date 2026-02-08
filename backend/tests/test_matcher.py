from app.services.music_matcher import MusicMatcher


def test_tempo_similarity_in_range():
    assert MusicMatcher._tempo_similarity(100, [90, 110]) == 1.0


def test_tempo_similarity_out_of_range():
    score = MusicMatcher._tempo_similarity(130, [90, 110])
    assert 0 <= score <= 1
    assert score == 0.0  # 20 BPM away = 0


def test_tempo_similarity_close():
    score = MusicMatcher._tempo_similarity(115, [90, 110])
    assert 0 < score < 1  # 5 BPM away = 0.75


def test_material_affinity_full_match():
    objects = [{"material": "wood"}, {"material": "ceramic"}]
    assert MusicMatcher._material_affinity(objects, ["wood", "ceramic", "organic"]) == 1.0


def test_material_affinity_no_match():
    objects = [{"material": "metal"}, {"material": "glass"}]
    assert MusicMatcher._material_affinity(objects, ["wood", "organic"]) == 0.0


def test_tag_similarity():
    gemini_tags = ["lofi", "piano", "calm"]
    music_tags = ["lofi", "piano", "study", "peaceful"]
    score = MusicMatcher._tag_similarity(gemini_tags, music_tags)
    # intersection: lofi, piano (2), union: lofi, piano, calm, study, peaceful (5)
    assert abs(score - 2 / 5) < 0.01


def test_match_returns_best():
    matcher = MusicMatcher()
    result = matcher.match(
        gemini_description={
            "genre": "Lo-fi Soul",
            "tempo": 85,
            "mood": "calm",
            "matching_tags": ["lofi", "piano", "calm", "coffee"],
        },
        user_emotion={"emotion": "calm", "tempo": 85, "energy": 0.3},
        user_objects=[
            {"name": "Coffee Cup", "material": "ceramic"},
            {"name": "Notebook", "material": "wood"},
        ],
    )
    assert "music_id" in result
    assert "file" in result
    assert 0 <= result["confidence"] <= 1
    assert result["reasoning"]
