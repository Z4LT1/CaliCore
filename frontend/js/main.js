/**
 * Punto de entrada del frontend: conecta el HTML con los demás módulos.
 *
 * Flujo general:
 *   1. Al cargar: pide el catálogo y lo dibuja.
 *   2. Si hay sesión guardada: pide el resumen y el historial del usuario.
 *   3. Escucha formularios y clics (filtros, login, registro, nuevo registro, borrar, salir).
 *   4. Cuando la sesión cambia (evento "session:changed"), actualiza qué se muestra.
 */
import { login, logout, register } from "./auth.js";
import { ApiError } from "./api.js";
import { fetchExercises, renderCatalog } from "./exercises.js";
import { getUsername, getToken } from "./session.js";
import {
  createWorkout, deleteWorkout, fetchSummary, fetchWorkouts,
  fillExerciseSelect, renderSummary, renderWorkouts,
} from "./workouts.js";

// --- Referencias a elementos del HTML ---------------------------------------
const $ = (selector) => document.querySelector(selector);

const catalog = $("#catalog");
const catalogStatus = $("#catalog-status");
const filtersForm = $("#filters");

const userLabel = $("#user-label");
const btnOpenAuth = $("#btn-open-auth");
const btnLogout = $("#btn-logout");

const progressLocked = $("#progress-locked");
const progressPanel = $("#progress-panel");
const workoutForm = $("#workout-form");
const workoutError = $("#workout-error");
const workoutStatus = $("#workout-status");
const workoutList = $("#workout-list");
const workoutExercise = $("#workout-exercise");
const workoutDate = $("#workout-date");

const authDialog = $("#auth-dialog");
const authTitle = $("#auth-title");
const loginForm = $("#login-form");
const registerForm = $("#register-form");
const btnSwitchAuth = $("#btn-switch-auth");

let allExercises = []; // catálogo completo, para rellenar el <select> del formulario de registro

/** Fecha de hoy en formato AAAA-MM-DD, usando la zona horaria local (el formato sueco "sv-SE" lo entrega así). */
const today = () => new Date().toLocaleDateString("sv-SE");

/** Muestra un error de forma amigable dentro de un elemento. */
function showError(target, error) {
  target.textContent = error instanceof ApiError ? error.message : "Ocurrió un error inesperado.";
}

// --- Catálogo ---------------------------------------------------------------
async function loadCatalog() {
  const filters = Object.fromEntries(new FormData(filtersForm)); // {category, level, search}
  catalogStatus.textContent = "Cargando ejercicios…";
  try {
    const exercises = await fetchExercises(filters);
    renderCatalog(catalog, exercises);
    catalogStatus.textContent = exercises.length ? "" : "No hay ejercicios con esos filtros.";
  } catch (error) {
    catalog.replaceChildren();
    showError(catalogStatus, error);
  }
}

// Debounce: espera 300 ms después de la última tecla antes de consultar la API (evita una petición por letra).
let searchTimer;
filtersForm.addEventListener("input", (event) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadCatalog, event.target.name === "search" ? 300 : 0);
});
filtersForm.addEventListener("submit", (event) => event.preventDefault());

// --- Sesión y panel "Mi progreso" ---------------------------------------------
async function loadProgress() {
  workoutStatus.textContent = "Cargando historial…";
  try {
    const [summary, logs] = await Promise.all([fetchSummary(), fetchWorkouts()]); // dos peticiones en paralelo
    renderSummary(summary);
    renderWorkouts(workoutList, logs);
    workoutStatus.textContent = logs.length ? "" : "Todavía no registras entrenamientos. Guarda el primero.";
  } catch (error) {
    showError(workoutStatus, error);
  }
}

