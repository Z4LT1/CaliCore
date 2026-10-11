/**
 * Peticiones del catálogo (públicas: no envían el token). No tocan el DOM.
 * Las usan la página principal y, más adelante, el árbol y la biblioteca.
 */
import { request } from "../../core/api.js";

/** El árbol completo: ramas > caminos > ejercicios (con sus requisitos). */
export function fetchTree() {
  return request("/tree/", { auth: false });
}

/** Lista resumida de ejercicios. `filters` admite branch, path, difficulty, muscle, equipment y search. */
export function fetchExercises(filters = {}) {
  const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
  const query = params.toString();
  return request(`/exercises/${query ? `?${query}` : ""}`, { auth: false });
}
