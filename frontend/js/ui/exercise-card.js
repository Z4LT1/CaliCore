/**
 * Tarjeta de ejercicio que se gira: al frente el nombre y la dificultad; atrás la descripción breve.
 *
 * - Con mouse: se gira al pasar el cursor (CSS :hover).
 * - Con teclado: se gira al enfocarla con Tab (CSS :focus-within).
 * - En pantallas táctiles (sin hover): el primer toque la gira (clase .is-flipped).
 * El enlace del reverso lleva a la ficha completa en la biblioteca.
 */
import { el } from "../core/dom.js";
import { difficultyMeter } from "./difficulty.js";

const touchOnly = window.matchMedia("(hover: none)");

export function exerciseCard(exercise) {
  const front = el("div", { className: "card-face card-front" },
    el("div", { className: "card-top" },
      el("span", { className: "tag", text: exercise.branch }),
      difficultyMeter(exercise.difficulty)),
    el("h3", { text: exercise.name }),
    el("p", { className: "card-path", text: `Camino: ${exercise.path}` }),
  );

  const back = el("div", { className: "card-face card-back" },
    el("p", { className: "card-summary", text: exercise.summary }),
    el("p", { className: "card-meta", text: `Se mide en ${exercise.measure_display.toLowerCase()} · ${exercise.muscles.slice(0, 3).join(", ")}` }),
    el("a", { className: "card-link", text: "Ver la ficha completa →", attrs: { href: `biblioteca.html#${exercise.slug}` } }),
  );

  const card = el("article", { className: "ex-card", attrs: { tabindex: "0", "aria-label": `${exercise.name}. ${exercise.summary}` } },
    el("div", { className: "card-inner" }, front, back));

  card.addEventListener("click", (event) => {
    if (touchOnly.matches && !event.target.closest("a")) card.classList.toggle("is-flipped");
  });
  return card;
}
