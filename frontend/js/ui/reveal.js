/**
 * Aparición suave al hacer scroll: cada elemento con la clase .reveal recibe .is-visible
 * cuando entra en pantalla. La animación en sí está en CSS y solo corre si la persona
 * no pidió reducir el movimiento.
 *
 * IntersectionObserver avisa cuando un elemento entra en la pantalla, sin tener que
 * revisar la posición en cada movimiento del scroll (más eficiente).
 */
export function initReveal() {
  const items = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    items.forEach((item) => item.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target); // basta con aparecer una vez
      }
    }
  }, { threshold: 0.15 });
  items.forEach((item) => observer.observe(item));
}
