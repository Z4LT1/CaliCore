/**
 * Vista de autenticación: la zona de sesión de la cabecera y el diálogo de ingreso/registro.
 * Solo cambia lo que se ve; no hace peticiones ni registra listeners (eso es trabajo de index.js).
 */
import { $ } from "../../core/dom.js";

const ui = {
  userLabel: $("#user-label"),
  btnOpenAuth: $("#btn-open-auth"),
  btnLogout: $("#btn-logout"),
  dialog: $("#auth-dialog"),
  title: $("#auth-title"),
  loginForm: $("#login-form"),
  registerForm: $("#register-form"),
  btnSwitch: $("#btn-switch-auth"),
};

export { ui as authUI };

/** Cabecera: muestra el usuario y "Salir" con sesión, o "Ingresar" sin ella. */
export function renderHeaderSession(username) {
  const loggedIn = Boolean(username);
  ui.userLabel.hidden = !loggedIn;
  ui.userLabel.textContent = loggedIn ? username : "";
  ui.btnLogout.hidden = !loggedIn;
  ui.btnOpenAuth.hidden = loggedIn;
}

/** Alterna el diálogo entre "login" y "register" y limpia los errores anteriores. */
export function setAuthMode(mode) {
  const isLogin = mode === "login";
  ui.loginForm.hidden = !isLogin;
  ui.registerForm.hidden = isLogin;
  ui.title.textContent = isLogin ? "Ingresar" : "Crear cuenta";
  ui.btnSwitch.textContent = isLogin ? "¿No tienes cuenta? Crear una" : "¿Ya tienes cuenta? Ingresar";
  ui.dialog.querySelectorAll(".form-error").forEach((node) => (node.textContent = ""));
}

/** Modo en que está el diálogo ahora mismo. */
export function currentAuthMode() {
  return ui.loginForm.hidden ? "register" : "login";
}

export function openAuthDialog(mode = "login") {
  setAuthMode(mode);
  ui.dialog.showModal(); // abre el <dialog> como modal (bloquea el resto de la página)
}

export function closeAuthDialog() {
  ui.dialog.close();
}
