/**
 * Feature de la biblioteca: todos los ejercicios en tarjetas, con búsqueda, filtros, orden,
 * favoritos y la ficha completa en un diálogo.
 *
 *   filters.js      filtrar y ordenar (funciones puras)
 *   detail.view.js  la ficha completa
 *   index.js        este archivo: controles, cuadrícula, favoritos y diálogo
 *
 * La ficha abierta se refleja en la dirección (biblioteca.html#muscle-up). Por eso:
 * - los enlaces desde otras páginas abren directo esa ficha,
 * - los botones atrás/adelante del navegador abren y cierran fichas,
 * - un enlace a "#otro-ejercicio" dentro de la ficha salta a esa otra ficha.
 */
import { errorMessage } from "../../core/api.js";
import { $, el, svg } from "../../core/dom.js";
import { EVENTS, on } from "../../core/events.js";
import { isLoggedIn } from "../../core/session.js";
import { fetchExercise, fetchExercises } from "../../services/catalog.js";
import { initFavorites, isFavorite, toggleFavorite } from "../../services/favorites.js";
import { DIFFICULTY_NAMES } from "../../ui/difficulty.js";
import { exerciseCard, setCardFavorite } from "../../ui/exercise-card.js";
import { renderDetail } from "./detail.view.js";
import { EMPTY_FILTERS, SORTS, applyFilters, applySort, hasFilters, uniqueValues } from "./filters.js";

const ui = {
  search: $("#lib-search"),
  branches: $("#lib-branches"),
  difficulty: $("#lib-difficulty"),
  muscle: $("#lib-muscle"),
  equipment: $("#lib-equipment"),
  sort: $("#lib-sort"),
  onlyFavorites: $("#lib-favorites"),
  clear: $("#lib-clear"),
  count: $("#lib-count"),
  status: $("#lib-status"),
  grid: $("#lib-grid"),
  empty: $("#lib-empty"),
  dialog: $("#exercise-dialog"),
  detail: $("#detail-body"),
};

let exercises = [];
let favorites = new Set();
let filters = { ...EMPTY_FILTERS };
let sort = "tree";

/* --------------------------------------------------------------------------
   Favoritos
   -------------------------------------------------------------------------- */
async function onToggleFavorite(slug) {
  ui.status.textContent = "";
  try {
    const saved = await toggleFavorite(slug);
    if (isLoggedIn()) {
      const name = exercises.find((exercise) => exercise.slug === slug)?.name;
      ui.status.textContent = saved ? `${name} se guardó en tu perfil.` : `${name} se quitó de tu perfil.`;
    }
  } catch (error) {
    ui.status.textContent = `No se pudo guardar el favorito. ${errorMessage(error)}`;
  }
}

/** Botón de estrella grande para la ficha completa. */
function detailFavoriteButton(exercise) {
  const button = el("button", {
    className: "btn fav-detail",
    attrs: { type: "button", "aria-pressed": String(isFavorite(exercise.slug)), "data-fav": exercise.slug },
  },
  svg("svg", { attrs: { viewBox: "0 0 24 24", "aria-hidden": "true" } },
    svg("path", { attrs: { d: "M12 3.5l2.6 5.3 5.9.9-4.25 4.1 1 5.85L12 16.9l-5.25 2.75 1-5.85L3.5 9.7l5.9-.9z" } })),
  el("span", { text: "Guardar" }));
  button.addEventListener("click", () => onToggleFavorite(exercise.slug));
  return button;
}

/** Cuando cambian los favoritos: actualizar estrellas sin redibujar todo (salvo con "solo favoritos"). */
function onFavoritesChanged(saved) {
  favorites = saved;
  if (filters.onlyFavorites) {
    render();
    return;
  }
  ui.grid.querySelectorAll(".ex-card").forEach((card) => setCardFavorite(card, favorites.has(card.dataset.slug)));
  ui.dialog.querySelectorAll("[data-fav]").forEach((button) => {
    const active = favorites.has(button.dataset.fav);
    button.setAttribute("aria-pressed", String(active));
    const label = button.querySelector("span");
    if (label) label.textContent = active ? "Guardado" : "Guardar";
  });
}

/* --------------------------------------------------------------------------
   Cuadrícula
   -------------------------------------------------------------------------- */
function render() {
  const list = applySort(applyFilters(exercises, filters, favorites), sort);
  ui.grid.replaceChildren(...list.map((exercise, i) => {
    const card = exerciseCard(exercise, {
      onOpen: (slug) => { location.hash = slug; },
      favorite: { active: favorites.has(exercise.slug), onToggle: onToggleFavorite },
    });
    card.style.setProperty("--i", Math.min(i, 12)); // retraso escalonado de la animación de entrada
    return card;
  }));
  ui.count.textContent = list.length === exercises.length
    ? `${exercises.length} ejercicios`
    : `${list.length} de ${exercises.length} ejercicios`;
  ui.empty.hidden = list.length > 0;
  ui.clear.hidden = !hasFilters(filters);
}

/* --------------------------------------------------------------------------
   Controles
   -------------------------------------------------------------------------- */
function chip(text, value, pressed) {
  return el("button", { className: "chip", text, attrs: { type: "button", "data-value": value, "aria-pressed": String(pressed) } });
}

