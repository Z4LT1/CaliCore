/**
 * Tarjeta de ejercicio que se gira: al frente el nombre y la dificultad; atrás la descripción breve.
 *
 * - Con mouse: se gira al pasar el cursor (CSS :hover).
 * - Con teclado: se gira al enfocarla con Tab (CSS :focus-within).
 * - En pantallas táctiles (sin hover): el primer toque la gira (clase .is-flipped).
 *
 * Opciones (las usa la biblioteca; el inicio no las necesita):
 * - onOpen(slug): se llama al hacer clic en la tarjeta (o Enter con el teclado) para abrir la ficha.
 * - favorite: { active, onToggle(slug) } agrega la estrella. Va FUERA de la parte que gira,
 *   para que no desaparezca cuando la tarjeta se da vuelta.
 */
import { el, svg } from "../core/dom.js";
import { difficultyMeter } from "./difficulty.js";

/** "Tracción" -> "traccion": el nombre de la rama como slug, para su color de tinta en CSS. */
export const branchSlug = (name) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const touchOnly = window.matchMedia("(hover: none)");

function starButton(exercise, { active, onToggle }) {
  const button = el("button", {
    className: "fav-button",
    attrs: { type: "button", "aria-pressed": String(active), "data-fav": exercise.slug,
      "aria-label": `Guardar ${exercise.name} en tus favoritos` },
  },
  svg("svg", { attrs: { viewBox: "0 0 24 24", "aria-hidden": "true" } },
    svg("path", { attrs: { d: "M12 3.5l2.6 5.3 5.9.9-4.25 4.1 1 5.85L12 16.9l-5.25 2.75 1-5.85L3.5 9.7l5.9-.9z" } })));
  button.addEventListener("click", (event) => {
    event.stopPropagation(); // que el clic en la estrella no abra ni gire la tarjeta
    onToggle(exercise.slug);
  });
  return button;
}

export function exerciseCard(exercise, { onOpen, favorite } = {}) {
  const front = el("div", { className: "card-face card-front" },
    el("div", { className: "card-top" },
      el("span", { className: "tag", text: exercise.branch, attrs: { "data-branch": branchSlug(exercise.branch) } }),
      difficultyMeter(exercise.difficulty)),
    el("h3", { text: exercise.name }),
    el("p", { className: "card-path", text: `${exercise.path} · paso ${exercise.step}` }),
    el("p", { className: "card-muscles", text: exercise.muscles.slice(0, 3).join(" · ") }),
  );

  const back = el("div", { className: "card-face card-back" },
    el("p", { className: "card-summary", text: exercise.summary }),
    el("p", { className: "card-meta", text: `Se mide en ${exercise.measure_display.toLowerCase()}` }),
    el("a", { className: "card-link", text: "Ver la ficha completa", attrs: { href: `biblioteca.html#${exercise.slug}` } }),
  );

  const card = el("article", {
    className: "ex-card",
    attrs: { tabindex: "0", "data-slug": exercise.slug, "aria-label": `${exercise.name}. ${exercise.summary}` },
  }, el("div", { className: "card-inner" }, front, back));
  if (favorite) card.append(starButton(exercise, favorite));

  card.addEventListener("click", (event) => {
    if (event.target.closest("a")) return; // el enlace del reverso navega por su cuenta
    // En pantallas táctiles, el primer toque solo gira la tarjeta; el segundo la abre
    if (touchOnly.matches && !card.classList.contains("is-flipped")) {
      card.classList.add("is-flipped");
      return;
    }
    if (onOpen) onOpen(exercise.slug);
    else if (touchOnly.matches) card.classList.remove("is-flipped");
  });
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.target === card && onOpen) onOpen(exercise.slug);
  });
  return card;
}

/** Actualiza la estrella de una tarjeta ya dibujada (cuando cambian los favoritos). */
export function setCardFavorite(card, active) {
  const button = card.querySelector(".fav-button");
  if (button) button.setAttribute("aria-pressed", String(active));
}
