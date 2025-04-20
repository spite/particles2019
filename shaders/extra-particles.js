import { fs as noise3d } from "./noise3d.js";
import { fs as turbulence } from "./turbulence.js";

const fs = `
precision highp float;

layout (location = 0) out vec4 fragmentColor;

uniform float time;
uniform sampler2D positionTexture;
uniform sampler2D originTexture;
uniform sampler2D extraTexture;

in vec2 vUv;

${noise3d}
${turbulence}

void main() {
  vec4 o = texture(originTexture, vUv);
  vec4 e = texture(extraTexture, vUv);
  vec4 d = texture(positionTexture, vUv);
  vec3 offset = vec3(.234,.656,.234);
  float n = mod(noise3d(offset+(o.xyz + d.xyz)/500. + vec3(0.,0.,time)),1.);
  fragmentColor = vec4(n,e.yzw);
}`;

export { fs };
