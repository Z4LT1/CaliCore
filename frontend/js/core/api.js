/**
 * Cliente de la API: una única función, request(), por la que pasan TODAS las llamadas al backend.
 *
 * Centralizarlo evita repetir en cada archivo: la URL base, las cabeceras, el token, la conversión
 * a JSON y el manejo de errores.
 */
import { API_URL } from "./config.js";
import { clearSession, getToken } from "./session.js";

export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = "ApiError";
    this.status = status; // código HTTP (0 = no hubo respuesta del servidor)
    this.data = data;
  }
}

/**
 * Convierte el JSON de error de Django REST Framework en un texto legible.
 * DRF responde cosas como {"password": ["Esta contraseña es muy común."]} o {"detail": "..."}.
 */
function extractMessage(data) {
  if (!data) return "Ocurrió un error inesperado.";
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  const messages = [];
  for (const value of Object.values(data)) {
    messages.push(...(Array.isArray(value) ? value : [value]));
  }
  return messages.join(" ") || "Ocurrió un error inesperado.";
}

/**
 * @param {string} path           ruta de la API, por ejemplo "/exercises/"
 * @param {object} options
 * @param {string} options.method  GET (por defecto), POST, PATCH, DELETE
 * @param {object} options.body    objeto que se enviará como JSON
 * @param {boolean} options.auth   si es false, no se envía el token (endpoints públicos)
 */
export async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const token = getToken();
  if (auth && token) headers.Authorization = `Token ${token}`;

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    // fetch solo falla (rechaza la promesa) si no hubo respuesta: servidor apagado, sin red o CORS bloqueado.
    throw new ApiError("No se pudo conectar con el servidor. ¿Está corriendo el backend?", 0);
  }

  if (response.status === 204) return null; // "sin contenido" (por ejemplo, tras borrar)

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    // 401 con token guardado = el token ya no es válido: cerramos la sesión local.
    if (response.status === 401 && token) clearSession();
    throw new ApiError(extractMessage(data), response.status, data);
  }
  return data;
}

/** Texto amigable para mostrar cualquier error: el mensaje de la API o uno genérico si fue otra cosa. */
export function errorMessage(error) {
  return error instanceof ApiError ? error.message : "Ocurrió un error inesperado.";
}
