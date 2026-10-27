// Genera los avatares abstractos de los autores de prueba (public/seed/person-*.svg).
// Las portadas son fotos de Wikimedia Commons: public/seed/photo-*.jpg, créditos en src/lib/data/seed-photos.json.
// No son fotos de nadie: formas geométricas con la paleta de NoticeCAT.
//   node scripts/make-seed-images.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "seed");
mkdirSync(out, { recursive: true });

const palettes = [
  ["#F1E1D2", "#A2441F", "#2B211A", "#D9A784"],
  ["#E1EEE4", "#2F6846", "#2B211A", "#A9C7B1"],
  ["#F5E8CF", "#7A5410", "#3B2F26", "#DDBB7C"],
  ["#F3ECE1", "#853819", "#6B5D4F", "#E7DCCB"],
  ["#2B211A", "#A2441F", "#FAF3EA", "#4A3D32"],
  ["#ECE5DA", "#6A6055", "#2B211A", "#C2B3A2"],
]

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

for (let i = 1; i <= 8; i++) {
  writeFileSync(join(out, `person-${String(i).padStart(2, "0")}.svg`), svg(100 + i, 240, 240));
}
console.log("public/seed listo");
