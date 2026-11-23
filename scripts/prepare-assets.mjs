import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const assetsDir = path.join(root, "assets");
const maskablePath = path.join(root, "icons", "icon-maskable-512.png");
const mainIconPath = path.join(root, "icons", "icon-512.png");

fs.mkdirSync(assetsDir, { recursive: true });

const iconSrc = fs.existsSync(maskablePath) ? maskablePath : mainIconPath;
const splashLogoSrc = fs.existsSync(mainIconPath) ? mainIconPath : iconSrc;

if (!fs.existsSync(iconSrc)) {
  throw new Error(`Missing source icon: ${iconSrc}`);
}

// 1024x1024 기본 아이콘 및 적응형 포그라운드/배경 생성
await sharp(iconSrc)
  .resize(1024, 1024, { kernel: sharp.kernel.lanczos3 })
  .png()
  .toFile(path.join(assetsDir, "icon-only.png"));

await sharp(iconSrc)
  .resize(1024, 1024, { kernel: sharp.kernel.lanczos3 })
  .png()
  .toFile(path.join(assetsDir, "icon-foreground.png"));

await sharp({
  create: {
    width: 1024,
    height: 1024,
    channels: 4,
    background: { r: 56, g: 189, b: 248, alpha: 1 }
  }
})
  .png()
  .toFile(path.join(assetsDir, "icon-background.png"));

// 2732x2732 스플래시 이미지 (중앙 선명한 음악왕 아이콘 배치)
const logoBuf = await sharp(splashLogoSrc)
  .resize(560, 560, { kernel: sharp.kernel.lanczos3 })
  .png()
  .toBuffer();

for (const splashName of ["splash.png", "splash-dark.png"]) {
  await sharp({
    create: {
      width: 2732,
      height: 2732,
      channels: 4,
      background: { r: 56, g: 189, b: 248, alpha: 1 }
    }
  })
    .composite([{ input: logoBuf, gravity: "center" }])
    .png()
    .toFile(path.join(assetsDir, splashName));
}

console.log(`[prepare-assets] Generated Capacitor icons & splash assets in ${assetsDir}`);
