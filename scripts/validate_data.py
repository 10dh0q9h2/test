#!/usr/bin/env python3
"""Validate the vocabulary JSON file used by the web app."""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path
from typing import Any


REQUIRED_STRING_FIELDS = ("id", "word", "meaningKo", "unit")
OPTIONAL_STRING_FIELDS = ("partOfSpeech", "exampleEn", "exampleKo", "level")


def error(message: str) -> str:
    return f"ERROR: {message}"


def warning(message: str) -> str:
    return f"WARNING: {message}"


def validate_word(index: int, word: dict[str, Any]) -> list[str]:
    messages: list[str] = []
    label = f"words[{index}]"

    for field in REQUIRED_STRING_FIELDS:
        value = word.get(field)
        if not isinstance(value, str) or not value.strip():
            messages.append(error(f"{label}.{field} must be a non-empty string"))

    for field in OPTIONAL_STRING_FIELDS:
        value = word.get(field)
        if value is not None and not isinstance(value, str):
            messages.append(error(f"{label}.{field} must be a string when present"))

    meanings = word.get("meanings")
    if meanings is not None:
        if not isinstance(meanings, list) or not all(isinstance(item, str) for item in meanings):
            messages.append(error(f"{label}.meanings must be a list of strings"))

    tags = word.get("tags")
    if tags is not None:
        if not isinstance(tags, list) or not all(isinstance(item, str) for item in tags):
            messages.append(error(f"{label}.tags must be a list of strings"))

    return messages


def validate(path: Path) -> tuple[list[str], dict[str, Any]]:
    if not path.exists():
        return [error(f"File not found: {path}")], {}

    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        return [error(f"Invalid JSON: {exc}")], {}

    messages: list[str] = []
    metadata = payload.get("metadata")
    words = payload.get("words")

    if not isinstance(metadata, dict):
        messages.append(error("metadata must be an object"))
    if not isinstance(words, list):
        messages.append(error("words must be a list"))
        return messages, {}
    if not words:
        messages.append(error("words must contain at least one entry"))

    ids: list[str] = []
    units: Counter[str] = Counter()
    for index, item in enumerate(words):
        if not isinstance(item, dict):
            messages.append(error(f"words[{index}] must be an object"))
            continue
        messages.extend(validate_word(index, item))
        if isinstance(item.get("id"), str):
            ids.append(item["id"])
        if isinstance(item.get("unit"), str) and item["unit"].strip():
            units[item["unit"]] += 1

    duplicate_ids = [word_id for word_id, count in Counter(ids).items() if count > 1]
    for word_id in duplicate_ids:
        messages.append(error(f"Duplicate id: {word_id}"))

    sample_count = sum(1 for item in words if isinstance(item, dict) and "sample" in item.get("tags", []))
    if sample_count == len(words):
        messages.append(warning("All entries look like sample data. Convert the real xlsx before publishing."))

    day_numbers = sorted(
        int(unit.split()[1])
        for unit in units
        if unit.startswith("DAY ") and len(unit.split()) == 2 and unit.split()[1].isdigit()
    )
    if len(day_numbers) >= 2:
        expected = list(range(day_numbers[0], day_numbers[-1] + 1))
        if day_numbers != expected:
            missing = sorted(set(expected) - set(day_numbers))
            preview = ", ".join(f"DAY {number:02d}" for number in missing[:8])
            suffix = "" if len(missing) <= 8 else f" and {len(missing) - 8} more"
            messages.append(warning(f"DAY units are not contiguous. Missing {preview}{suffix}."))

    summary = {
        "wordCount": len(words),
        "unitCount": len(units),
        "largestUnits": units.most_common(5),
        "errors": sum(1 for message in messages if message.startswith("ERROR:")),
        "warnings": sum(1 for message in messages if message.startswith("WARNING:")),
    }
    return messages, summary


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("path", type=Path, nargs="?", default=Path("data/words.json"))
    parser.add_argument("--strict", action="store_true", help="Treat warnings as failures")
    args = parser.parse_args()

    messages, summary = validate(args.path)
    for message in messages:
        print(message)
    if summary:
        print(json.dumps(summary, ensure_ascii=False, indent=2))

    has_errors = any(message.startswith("ERROR:") for message in messages)
    has_warnings = any(message.startswith("WARNING:") for message in messages)
    return 1 if has_errors or (args.strict and has_warnings) else 0


if __name__ == "__main__":
    raise SystemExit(main())
