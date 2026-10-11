/**
 * Feature de la historia: el riel lateral que sigue la lectura y el juego de la palabra.
 * El quiz final vive en quiz.js. Todo el contenido está en historia.html: si el JavaScript
 * fallara, la historia se seguiría leyendo completa; aquí solo se agrega interacción.
 */
import { $ } from "../../core/dom.js";
import { initHistoryQuiz } from "./quiz.js";

/**
 * Riel lateral:
 * - Marca la era que se está leyendo (IntersectionObserver avisa qué capítulo cruza el centro
 *   de la pantalla, sin revisar la posición en cada movimiento del scroll).
 * - Llena la barra según cuánto de la línea de tiempo se ha recorrido.
 */
function initRail() {
  const chapters = document.querySelectorAll(".chapter");
  const links = document.querySelectorAll(".era-rail a");
  const fill = $("#rail-fill");
  const container = $(".chapters");

  const setActive = (era) => links.forEach((link) => {
    const active = link.dataset.era === era;
    link.classList.toggle("is-active", active);
    if (active) link.setAttribute("aria-current", "step");
    else link.removeAttribute("aria-current");
  });

  // rootMargin recorta la "ventana" a una franja en el centro de la pantalla
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.dataset.era);
  }, { rootMargin: "-45% 0px -45% 0px" });
  chapters.forEach((chapter) => observer.observe(chapter));

  // Progreso: qué porcentaje de la línea de tiempo ya pasó por el centro de la pantalla
  let ticking = false;
  const updateFill = () => {
    const box = container.getBoundingClientRect();
    const middle = window.innerHeight / 2;
    const progress = Math.min(Math.max((middle - box.top) / box.height, 0), 1);
    fill.style.transform = `scaleY(${progress})`;
    ticking = false;
  };
  // requestAnimationFrame agrupa los eventos de scroll: se calcula como máximo una vez por cuadro
  window.addEventListener("scroll", () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(updateFill);
    }
  }, { passive: true });
  updateFill();
}

/** "Unir las palabras": revela el resultado y anima la unión (la animación está en CSS). */
function initWordGame() {
  const button = $("#word-join");
  const result = $("#word-result");
  const game = $(".word-game");
  button.addEventListener("click", () => {
    const joined = !game.classList.contains("is-joined");
    game.classList.toggle("is-joined", joined);
    result.hidden = !joined;
    button.setAttribute("aria-expanded", String(joined));
    button.textContent = joined ? "Separar de nuevo" : "Unir las palabras";
  });
}

export function initHistory() {
  initRail();
  initWordGame();
  initHistoryQuiz($("#history-quiz"), $("#hq-score"));
}
