/**
 * Estructura común de todas las páginas: enlace "saltar al contenido", cabecera, diálogo de
 * acceso y pie.
 *
 * Por qué con JavaScript: así la cabecera y el pie se escriben UNA sola vez. Si mañana se agrega
 * una sección, se cambia este archivo y todas las páginas quedan al día.
 * Cada página solo necesita su <main id="contenido"> y un atributo data-page en el <body>
 * que diga cuál es (sirve para marcar el enlace activo del menú).
 */
import { el, svg } from "../core/dom.js";

/** Secciones del menú, en el orden del bosquejo. Para agregar una página, se suma aquí. */
const PAGES = [
  { id: "perfil", href: "perfil.html", label: "Tu perfil" },
  { id: "historia", href: "historia.html", label: "Historia" },
  { id: "arbol", href: "arbol.html", label: "Árbol" },
  { id: "biblioteca", href: "biblioteca.html", label: "Biblioteca" },
];

function header(currentPage) {
  const links = PAGES.map(({ id, href, label }) => {
    // aria-current="page" marca la página actual para lectores de pantalla (y para el CSS)
    const attrs = id === currentPage ? { href, "aria-current": "page" } : { href };
    return el("li", {}, el("a", { text: label, attrs }));
  });

  return el("header", { className: "site-header" },
    el("a", { className: "brand", attrs: { href: "index.html", "aria-label": "CaliCore, inicio" } },
      "Cali", el("span", { text: "Core" })),
    el("nav", { attrs: { "aria-label": "Navegación principal" } }, el("ul", {}, ...links)),
    // Zona de sesión: features/auth muestra u oculta estos elementos con el atributo "hidden".
    el("div", { className: "session" },
      themeButton(),
      el("span", { className: "user-label", attrs: { id: "user-label", hidden: "" } }),
      el("button", { className: "btn", text: "Ingresar", attrs: { id: "btn-open-auth", type: "button" } }),
      el("button", { className: "btn btn-ghost", text: "Salir", attrs: { id: "btn-logout", type: "button", hidden: "" } }),
    ),
  );
}

/** Botón de tema con dos íconos (luna y sol); el CSS muestra el que corresponde. */
function themeButton() {
  const icon = (className, ...shapes) => svg("svg", {
    className, attrs: { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2",
      "stroke-linecap": "round", "aria-hidden": "true" },
  }, ...shapes);
  return el("button", { className: "btn btn-ghost btn-icon theme-toggle", attrs: { id: "theme-toggle", type: "button" } },
    icon("icon-moon", svg("path", { attrs: { d: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" } })),
    icon("icon-sun", svg("circle", { attrs: { cx: "12", cy: "12", r: "4" } }),
      svg("path", { attrs: { d: "M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" } })),
  );
}

/** Un campo de formulario: etiqueta que envuelve al input (así el clic en la etiqueta enfoca el campo). */
const field = (label, attrs) => el("label", { text: label }, el("input", { attrs }));

/**
 * Diálogo de ingreso y registro. <dialog> es el modal nativo de HTML: showModal() lo abre,
 * Esc lo cierra y bloquea el resto de la página.
 */
function authDialog() {
  const loginForm = el("form", { attrs: { id: "login-form" } },
    field("Usuario", { type: "text", name: "username", autocomplete: "username", required: "" }),
    field("Contraseña", { type: "password", name: "password", autocomplete: "current-password", required: "" }),
    el("p", { className: "form-error", attrs: { role: "alert" } }),
    el("button", { className: "btn btn-primary", text: "Ingresar", attrs: { type: "submit" } }),
  );

  const registerForm = el("form", { attrs: { id: "register-form", hidden: "" } },
    field("Usuario", { type: "text", name: "username", autocomplete: "username", maxlength: "150", required: "" }),
    field("Correo (opcional)", { type: "email", name: "email", autocomplete: "email" }),
    field("Contraseña", { type: "password", name: "password", autocomplete: "new-password", minlength: "8", required: "" }),
    el("p", { className: "hint", text: "Mínimo 8 caracteres. No uses claves comunes ni solo números." }),
    el("p", { className: "form-error", attrs: { role: "alert" } }),
    el("button", { className: "btn btn-primary", text: "Crear cuenta", attrs: { type: "submit" } }),
  );

  return el("dialog", { attrs: { id: "auth-dialog", "aria-labelledby": "auth-title" } },
    el("div", { className: "dialog-head" },
      el("h2", { text: "Ingresar", attrs: { id: "auth-title" } }),
      el("button", { className: "btn btn-ghost", text: "Cerrar", attrs: { id: "btn-close-auth", type: "button" } }),
    ),
    loginForm,
    registerForm,
    el("p", { className: "dialog-switch" },
      el("button", { className: "link-button", text: "¿No tienes cuenta? Crear una", attrs: { id: "btn-switch-auth", type: "button" } })),
  );
}

function footer() {
  return el("footer", { className: "site-footer" },
    el("div", { className: "footer-inner" },
      el("p", { className: "footer-brand", text: "CaliCore® · Tu núcleo de la calistenia" }),
      el("p", { className: "footer-note",
        text: "La información de CaliCore es general y no reemplaza la indicación de un profesional de la salud. Si sientes dolor, detente." }),
    ));
}

/** Inserta la estructura común alrededor del <main> de la página. */
export function renderLayout() {
  const currentPage = document.body.dataset.page;
  document.body.prepend(
    el("a", { className: "skip-link", text: "Saltar al contenido", attrs: { href: "#contenido" } }),
    header(currentPage),
  );
  document.body.append(authDialog(), footer());
}
