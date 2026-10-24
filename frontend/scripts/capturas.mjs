/**
 * Capturas de pantalla de todas las páginas, en escritorio y celular, con Playwright.
 *
 * Uso (con el backend y `npm run dev` corriendo):
 *   npm run capturas -- antes      -> guarda en docs/capturas/antes/
 *   npm run capturas -- despues    -> guarda en docs/capturas/despues/
 *
 * Sirven para el README y el portafolio (el "antes y después" del rediseño).
 */
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:5500";
const PAGES = ["index", "perfil", "historia", "arbol", "biblioteca"];
const DEVICES = {
  escritorio: { viewport: { width: 1440, height: 900 } },
  celular: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
};
const THEMES = ["light", "dark"];

const label = process.argv[2] ?? "antes";
const outDir = resolve(import.meta.dirname, "../../docs/capturas", label);
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
for (const [deviceName, device] of Object.entries(DEVICES)) {
  for (const theme of THEMES) {
    // colorScheme simula el tema del sistema: el sitio lo sigue si no se eligió otro con el botón
    const context = await browser.newContext({ ...device, colorScheme: theme });
    const page = await context.newPage();
    for (const name of PAGES) {
      await page.goto(`${BASE}/${name}.html`, { waitUntil: "networkidle" });
      // Las secciones aparecen al entrar en pantalla (js/ui/reveal.js): se recorre la página
      // completa antes de capturar, o la captura de página completa sale con huecos vacíos
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight / 2) {
          window.scrollTo(0, y);
          await new Promise((done) => setTimeout(done, 150));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(3000); // deja terminar las animaciones de entrada
      // El árbol ocupa la pantalla exacta: una captura de página completa no agrega nada
      const fullPage = name !== "arbol";
      const file = resolve(outDir, `${name}-${deviceName}-${theme === "light" ? "claro" : "oscuro"}.png`);
      await page.screenshot({ path: file, fullPage });
      console.log("✓", file);
    }
    await context.close();
  }
}
await browser.close();
