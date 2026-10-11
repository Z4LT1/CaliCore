/**
 * Utilidad para crear elementos del DOM de forma segura.
 *
 * Regla de seguridad: el texto SIEMPRE se asigna con textContent, que lo trata como texto plano.
 * Si se usara innerHTML con datos del servidor (nombres, notas), un texto como <img onerror=...>
 * se ejecutaría como código: eso es una vulnerabilidad XSS.
 *
 * Uso:  el("li", { className: "item", text: "Hola" }, hijo1, hijo2)
 */
export function el(tag, { className, text, attrs } = {}, ...children) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  if (attrs) {
    for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  }
  node.append(...children);
  return node;
}

/**
 * Igual que el(), pero para elementos SVG (íconos, ilustraciones).
 * Los SVG viven en otro "espacio de nombres" y deben crearse con createElementNS;
 * con createElement aparecerían en el DOM pero el navegador no los dibujaría.
 */
export function svg(tag, { className, attrs } = {}, ...children) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  if (className) node.setAttribute("class", className); // en SVG, className no es un texto simple
  if (attrs) {
    for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  }
  node.append(...children);
  return node;
}

/** Atajo de document.querySelector. Uso: $("#contenido") */
export const $ = (selector) => document.querySelector(selector);
