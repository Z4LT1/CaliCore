/**
 * Filtros y orden de la biblioteca: funciones puras (reciben datos y devuelven datos, sin DOM).
 *
 * Se filtra en el navegador y no en el servidor: el catálogo completo (79 ejercicios) llega en
 * una sola petición, y así cada tecla o clic actualiza la lista al instante, sin esperar la red.
 */

/** "Flexión" -> "flexion": minúsculas y sin tildes, para que buscar "flexion" encuentre "Flexión". */
export function normalize(text) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export const EMPTY_FILTERS = { search: "", branch: "", difficulty: "", muscle: "", equipment: "", onlyFavorites: false };

/** ¿Hay algún filtro activo? (sirve para mostrar el botón "Limpiar filtros"). */
export function hasFilters(filters) {
  return Object.entries(filters).some(([key, value]) => value !== EMPTY_FILTERS[key]);
}

export function applyFilters(exercises, filters, favorites = new Set()) {
  const query = normalize(filters.search.trim());
  return exercises.filter((exercise) =>
    (!filters.branch || exercise.branch === filters.branch)
    && (!filters.difficulty || exercise.difficulty === Number(filters.difficulty))
    && (!filters.muscle || exercise.muscles.includes(filters.muscle))
    && (!filters.equipment || exercise.equipment.includes(filters.equipment))
    && (!filters.onlyFavorites || favorites.has(exercise.slug))
    // La búsqueda mira el nombre, el resumen, el camino y los músculos
    && (!query || normalize([exercise.name, exercise.summary, exercise.path, ...exercise.muscles].join(" ")).includes(query)));
}

export const SORTS = {
  tree: ["Orden del árbol", null], // el orden en que llegan de la API: rama, camino y paso
  easy: ["Más fácil primero", (a, b) => a.difficulty - b.difficulty || a.name.localeCompare(b.name, "es")],
  hard: ["Más difícil primero", (a, b) => b.difficulty - a.difficulty || a.name.localeCompare(b.name, "es")],
  name: ["Nombre (A-Z)", (a, b) => a.name.localeCompare(b.name, "es")],
};

export function applySort(exercises, sort) {
  const compare = SORTS[sort]?.[1];
  return compare ? [...exercises].sort(compare) : exercises;
}

/** Valores únicos de un campo de lista (músculos, equipamiento), ordenados alfabéticamente. */
export function uniqueValues(exercises, field) {
  return [...new Set(exercises.flatMap((exercise) => exercise[field]))].sort((a, b) => a.localeCompare(b, "es"));
}
