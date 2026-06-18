#!/usr/bin/env python3
"""Run all local checks used before publishing the app."""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_BUILD_DIR = ROOT / "_site"
LOCAL_CODEX_NODE = (
    Path.home()
    / ".cache"
    / "codex-runtimes"
    / "codex-primary-runtime"
    / "dependencies"
    / "node"
    / "bin"
    / "node"
)


def find_node(explicit_node: str | None) -> str:
    candidates = [
        explicit_node,
        os.environ.get("NODE_BIN"),
        shutil.which("node"),
        str(LOCAL_CODEX_NODE) if LOCAL_CODEX_NODE.exists() else None,
    ]
    for candidate in candidates:
        if candidate:
            return candidate
    raise FileNotFoundError("Node.js was not found. Set NODE_BIN or install node.")


def run_step(label: str, command: list[str]) -> None:
    print(f"\n== {label} ==", flush=True)
    print(" ".join(command), flush=True)
    subprocess.run(command, cwd=ROOT, check=True)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--strict-data", action="store_true", help="Fail on sample-data warnings.")
    parser.add_argument("--no-build", action="store_true", help="Skip static build.")
    parser.add_argument("--build-dir", type=Path, default=DEFAULT_BUILD_DIR)
    parser.add_argument("--node", help="Path to the node executable.")
    args = parser.parse_args()

    try:
        node = find_node(args.node)
    except FileNotFoundError as exc:
        print(str(exc), file=sys.stderr)
        return 1

    python = sys.executable
    data_command = [python, "scripts/validate_data.py", "data/words.json"]
    if args.strict_data:
        data_command.append("--strict")

    build_dir = args.build_dir
    if not build_dir.is_absolute():
        build_dir = ROOT / build_dir

    steps = [
        ("Check app JavaScript", [node, "--check", "app.js"]),
        ("Check service worker JavaScript", [node, "--check", "service-worker.js"]),
        (
            "Compile Python scripts",
            [
                python,
                "-m",
                "py_compile",
                "scripts/convert_xlsx.py",
                "scripts/validate_data.py",
                "scripts/build_pages.py",
                "scripts/prepare_data.py",
                "scripts/report_data.py",
                "scripts/package_upload.py",
                "scripts/check_all.py",
                "tests/test_convert_xlsx.py",
            ],
        ),
        ("Run converter tests", [python, "-m", "unittest", "discover", "-s", "tests"]),
        ("Validate word data", data_command),
    ]
    if not args.no_build:
        steps.append(("Build static site", [python, "scripts/build_pages.py", str(build_dir)]))

    try:
        for label, command in steps:
            run_step(label, command)
    except subprocess.CalledProcessError as exc:
        return exc.returncode

    print("\nAll checks passed.", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
