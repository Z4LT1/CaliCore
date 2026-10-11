/**
 * Bus de eventos de la aplicación.
 *
 * Las features (auth, favorites, home, library...) NO se importan entre sí: se comunican emitiendo y escuchando
 * eventos. Así cada una se puede cambiar, o incluso borrar, sin romper a las demás (bajo acoplamiento).
 *
 * Los nombres viven aquí, en un solo lugar: el editor los autocompleta, buscarlos muestra quién emite
 * y quién escucha cada evento, y renombrar uno es cambiar una sola línea.
 */
export const EVENTS = Object.freeze({
  // La sesión empezó o terminó (login, registro, logout o token vencido). Sin datos.
  SESSION_CHANGED: "session:changed",
  // Alguien intentó usar algo que exige sesión (por ejemplo, la estrella). features/auth abre el diálogo.
  AUTH_REQUIRED: "auth:required",
  // Cambió la lista de favoritos del usuario. detail = Set con los slugs guardados.
  FAVORITES_CHANGED: "favorites:changed",
});

/** Emite un evento global. `detail` es el dato que acompaña al evento (opcional). */
export function emit(name, detail) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

/** Escucha un evento global. El callback recibe directamente el `detail`. */
export function on(name, callback) {
  window.addEventListener(name, (event) => callback(event.detail));
}
