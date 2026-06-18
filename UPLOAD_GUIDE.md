# Upload Guide

## 1. 실제 단어장 넣기

`source/words.xlsx` 위치에 실제 단어장 xlsx 파일을 둡니다.

## 2. 데이터 변환과 검증

```bash
/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 scripts/prepare_data.py source/words.xlsx
```

성공하면 `data/words.json`이 실제 단어 데이터로 교체되고 `_site` 폴더와 `reports/word-data-report.md`가 만들어집니다.

`reports/word-data-report.md`에서 단원별 개수, 예문 누락, 품사 누락, 중복 단어 후보를 확인합니다.

## 3. 전체 검증

```bash
/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 scripts/check_all.py --strict-data
```

현재 ZIP에는 샘플 데이터가 들어 있으므로 실제 xlsx를 변환하기 전에는 strict 검증이 실패합니다. 실제 데이터 변환 후 통과해야 배포 준비가 된 상태입니다.

## 4. GitHub에 올릴 때

실제 데이터 변환 후 ZIP을 다시 만들려면 다음 명령을 실행합니다.

```bash
/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 scripts/package_upload.py
```

`dist/english-word-app-upload.zip`을 풀고, 풀린 파일들을 새 GitHub repository 루트에 업로드합니다. `.github/workflows/pages.yml`이 포함되어 있으므로 GitHub Pages를 GitHub Actions로 설정하면 push 시 자동 배포됩니다.

업로드 전 `RELEASE_CHECKLIST.md`를 확인하세요.

주의: private repository와 private website는 다릅니다. 일반 개인 GitHub 계정에서는 Pages URL이 공개될 수 있습니다.
