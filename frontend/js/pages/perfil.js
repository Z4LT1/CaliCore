/**
 * Punto de entrada de perfil.html.
 * Primero lo común a todas las páginas (main.js: cabecera, tema, acceso) y luego el perfil.
 */
import "../main.js";
import { initProfile } from "../features/profile/index.js";

initProfile();
