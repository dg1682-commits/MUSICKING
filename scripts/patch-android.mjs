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

// 5) MainActivity.java/.kt -> WebView textZoom 하한(100%), WideViewPort, 줌 비활성화 적용
function findFileRecursive(dir, targetNames) {
  if (!fs.existsSync(dir)) return null;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const hit = findFileRecursive(full, targetNames);
      if (hit) return hit;
    } else if (targetNames.includes(entry.name)) {
      return full;
    }
  }
  return null;
}

const javaSrcRoot = path.join(androidDir, "app", "src", "main", "java");
const mainActivityPath = findFileRecursive(javaSrcRoot, ["MainActivity.java", "MainActivity.kt"]);
if (mainActivityPath) {
  const cur = fs.readFileSync(mainActivityPath, "utf8");
  const pkgMatch = cur.match(/^\s*package\s+([A-Za-z0-9_.]+)\s*;?/m);
  const pkgName = pkgMatch ? pkgMatch[1] : "com.goongdystudio.musicking";

  if (mainActivityPath.endsWith(".java")) {
    const javaSource = `package ${pkgName};

import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private void configureWebViewSettings() {
        if (getBridge() == null) return;
        WebView webView = getBridge().getWebView();
        if (webView == null) return;
        WebSettings settings = webView.getSettings();
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        if (settings.getTextZoom() < 100) {
            settings.setTextZoom(100);
        }
    }

    @Override
    public void onStart() {
        super.onStart();
        configureWebViewSettings();
    }

    @Override
    public void onResume() {
        super.onResume();
        configureWebViewSettings();
    }
}
`;
    fs.writeFileSync(mainActivityPath, javaSource, "utf8");
    console.log(`[patch-android] Patched ${path.basename(mainActivityPath)} WebSettings (textZoom>=100, wideViewPort, noZoom)`);
  } else {
    const ktSource = `package ${pkgName}

import android.webkit.WebView
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    private fun configureWebViewSettings() {
        val webView: WebView = bridge?.webView ?: return
        val settings = webView.settings
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true
        settings.setSupportZoom(false)
        settings.builtInZoomControls = false
        settings.displayZoomControls = false
        if (settings.textZoom < 100) {
            settings.textZoom = 100
        }
    }

    override fun onStart() {
        super.onStart()
        configureWebViewSettings()
    }

    override fun onResume() {
        super.onResume()
        configureWebViewSettings()
    }
}
`;
    fs.writeFileSync(mainActivityPath, ktSource, "utf8");
    console.log(`[patch-android] Patched ${path.basename(mainActivityPath)} WebSettings (textZoom>=100, wideViewPort, noZoom)`);
  }
}
