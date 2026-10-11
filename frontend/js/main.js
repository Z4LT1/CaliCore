/**
 * Punto de entrada común de todas las páginas.
 *
 * Por ahora todas hacen lo mismo: dibujar la cabecera y el pie, y activar el ingreso.
 * Cuando una página tenga contenido propio (el árbol, la biblioteca...), tendrá su propio
 * punto de entrada que importará lo de aquí y sumará su feature.
 *
 * Estructura del frontend:
 *   core/       piezas genéricas (config, API, sesión, DOM, eventos)
 *   ui/         estructura visual común (cabecera, diálogo, pie)
 *   features/   una carpeta por funcionalidad, con capas api / view / index
 */
import { initAuth } from "./features/auth/index.js";
import { renderLayout } from "./ui/layout.js";

renderLayout(); // primero la estructura: initAuth necesita que los botones ya existan
initAuth();
