/**
 * Feature del catálogo: carga los ejercicios, dibuja las progresiones y atiende los filtros.
 *
 *   catalog.api.js   pide los ejercicios al servidor
 *   catalog.view.js  dibuja las cadenas de progresión
 *   index.js         este archivo: filtros, estados de carga y aviso a las demás features
 */
import { errorMessage } from "../../core/api.js";
import { $ } from "../../core/dom.js";
import { EVENTS, emit } from "../../core/events.js";
import { fetchExercises } from "./catalog.api.js";
import { renderCatalog } from "./catalog.view.js";

const ui = {
  catalog: $("#catalog"),
  status: $("#catalog-status"),
  filters: $("#filters"),
};

/** Pide el catálogo con los filtros actuales del formulario y lo dibuja. */
async function loadCatalog() {
  const filters = Object.fromEntries(new FormData(ui.filters)); // {category, level, search}
  ui.status.textContent = "Cargando ejercicios…";
  try {
    const exercises = await fetchExercises(filters);
    renderCatalog(ui.catalog, exercises);
    ui.status.textContent = exercises.length ? "" : "No hay ejercicios con esos filtros.";
  } catch (error) {
    ui.catalog.replaceChildren();
    ui.status.textContent = errorMessage(error);
  }
}

/** Primera carga: el catálogo completo, sin filtros. Se comparte con el resto vía CATALOG_LOADED. */
async function loadFullCatalog() {
  try {
    const exercises = await fetchExercises();
    renderCatalog(ui.catalog, exercises);
    // "progress" lo usa para rellenar el <select> del formulario, sin importar nada de esta feature.
    emit(EVENTS.CATALOG_LOADED, exercises);
  } catch (error) {
    ui.status.textContent = errorMessage(error);
  }
}

export function initCatalog() {
  // Debounce: espera 300 ms después de la última tecla antes de consultar la API (evita una petición por letra).
  let searchTimer;
  ui.filters.addEventListener("input", (event) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(loadCatalog, event.target.name === "search" ? 300 : 0);
  });
  ui.filters.addEventListener("submit", (event) => event.preventDefault());

  loadFullCatalog();
}
