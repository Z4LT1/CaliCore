/**
 * Vista del formulario "Registrar entrenamiento": rellena el <select> y traduce el formulario a JSON.
 */
import { el } from "../../core/dom.js";

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

/**
 * Convierte el formulario en el objeto que espera la API.
 * reps y seconds son opcionales: solo se envían si el usuario escribió algo.
 */
export function readWorkoutForm(form) {
  const data = new FormData(form);
  const payload = {
    exercise: Number(data.get("exercise")),
    performed_on: data.get("performed_on"),
    sets: Number(data.get("sets")),
    notes: data.get("notes").trim(),
  };
  if (data.get("reps")) payload.reps = Number(data.get("reps"));
  if (data.get("seconds")) payload.seconds = Number(data.get("seconds"));
  return payload;
}
