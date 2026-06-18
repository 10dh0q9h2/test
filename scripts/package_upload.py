#!/usr/bin/env python3
"""Create the source ZIP used for manual GitHub upload."""

from __future__ import annotations

import argparse
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "dist" / "english-word-app-upload.zip"
INCLUDE_PATHS = (
    ".github",
    ".gitignore",
    ".nojekyll",
    "PLAN.md",
    "README.md",
    "RELEASE_CHECKLIST.md",
    "UPLOAD_GUIDE.md",
    "app.js",
    "assets",
    "data",
    "index.html",
    "manifest.webmanifest",
    "scripts",
    "service-worker.js",
    "source",
    "styles.css",
    "tests",
)
EXCLUDED_PARTS = {".git", "_site", "dist", "reports", "__pycache__", ".pytest_cache"}
EXCLUDED_SUFFIXES = {".xlsx", ".xls", ".xlsm", ".pyc", ".log"}


def should_include(path: Path) -> bool:
    relative = path.relative_to(ROOT)
    if any(part in EXCLUDED_PARTS for part in relative.parts):
        return False
    if path.suffix.lower() in EXCLUDED_SUFFIXES:
        return False
    return True


def iter_files() -> list[Path]:
    files: list[Path] = []
    for name in INCLUDE_PATHS:
        path = ROOT / name
        if not path.exists():
            raise FileNotFoundError(path)
        if path.is_file():
            if should_include(path):
                files.append(path)
            continue
        for child in path.rglob("*"):
            if child.is_file() and should_include(child):
                files.append(child)
    return sorted(files, key=lambda item: item.relative_to(ROOT).as_posix())


def package(output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    files = iter_files()
    with zipfile.ZipFile(output_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for file_path in files:
            archive.write(file_path, file_path.relative_to(ROOT).as_posix())


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path, nargs="?", default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    output_path = args.output if args.output.is_absolute() else ROOT / args.output
    package(output_path)
    print(f"Wrote {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
