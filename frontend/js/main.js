/**
 * Punto de entrada común de todas las páginas.
 *
 * Por ahora todas hacen lo mismo: dibujar la cabecera y el pie, y activar el ingreso.
 * Cuando una página tenga contenido propio (el árbol, la biblioteca...), tendrá su propio
 * punto de entrada que importará lo de aquí y sumará su feature.
 *
 * Estructura del frontend:
 *   core/       piezas genéricas (config, API, sesión, DOM, eventos)
 *   services/   datos compartidos por varias features (catálogo, favoritos)
 *   ui/         piezas visuales comunes (cabecera, tema, tarjetas, dificultad)
 *   features/   una carpeta por funcionalidad de una página; no se importan entre sí
 *   pages/      el punto de entrada de cada página
 */
// Tipografías alojadas en el propio sitio (paquetes npm): Vite copia los archivos de fuente
// al compilar. No dependemos de Google Fonts ni le avisamos a un tercero de cada visita.
import "@fontsource-variable/fraunces";
import "@fontsource-variable/inter";

import { initAuth } from "./features/auth/index.js";
import { renderLayout } from "./ui/layout.js";
import { initThemeToggle } from "./ui/theme.js";

renderLayout(); // primero la estructura: lo que sigue necesita que los botones ya existan
initThemeToggle(document.getElementById("theme-toggle"));
initAuth();
