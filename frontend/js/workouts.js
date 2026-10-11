/**
 * Entrenamientos del usuario: pedir, crear y borrar registros, y dibujar el historial y las estadísticas.
 * Todas estas rutas de la API requieren sesión iniciada (request() envía el token automáticamente).
 */
import { request } from "./api.js";
import { el } from "./dom.js";

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

/** Rellena el <select> de ejercicios, agrupándolos por tipo con <optgroup>. */
export function fillExerciseSelect(select, exercises) {
  select.replaceChildren();
  const groups = new Map();
  for (const exercise of exercises) {
    if (!groups.has(exercise.category_display)) {
      groups.set(exercise.category_display, el("optgroup", { attrs: { label: exercise.category_display } }));
    }
    groups.get(exercise.category_display).append(
      el("option", { text: exercise.name, attrs: { value: String(exercise.id) } }),
    );
  }
  for (const group of groups.values()) select.append(group);
}

/** Actualiza las cuatro cifras del resumen. */
export function renderSummary(summary) {
  document.getElementById("stat-logs").textContent = summary.total_logs;
  document.getElementById("stat-sets").textContent = summary.total_sets;
  document.getElementById("stat-exercises").textContent = summary.distinct_exercises;
  document.getElementById("stat-week").textContent = summary.logs_last_7_days;
}

/** "2026-09-14" -> "14 sept 2026". Se añade la hora para evitar que la zona horaria cambie el día. */
function formatDate(isoDate) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" });
}

/** "3 series × 10 repeticiones" o "3 series × 30 s" */
function describeEffort(log) {
  const sets = `${log.sets} ${log.sets === 1 ? "serie" : "series"}`;
  const parts = [];
  if (log.reps) parts.push(`${log.reps} rep.`);
  if (log.seconds) parts.push(`${log.seconds} s`);
  return `${sets} × ${parts.join(" y ")}`;
}

/** Dibuja el historial. El botón de borrar guarda el id en data-id; main.js lo recoge con un solo listener. */
export function renderWorkouts(container, logs) {
  container.replaceChildren();
  for (const log of logs) {
    const detail = el("span", { className: "log-detail", text: `${describeEffort(log)} · ${formatDate(log.performed_on)}` });
    const info = el("div", {}, el("strong", { text: log.exercise_name }), detail);
    if (log.notes) info.append(el("span", { className: "log-detail", text: log.notes }));

    const remove = el("button", {
      className: "btn btn-ghost btn-delete",
      text: "Eliminar",
      attrs: { type: "button", "data-id": String(log.id), "aria-label": `Eliminar registro de ${log.exercise_name}` },
    });
    container.append(el("li", { className: "log-item" }, info, remove));
  }
}
