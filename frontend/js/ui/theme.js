/**
 * Tema claro / oscuro.
 *
 * - Sin elección guardada, la página sigue el tema del sistema operativo (lo resuelve el CSS
 *   con prefers-color-scheme, ver css/base/tokens.css).
 * - Al usar el botón, se guarda la elección en localStorage y se marca <html data-theme="...">.
 *   Un script mínimo en el <head> de cada página aplica esa elección ANTES de dibujar, para
 *   evitar el "destello" blanco al cargar en modo oscuro.
 */
const KEY = "calicore_theme";
const systemDark = window.matchMedia("(prefers-color-scheme: dark)");

/** Tema que se está viendo ahora: el elegido o, si no hay, el del sistema. */
export function currentTheme() {
  return document.documentElement.dataset.theme || (systemDark.matches ? "dark" : "light");
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* sin almacenamiento (modo privado): el cambio dura hasta recargar */
  }
}

/** Conecta el botón de la cabecera: alterna el tema y actualiza su texto accesible. */
export function initThemeToggle(button) {
  const sync = () => {
    const dark = currentTheme() === "dark";
    button.setAttribute("aria-pressed", String(dark));
    button.setAttribute("aria-label", dark ? "Cambiar a tema claro" : "Cambiar a tema oscuro");
    button.dataset.theme = currentTheme(); // el CSS muestra el ícono de sol o de luna según esto
  };
  button.addEventListener("click", () => {
    setTheme(currentTheme() === "dark" ? "light" : "dark");
    sync();
  });
  systemDark.addEventListener("change", sync); // si cambia el tema del sistema y no hay elección propia
  sync();
}
