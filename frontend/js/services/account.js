/**
 * Servicio de la cuenta: datos del usuario con sesión iniciada. No toca el DOM.
 */
import { request } from "../core/api.js";

/** Nombre de usuario, correo y fecha de registro (GET /api/auth/me/). */
export function fetchMe() {
  return request("/auth/me/");
}
