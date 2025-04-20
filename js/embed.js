import {container, start, stop, params, preset} from './main.js';

// presets: converge, regular, crazy, coherent
window.preset = preset;

document.body.appendChild(container);

start();

window.addEventListener('message', ev => {
  const data = ev.data;

  if (data.action === 'setPreset') {
    console.log(
      `running preset ${data.preset} with duration ${data.duration}ms`
    );
    preset(data.preset, data.duration);
  }
});
