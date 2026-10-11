/**
 * Punto de entrada de historia.html.
 * Primero lo común a todas las páginas (main.js: cabecera, tema, acceso) y luego la historia.
 */
import "../main.js";
import { initHistory } from "../features/history/index.js";
import { initReveal } from "../ui/reveal.js";

initReveal();
initHistory();
