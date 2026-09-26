import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';

function createIcon(size, isMaskable = false) {
  const png = new PNG({ width: size, height: size });
  const center = size / 2;
  const radius = isMaskable ? size * 0.40 : size * 0.44;

  // Colors: V-Chat Electric Azure Blue and White
  const blueR = 0, blueG = 168, blueB = 255; // #00A8FF
  const whiteR = 255, whiteG = 255, whiteB = 255;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let r = whiteR;
      let g = whiteG;
      let b = whiteB;
      let a = 255;

      // Pure circular badge matching the attached logo
      const bubbleDist = Math.sqrt(dx * dx + dy * dy);
      const bubbleRadius = radius;

      if (bubbleDist <= bubbleRadius) {
        // Inside Azure Blue Circle matching attached logo
        r = blueR;
        g = blueG;
        b = blueB;

        // Draw Stylized 'V' in white inside the circle
        const relX = dx / radius;
        const relY = dy / radius;

        // Left curl of the script V:
        const leftLoopDist = Math.sqrt(Math.pow(relX + 0.35, 2) + Math.pow(relY + 0.15, 2));
        const leftInnerLoopDist = Math.sqrt(Math.pow(relX + 0.35, 2) + Math.pow(relY + 0.15, 2));
        const rightDotDist = Math.sqrt(Math.pow(relX - 0.44, 2) + Math.pow(relY + 0.26, 2));

        const inVStroke = (
          (relY >= -0.28 && relY <= 0.52 && Math.abs(relX - (-0.25 + (relY + 0.25) * 0.33)) < 0.12) ||
          (relY >= -0.32 && relY <= 0.52 && Math.abs(relX - (0.0 + (0.52 - relY) * 0.58)) < 0.11) ||
          (leftLoopDist < 0.20 && leftInnerLoopDist > 0.08) ||
          (rightDotDist < 0.10)
        );

        if (inVStroke) {
          r = whiteR;
          g = whiteG;
          b = whiteB;
        }
      }

      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = a;
    }
  }

  return PNG.sync.write(png);
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createIcon(192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createIcon(512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createIcon(512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createIcon(180, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), createIcon(64, false));

console.log('All V-Chat PWA icons generated successfully in /public');
