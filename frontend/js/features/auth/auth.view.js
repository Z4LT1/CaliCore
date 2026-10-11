/**
 * Vista de autenticación: la zona de sesión de la cabecera y el diálogo de ingreso/registro.
 * Solo cambia lo que se ve; no hace peticiones ni registra listeners (eso es trabajo de index.js).
 */
import { $ } from "../../core/dom.js";

// Los elementos se buscan al USARLOS (getters), no al cargar este archivo: la cabecera y el
// diálogo los crea ui/layout.js, y los módulos se cargan antes de que ese código se ejecute.
const ui = {
  get userLabel() { return $("#user-label"); },
  get btnOpenAuth() { return $("#btn-open-auth"); },
  get btnLogout() { return $("#btn-logout"); },
  get dialog() { return $("#auth-dialog"); },
  get title() { return $("#auth-title"); },
  get loginForm() { return $("#login-form"); },
  get registerForm() { return $("#register-form"); },
  get btnSwitch() { return $("#btn-switch-auth"); },
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
