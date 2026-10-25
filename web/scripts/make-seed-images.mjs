// Genera ilustraciones abstractas propias para los datos de prueba (public/seed/*.svg).
// No son fotos de nadie: formas geométricas con la paleta de NoticeCAT.
//   node scripts/make-seed-images.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "seed");
mkdirSync(out, { recursive: true });

const palettes = [
  ["#EFEAF7", "#6C4FA1", "#1E1728", "#A79EB5"],
  ["#E2EFE6", "#33694A", "#1E1728", "#A7C4B0"],
  ["#F6EBD4", "#7F5810", "#332A40", "#D9B97A"],
  ["#F7F5FA", "#5A4089", "#6E6580", "#E4DEED"],
  ["#1E1728", "#6C4FA1", "#FBF9FD", "#3E3549"],
  ["#E8E4DC", "#6B6459", "#1E1728", "#B8B0A2"],
];

// generador pseudoaleatorio con semilla: mismas imágenes en cada corrida
function rng(seed) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
}

function svg(i, w, h) {
  const r = rng(i * 7919 + 13);
  const [bg, a, b, c] = palettes[i % palettes.length];
  const shapes = [];
  for (let k = 0; k < 7; k++) {
    const kind = Math.floor(r() * 3);
    const fill = [a, b, c][Math.floor(r() * 3)];
    const op = (0.35 + r() * 0.6).toFixed(2);
    if (kind === 0) {
      shapes.push(`<circle cx="${(r() * w).toFixed(0)}" cy="${(r() * h).toFixed(0)}" r="${(40 + r() * h * 0.45).toFixed(0)}" fill="${fill}" opacity="${op}"/>`);
    } else if (kind === 1) {
      shapes.push(`<rect x="${(r() * w * 0.8).toFixed(0)}" y="${(r() * h * 0.8).toFixed(0)}" width="${(60 + r() * w * 0.4).toFixed(0)}" height="${(30 + r() * h * 0.5).toFixed(0)}" fill="${fill}" opacity="${op}"/>`);
    } else {
      const y = (r() * h).toFixed(0);
      shapes.push(`<path d="M0 ${y} C ${w * 0.3} ${(r() * h).toFixed(0)}, ${w * 0.6} ${(r() * h).toFixed(0)}, ${w} ${y} L ${w} ${h} L 0 ${h} Z" fill="${fill}" opacity="${op}"/>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="${bg}"/>${shapes.join("")}</svg>\n`;
}

for (let i = 1; i <= 16; i++) {
  writeFileSync(join(out, `cover-${String(i).padStart(2, "0")}.svg`), svg(i, 1200, 675));
}
for (let i = 1; i <= 8; i++) {
  writeFileSync(join(out, `person-${String(i).padStart(2, "0")}.svg`), svg(100 + i, 240, 240));
}
console.log("public/seed listo");