/** Muestra u oculta elementos según haya sesión o no. */
function renderSession() {
  const loggedIn = Boolean(getToken());
  userLabel.hidden = !loggedIn;
  userLabel.textContent = loggedIn ? getUsername() : "";
  btnLogout.hidden = !loggedIn;
  btnOpenAuth.hidden = loggedIn;
  progressLocked.hidden = loggedIn;
  progressPanel.hidden = !loggedIn;

  if (loggedIn) {
    workoutDate.value = today();
    loadProgress();
  } else {
    workoutList.replaceChildren();
  }
}
window.addEventListener("session:changed", renderSession);

// --- Diálogo de login / registro ----------------------------------------------
function setAuthMode(mode) {
  const isLogin = mode === "login";
  loginForm.hidden = !isLogin;
  registerForm.hidden = isLogin;
  authTitle.textContent = isLogin ? "Ingresar" : "Crear cuenta";
  btnSwitchAuth.textContent = isLogin ? "¿No tienes cuenta? Crear una" : "¿Ya tienes cuenta? Ingresar";
  authDialog.querySelectorAll(".form-error").forEach((node) => (node.textContent = ""));
}

function openAuth(mode = "login") {
  setAuthMode(mode);
  authDialog.showModal(); // abre el <dialog> como modal (bloquea el resto de la página)
}

btnOpenAuth.addEventListener("click", () => openAuth("login"));
document.querySelectorAll("[data-open-auth]").forEach((button) => button.addEventListener("click", () => openAuth("register")));
$("#btn-close-auth").addEventListener("click", () => authDialog.close());
btnSwitchAuth.addEventListener("click", () => setAuthMode(loginForm.hidden ? "login" : "register"));
// Clic en el fondo oscuro (::backdrop) = clic sobre el propio <dialog>, fuera de su contenido.
authDialog.addEventListener("click", (event) => {
  if (event.target === authDialog) authDialog.close();
});

/** Envuelve el envío de un formulario de autenticación: deshabilita el botón, muestra errores y cierra al terminar. */
function handleAuthSubmit(form, action) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault(); // evita que el navegador recargue la página
    const errorBox = form.querySelector(".form-error");
    const submit = form.querySelector("[type=submit]");
    errorBox.textContent = "";
    submit.disabled = true;
    try {
      await action(new FormData(form));
      form.reset();
      authDialog.close();
    } catch (error) {
      showError(errorBox, error);
    } finally {
      submit.disabled = false;
    }
  });
}

handleAuthSubmit(loginForm, (data) => login(data.get("username"), data.get("password")));
handleAuthSubmit(registerForm, (data) => register(data.get("username"), data.get("email"), data.get("password")));

btnLogout.addEventListener("click", logout);

// --- Formulario de nuevo registro ----------------------------------------------
workoutForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  workoutError.textContent = "";
  const data = new FormData(workoutForm);

  const payload = {
    exercise: Number(data.get("exercise")),
    performed_on: data.get("performed_on"),
    sets: Number(data.get("sets")),
    notes: data.get("notes").trim(),
  };
  // reps y seconds son opcionales: solo se envían si el usuario escribió algo.
  if (data.get("reps")) payload.reps = Number(data.get("reps"));
  if (data.get("seconds")) payload.seconds = Number(data.get("seconds"));

  try {
    await createWorkout(payload);
    workoutForm.reset();
    workoutDate.value = today();
    await loadProgress(); // refresca estadísticas e historial
  } catch (error) {
    showError(workoutError, error);
  }
});

// Delegación de eventos: un solo listener en la lista atiende los botones "Eliminar" de todos los registros.
workoutList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-id]");
  if (!button) return;
  button.disabled = true;
  try {
    await deleteWorkout(button.dataset.id);
    await loadProgress();
  } catch (error) {
    button.disabled = false;
    showError(workoutStatus, error);
  }
});

// --- Arranque -------------------------------------------------------------------
async function init() {
  try {
    allExercises = await fetchExercises(); // catálogo completo, sin filtros
    renderCatalog(catalog, allExercises);
    fillExerciseSelect(workoutExercise, allExercises);
  } catch (error) {
    showError(catalogStatus, error);
  }
  renderSession();
}
init();
