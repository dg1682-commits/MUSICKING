# 🤖 음악왕 GitHub Actions 자동 `.aab` / `.apk` 빌드 가이드

> **목적:** 내 PC에 무거운 Android Studio(10~15GB)나 Node.js를 설치하지 않고, **GitHub 클라우드 서버**에서 자동으로 서명된 `.aab`(구글 플레이용) 및 `.apk`(폰 테스트용)를 추출하기 위한 세팅 가이드

---

## 1단계: 집 PC에서 서명 키(`.jks`) 1회 생성 (1분 컷)

구글 플레이에 올리는 `.aab`에는 개발자 본인 서명 키(`.jks`)가 필수입니다. 최초 1회만 집 PC에서 생성합니다.

### 1) Java JDK 설치 (없는 경우에만)
- **Adoptium Temurin JDK 17 또는 21** 설치 (Android Studio 전체 설치 불필요)

### 2) 키스토어(`.jks`) 생성 명령어
집 PC 터미널(CMD 또는 PowerShell)에서 아래 명령어를 실행하고 비밀번호와 정보(이름 등)를 입력합니다.

```bash
keytool -genkey -v -keystore musicking-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias musicking
```

> ⚠️ **절대 주의:** 생성된 `musicking-release.jks` 파일과 입력한 비밀번호는 **구글 드라이브/개인 이메일 등에 반드시 백업**하세요! 분실 시 구글 플레이 앱 업데이트를 영구적으로 할 수 없습니다.

### 3) `.jks` 파일을 Base64 텍스트로 변환 (집 PC PowerShell)
GitHub Secrets에 파일 내용을 문자열로 넣기 위해 Base64로 변환해 클립보드에 복사합니다.

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("musicking-release.jks")) | Set-Clipboard
```

---

## 2단계: GitHub 레포지토리에 비밀 키 4개 등록

GitHub `MUSICKING` 레포지토리 → **`Settings` → `Secrets and variables` → `Actions` → `New repository secret`** 클릭 후 아래 4개를 등록합니다.

| Secret 이름 | 입력할 값 |
| :--- | :--- |
| `KEYSTORE_BASE64` | 1단계에서 클립보드에 복사한 Base64 문자열 붙여넣기 |
| `KEYSTORE_PASSWORD` | 키스토어 생성 시 입력한 비밀번호 |
| `KEY_ALIAS` | `musicking` |
| `KEY_PASSWORD` | 키 비밀번호 (보통 키스토어 비밀번호와 동일) |

---

## 3단계: 레포지토리에 Capacitor + 자동 빌드 파일 추가

1~2단계가 끝나면 레포지토리에 아래 구성 파일들을 추가합니다.

1. **`package.json` / `capacitor.config.json`**
   - `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor-community/admob` 의존성 정의
   - 웹 파일(`index.html`, `style.css`, `app.js`, `data.js`, `pixel_avatar.js`, `online.js`, `fishing.js`, `icons/` 등)을 `www/` 폴더에 모아 패키징하도록 설정
   - `compileSdkVersion = 36`, `targetSdkVersion = 36` 및 `AndroidManifest.xml`에 AdMob App ID 반영

2. **`.github/workflows/build-aab.yml`**
   - GitHub 클라우드 서버(Ubuntu)가 자동으로 Node.js + Java + Android SDK 36 세팅
   - `Secrets`에 저장된 `.jks` 서명 키를 임시 복원해 **`app-release.aab`**(구글 플레이 제출용)와 **`app-release.apk`**(내 폰 테스트용) 동시 빌드 후 Artifacts로 업로드

---

## 4단계: 이후 빌드 및 업데이트 사용법

세팅 완료 후에는 어느 PC에서든 Android Studio 없이 아래 순서만 반복하면 됩니다.

1. 웹 코드 수정 후 GitHub에 Push (또는 GitHub `Actions` 탭에서 수동 실행 버튼 클릭)
2. 약 3~5분 후 `Actions` 실행 결과 화면 하단 **Artifacts**에서 파일 다운로드:
   - **`app-release.apk`** → 내 안드로이드 폰에 설치해 UI·AdMob 동작 테스트
   - **`app-release.aab`** → Google Play Console에 업로드해 심사 제출!
