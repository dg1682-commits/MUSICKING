import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const androidDir = path.join(root, "android");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

const versionCode = Math.max(1, parseInt(process.env.ANDROID_VERSION_CODE || "1", 10) || 1);
const versionName = String(process.env.ANDROID_VERSION_NAME || pkg.version || "1.0.0").trim();

// 1) variables.gradle -> compileSdkVersion = 36, targetSdkVersion = 36 보장
const varsPath = path.join(androidDir, "variables.gradle");
if (fs.existsSync(varsPath)) {
  let vars = fs.readFileSync(varsPath, "utf8");
  vars = vars.replace(/compileSdkVersion\s*=\s*\d+/, "compileSdkVersion = 36");
  vars = vars.replace(/targetSdkVersion\s*=\s*\d+/, "targetSdkVersion = 36");
  fs.writeFileSync(varsPath, vars, "utf8");
  console.log("[patch-android] Updated variables.gradle to compileSdkVersion/targetSdkVersion = 36");
}

// 2) android/app/build.gradle -> versionCode, versionName, release signingConfig 연결
const appGradlePath = path.join(androidDir, "app", "build.gradle");
if (fs.existsSync(appGradlePath)) {
  let gradle = fs.readFileSync(appGradlePath, "utf8");
  gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);
  gradle = gradle.replace(/versionName\s+"[^"]*"/, `versionName "${versionName}"`);

  const hasKeystoreProps = fs.existsSync(path.join(androidDir, "keystore.properties"));
  if (hasKeystoreProps && !gradle.includes("signingConfigs")) {
    gradle = gradle.replace(
      /buildTypes\s*\{/,
      `signingConfigs {\n        release {\n            def kpFile = rootProject.file('keystore.properties')\n            if (kpFile.exists()) {\n                def kp = new Properties()\n                kp.load(new FileInputStream(kpFile))\n                storeFile file(kp['storeFile'])\n                storePassword kp['storePassword']\n                keyAlias kp['keyAlias']\n                keyPassword kp['keyPassword']\n            }\n        }\n    }\n    buildTypes {`
    );
    gradle = gradle.replace(
      /buildTypes\s*\{\s*release\s*\{/,
      `buildTypes {\n        release {\n            signingConfig signingConfigs.release`
    );
  }
  fs.writeFileSync(appGradlePath, gradle, "utf8");
  console.log(`[patch-android] Patched app/build.gradle (versionCode=${versionCode}, versionName=${versionName}, signed=${hasKeystoreProps})`);
}

// 3) AndroidManifest.xml -> 세로 화면(portrait) 고정
const manifestPath = path.join(androidDir, "app", "src", "main", "AndroidManifest.xml");
if (fs.existsSync(manifestPath)) {
  let xml = fs.readFileSync(manifestPath, "utf8");
  if (!xml.includes("android:screenOrientation=")) {
    xml = xml.replace(
      /(<activity\b[^>]*android:name="[^"]*MainActivity"[^>]*)/,
      `$1\n            android:screenOrientation="portrait"`
    );
    fs.writeFileSync(manifestPath, xml, "utf8");
    console.log("[patch-android] Set MainActivity screenOrientation=portrait");
  }
}

// 4) values/styles.xml -> 안드로이드 시스템 다크모드 강제 반전 방지
const stylesPath = path.join(androidDir, "app", "src", "main", "res", "values", "styles.xml");
if (fs.existsSync(stylesPath)) {
  let styles = fs.readFileSync(stylesPath, "utf8");
  if (!styles.includes("android:forceDarkAllowed")) {
    styles = styles.replace(
      /(<style[^>]*name="AppTheme\.NoActionBar"[^>]*>)/,
      `$1\n        <item name="android:forceDarkAllowed">false</item>`
    );
    fs.writeFileSync(stylesPath, styles, "utf8");
    console.log("[patch-android] Disabled Android forceDarkAllowed in styles.xml");
  }
}
