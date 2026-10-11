/**
 * Vista del historial: dibuja la lista de registros con su botón "Eliminar".
 */
import { el } from "../../core/dom.js";

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

/** Dibuja el historial. El botón de borrar guarda el id en data-id; progress/index.js lo recoge con un solo listener. */
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
