#!/usr/bin/env python3
"""Create a compact Markdown quality report for data/words.json."""

from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = ROOT / "data" / "words.json"
DEFAULT_OUTPUT = ROOT / "reports" / "word-data-report.md"


def load_words(path: Path) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    metadata = payload.get("metadata") if isinstance(payload.get("metadata"), dict) else {}
    words = payload.get("words") if isinstance(payload.get("words"), list) else []
    return metadata, [item for item in words if isinstance(item, dict)]


def text(value: Any) -> str:
    return str(value or "").strip()


def has_value(word: dict[str, Any], field: str) -> bool:
    return bool(text(word.get(field)))


def duplicate_word_groups(words: list[dict[str, Any]]) -> list[tuple[str, list[dict[str, Any]]]]:
    groups: defaultdict[str, list[dict[str, Any]]] = defaultdict(list)
    for word in words:
        key = text(word.get("word")).lower()
        if key:
            groups[key].append(word)
    return sorted(
        [(key, items) for key, items in groups.items() if len(items) > 1],
        key=lambda item: (-len(item[1]), item[0]),
    )


def source_label(word: dict[str, Any]) -> str:
    source = word.get("source")
    if not isinstance(source, dict):
        return ""
    sheet = text(source.get("sheet"))
    row = text(source.get("row"))
    if sheet and row:
        return f"{sheet} row {row}"
    return sheet or row


def table(rows: list[list[str]]) -> str:
    if not rows:
        return ""
    widths = [max(len(row[index]) for row in rows) for index in range(len(rows[0]))]
    output = []
    header = rows[0]
    output.append("| " + " | ".join(value.ljust(widths[index]) for index, value in enumerate(header)) + " |")
    output.append("| " + " | ".join("-" * widths[index] for index in range(len(header))) + " |")
    for row in rows[1:]:
        output.append("| " + " | ".join(value.ljust(widths[index]) for index, value in enumerate(row)) + " |")
    return "\n".join(output)


def create_report(metadata: dict[str, Any], words: list[dict[str, Any]]) -> str:
    unit_counts = Counter(text(word.get("unit")) or "(blank)" for word in words)
    level_counts = Counter(text(word.get("level")) or "(blank)" for word in words)
    missing_meaning = [word for word in words if not has_value(word, "meaningKo")]
    missing_example = [word for word in words if not has_value(word, "exampleEn")]
    missing_pos = [word for word in words if not has_value(word, "partOfSpeech")]
    duplicate_groups = duplicate_word_groups(words)
    sample_count = sum(1 for word in words if "sample" in word.get("tags", []))

    lines = [
        "# Word Data Report",
        "",
        "## Summary",
        "",
        table(
            [
                ["Metric", "Value"],
                ["Title", text(metadata.get("title")) or "(untitled)"],
                ["Words", str(len(words))],
                ["Units", str(len(unit_counts))],
                ["Missing examples", str(len(missing_example))],
                ["Missing part of speech", str(len(missing_pos))],
                ["Missing meanings", str(len(missing_meaning))],
                ["Duplicate word candidates", str(len(duplicate_groups))],
                ["Sample-tagged rows", str(sample_count)],
            ]
        ),
        "",
        "## Units",
        "",
        table([["Unit", "Count"], *[[unit, str(count)] for unit, count in unit_counts.most_common()]]),
        "",
        "## Levels",
        "",
        table([["Level", "Count"], *[[level, str(count)] for level, count in level_counts.most_common()]]),
        "",
        "## Duplicate Word Candidates",
        "",
    ]

    if duplicate_groups:
        rows = [["Word", "Count", "Sources"]]
        for key, items in duplicate_groups[:30]:
            rows.append([
                key,
                str(len(items)),
                ", ".join(filter(None, (source_label(item) for item in items)))[:120],
            ])
        lines.append(table(rows))
    else:
        lines.append("No duplicate word candidates found.")

    lines.extend(["", "## Missing Examples", ""])
    if missing_example:
        rows = [["Word", "Meaning", "Source"]]
        for word in missing_example[:50]:
            rows.append([text(word.get("word")), text(word.get("meaningKo"))[:80], source_label(word)])
        lines.append(table(rows))
    else:
        lines.append("No missing examples found.")

    lines.extend(["", "## Missing Part Of Speech", ""])
    if missing_pos:
        rows = [["Word", "Meaning", "Source"]]
        for word in missing_pos[:50]:
            rows.append([text(word.get("word")), text(word.get("meaningKo"))[:80], source_label(word)])
        lines.append(table(rows))
    else:
        lines.append("No missing part-of-speech entries found.")

    return "\n".join(lines).rstrip() + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path, nargs="?", default=DEFAULT_INPUT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    input_path = args.input if args.input.is_absolute() else ROOT / args.input
    output_path = args.output if args.output.is_absolute() else ROOT / args.output
    metadata, words = load_words(input_path)
    report = create_report(metadata, words)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(report, encoding="utf-8")
    print(f"Wrote report to {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

