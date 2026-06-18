#!/usr/bin/env python3
"""Build the static GitHub Pages directory."""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FILES = (
    "index.html",
    "styles.css",
    "app.js",
    "service-worker.js",
    "manifest.webmanifest",
    ".nojekyll",
)
DIRECTORIES = ("data", "assets")


def copy_file(source: Path, destination: Path) -> None:
    if not source.exists():
        raise FileNotFoundError(source)
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)


def build(output_dir: Path) -> None:
    if output_dir.exists():
        shutil.rmtree(output_dir)
    output_dir.mkdir(parents=True)

    for name in FILES:
        copy_file(ROOT / name, output_dir / name)

    for name in DIRECTORIES:
        source = ROOT / name
        if not source.exists():
            raise FileNotFoundError(source)
        shutil.copytree(source, output_dir / name)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path, nargs="?", default=ROOT / "_site")
    args = parser.parse_args()

    output_dir = args.output
    if not output_dir.is_absolute():
        output_dir = ROOT / output_dir
    build(output_dir)
    print(f"Built {output_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
