# English Word Learning App

개인 단어장을 웹에서 학습하기 위한 정적 웹앱입니다. 모바일과 PC 모두에서 사용할 수 있고, GitHub Pages에 배포할 수 있습니다.

## 현재 구성

- `index.html`, `styles.css`, `app.js`: 웹앱 본체
- `service-worker.js`, `manifest.webmanifest`: 설치형 PWA와 오프라인 캐시
- `data/words.json`: 앱이 읽는 단어 DB
- `scripts/convert_xlsx.py`: xlsx 단어장을 `data/words.json`으로 변환
- `.github/workflows/pages.yml`: GitHub Pages 배포 워크플로

## 학습 기능

- 대시보드에서 일일 학습 목표를 설정하고 오늘 진행률을 확인합니다.
- 플래시카드, 퀴즈, 복습에서 채점한 항목은 오늘 학습량에 반영됩니다.
- 단어장에서 미학습, 복습, 오답, 즐겨찾기, 완료 상태로 필터링합니다.
- 학습 진도, 일일 목표, 날짜별 기록은 브라우저에 저장됩니다.
- 진도 내보내기/가져오기로 모바일과 PC 사이에 기록을 옮길 수 있습니다.

## xlsx 변환

원본 xlsx를 `source/words.xlsx`에 둔 뒤 실행합니다. 이 명령은 xlsx 변환, JSON 검증, 데이터 리포트 생성, GitHub Pages용 정적 산출물 생성을 한 번에 수행합니다.

```bash
/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 scripts/prepare_data.py source/words.xlsx
```

성공하면 `data/words.json`, `reports/word-data-report.md`, `_site`가 만들어집니다. 리포트에서 단원별 개수, 예문 누락, 품사 누락, 중복 단어 후보를 확인합니다.

변환만 따로 실행할 수도 있습니다.

```bash
/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 scripts/convert_xlsx.py source/words.xlsx data/words.json
```

데이터 리포트만 따로 만들 수도 있습니다.

```bash
/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 scripts/report_data.py data/words.json
```

스크립트는 다음과 같은 열 이름을 자동 인식합니다.

- 단어: `word`, `vocab`, `단어`, `영단어`, `표제어`
- 뜻: `meaning`, `definition`, `뜻`, `의미`, `해석`
- 품사: `part of speech`, `pos`, `품사`
- 예문: `example`, `sentence`, `예문`
- 단원: `unit`, `day`, `chapter`, `단원`, `챕터`, `day`
- 난이도: `level`, `difficulty`, `난이도`

열 이름이 없는 파일도 첫 번째 열을 단어, 두 번째 열을 뜻으로 추정합니다.

## 로컬 실행

정적 파일이므로 간단한 HTTP 서버로 실행합니다.

```bash
python3 -m http.server 8765
```

브라우저에서 `http://127.0.0.1:8765`로 접속합니다.

앱은 서비스 워커를 등록해 주요 정적 파일과 `data/words.json`을 캐시합니다. 한 번 접속한 뒤에는 네트워크가 불안정해도 기본 학습 화면을 다시 열 수 있습니다.

## 검증

배포 전에 JSON 스키마와 정적 산출물을 확인합니다.

```bash
/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 scripts/check_all.py
```

개별 검증을 따로 실행할 수도 있습니다.

```bash
/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 scripts/validate_data.py data/words.json
/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 scripts/build_pages.py _site
/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m unittest discover -s tests
```

실제 배포 전에는 샘플 데이터 경고까지 실패로 처리합니다.

```bash
/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 scripts/check_all.py --strict-data
```

## 업로드용 ZIP 만들기

Git 명령을 사용하지 않고 GitHub에 직접 업로드하려면 다음 명령으로 ZIP을 만듭니다.

```bash
/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 scripts/package_upload.py
```

결과물은 `dist/english-word-app-upload.zip`입니다. 원본 xlsx, `_site`, `reports`, `.git`, 캐시 파일은 ZIP에서 제외됩니다.

업로드 전 확인 항목은 `RELEASE_CHECKLIST.md`에 정리되어 있습니다.

## GitHub Pages 배포

저장소를 GitHub에 올리고 `Settings > Pages > Source`를 `GitHub Actions`로 설정하면, `main` 브랜치에 push될 때 자동 배포됩니다. GitHub 공식 문서의 custom workflow 방식에 맞춘 구성입니다.

주의: private repository와 private website는 다릅니다. 일반 개인 계정에서는 GitHub Pages URL이 사실상 공개될 수 있습니다. 단어장 원문 데이터가 저작권상 민감하다면 GitHub Enterprise Cloud의 private Pages, 별도 인증이 있는 호스팅, 또는 백엔드 인증 배포가 더 안전합니다.
