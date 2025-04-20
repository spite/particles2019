import { fs as fxaa } from "./fxaa.js";
import { fs as vignette } from "./vignette.js";
import { fs as softLight } from "./soft-light.js";
import { fs as ditherNoise } from "./dither-noise.js";
import { gammaCorrect, levelRange, finalLevels } from "./levels.js";

const fs = `
precision highp float;

layout (location = 0) out vec4 fragmentColor;

uniform vec2 resolution;
uniform sampler2D inputTexture;
uniform float time;

in vec2 vUv;

${vignette}
${fxaa}
${softLight}
${ditherNoise}
${gammaCorrect}
${levelRange}
${finalLevels}

void main() {

  float vignetteBoost = .5;
  float vignetteReduction = .5;

  vec4 color = fxaa(inputTexture, vUv );
  // color = softLight(color, vec4(vec3(vignette(vUv, vignetteBoost, vignetteReduction)),1.));
  // color.rgb = finalLevels(color.rgb, vec3(0./255.), vec3(1.49), vec3(239./255.));

  fragmentColor = color + .1*ditherNoise(vUv, .001*time);
}
`;

export { fs };
