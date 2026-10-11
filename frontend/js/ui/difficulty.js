/**
 * Medidor de dificultad del 1 al 5: cinco "nudillos", rellenos hasta el nivel del ejercicio.
 * El número también va en texto (aria-label), para lectores de pantalla.
 */
import { el } from "../core/dom.js";

export const DIFFICULTY_NAMES = { 1: "Inicio", 2: "Base", 3: "Intermedio", 4: "Avanzado", 5: "Élite" };

export function difficultyMeter(level) {
  const meter = el("span", {
    className: "difficulty",
    attrs: { role: "img", "aria-label": `Dificultad ${level} de 5: ${DIFFICULTY_NAMES[level]}`, "data-level": String(level) },
  });
  for (let i = 1; i <= 5; i++) meter.append(el("i", { className: i <= level ? "on" : "" }));
  return meter;
}
