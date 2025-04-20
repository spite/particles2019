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
  s.xyz += d.x*dt*speed*n;
 // s.y += 1.*d.x*dt*speed;
  float decayRate = d.z;
  s.w -= dt*decay*decayRate;
  if(s.w<0.) {
    vec2 oUv = vUv;//vec2(random(s.xy), random(s.yz));
    vec4 o = texture(originTexture,oUv);
    s.xyz = o.xyz;
    s.w += 100.;
  }
  fragmentColor = s;
}`;

export { fs };
