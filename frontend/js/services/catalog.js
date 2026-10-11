/**
 * Servicio del catálogo: peticiones públicas (no envían el token). No toca el DOM.
 * Lo usan varias features: el inicio, la biblioteca y, más adelante, el árbol.
 */
import { request } from "../core/api.js";

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

/** Ficha completa de un ejercicio. Se guarda en memoria: abrirla dos veces no repite la petición. */
const detailCache = new Map();
export function fetchExercise(slug) {
  if (!detailCache.has(slug)) {
    const promise = request(`/exercises/${encodeURIComponent(slug)}/`, { auth: false });
    promise.catch(() => detailCache.delete(slug)); // si falla, se puede reintentar
    detailCache.set(slug, promise);
  }
  return detailCache.get(slug);
}
