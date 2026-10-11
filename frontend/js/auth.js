/**
 * Funciones de autenticación: registrarse, iniciar sesión y cerrar sesión.
 * Hablan con la API (api.js) y guardan/limpian la sesión (session.js).
 */
import { request } from "./api.js";
import { clearSession, setSession } from "./session.js";

export async function login(username, password) {
  const data = await request("/auth/login/", { method: "POST", body: { username, password }, auth: false });
  setSession(data.token, data.username);
}

export async function register(username, email, password) {
  const body = { username, password };
  if (email) body.email = email; // el correo es opcional: solo se envía si se escribió
  const data = await request("/auth/register/", { method: "POST", body, auth: false });
  setSession(data.token, data.username);
}

export async function logout() {
  try {
    await request("/auth/logout/", { method: "POST" }); // invalida el token en el servidor
  } catch {
    /* si falla (servidor apagado, token ya vencido), igual limpiamos la sesión local */
  } finally {
    clearSession();
  }
}
