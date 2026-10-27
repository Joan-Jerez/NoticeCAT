import { expect, test, type Page } from "@playwright/test";

// Vertical slice: una editora publica una nota y aparece en la portada,
// en su sección, en última hora y en el RSS; la abre un lector.

function failOnConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => r.status() >= 500 && errors.push(`${r.status()} ${r.url()}`));
  return () => expect(errors, errors.join("\n")).toEqual([]);
}

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
});

test("una editora publica una nota y el lector la ve", async ({ page }, info) => {
  test.skip(info.project.name !== "escritorio", "el flujo de publicación se prueba una vez");
  const check = failOnConsoleErrors(page);
  const title = `Nota de prueba ${Date.now()}`;

  await page.goto("/admin/notas/nueva");
  await page.getByLabel("Título", { exact: true }).fill(title);
  await page.getByLabel("Bajada").fill("Una bajada escrita en la prueba.");
  await page.getByLabel("Texto").fill("Primer párrafo con **negrita**.\n\n## Un subtítulo\n\n- uno\n- dos");
  await page.getByLabel("Sección").selectOption({ label: "— Vivienda" });
  await page.getByText("Vivienda", { exact: true }).last().click(); // tema
  await page.getByRole("button", { name: "Publicar ahora" }).click();

  await expect(page).toHaveURL(/\/admin\/notas\/[\w-]+\?creada=1/);
  await expect(page.getByText("Publicado", { exact: true })).toBeVisible();

  await page.goto("/");
  const link = page.getByRole("link", { name: title }).first();
  await expect(link).toBeVisible();
  await link.click();

  await expect(page).toHaveURL(/\/economia\/vivienda\/\d{4}\/\d{2}\/\d{2}\/nota-de-prueba-\d+\/\d+$/);
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(page.locator("b", { hasText: "negrita" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Un subtítulo" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Ruta" })).toContainText("Vivienda");

  await page.goto("/economia/vivienda");
  await expect(page.getByRole("link", { name: title })).toBeVisible();
  await page.goto("/ultima-hora");
  await expect(page.getByRole("link", { name: title })).toBeVisible();
  expect(await (await page.request.get("/rss/economia.xml")).text()).toContain(title);
  check();
});

test("una nota programada no se ve hasta su hora", async ({ page }, info) => {
  test.skip(info.project.name !== "escritorio");
  const title = `Programada ${Date.now()}`;
  await page.goto("/admin/notas/nueva");
  await page.getByLabel("Título", { exact: true }).fill(title);
  await page.getByLabel("Texto").fill("Sale mañana.");
  await page.getByLabel("Sección").selectOption({ label: "Ciencia" });
  await page.getByLabel("Programar para").fill("2099-01-01T08:00");
  await page.getByRole("button", { name: "Programar" }).click();
  await expect(page.getByText("Programado", { exact: true })).toBeVisible();
  await page.goto("/ultima-hora");
  await expect(page.getByRole("link", { name: title })).toHaveCount(0);
});

test("un redactor no puede publicar", async ({ page }, info) => {
  test.skip(info.project.name !== "escritorio");
  await page.goto("/admin/notas/nueva?como=user-redactor");
  await expect(page.getByRole("button", { name: "Guardar borrador" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Publicar ahora" })).toHaveCount(0);
});

test("el editor muestra errores en los campos obligatorios", async ({ page }, info) => {
  test.skip(info.project.name !== "escritorio");
  await page.goto("/admin/notas/nueva");
  await page.getByRole("button", { name: "Guardar borrador" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Revisa los campos" })).toBeVisible();
  await expect(page.getByLabel("Título", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("El título es obligatorio.")).toBeVisible();
});

test("un medio no ve las notas del otro", async ({ page }) => {
  await page.goto("/?org=costa");
  await expect(page.getByRole("banner").getByRole("link", { name: "Diario Costa Norte" }).first()).toBeVisible();
  await expect(page.getByText("El puerto amplía su terminal")).toHaveCount(0);
  const res = await page.goto("/economia/2026/10/25/x/1001");
  expect(res?.status()).toBe(404);
});

for (const path of ["/", "/economia", "/ultima-hora", "/autor/laura-mendez", "/tema/vivienda", "/archivo/2026", "/buscar?q=puerto", "/rss", "/cuenta/entrar", "/admin"]) {
  test(`sin errores ni desbordes: ${path}`, async ({ page }) => {
    const check = failOnConsoleErrors(page);
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, "la página no debe tener scroll horizontal").toBeLessThanOrEqual(0);
    check();
  });
}

test("menú móvil: abre, navega y se cierra", async ({ page }, info) => {
  test.skip(info.project.name !== "movil");
  await page.goto("/");
  await page.getByRole("button", { name: "Abrir menú" }).click();
  const menu = page.getByRole("dialog", { name: "Menú de secciones" });
  await expect(menu).toBeVisible();
  await menu.getByRole("button", { name: "Subsecciones de Economía" }).click();
  await menu.getByRole("link", { name: "Vivienda" }).click();
  await expect(page).toHaveURL(/\/economia\/vivienda$/);
  await expect(menu).toBeHidden();
});

test("mega menú de escritorio con teclado", async ({ page }, info) => {
  test.skip(info.project.name !== "escritorio");
  await page.goto("/");
  const btn = page.getByRole("navigation", { name: "Secciones" }).getByRole("button", { name: "Economía" });
  await btn.focus();
  await page.keyboard.press("Enter");
  await expect(btn).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(btn).toHaveAttribute("aria-expanded", "false");
  await expect(btn).toBeFocused();
});

test("cargar más notas", async ({ page }, info) => {
  test.skip(info.project.name !== "escritorio");
  await page.goto("/ultima-hora");
  const before = await page.locator("main article").count();
  const more = page.getByRole("button", { name: "Ver más notas" });
  if (await more.count()) {
    await more.click();
    await expect.poll(() => page.locator("main article").count()).toBeGreaterThan(before);
  }
});
