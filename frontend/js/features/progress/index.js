/**
 * Feature "Mi progreso": resumen, formulario de nuevo registro e historial del usuario.
 *
 *   workouts.api.js        peticiones (listar, resumen, crear, borrar)
 *   summary.view.js        las cifras del resumen
 *   workout-form.view.js   el <select> de ejercicios y la lectura del formulario
 *   history.view.js        la lista del historial
 *   index.js               este archivo: decide cuándo cargar y atiende los eventos
 */
import { errorMessage } from "../../core/api.js";
import { $ } from "../../core/dom.js";
import { EVENTS, on } from "../../core/events.js";
import { isLoggedIn } from "../../core/session.js";
import { renderWorkouts } from "./history.view.js";
import { renderSummary } from "./summary.view.js";
import { fillExerciseSelect, readWorkoutForm } from "./workout-form.view.js";
import { createWorkout, deleteWorkout, fetchSummary, fetchWorkouts } from "./workouts.api.js";

const ui = {
  locked: $("#progress-locked"),
  panel: $("#progress-panel"),
  form: $("#workout-form"),
  formError: $("#workout-error"),
  status: $("#workout-status"),
  list: $("#workout-list"),
  exerciseSelect: $("#workout-exercise"),
  date: $("#workout-date"),
};

/** Fecha de hoy en formato AAAA-MM-DD, usando la zona horaria local (el formato sueco "sv-SE" lo entrega así). */
const today = () => new Date().toLocaleDateString("sv-SE");

/** Pide resumen e historial en paralelo y los dibuja. */
async function loadProgress() {
  ui.status.textContent = "Cargando historial…";
  try {
    const [summary, logs] = await Promise.all([fetchSummary(), fetchWorkouts()]);
    renderSummary(summary);
    renderWorkouts(ui.list, logs);
    ui.status.textContent = logs.length ? "" : "Todavía no registras entrenamientos. Guarda el primero.";
  } catch (error) {
    ui.status.textContent = errorMessage(error);
  }
}

/** Con sesión: muestra el panel y carga los datos. Sin sesión: muestra la invitación a ingresar. */
function renderSession() {
  const loggedIn = isLoggedIn();
  ui.locked.hidden = loggedIn;
  ui.panel.hidden = !loggedIn;

  if (loggedIn) {
    ui.date.value = today();
    loadProgress();
  } else {
    ui.list.replaceChildren(); // no dejar datos del usuario anterior en la página
  }
}

async function handleSubmit(event) {
  event.preventDefault();
  ui.formError.textContent = "";
  try {
    await createWorkout(readWorkoutForm(ui.form));
    ui.form.reset();
    ui.date.value = today();
    await loadProgress(); // refresca estadísticas e historial
  } catch (error) {
    ui.formError.textContent = errorMessage(error);
  }
}

// Delegación de eventos: un solo listener en la lista atiende los botones "Eliminar" de todos los registros.
async function handleDeleteClick(event) {
  const button = event.target.closest("[data-id]");
  if (!button) return;
  button.disabled = true;
  try {
    await deleteWorkout(button.dataset.id);
    await loadProgress();
  } catch (error) {
    button.disabled = false;
    ui.status.textContent = errorMessage(error);
  }
}

export function initProgress() {
  ui.form.addEventListener("submit", handleSubmit);
  ui.list.addEventListener("click", handleDeleteClick);

  // El catálogo lo carga otra feature; aquí solo escuchamos el aviso para rellenar el <select>.
  on(EVENTS.CATALOG_LOADED, (exercises) => fillExerciseSelect(ui.exerciseSelect, exercises));
  on(EVENTS.SESSION_CHANGED, renderSession);
  renderSession(); // estado inicial
}
