/**
 * Manejo de la sesión en el navegador.
 *
 * Guarda el token y el nombre de usuario en localStorage para que la sesión sobreviva a recargar la página.
 * Cada vez que la sesión cambia se emite el evento "session:changed", y main.js actualiza la interfaz.
 *
 * Nota de seguridad: localStorage es legible por cualquier script de la página. Si hubiera una
 * vulnerabilidad XSS, un atacante podría robar el token. Por eso en todo el frontend se usa textContent
 * (nunca innerHTML) para mostrar datos. La alternativa más robusta son cookies HttpOnly (ver README).
 */
import { TOKEN_KEY, USERNAME_KEY } from "./config.js";

// localStorage puede lanzar errores (modo privado, almacenamiento bloqueado): por eso va dentro de try/catch.
function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function getToken() {
  return safeGet(TOKEN_KEY);
}

export function getUsername() {
  return safeGet(USERNAME_KEY);
}

export function setSession(token, username) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USERNAME_KEY, username);
  } catch {
    /* sin almacenamiento disponible: la sesión durará solo hasta recargar */
  }
  window.dispatchEvent(new Event("session:changed"));
}

export function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USERNAME_KEY);
  } catch {
    /* nada que limpiar */
  }
  window.dispatchEvent(new Event("session:changed"));
}
