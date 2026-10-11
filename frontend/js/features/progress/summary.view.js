/**
 * Vista del resumen: las cifras de "Mi progreso" (registros, series, ejercicios distintos, últimos 7 días).
 */

/** Actualiza las cuatro cifras del resumen. */
export function renderSummary(summary) {
  document.getElementById("stat-logs").textContent = summary.total_logs;
  document.getElementById("stat-sets").textContent = summary.total_sets;
  document.getElementById("stat-exercises").textContent = summary.distinct_exercises;
  document.getElementById("stat-week").textContent = summary.logs_last_7_days;
}
