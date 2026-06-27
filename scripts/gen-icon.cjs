// 生成 1024x1024 PNG 占位图标 — 深色面板 + 绿色 LCD 风格时间显示
// 纯 Node 内置 (zlib + Buffer),无依赖
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const W = 1024, H = 1024;
const px = (x, y, r, g, b) => {
  const i = (y * W + x) * 4;
  buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = 255;
};
const buf = Buffer.alloc(W * H * 4);

// 调色板
const BG_TOP = [10, 11, 13];
const BG_BOT = [22, 24, 28];
const LCD_BG = [47, 79, 50];
const LCD_FG = [143, 163, 125];

// 1. 背景垂直渐变
for (let y = 0; y < H; y++) {
  const t = y / H;
  const r = Math.round(BG_TOP[0] + (BG_BOT[0] - BG_TOP[0]) * t);
  const g = Math.round(BG_TOP[1] + (BG_BOT[1] - BG_TOP[1]) * t);
  const b = Math.round(BG_TOP[2] + (BG_BOT[2] - BG_TOP[2]) * t);
  for (let x = 0; x < W; x++) px(x, y, r, g, b);
}

// 工具:填充圆角矩形
function roundRect(x0, y0, w, h, r, color) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const dx = Math.max(0, Math.max(x0 + r - x, x - (x0 + w - 1 - r)));
      const dy = Math.max(0, Math.max(y0 + r - y, y - (y0 + h - 1 - r)));
      if (dx * dx + dy * dy <= r * r) px(x, y, color[0], color[1], color[2]);
    }
  }
}

// 工具:填充实心圆
function disc(cx, cy, radius, color) {
  for (let y = cy - radius; y <= cy + radius; y++) {
    for (let x = cx - radius; x <= cx + radius; x++) {
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy <= radius * radius && x >= 0 && x < W && y >= 0 && y < H) {
        px(x, y, color[0], color[1], color[2]);
      }
    }
  }
}

// 工具:填充矩形
function rect(x0, y0, w, h, color) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) px(x, y, color[0], color[1], color[2]);
  }
}

// 2. 中央 LCD 屏 (800x460, 圆角 50)
const LX = (W - 800) / 2, LY = (H - 460) / 2;
roundRect(LX, LY, 800, 460, 50, LCD_BG);

// 3. LCD 上半部网格状装饰线(用 BG_BOT 模拟扫描线)
for (let y = LY + 4; y < LY + 456; y += 6) {
  for (let x = LX + 4; x < LX + 796; x++) {
    const i = (y * W + x) * 4;
    buf[i] = LCD_BG[0] - 8; buf[i+1] = LCD_BG[1] - 8; buf[i+2] = LCD_BG[2] - 8;
  }
}

// 4. LCD 中央画"00:00"风格 4 个数字 + 2 个冒号
const DY = LY + 130;
const DH = 200;
const digitW = 110, digitGap = 30, colonW = 30;
const colonGap = 25;
const totalDigitsW = digitW * 4 + digitGap * 3 + colonW * 2 + colonGap * 2;
const DX0 = Math.round((W - totalDigitsW) / 2);

// 数字 = 实心圆角矩形(看起来像 LCD 段码的"8")
function drawDigit(x, y) {
  roundRect(x, y, digitW, DH, 16, LCD_FG);
  // 中间横线空隙(模拟 LCD 段码间隔)
  const gapH = 16;
  const topY = y, midY = y + Math.round(DH / 2) - Math.round(gapH / 2);
  const botY = y + DH - gapH;
  // 把矩形中间部分用 LCD_BG 颜色覆盖(形成"8"的两横)
  rect(x, y + Math.round(DH * 0.42), digitW, Math.round(DH * 0.16), LCD_BG);
}

let cx = DX0;
drawDigit(cx, DY); cx += digitW + digitGap;
drawDigit(cx, DY); cx += digitW + digitGap;
// 冒号 1
disc(cx + colonW / 2, DY + DH * 0.32, 16, LCD_FG);
disc(cx + colonW / 2, DY + DH * 0.68, 16, LCD_FG);
cx += colonW + colonGap;
drawDigit(cx, DY); cx += digitW + digitGap;
drawDigit(cx, DY);

// 5. 顶部装饰: 3 个小圆点(LED 指示灯)
const ledY = 90;
disc(180, ledY, 22, [180, 50, 50]);
disc(240, ledY, 22, [180, 50, 50]);
disc(300, ledY, 22, [80, 130, 60]);

// 6. 底部装饰: 文字"FISHER" 用方块模拟(简单点)
const textY = 900;
const fw = 60, fh = 50, fgap = 12;
const totalTextW = fw * 7 + fgap * 6; // "FISHER " 7 字符
const textStartX = Math.round((W - totalTextW) / 2);
// F = 1个, I = 1个, S = 1个, H = 1个, E = 1个, R = 1个, R = 1个 - 实际只要位置
// 为简化: 画 7 个细长方块代表字符
for (let i = 0; i < 7; i++) {
  const tx = textStartX + i * (fw + fgap);
  roundRect(tx, textY, fw, fh, 8, [180, 180, 180]);
}

// 7. PNG 编码
function crc32(buf) {
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = (table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)) >>> 0;
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 6;

// 加 filter byte (0 = None)
const filtered = Buffer.alloc(H * (W * 4 + 1));
for (let y = 0; y < H; y++) {
  filtered[y * (W * 4 + 1)] = 0;
  buf.copy(filtered, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4);
}

const idatData = zlib.deflateSync(filtered);

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', idatData),
  chunk('IEND', Buffer.alloc(0)),
]);

const outDir = path.join(__dirname, '..', 'src-tauri', 'icons');
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, 'icon.png');
fs.writeFileSync(out, png);
console.log(`Wrote ${out} (${(png.length / 1024).toFixed(1)} KB, ${W}x${H})`);