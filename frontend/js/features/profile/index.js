/**
 * Feature del perfil: la cuenta del usuario y todo lo que guardó en la biblioteca.
 *
 *   stats.js         cálculos (cifras, cobertura por rama, metas)
 *   profile.view.js  vistas
 *   index.js         este archivo: carga los datos y reacciona a la sesión y a los favoritos
 *
 * Sin sesión se muestra una invitación a ingresar. Con sesión se piden en paralelo la cuenta,
 * los favoritos (completos, del más reciente al más antiguo) y el árbol.
 */
import { errorMessage } from "../../core/api.js";
import { $, el } from "../../core/dom.js";
import { EVENTS, on } from "../../core/events.js";
import { isLoggedIn } from "../../core/session.js";
import { fetchMe } from "../../services/account.js";
import { fetchTree } from "../../services/catalog.js";
import { fetchFavorites } from "../../services/favorites.api.js";
import { initFavorites, toggleFavorite } from "../../services/favorites.js";
import { exerciseCard } from "../../ui/exercise-card.js";
import { branchCoverage, goals, indexTree, profileStats } from "./stats.js";
import { renderCoverage, renderGoals, renderIdentity, renderStats } from "./profile.view.js";

const ui = {
  guest: $("#profile-guest"),
  user: $("#profile-user"),
  identity: $("#profile-identity"),
  stats: $("#profile-stats"),
  coverage: $("#profile-coverage"),
  goals: $("#profile-goals"),
  grid: $("#fav-grid"),
  branches: $("#fav-branches"),
  sort: $("#fav-sort"),
  empty: $("#fav-empty"),
  status: $("#profile-status"),
};

let state = { me: null, tree: [], treeIndex: {}, favorites: [] };
let branchFilter = "";

/* --------------------------------------------------------------------------
   Dibujo
   -------------------------------------------------------------------------- */
function renderFavorites() {
  const sorters = {
    recent: null, // el orden de la API: lo más reciente primero
    hard: (a, b) => b.difficulty - a.difficulty,
    easy: (a, b) => a.difficulty - b.difficulty,
  };
  let list = state.favorites.filter((exercise) => !branchFilter || exercise.branch === branchFilter);
  if (sorters[ui.sort.value]) list = [...list].sort(sorters[ui.sort.value]);

  ui.grid.replaceChildren(...list.map((exercise) => exerciseCard(exercise, {
    onOpen: (slug) => { location.href = `biblioteca.html#${slug}`; },
    favorite: { active: true, onToggle: onRemove },
  })));
  ui.empty.hidden = state.favorites.length > 0;
}

function renderBranchChips() {
  const names = [...new Set(state.favorites.map((exercise) => exercise.branch))];
  if (branchFilter && !names.includes(branchFilter)) branchFilter = "";
  const chip = (value, text) => el("button", {
    className: "chip", text, attrs: { type: "button", "data-value": value, "aria-pressed": String(branchFilter === value) },
  });
  ui.branches.replaceChildren(chip("", "Todas"), ...names.map((name) => chip(name, name)));
  ui.branches.hidden = names.length < 2; // con una sola rama, el filtro no aporta
}

function renderAll() {
  const saved = new Set(state.favorites.map((exercise) => exercise.slug));
  ui.identity.replaceChildren(...renderIdentity(state.me));
  ui.stats.replaceChildren(...renderStats(profileStats(state.favorites, state.treeIndex)));
  ui.coverage.replaceChildren(...renderCoverage(branchCoverage(state.tree, saved)));
  const goalList = goals(state.favorites, state.treeIndex);
  ui.goals.replaceChildren(...(goalList.length
    ? renderGoals(goalList, saved)
    : [el("p", { className: "muted", text: "Guarda ejercicios difíciles en la biblioteca y aquí verás el camino para llegar a ellos." })]));
  renderBranchChips();
  renderFavorites();
}

/* --------------------------------------------------------------------------
   Acciones
   -------------------------------------------------------------------------- */
async function onRemove(slug) {
  ui.status.textContent = "";
  try {
    await toggleFavorite(slug); // en el perfil, la estrella siempre está marcada: tocarla la quita
  } catch (error) {
    ui.status.textContent = `No se pudo quitar el favorito. ${errorMessage(error)}`;
  }
}

/** Cuando cambian los favoritos (aquí o en otra pestaña de la misma sesión), quitar los que ya no están. */
function onFavoritesChanged(savedSlugs) {
  if (!state.me) return;
  const before = state.favorites.length;
  state.favorites = state.favorites.filter((exercise) => savedSlugs.has(exercise.slug));
  if (state.favorites.length !== before) renderAll();
}

/* --------------------------------------------------------------------------
   Carga según la sesión
   -------------------------------------------------------------------------- */
async function load() {
  const loggedIn = isLoggedIn();
  ui.guest.hidden = loggedIn;
  ui.user.hidden = !loggedIn;
  if (!loggedIn) {
    state = { ...state, me: null, favorites: [] };
    return;
  }
  ui.identity.replaceChildren(el("p", { className: "status", text: "Cargando tu perfil…" }));
  try {
    const [me, favorites, tree] = await Promise.all([fetchMe(), fetchFavorites(), fetchTree()]);
    state = { me, favorites, tree, treeIndex: indexTree(tree) };
    renderAll();
  } catch (error) {
    ui.identity.replaceChildren(el("p", { className: "load-error", text: `No pudimos cargar tu perfil. ${errorMessage(error)}` }));
  }
}

export function initProfile() {
  ui.branches.addEventListener("click", (event) => {
    const button = event.target.closest(".chip");
    if (!button) return;
    branchFilter = button.dataset.value;
    ui.branches.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", String(c === button)));
    renderFavorites();
  });
  ui.sort.addEventListener("change", renderFavorites);

  on(EVENTS.SESSION_CHANGED, load);
  on(EVENTS.FAVORITES_CHANGED, onFavoritesChanged);
  initFavorites(); // mantiene el estado de las estrellas sincronizado con el servidor
  load();
}
