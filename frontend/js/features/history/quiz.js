/**
 * Quiz de historia: cuatro preguntas de opción múltiple con respuesta inmediata.
 * Al elegir una opción se marca si es correcta, se explica por qué y la pregunta queda cerrada.
 * El formulario se construye con el(): las preguntas son texto, nunca HTML.
 */
import { el } from "../../core/dom.js";

const QUESTIONS = [
  {
    text: "¿Qué significa la palabra «calistenia»?",
    options: ["Belleza y fuerza", "Cuerpo y mente", "Barra y suelo"],
    answer: 0,
    why: "Viene del griego kállos (belleza) y sthénos (fuerza).",
  },
  {
    text: "¿A quién se le atribuye haber popularizado la barra fija y las paralelas?",
    options: ["Per Henrik Ling", "Friedrich Ludwig Jahn", "Catharine Beecher"],
    answer: 1,
    why: "Jahn las usó en su espacio de gimnasia al aire libre de Berlín, en 1811.",
  },
  {
    text: "¿En qué año la barra fija y las paralelas estuvieron en los primeros Juegos Olímpicos modernos?",
    options: ["1896", "1924", "1960"],
    answer: 0,
    why: "Fue en Atenas 1896, los primeros Juegos Olímpicos modernos.",
  },
  {
    text: "¿Qué significa «gymnós», la palabra de la que viene «gimnasio»?",
    options: ["Fuerte", "Joven", "Desnudo"],
    answer: 2,
    why: "En el gimnasio griego se entrenaba sin ropa.",
  },
];

export function initHistoryQuiz(form, score) {
  let answered = 0;
  let correct = 0;

  QUESTIONS.forEach((question, q) => {
    const feedback = el("p", { className: "hq-feedback", attrs: { "aria-live": "polite" } });
    const options = question.options.map((option, i) => el("label", { className: "hq-option" },
      el("input", { attrs: { type: "radio", name: `q${q}`, value: String(i) } }),
      el("span", { text: option })));

    const fieldset = el("fieldset", { className: "hq-question" },
      el("legend", { text: `${q + 1}. ${question.text}` }), ...options, feedback);

    fieldset.addEventListener("change", (event) => {
      const chosen = Number(event.target.value);
      const isRight = chosen === question.answer;
      answered += 1;
      if (isRight) correct += 1;
      // Marca la correcta (y la elegida si se equivocó) y bloquea la pregunta
      options.forEach((label, i) => {
        label.classList.toggle("is-right", i === question.answer);
        label.classList.toggle("is-wrong", i === chosen && !isRight);
        label.querySelector("input").disabled = true;
      });
      feedback.textContent = `${isRight ? "¡Correcto!" : "No exactamente."} ${question.why}`;
      fieldset.classList.add(isRight ? "was-right" : "was-wrong");
      if (answered === QUESTIONS.length) {
        score.textContent = correct === QUESTIONS.length
          ? `¡${correct} de ${QUESTIONS.length}! Conoces la historia de la calistenia.`
          : `Respondiste bien ${correct} de ${QUESTIONS.length}. Vuelve a recorrer la línea de tiempo cuando quieras.`;
      }
    });
    form.append(fieldset);
  });

  form.addEventListener("submit", (event) => event.preventDefault());
}
