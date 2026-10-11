/**
 * Punto de entrada de index.html.
 * Primero lo común a todas las páginas (main.js: cabecera, tema, acceso) y luego lo propio del inicio.
 */
import "../main.js";
import { initHome } from "../features/home/index.js";
import { initReveal } from "../ui/reveal.js";

initReveal();
initHome();