/** Un grupo de chips de selección única (como botones de radio). */
function chipGroup(container, options, key) {
  container.replaceChildren(...options.map(([value, text]) => chip(text, value, filters[key] === value)));
  container.addEventListener("click", (event) => {
    const button = event.target.closest(".chip");
    if (!button) return;
    filters[key] = button.dataset.value;
    container.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", String(c === button)));
    render();
  });
}

function fillSelect(select, values, allLabel) {
  select.replaceChildren(el("option", { text: allLabel, attrs: { value: "" } }),
    ...values.map((value) => el("option", { text: value, attrs: { value } })));
}

function syncControls() {
  ui.search.value = filters.search;
  ui.muscle.value = filters.muscle;
  ui.equipment.value = filters.equipment;
  ui.onlyFavorites.checked = filters.onlyFavorites;
  ui.branches.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.value === filters.branch)));
  ui.difficulty.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.value === filters.difficulty)));
}

function initControls() {
  const branchNames = [...new Set(exercises.map((exercise) => exercise.branch))]; // en el orden del árbol
  chipGroup(ui.branches, [["", "Todas"], ...branchNames.map((name) => [name, name])], "branch");
  chipGroup(ui.difficulty, [["", "Todas"], ...[1, 2, 3, 4, 5].map((n) => [String(n), `${n} · ${DIFFICULTY_NAMES[n]}`])], "difficulty");
  fillSelect(ui.muscle, uniqueValues(exercises, "muscles"), "Todos los músculos");
  fillSelect(ui.equipment, uniqueValues(exercises, "equipment"), "Todo el equipamiento");
  ui.sort.replaceChildren(...Object.entries(SORTS).map(([value, [label]]) => el("option", { text: label, attrs: { value } })));

  ui.search.addEventListener("input", () => { filters.search = ui.search.value; render(); });
  ui.muscle.addEventListener("change", () => { filters.muscle = ui.muscle.value; render(); });
  ui.equipment.addEventListener("change", () => { filters.equipment = ui.equipment.value; render(); });
  ui.sort.addEventListener("change", () => { sort = ui.sort.value; render(); });
  ui.onlyFavorites.addEventListener("change", () => { filters.onlyFavorites = ui.onlyFavorites.checked; render(); });
  const clearAll = () => { filters = { ...EMPTY_FILTERS }; syncControls(); render(); };
  ui.clear.addEventListener("click", clearAll);
  $("#lib-empty-clear").addEventListener("click", clearAll);
}

/* --------------------------------------------------------------------------
   Ficha completa (diálogo)
   -------------------------------------------------------------------------- */
async function openFromHash() {
  const slug = decodeURIComponent(location.hash.slice(1));
  if (!slug || !exercises.some((exercise) => exercise.slug === slug)) {
    if (ui.dialog.open) ui.dialog.close();
    return;
  }
  ui.detail.replaceChildren(el("p", { className: "status", text: "Cargando ficha…" }));
  if (!ui.dialog.open) ui.dialog.showModal();
  try {
    const exercise = await fetchExercise(slug);
    ui.detail.replaceChildren(...renderDetail(exercise, { favoriteButton: detailFavoriteButton(exercise) }));
    onFavoritesChanged(favorites); // deja la estrella de la ficha con su texto correcto
    ui.dialog.scrollTop = 0;
  } catch (error) {
    ui.detail.replaceChildren(el("p", { className: "load-error", text: `No se pudo cargar la ficha. ${errorMessage(error)}` }));
  }
}

/** Quita el "#slug" de la dirección sin agregar otra entrada al historial. */
function clearHash() {
  if (location.hash) history.replaceState(null, "", location.pathname + location.search);
}

function closeDetail() {
  ui.dialog.close();
  clearHash();
}

function initDialog() {
  $("#detail-close").addEventListener("click", closeDetail);
  // Clic en el fondo oscuro (fuera del contenido) = cerrar
  ui.dialog.addEventListener("click", (event) => { if (event.target === ui.dialog) closeDetail(); });
  // La tecla Esc cierra el diálogo por su cuenta: el evento "close" limpia la dirección también en ese caso
  ui.dialog.addEventListener("close", clearHash);
  window.addEventListener("hashchange", openFromHash);
}

/* --------------------------------------------------------------------------
   Arranque
   -------------------------------------------------------------------------- */
function renderSession() {
  const loggedIn = isLoggedIn();
  document.querySelectorAll("[data-user-only]").forEach((node) => { node.hidden = !loggedIn; });
  if (!loggedIn && filters.onlyFavorites) {
    filters.onlyFavorites = false;
    syncControls();
    render();
  }
}

export async function initLibrary() {
  ui.count.textContent = "Cargando ejercicios…";
  try {
    exercises = await fetchExercises();
  } catch (error) {
    ui.count.textContent = "";
    ui.grid.replaceChildren(el("p", { className: "load-error", text: `No pudimos cargar la biblioteca. ${errorMessage(error)}` }));
    return;
  }
  initControls();
  initDialog();
  on(EVENTS.FAVORITES_CHANGED, onFavoritesChanged);
  on(EVENTS.SESSION_CHANGED, renderSession);
  renderSession();
  render();
  await initFavorites();
  openFromHash(); // si se llegó con biblioteca.html#slug, abrir esa ficha
}
