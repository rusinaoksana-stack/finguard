import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const images = [
  "1_girl_with_card",
  "2_boy_with_card",
  "bank_1",
  "bank_2",
  "safety",
];

await Promise.all(
  images.map(async (name) => {
    const input = path.join(rootDir, "frontend", "images", `${name}.png`);
    const output = path.join(rootDir, "frontend", "images", `${name}.webp`);

    await sharp(input)
      .webp({ quality: 78, effort: 6 })
      .toFile(output);
  }),
);
