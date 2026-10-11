/**
 * Peticiones de favoritos. Requieren sesión: request() envía el token automáticamente.
 * No tocan el DOM.
 */
import { request } from "../core/api.js";

/** Ejercicios guardados por el usuario, del más reciente al más antiguo. */
export function fetchFavorites() {
  return request("/favorites/");
}

/** Guardar es PUT y quitar es DELETE: ambos son idempotentes (ver backend/apps/favorites/views.py). */
export function addFavorite(slug) {
  return request(`/favorites/${encodeURIComponent(slug)}/`, { method: "PUT" });
}

export function removeFavorite(slug) {
  return request(`/favorites/${encodeURIComponent(slug)}/`, { method: "DELETE" });
}
