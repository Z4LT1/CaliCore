/**
 * "¿Por dónde empiezo?": tres preguntas y un ejercicio recomendado por rama.
 * El valor de cada opción del formulario ya es el slug del ejercicio recomendado (ver index.html),
 * así que aquí solo se buscan sus datos en el catálogo y se dibujan.
 */
import { el } from "../../core/dom.js";
import { difficultyMeter } from "../../ui/difficulty.js";
import { branchSlug } from "../../ui/exercise-card.js";

const QUESTIONS = [
  ["push", "Empuje"],
  ["pull", "Tracción"],
  ["legs", "Pierna"],
];

function resultCard(label, exercise) {
  return el("article", { className: "start-card" },
    el("span", { className: "tag", text: label, attrs: { "data-branch": branchSlug(label) } }),
    el("h3", { text: exercise.name }),
    difficultyMeter(exercise.difficulty),
    el("p", { text: exercise.summary }),
    el("a", { className: "text-link", text: "Verlo en el árbol", attrs: { href: `arbol.html#${exercise.slug}` } }),
  );
}

export function initQuiz(form, output, exercisesBySlug) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    // El navegador ya exige responder (required), pero la validación propia no depende de eso
    if (QUESTIONS.some(([name]) => !data.get(name))) {
      output.replaceChildren(el("p", { className: "form-error", text: "Responde las tres preguntas para ver tu punto de partida." }));
      return;
    }
    output.replaceChildren(
      el("p", { className: "start-intro", text: "Tu punto de partida en cada rama:" }),
      el("div", { className: "start-grid" },
        ...QUESTIONS.map(([name, label]) => resultCard(label, exercisesBySlug[data.get(name)]))),
    );
    output.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
}
