import { container, start, stop, params, preset } from "./main.js";

// presets: converge, regular, crazy, coherent
window.preset = preset;

document.body.appendChild(container);

start();
