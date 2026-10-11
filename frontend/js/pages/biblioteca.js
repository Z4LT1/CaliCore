/**
 * Punto de entrada de biblioteca.html.
 * Primero lo común a todas las páginas (main.js: cabecera, tema, acceso) y luego la biblioteca.
 */
import "../main.js";
import { initLibrary } from "../features/library/index.js";

initLibrary();
