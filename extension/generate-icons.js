/**
 * Generates PNG icons for the HERMES extension.
 * No dependencies required — writes raw PNG bytes.
 *
 * Usage: node generate-icons.js
 *
 * Produces:
 *   icons/icon-16.png
 *   icons/icon-48.png
 *   icons/icon-128.png
 */

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const SIZES = [16, 48, 128];
const ICON_DIR = path.join(__dirname, "icons");

// Indigo #6366f1 = rgb(99,102,241)
const BG_R = 99, BG_G = 102, BG_B = 241;
// White for the "H"
const FG_R = 255, FG_G = 255, FG_B = 255;

// Simple bitmap font for "H" — a 5x7 grid
const H_GLYPH = [
  [1, 0, 0, 0, 1],
  [1, 0, 0, 0, 1],
  [1, 0, 0, 0, 1],
  [1, 1, 1, 1, 1],
  [1, 0, 0, 0, 1],
  [1, 0, 0, 0, 1],
  [1, 0, 0, 0, 1],
];

function createIcon(size) {
  // Create RGBA pixel buffer
  const pixels = Buffer.alloc(size * size * 4);

  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2;

  // Glyph sizing: the H occupies about 50% of the icon
  const glyphW = 5;
  const glyphH = 7;
  const scale = Math.max(1, Math.floor(size * 0.07));
  const totalGlyphW = glyphW * scale;
  const totalGlyphH = glyphH * scale;
  const glyphOffX = Math.floor((size - totalGlyphW) / 2);
  const glyphOffY = Math.floor((size - totalGlyphH) / 2);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Distance from center for circular mask
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > radius) {
        // Outside circle — transparent
        pixels[idx] = 0;
        pixels[idx + 1] = 0;
        pixels[idx + 2] = 0;
        pixels[idx + 3] = 0;
        continue;
      }

      // Anti-aliasing at edge
      let alpha = 255;
      if (dist > radius - 1.0) {
        alpha = Math.round(Math.max(0, (radius - dist)) * 255);
      }

      // Check if this pixel is part of the "H" glyph
      const gx = x - glyphOffX;
      const gy = y - glyphOffY;
      let isGlyph = false;

      if (gx >= 0 && gx < totalGlyphW && gy >= 0 && gy < totalGlyphH) {
        const glyphCol = Math.floor(gx / scale);
        const glyphRow = Math.floor(gy / scale);
        if (glyphRow < glyphH && glyphCol < glyphW && H_GLYPH[glyphRow][glyphCol]) {
          isGlyph = true;
        }
      }

      if (isGlyph) {
        pixels[idx] = FG_R;
        pixels[idx + 1] = FG_G;
        pixels[idx + 2] = FG_B;
      } else {
        pixels[idx] = BG_R;
        pixels[idx + 1] = BG_G;
        pixels[idx + 2] = BG_B;
      }
      pixels[idx + 3] = alpha;
    }
  }

  return pixels;
}

function crc32(buf) {
  // Standard CRC32 table
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }

  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makePNG(width, height, rgbaPixels) {
  // Build raw scanlines (filter byte 0 = None for each row)
  const rawData = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + width * 4);
    rawData[rowOffset] = 0; // filter: None
    rgbaPixels.copy(rawData, rowOffset + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressed = zlib.deflateSync(rawData, { level: 9 });

  function writeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);

    const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const checksum = Buffer.alloc(4);
    checksum.writeUInt32BE(crc32(typeAndData), 0);

    return Buffer.concat([len, typeAndData, checksum]);
  }

  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // IDAT
  // IEND
  const iend = Buffer.alloc(0);

  return Buffer.concat([
    signature,
    writeChunk("IHDR", ihdr),
    writeChunk("IDAT", compressed),
    writeChunk("IEND", iend),
  ]);
}

// Ensure icons directory exists
if (!fs.existsSync(ICON_DIR)) {
  fs.mkdirSync(ICON_DIR, { recursive: true });
}

for (const size of SIZES) {
  const pixels = createIcon(size);
  const png = makePNG(size, size, pixels);
  const outPath = path.join(ICON_DIR, `icon-${size}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`Generated ${outPath} (${png.length} bytes)`);
}

console.log("Done. All icons generated.");
