/**
 * Vista de la ficha completa de un ejercicio (el contenido del diálogo que se abre en la biblioteca).
 * Recibe los datos de /api/exercises/<slug>/ y devuelve nodos del DOM. No hace peticiones.
 *
 * Los enlaces a otros ejercicios (requisitos, variantes) apuntan a "#slug": la biblioteca escucha
 * el cambio de "#" en la dirección y abre esa ficha. Así también funcionan atrás/adelante del navegador.
 */
import { el } from "../../core/dom.js";
import { DIFFICULTY_NAMES, difficultyMeter } from "../../ui/difficulty.js";

const exerciseLink = (exercise) => el("a", { className: "ex-link", attrs: { href: `#${exercise.slug}` } },
  el("span", { text: exercise.name }), difficultyMeter(exercise.difficulty));

function linkGroup(title, exercises, emptyText) {
  return el("div", { className: "detail-links" },
    el("h4", { text: title }),
    exercises.length ? el("ul", {}, ...exercises.map((exercise) => el("li", {}, exerciseLink(exercise))))
      : el("p", { className: "muted", text: emptyText }));
}

export function renderDetail(exercise, { favoriteButton }) {
  const head = el("header", { className: "detail-head" },
    el("p", { className: "kicker", text: `${exercise.branch} › ${exercise.path} · paso ${exercise.step}` }),
    el("h2", { text: exercise.name, attrs: { id: "detail-title" } }),
    el("div", { className: "detail-badges" },
      difficultyMeter(exercise.difficulty),
      el("span", { text: `Dificultad ${exercise.difficulty} · ${DIFFICULTY_NAMES[exercise.difficulty]}` }),
      el("span", { className: "tag", text: `Se mide en ${exercise.measure_display.toLowerCase()}` }),
      favoriteButton),
  );

  const how = el("section", {},
    el("h3", { text: "Cómo se hace" }),
    el("ol", { className: "detail-steps" }, ...exercise.steps.map((step) => el("li", { text: step }))));

  const mistakes = el("section", {},
    el("h3", { text: "Errores comunes" }),
    el("ul", { className: "detail-mistakes" }, ...exercise.mistakes.map((item) => el("li", {},
      el("p", { className: "mistake" }, el("b", { text: "✗", attrs: { "aria-hidden": "true" } }), ` ${item.mistake}`),
      el("p", { className: "fix" }, el("b", { text: "✓", attrs: { "aria-hidden": "true" } }), ` ${item.fix}`)))));

  const body = el("section", { className: "detail-tags" },
    el("div", {}, el("h4", { text: "Músculos" }),
      el("div", { className: "tag-row" }, ...exercise.muscles.map((muscle) => el("span", { className: "tag", text: muscle })))),
    el("div", {}, el("h4", { text: "Equipamiento" }),
      el("div", { className: "tag-row" }, ...exercise.equipment.map((item) => el("span", { className: "tag tag-neutral", text: item })))),
  );

  const progression = el("section", { className: "detail-progression" },
    el("h3", { text: "Progresión" }),
    el("div", { className: "detail-grid" },
      linkGroup("Más fácil", exercise.easier ? [exercise.easier] : [], "Es el primer paso de su camino."),
      linkGroup("Más difícil", exercise.harder ? [exercise.harder] : [], "Es la cima de su camino."),
      linkGroup("Necesitas antes", exercise.requirements, "No tiene requisitos: es un punto de partida."),
      linkGroup("Desbloquea", exercise.unlocks, "Por ahora no desbloquea otros ejercicios."),
    ));

  return [
    head,
    el("p", { className: "detail-summary", text: exercise.summary }),
    el("div", { className: "detail-columns" }, how, mistakes),
    body,
    progression,
    el("a", { className: "text-link", text: "Verlo en el árbol →", attrs: { href: `arbol.html#${exercise.slug}` } }),
  ];
}
