/**
 * Feature de la página principal: conecta cada sección viva con los datos del catálogo.
 *
 *   stats.js         cifras del catálogo
 *   quiz.js          "¿Por dónde empiezo?"
 *   path-preview.js  la escalera de un camino del árbol
 *   body-map.js      índice "¿Qué quieres fortalecer?" por zona del cuerpo
 *   hero.js          la lámina del héroe (roble grabado, animado con GSAP)
 * Las tarjetas que giran vienen de ui/exercise-card.js (las reutilizará la biblioteca).
 *
 * El árbol y la lista de ejercicios se piden UNA vez, en paralelo, y se reparten a cada sección.
 */
import { errorMessage } from "../../core/api.js";
import { $, el } from "../../core/dom.js";
import { EVENTS, on } from "../../core/events.js";
import { isLoggedIn } from "../../core/session.js";
import { exerciseCard } from "../../ui/exercise-card.js";
import { fetchExercises, fetchTree } from "../../services/catalog.js";
import { initBodyMap } from "./body-map.js";
import { fillBranchCounts, initHeroPlate } from "./hero.js";
import { initPathPreview } from "./path-preview.js";
import { initQuiz } from "./quiz.js";
import { renderStats } from "./stats.js";

// Tarjetas destacadas: una habilidad llamativa de cada rama
const FEATURED = ["muscle-up", "pistol-squat", "full-front-lever", "pino-libre", "dragon-flag", "flexion-una-mano"];

/** Muestra u oculta lo marcado como solo-invitado o solo-usuario según haya sesión. */
function renderSession() {
  const loggedIn = isLoggedIn();
  document.querySelectorAll("[data-guest-only]").forEach((node) => { node.hidden = loggedIn; });
  document.querySelectorAll("[data-user-only]").forEach((node) => { node.hidden = !loggedIn; });
}

/** Si el backend no responde, cada sección viva muestra el mismo aviso en vez de quedar vacía. */
function showError(error) {
  const message = `No pudimos cargar el catálogo. ${errorMessage(error)}`;
  for (const id of ["#path-ladder", "#card-grid", "#zone-result", "#quiz-result"]) {
    $(id).replaceChildren(el("p", { className: "load-error", text: message }));
  }
}

export async function initHome() {
  initHeroPlate($("#hero-plate")); // no depende del catálogo: la lámina entra de inmediato
  renderSession();
  on(EVENTS.SESSION_CHANGED, renderSession);

  let tree;
  let exercises;
  try {
    [tree, exercises] = await Promise.all([fetchTree(), fetchExercises()]);
  } catch (error) {
    showError(error);
    return;
  }
  const bySlug = Object.fromEntries(exercises.map((exercise) => [exercise.slug, exercise]));

  renderStats(tree);
  fillBranchCounts($("#hero-plate"), tree);
  initQuiz($("#quiz-form"), $("#quiz-result"), bySlug);
  initPathPreview($("#path-select"), $("#path-ladder"), tree);
  $("#card-grid").replaceChildren(...FEATURED.filter((slug) => bySlug[slug]).map((slug) => exerciseCard(bySlug[slug])));
  initBodyMap({ list: $("#zone-list"), result: $("#zone-result") }, exercises);
}
