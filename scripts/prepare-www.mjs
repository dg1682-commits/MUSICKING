import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outDir = path.join(root, "www");

const FILES_TO_COPY = [
  "index.html",
  "style.css",
  "app.js",
  "online.js",
  "fishing.js",
  "fishing_manual.js",
  "quiz_plaza.js",
  "arcade.js",
  "arcade_games.js",
  "arcade_sfx.js",
  "pixel_avatar.js",
  "pixel_avatar_v3.js",
  "data.js",
  "ox_questions.js",
  "climb_questions.js",
  "typing_questions.js",
  "manifest.json",
  "privacy.html",
  "sw.js"
];

// Google Play 무광고 첫 출시(.aab)에서는 외부 홍보 이미지가 포함된 myad/ 폴더를 패키징에서 제외
const DIRS_TO_COPY = ["icons", "bgm"];

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

for (const file of FILES_TO_COPY) {
  const src = path.join(root, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(outDir, file));
  }
}

for (const dir of DIRS_TO_COPY) {
  const src = path.join(root, dir);
  if (fs.existsSync(src)) {
    fs.cpSync(src, path.join(outDir, dir), { recursive: true });
  }
}

console.log(`[prepare-www] Copied web bundle cleanly into ${outDir}`);
