// Capturas de cada pantalla para /replica-diff, a 1440 y 390 px.
//   node scripts/screenshots.mjs   (con el servidor en http://localhost:3000)
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "replica", "clone-screens");
mkdirSync(out, { recursive: true });
const base = "http://localhost:3000";

const browser = await chromium.launch({ channel: "msedge" });
const home = await (await browser.newPage()).goto(base);
const html = await home.text();
const article = html.match(/href="(\/economia\/\d{4}\/\d{2}\/\d{2}\/[a-z0-9-]+\/\d+)"/)?.[1];
const day = article?.match(/\d{4}\/\d{2}\/\d{2}/)?.[0].replaceAll("/", "-");

const screens = {
  S01: "/",
  S02: "/economia",
  S03: article,
  S04: "/autor/laura-mendez",
  S05: "/tema/vivienda",
  S06: `/archivo/${day}`,
  S07: "/ultima-hora",
  S08: "/cuenta/entrar",
  S10: "/rss",
  S14: "/archivo/2026",
  A01: "/admin",
  A02: "/admin/notas/nueva",
};

for (const [width, height, suffix] of [[1440, 900, ""], [390, 844, "-390"]]) {
  const page = await browser.newPage({ viewport: { width, height } });
  for (const [id, path] of Object.entries(screens)) {
    if (!path) continue;
    await page.goto(base + path, { waitUntil: "networkidle" });
    // las fotos bajo el pliegue cargan en diferido: recorrer la página primero
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: join(out, `${id}${suffix}.png`), fullPage: true });
  }
  await page.close();
}
await browser.close();
console.log(`capturas en ${out}`);
