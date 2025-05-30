import { fs as curlFS } from "./curl.js";

const fs = `
precision highp float;

layout (location = 0) out vec4 fragmentColor;

uniform float time;
uniform sampler2D inputTexture;
uniform sampler2D originTexture;
uniform sampler2D colorTexture;
uniform sampler2D particleTexture;
uniform float persistence;
uniform float speed;
uniform float nSpeed;
uniform float nScale;
uniform float decay;
uniform bool run;
uniform float dt;
uniform float stay;
uniform float scale;
uniform vec3 center;

in vec2 vUv;

${curlFS}

float random (vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898,78.233))) *43758.5453123);
}

void main() {
  vec4 d = texture(particleTexture, vUv);
  vec4 s = texture(inputTexture, vUv);
  float t = nSpeed * time;
  
  vec3 n = curlNoise(s.xyz*nScale, t);
  // n = .1 * normalize(n);
  n = .05 * n;

  vec3 c = center / scale;
  vec3 dirToCenter = -(c - s.xyz);
  float distToCenter = clamp(.0001 / pow(length(dirToCenter),20.), 0., 1.);
  dirToCenter = 1. * normalize(dirToCenter);
  vec3 dir = mix(n, dirToCenter, distToCenter);
  s.xyz += d.x * dt * speed * dir;

  float decayRate = d.z;
  s.w -= dt*decay*decayRate;

  if(s.w<0.) {
    vec2 oUv = vUv;
    vec4 o = texture(originTexture,oUv);
    s.xyz = o.xyz;
    s.w += 100.;
  }
  fragmentColor = s;
}`;

export { fs };
