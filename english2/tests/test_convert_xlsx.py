from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

from openpyxl import Workbook

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from convert_xlsx import convert_workbook  # noqa: E402
from validate_data import validate  # noqa: E402


class ConvertXlsxTests(unittest.TestCase):
    def make_workbook(self, rows: list[list[str]], sheet_name: str = "Day 7") -> Path:
        temp_dir = Path(tempfile.mkdtemp())
        path = temp_dir / "words.xlsx"
        workbook = Workbook()
        sheet = workbook.active
        sheet.title = sheet_name
        for row in rows:
            sheet.append(row)
        workbook.save(path)
        return path

    def test_detects_header_below_title_rows(self) -> None:
        path = self.make_workbook(
            [
                ["My Word Book"],
                [""],
                ["단어", "뜻", "품사", "예문", "난이도"],
                ["analyze", "분석하다", "verb", "Analyze the result.", "basic"],
                ["brief", "짧은; 간단한", "adjective", "Keep it brief.", "basic"],
            ]
        )

        payload = convert_workbook(path)

        self.assertEqual(payload["metadata"]["wordCount"], 2)
        self.assertEqual(payload["words"][0]["word"], "analyze")
        self.assertEqual(payload["words"][0]["meaningKo"], "분석하다")
        self.assertEqual(payload["words"][0]["unit"], "Day 7")
        self.assertEqual(payload["words"][1]["meanings"], ["짧은", "간단한"])

    def test_infers_columns_without_header(self) -> None:
        path = self.make_workbook(
            [
                ["abandon", "버리다", "verb", "Do not abandon the task."],
                ["accurate", "정확한", "adjective", "The report is accurate."],
            ],
            sheet_name="Unit A",
        )

        payload = convert_workbook(path)

        self.assertEqual(payload["metadata"]["wordCount"], 2)
        self.assertEqual(payload["words"][0]["partOfSpeech"], "verb")
        self.assertEqual(payload["words"][0]["unit"], "Unit A")

    def test_duplicate_words_receive_stable_unique_ids(self) -> None:
        path = self.make_workbook(
            [
                ["word", "meaning"],
                ["decline", "감소하다"],
                ["decline", "거절하다"],
            ]
        )

        ids = [word["id"] for word in convert_workbook(path)["words"]]

        self.assertEqual(ids, ["decline", "decline-2"])

    def test_converted_payload_validates(self) -> None:
        path = self.make_workbook(
            [
                ["word", "meaning", "unit"],
                ["evidence", "증거", "Day 2"],
            ]
        )
        temp_dir = Path(tempfile.mkdtemp())
        output = temp_dir / "words.json"
        output.write_text(
            json.dumps(convert_workbook(path), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

        messages, summary = validate(output)

        self.assertEqual(summary["errors"], 0)
        self.assertFalse([message for message in messages if message.startswith("ERROR:")])

    def test_extracts_two_indexed_word_groups_per_row(self) -> None:
        path = self.make_workbook(
            [
                ["DAY 01", "", "", "DAY 345", "", ""],
                ["1", "provide", "공급하다, 준비하다", "1", "emotion", "감정"],
                ["2", "develop", "개발하다", "2", "amaze", "놀라게 하다"],
                ["3", "service", "서비스", "3", "reduce", "줄이다"],
            ],
            sheet_name="01-02",
        )

        payload = convert_workbook(path)
        words = payload["words"]

        self.assertEqual(payload["metadata"]["wordCount"], 6)
        self.assertEqual(
            [item["word"] for item in words],
            ["provide", "develop", "service", "emotion", "amaze", "reduce"],
        )
        self.assertEqual(words[0]["unit"], "DAY 01")
        self.assertEqual(words[3]["unit"], "DAY 02")


if __name__ == "__main__":
    unittest.main()
