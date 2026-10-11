/**
 * Configuración del frontend.
 *
 * API_URL es la dirección base del backend. En desarrollo es Django corriendo en tu computador.
 * Cuando despliegues el backend, cambia solo esta línea por su URL pública (con https://).
 */
export const API_URL = "http://127.0.0.1:8000/api";

// Claves con las que se guarda la sesión en el navegador (localStorage).
export const TOKEN_KEY = "calicore_token";
export const USERNAME_KEY = "calicore_username";
