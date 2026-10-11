/**
 * Feature de autenticación: conecta los botones y formularios de acceso con la API.
 *
 *   auth.api.js   habla con el servidor (login, registro, logout)
 *   auth.view.js  cambia lo que se ve (cabecera, diálogo)
 *   index.js      este archivo: escucha eventos y une las dos capas
 */
import { errorMessage } from "../../core/api.js";
import { EVENTS, on } from "../../core/events.js";
import { getUsername, isLoggedIn } from "../../core/session.js";
import { login, logout, register } from "./auth.api.js";
import {
  authUI as ui, closeAuthDialog, currentAuthMode, openAuthDialog, renderHeaderSession, setAuthMode,
} from "./auth.view.js";

/** Envuelve el envío de un formulario de acceso: deshabilita el botón, muestra errores y cierra al terminar. */
function handleAuthSubmit(form, action) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault(); // evita que el navegador recargue la página
    const errorBox = form.querySelector(".form-error");
    const submit = form.querySelector("[type=submit]");
    errorBox.textContent = "";
    submit.disabled = true;
    try {
      await action(new FormData(form));
      form.reset();
      closeAuthDialog();
    } catch (error) {
      errorBox.textContent = errorMessage(error);
    } finally {
      submit.disabled = false;
    }
  });
}

function renderSession() {
  renderHeaderSession(isLoggedIn() ? getUsername() : null);
}

export function initAuth() {
  ui.btnOpenAuth.addEventListener("click", () => openAuthDialog("login"));
  // Cualquier botón con data-open-auth (por ejemplo, el de "Mi progreso") abre el diálogo en modo registro.
  document.querySelectorAll("[data-open-auth]").forEach((button) =>
    button.addEventListener("click", () => openAuthDialog("register")),
  );
  document.querySelector("#btn-close-auth").addEventListener("click", closeAuthDialog);
  ui.btnSwitch.addEventListener("click", () => setAuthMode(currentAuthMode() === "login" ? "register" : "login"));
  // Clic en el fondo oscuro (::backdrop) = clic sobre el propio <dialog>, fuera de su contenido.
  ui.dialog.addEventListener("click", (event) => {
    if (event.target === ui.dialog) closeAuthDialog();
  });

  handleAuthSubmit(ui.loginForm, (data) => login(data.get("username"), data.get("password")));
  handleAuthSubmit(ui.registerForm, (data) => register(data.get("username"), data.get("email"), data.get("password")));
  ui.btnLogout.addEventListener("click", logout);

  on(EVENTS.SESSION_CHANGED, renderSession);
  // Otra feature pide sesión (por ejemplo, al tocar la estrella sin haber ingresado)
  on(EVENTS.AUTH_REQUIRED, () => openAuthDialog("login"));
  renderSession(); // estado inicial (puede haber una sesión guardada de antes)
}
