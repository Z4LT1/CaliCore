/**
 * Servicio de favoritos: mantiene en memoria qué ejercicios guardó el usuario y avisa a la
 * página (EVENTS.FAVORITES_CHANGED) cada vez que la lista cambia.
 *
 * Actualización "optimista": al tocar la estrella, se marca al instante y la petición viaja
 * después. Si el servidor falla, se deshace el cambio. Así la interfaz se siente inmediata.
 */
import { EVENTS, emit, on } from "../core/events.js";
import { isLoggedIn } from "../core/session.js";
import { addFavorite, fetchFavorites, removeFavorite } from "./favorites.api.js";

let saved = new Set(); // slugs de los ejercicios guardados

const notify = () => emit(EVENTS.FAVORITES_CHANGED, new Set(saved));

export const isFavorite = (slug) => saved.has(slug);

/** Carga los favoritos del servidor (o los vacía si no hay sesión). */
export async function loadFavorites() {
  if (!isLoggedIn()) {
    saved = new Set();
    notify();
    return;
  }
  try {
    const exercises = await fetchFavorites();
    saved = new Set(exercises.map((exercise) => exercise.slug));
  } catch {
    saved = new Set(); // si falla (por ejemplo, token vencido), se muestran sin marcar
  }
  notify();
}

/**
 * Guarda o quita un ejercicio. Sin sesión, pide ingresar en vez de fallar.
 * Devuelve true si quedó guardado, false si quedó quitado.
 */
export async function toggleFavorite(slug) {
  if (!isLoggedIn()) {
    emit(EVENTS.AUTH_REQUIRED);
    return isFavorite(slug);
  }
  const willSave = !saved.has(slug);
  willSave ? saved.add(slug) : saved.delete(slug);
  notify();
  try {
    await (willSave ? addFavorite(slug) : removeFavorite(slug));
  } catch (error) {
    willSave ? saved.delete(slug) : saved.add(slug); // deshacer el cambio optimista
    notify();
    throw error;
  }
  return willSave;
}

/** Arranque: carga ahora y vuelve a cargar cada vez que alguien entra o sale. */
export function initFavorites() {
  on(EVENTS.SESSION_CHANGED, loadFavorites);
  return loadFavorites();
}
