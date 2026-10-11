/**
 * Peticiones de entrenamientos. Todas requieren sesión iniciada: request() envía el token automáticamente.
 * No toca el DOM.
 */
import { request } from "../../core/api.js";

export function fetchSummary() {
  return request("/workouts/summary/");
}

export async function fetchWorkouts() {
  const data = await request("/workouts/");
  return data.results; // la lista viene paginada: {count, next, previous, results}
}

export function createWorkout(payload) {
  return request("/workouts/", { method: "POST", body: payload });
}

export function deleteWorkout(id) {
  return request(`/workouts/${id}/`, { method: "DELETE" });
}
