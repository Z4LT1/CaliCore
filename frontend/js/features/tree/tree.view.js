/**
 * Vista del árbol: arma la escena SVG sobre la ilustración. No maneja el zoom ni los eventos
 * (eso lo hace index.js); solo dibuja.
 *
 * Capas, de atrás hacia adelante:
 *   1. la ilustración (con un recorte que "crece" desde la base al cargar)
 *   2. un velo oscuro con un "foco": ilumina la rama elegida y oscurece el resto
 *   3. las venas: líneas finas que siguen cada camino sobre las ramas dibujadas
 *   4. la savia: partículas de luz que suben por las venas
 *   5. las raíces (enlace a la historia) y los ejercicios
 *
 * La ilustración se ESTIRA hasta llenar todo el escenario (ancho y alto de la página), así el
 * árbol completo se ve entero en cualquier pantalla. Para que los ejercicios sigan cayendo sobre
 * sus ramas, sus coordenadas (en píxeles de la imagen original) se multiplican por la misma
 * proporción en fitScene(). Los puntos y los textos se dibujan en píxeles de pantalla, por eso
 * no se deforman aunque la imagen sí lo haga.
 */
import { svg } from "../../core/dom.js";
import { BRANCH_COLORS, IMAGE, PATH_LINES, ROOTS } from "./layout.js";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const linePath = (points) => `M ${points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ")}`;
const SPOT_RADIUS = 60; // radio del foco de luz, en píxeles de pantalla

let spotNodes = []; // nodos bajo el foco: se redibujan si cambia el tamaño del escenario

function defs() {
  return svg("defs", {},
    // Recorte que crece de abajo hacia arriba (animado en CSS): el árbol "nace" desde las raíces
    svg("clipPath", { attrs: { id: "grow-clip" } },
      svg("rect", { className: "grow-rect", attrs: { x: 0, y: 0, "data-fill": "" } })),
    // Máscara del velo: blanco = se oscurece; las manchas negras (desenfocadas) son el foco
    svg("filter", { attrs: { id: "spot-blur", x: "-50%", y: "-50%", width: "200%", height: "200%" } },
      svg("feGaussianBlur", { attrs: { stdDeviation: 22 } })),
    svg("mask", { attrs: { id: "dim-mask", maskUnits: "userSpaceOnUse", x: 0, y: 0, "data-fill": "" } },
      svg("rect", { attrs: { fill: "white", "data-fill": "" } }),
      svg("g", { attrs: { id: "spot", filter: "url(#spot-blur)" } })),
  );
}

function drawNode(node) {
  const color = BRANCH_COLORS[node.branch.slug] ?? "#555";
  const label = `${node.name}. ${node.branch.name}, ${node.path.name}, paso ${node.step}${node.isSummit ? ", cima" : ""}`;
  const group = svg("g", {
    className: `tnode${node.isSummit ? " is-summit" : ""}`,
    attrs: {
      tabindex: "0", role: "button", "aria-label": label,
      "data-slug": node.slug, "data-branch": node.branch.slug, "data-path": node.path.slug,
      // Retraso de aparición: los nodos de abajo brotan primero, siguiendo al recorte que crece
      style: `--c:${color}; --d:${(0.9 + (1 - node.iy / IMAGE.height) * 1.6).toFixed(2)}s`,
    },
  });
  const r = node.isSummit ? 8 : 5.5;
  group.append(
    svg("circle", { className: "tnode-halo", attrs: { r: r + 5 } }),
    svg("circle", { className: "tnode-dot", attrs: { r } }),
    svg("text", { className: "tnode-label", text: node.name, attrs: { y: -(r + 7), "text-anchor": "middle" } }),
  );
  return group;
}

/** Partículas de savia: cada una recorre su vena con <animateMotion> (animación nativa de SVG). */
function sap(pathSlug, points) {
  if (reduceMotion) return [];
  const length = points.slice(1).reduce((sum, [x, y], i) => sum + Math.hypot(x - points[i][0], y - points[i][1]), 0);
  const duration = Math.max(length / 45, 3); // unos 45 píxeles (de la imagen) por segundo
  return [0, 0.5].map((offset) => svg("circle", { className: "sap", attrs: { r: 2.2 } },
    svg("animateMotion", { attrs: { dur: `${duration.toFixed(1)}s`, repeatCount: "indefinite", begin: `${(2.6 + offset * duration).toFixed(1)}s` } },
      svg("mpath", { attrs: { href: `#vein-${pathSlug}` } }))));
}

