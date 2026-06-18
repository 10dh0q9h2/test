#!/usr/bin/env python3
"""Convert the source workbook, validate JSON, and build the static site."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import build_pages
import report_data
import validate_data
from convert_xlsx import convert_workbook


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "source"
DEFAULT_OUTPUT = ROOT / "data" / "words.json"
WORKBOOK_SUFFIXES = {".xlsx", ".xlsm"}


def find_source_workbook(source_dir: Path) -> Path:
    candidates = sorted(
        path
        for path in source_dir.iterdir()
        if path.is_file() and path.suffix.lower() in WORKBOOK_SUFFIXES
    )
    if not candidates:
        raise FileNotFoundError(f"No .xlsx or .xlsm workbook found in {source_dir}")
    if len(candidates) > 1:
        names = ", ".join(path.name for path in candidates)
        raise ValueError(f"Multiple workbooks found in {source_dir}: {names}. Pass one explicitly.")
    return candidates[0]


def write_json(payload: dict, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def run(
    input_path: Path | None,
    output_path: Path,
    build_dir: Path | None,
    report_path: Path | None,
    strict: bool,
) -> int:
    workbook_path = input_path or find_source_workbook(SOURCE_DIR)
    if not workbook_path.exists():
        print(f"Input file not found: {workbook_path}", file=sys.stderr)
        return 1

    payload = convert_workbook(workbook_path)
    write_json(payload, output_path)
    print(f"Wrote {len(payload['words'])} words to {output_path}")

    messages, summary = validate_data.validate(output_path)
    for message in messages:
        print(message)
    if summary:
        print(json.dumps(summary, ensure_ascii=False, indent=2))

    has_errors = any(message.startswith("ERROR:") for message in messages)
    has_warnings = any(message.startswith("WARNING:") for message in messages)
    if has_errors or (strict and has_warnings):
        return 1

    if report_path is not None:
        metadata, words = report_data.load_words(output_path)
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(report_data.create_report(metadata, words), encoding="utf-8")
        print(f"Wrote report to {report_path}")

    if build_dir is not None:
        build_pages.build(build_dir)
        print(f"Built {build_dir}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "input",
        type=Path,
        nargs="?",
        help="Workbook path. Defaults to the only .xlsx/.xlsm file in source/.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help="Output JSON path. Defaults to data/words.json.",
    )
    parser.add_argument(
        "--build-dir",
        type=Path,
        default=ROOT / "_site",
        help="Static build output. Use --no-build to skip.",
    )
    parser.add_argument("--no-build", action="store_true", help="Skip static site build.")
    parser.add_argument(
        "--report",
        type=Path,
        default=ROOT / "reports" / "word-data-report.md",
        help="Markdown report output. Use --no-report to skip.",
    )
    parser.add_argument("--no-report", action="store_true", help="Skip Markdown data report.")
    parser.add_argument(
        "--allow-warnings",
        action="store_true",
        help="Do not fail on validation warnings.",
    )
    args = parser.parse_args()

    output = args.output if args.output.is_absolute() else ROOT / args.output
    build_dir = None if args.no_build else args.build_dir
    if build_dir is not None and not build_dir.is_absolute():
        build_dir = ROOT / build_dir
    report_path = None if args.no_report else args.report
    if report_path is not None and not report_path.is_absolute():
        report_path = ROOT / report_path

    try:
        return run(args.input, output, build_dir, report_path, strict=not args.allow_warnings)
    except (FileNotFoundError, ValueError) as exc:
        print(str(exc), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
