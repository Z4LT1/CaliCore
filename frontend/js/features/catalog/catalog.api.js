/**
 * Peticiones del catálogo de ejercicios. No toca el DOM.
 */
import { request } from "../../core/api.js";

/** Pide ejercicios a la API. `filters` puede tener category, level y search. */
export function fetchExercises(filters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value); // ignora filtros vacíos
  }
  const query = params.toString();
  // auth: false -> el catálogo es público, no hace falta enviar el token.
  return request(`/exercises/${query ? `?${query}` : ""}`, { auth: false });
}