/** Dibuja la escena dentro del <svg>. Devuelve el grupo "cámara" que index.js mueve con el zoom. */
export function renderScene(root, nodes) {
  const usedPaths = [...new Set(nodes.map((node) => node.path.slug))];
  const veins = usedPaths.map((slug) => svg("path", {
    className: "vein", attrs: { id: `vein-${slug}`, "data-path": slug,
      style: `--c:${BRANCH_COLORS[nodes.find((n) => n.path.slug === slug).branch.slug]}` },
  }));

  const roots = svg("a", { className: "troots", attrs: { href: ROOTS.href, "aria-label": `${ROOTS.label}: ir a la página de historia` } },
    svg("circle", { attrs: { r: 9 } }),
    svg("text", { text: ROOTS.label, attrs: { "text-anchor": "middle" } }));

  const camera = svg("g", { attrs: { id: "tree-camera" } },
    svg("g", { attrs: { "clip-path": "url(#grow-clip)" } },
      // preserveAspectRatio="none": la imagen se estira hasta llenar el escenario completo
      svg("image", { attrs: { href: IMAGE.url, preserveAspectRatio: "none", "data-fill": "" } })),
    svg("rect", { className: "dim", attrs: { mask: "url(#dim-mask)", "data-fill": "" } }),
    svg("g", { className: "veins" }, ...veins),
    svg("g", { className: "saps" }, ...usedPaths.flatMap((slug) => sap(slug, PATH_LINES[slug]))),
    roots,
    svg("g", { className: "tnodes" }, ...nodes.map(drawNode)),
  );

  root.replaceChildren(defs(), camera);
  return camera;
}

/**
 * Ajusta la escena al tamaño del escenario (width × height, en píxeles de pantalla).
 * Se llama al cargar y cada vez que cambia el tamaño de la ventana.
 * Actualiza node.x / node.y: index.js los usa para encuadrar la cámara.
 */
export function fitScene(root, nodes, width, height) {
  const sx = width / IMAGE.width;
  const sy = height / IMAGE.height;
  const toStage = ([x, y]) => [x * sx, y * sy];

  root.setAttribute("viewBox", `0 0 ${width} ${height}`); // 1 unidad del SVG = 1 píxel de pantalla
  root.querySelectorAll("[data-fill]").forEach((element) => {
    element.setAttribute("width", width);
    element.setAttribute("height", height);
  });

  const byslug = {};
  for (const node of nodes) {
    [node.x, node.y] = toStage([node.ix, node.iy]);
    byslug[node.slug] = node;
  }
  root.querySelectorAll(".tnode").forEach((g) => {
    const node = byslug[g.dataset.slug];
    g.setAttribute("transform", `translate(${node.x.toFixed(1)} ${node.y.toFixed(1)})`);
  });
  root.querySelectorAll(".vein").forEach((vein) => vein.setAttribute("d", linePath(PATH_LINES[vein.dataset.path].map(toStage))));

  const [rx, ry] = toStage([ROOTS.x, ROOTS.y]);
  const roots = root.querySelector(".troots");
  roots.querySelector("circle").setAttribute("cx", rx);
  roots.querySelector("circle").setAttribute("cy", ry);
  roots.querySelector("text").setAttribute("x", rx);
  roots.querySelector("text").setAttribute("y", ry + 26);

  setSpotlight(root, spotNodes);
  return { sx, sy };
}

/** Enciende el foco sobre un conjunto de nodos (o lo apaga si la lista está vacía). */
export function setSpotlight(root, nodes) {
  spotNodes = nodes;
  const spot = root.querySelector("#spot");
  spot.replaceChildren(...nodes.map((node) => svg("circle", { attrs: { cx: node.x, cy: node.y, r: SPOT_RADIUS, fill: "black" } })));
  root.classList.toggle("has-focus", nodes.length > 0);
}
