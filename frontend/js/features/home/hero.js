/**
 * Lámina del héroe: el roble grabado con sus cinco ramas señaladas.
 *
 * Entrada (GSAP, una sola vez): el sol sube, el árbol crece desde las raíces, se trazan las
 * líneas guía y aparecen los rótulos. Después, el sol y el árbol se desplazan apenas con el
 * mouse, en direcciones opuestas, para dar profundidad (parallax).
 * Todo usa gsap.from(): el estado final es el del HTML, así que sin animación la lámina igual
 * se ve completa. Con "reducir movimiento" no se anima nada.
 */
import { gsap } from "gsap";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

/** Escribe cuántos ejercicios tiene cada rama en su rótulo (desde el catálogo real). */
export function fillBranchCounts(plate, tree) {
  for (const branch of tree) {
    const count = branch.paths.reduce((total, path) => total + path.exercises.length, 0);
    const node = plate.querySelector(`[data-branch-count="${branch.slug}"]`);
    if (node) node.textContent = String(count);
  }
}

export function initHeroPlate(plate) {
  if (!plate || reduceMotion) return;
  const sun = plate.querySelector(".plate-sun");
  const tree = plate.querySelector(".plate-tree");
  const leads = plate.querySelectorAll(".plate-leads path");
  const dots = plate.querySelectorAll(".plate-leads circle");
  const labels = plate.querySelectorAll(".plate-label");

  const start = () => {
    gsap.timeline({ defaults: { ease: "expo.out" } })
      .from(sun, { opacity: 0, scale: 0.7, y: 40, duration: 1.8 }, 0)
      .from(tree, { clipPath: "inset(100% 0% 0% 0%)", duration: 1.9, ease: "power3.inOut", clearProps: "clipPath" }, 0.15)
      .from(leads, { strokeDashoffset: 1, duration: 0.8, stagger: 0.08, ease: "power2.out" }, 1.45)
      .from(dots, { opacity: 0, scale: 0, transformOrigin: "50% 50%", duration: 0.5, stagger: 0.08 }, 1.5)
      .from(labels, { opacity: 0, y: 8, duration: 0.7, stagger: 0.08, clearProps: "opacity,transform" }, 1.7);
  };
  // Se espera a que la ilustración esté lista, para que el crecimiento no empiece "en blanco"
  tree.decode().catch(() => {}).then(start);

  if (!finePointer) return;
  // Parallax con el mouse: quickTo crea una función que anima hacia un valor (sin crear tweens nuevos)
  const sunX = gsap.quickTo(sun, "x", { duration: 1.2, ease: "power3.out" });
  const sunY = gsap.quickTo(sun, "y", { duration: 1.2, ease: "power3.out" });
  const treeX = gsap.quickTo(tree, "x", { duration: 1.2, ease: "power3.out" });
  plate.addEventListener("pointermove", (event) => {
    const box = plate.getBoundingClientRect();
    const dx = (event.clientX - box.left) / box.width - 0.5;  // -0.5 a 0.5
    const dy = (event.clientY - box.top) / box.height - 0.5;
    sunX(dx * -18);
    sunY(dy * -10);
    treeX(dx * 6);
  });
  plate.addEventListener("pointerleave", () => { sunX(0); sunY(0); treeX(0); });
}
