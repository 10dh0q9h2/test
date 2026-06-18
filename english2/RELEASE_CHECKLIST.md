# Release Checklist

Use this checklist before uploading the project ZIP to GitHub.

## Data

- [ ] Put the real workbook at `source/words.xlsx`.
- [ ] Run `scripts/prepare_data.py source/words.xlsx`.
- [ ] Open `reports/word-data-report.md`.
- [ ] Check unit counts look reasonable.
- [ ] Check duplicate word candidates.
- [ ] Check missing examples and missing part-of-speech rows.
- [ ] Confirm `data/words.json` is no longer sample-only data.

## App Checks

- [ ] Run `scripts/check_all.py --strict-data`.
- [ ] Run a local server with `python3 -m http.server 8765`.
- [ ] Check the app on desktop.
- [ ] Check the app on mobile width.
- [ ] Confirm search, flashcards, quiz, review, and wordbook filters work.
- [ ] Export/import progress once if moving between devices matters.

## Packaging

- [ ] Run `scripts/package_upload.py`.
- [ ] Upload `dist/english-word-app-upload.zip`.
- [ ] Do not upload the source `.xlsx` unless you intentionally want it in the repository.
- [ ] Do not upload `_site`, `reports`, `dist`, `.git`, or cache folders.

## GitHub Pages

- [ ] Create or open the target repository.
- [ ] Upload the unzipped files to the repository root.
- [ ] Set Pages source to GitHub Actions.
- [ ] Confirm whether the Pages URL is public. A private repository does not always mean a private Pages site.

