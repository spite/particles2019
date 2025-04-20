import { fs as dither } from "./dither.js";
import { fs as ditherBlueNoiseTex } from "./dither-blue-noise-texture.js";

const vs = `
precision highp float;

in vec3 position;
in vec2 offsetUv;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform sampler2D positionTexture;
uniform sampler2D particleTexture;
uniform sampler2D extraParticleTexture;
uniform sampler2D colorTexture;
uniform vec2 resolution;
uniform float size;
uniform float scale;
uniform float time;

out vec2 vUv;
out float vSize;
out vec3 lPos;
out float lDistance;
out vec3 vColor;
out vec4 vPosition;
out vec4 vCenter;
out vec4 vShadowCoord;
out float brightness;
out float roughness;
out float opacity;

float parabola( float x, float k ){
  return pow( 4.0*x*(1.0-x), k );
}

const float PI = 3.1415926535897932384626433832795;

void main(){
  vec4 particle = texture(positionTexture, offsetUv);
  vec4 d = texture(particleTexture, offsetUv);
  vec4 extra = texture(extraParticleTexture, offsetUv);
  vec2 noiseUv = vec2(extra.x,.5);
  vec4 t = texture(colorTexture, noiseUv);
  brightness = extra.y;
  roughness = extra.z;
  opacity = .1 + .9 * (d.x-1.);
  vColor = t.rgb;
  float f = smoothstep(0.,1.,parabola(clamp(particle.w/100.,0.,1.),1.));
  vSize = d.y*size*f;
  vec3 offsetPosition = scale*.1*particle.xyz;
  vUv = 2. * position.xy ;
  vCenter = vec4( offsetPosition, 1.0 );
  vPosition = modelViewMatrix * vec4( offsetPosition, 1.0 ) + vSize*vec4(position,1.);
  gl_Position = projectionMatrix * vPosition;
  vec4 lMod = vec4(vec3(0.,100.,100.),0.);
  lPos = (modelViewMatrix* vec4(lMod.xyz,1.)).xyz;
  lDistance = length(.01*lMod);
  lDistance = lDistance * lDistance;
}`;

const shadow_vs = `
precision highp float;

in vec3 position;
in vec2 offsetUv;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform sampler2D positionTexture;
uniform sampler2D colorTexture;
uniform sampler2D particleTexture;
uniform float size;
uniform float scale;

out vec2 vUv;
out float opacity;

float parabola( float x, float k ){
  return pow( 4.0*x*(1.0-x), k );
}

void main(){
  vec4 particle = texture(positionTexture, offsetUv);
  vec4 d = texture(particleTexture, offsetUv);
  opacity = .1 + .9 * (d.x-1.);
  float f = smoothstep(0.,.25,parabola(particle.w/100.,1.));
  float vSize = d.y*size*f;
  vec3 offsetPosition = scale*.1*particle.xyz;
  vUv = 2. * position.xy ;
  vec4 vPosition = modelViewMatrix * vec4( offsetPosition, 1.0 ) + vSize*vec4(position,1.);
  gl_Position = projectionMatrix * vPosition;
}`;

const shadow_fs = `
precision highp float;

layout (location = 0) out vec4 fragmentColor;

in vec2 vUv;
in float opacity;

${ditherBlueNoiseTex}

vec4 packDepth(const in float depth) {
  const vec4 bit_shift = vec4(256.0*256.0*256.0, 256.0*256.0, 256.0, 1.0);
  const vec4 bit_mask  = vec4(0.0, 1.0/256.0, 1.0/256.0, 1.0/256.0);
  vec4 res = mod(depth*bit_shift*vec4(255), vec4(256))/vec4(255);
  res -= res.xxyz * bit_mask;
  return res;
}

void main() {
  float d = dot(vUv,vUv);
  if(d > 1.) {
    discard;
  }
  // vec2 bnuv = gl_FragCoord.xy;
  // float dn = ditherBlueNoiseTexture(opacity, bnuv) ;
  // if(dn==1.) {
  //   discard;
  // }
  fragmentColor = packDepth( gl_FragCoord.z );
}
`;

const fs = `
precision highp float;

layout (location = 0) out vec4 fragmentColor;

uniform vec2 resolution;
uniform vec2 shadowResolution;
uniform vec3 cameraPos;
uniform mat4 modelViewMatrix;
uniform mat4 shadowMatrix;
uniform sampler2D shadowBuffer;
uniform vec3 ambientColor;
uniform vec3 lightColor;
uniform float blend;

uniform float spread;
uniform float jitter;
uniform float bias;
uniform float time;

in float vSize;
in vec2 vUv;
in vec3 lPos;
in float lDistance;
in vec3 vColor;
in vec4 vPosition;
in vec4 vCenter;
in float brightness;
in float roughness;
in float opacity;

${ditherBlueNoiseTex}

const float PI = 3.1415926535897932384626433832795;

float unpackDepth( const in vec4 rgba_depth ) {
  const vec4 bit_shift = vec4(1.0/(256.0*256.0*256.0), 1.0/(256.0*256.0), 1.0/256.0, 1.0);
  return dot(rgba_depth, bit_shift);
}

float random(vec4 seed4){
  float dot_product = dot(seed4, vec4(12.9898,78.233,45.164,94.673));
  return fract(sin(dot_product) * 43758.5453);
}

float sampleVisibility( vec3 coord ) {
  vec2 jitter = jitter*vec2(.5 - random(vec4(coord, bias)))/shadowResolution;
  float d = coord.z;
  float s = (unpackDepth( texture( shadowBuffer, coord.xy + jitter)) + bias);
  float diff = s-d;
  return step( d,s );
}

vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
  return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}


void main() {
  float d = dot(vUv,vUv);
  if(d > 1.) {
    discard;
  }

  d = clamp(d, 0., 1.);
  float z = gl_FragCoord.z / gl_FragCoord.w;
  z += .95;
  z = (exp(z) - 1.)-(exp(1.)-1.);
  vec2 bnuv = gl_FragCoord.xy;
  float dn = ditherBlueNoiseTexture(z, bnuv) ;
  float dn2 = 0.;//ditherBlueNoiseTexture(opacity, bnuv) ;
  if(dn2 == 1.||dn==1. ) {
    discard;
    //fragmentColor = vec4(dn,dn,dn,1.);
    //return;
  }
  // if(dither8x8(gl_FragCoord.xy,10.*z) == 0.){
  //   discard;
  // }

  //fragmentColor = vec4(vColor, 1.);
  //fragmentColor.xyz = vec3(opacity);
  //return;

  vec3 n = normalize(vec3(vUv, sqrt(1. - d)));
  vec3 p = vCenter.xyz + n * .5 * vSize;
  vec3 wp = (modelViewMatrix * vec4(p,1.)).xyz;

  vec4 vShadowCoord = shadowMatrix * vec4(p,1.);
  vec3 shadowCoord = vShadowCoord.xyz / vShadowCoord.w;

  vec3 lDir = normalize(lPos-wp.xyz);
  float diffuse = dot(n, lDir);
  float specular = 0.;
  if(diffuse>0.){
    vec3 e = vec3(0.,0.,1.);
    vec3 r = reflect(-lDir, n);
    float s = dot(n,r);
    specular = max(.5*pow(s,2.)*(1.-roughness), .5*pow(s,20.)*roughness);
  }
  diffuse = .45 + .65 *clamp(diffuse, 0., 1.);
  specular *= diffuse;
  float rim = clamp(pow(1.-clamp(dot(vec3(0.,0.,1.), n),0.,1.),1.),0.,1.);

  float shadow = 0.;
  vec2 inc = vec2(spread) / shadowResolution;
  shadow += sampleVisibility( shadowCoord + vec3(     0., -inc.y, 0. ) );
  shadow += sampleVisibility( shadowCoord + vec3( -inc.x,     0., 0. ) );
  shadow += sampleVisibility( shadowCoord + vec3(     0.,     0., 0. ) );
  shadow += sampleVisibility( shadowCoord + vec3(  inc.x,     0., 0. ) );
  shadow += sampleVisibility( shadowCoord + vec3(     0.,  inc.y, 0. ) );
  shadow /= 5.;
  shadow = clamp(shadow, 0., 1.);
  shadow = .2 + .8 * shadow;

  diffuse *= shadow;
  specular *= shadow;

  vec3 color = mix(ambientColor*vColor, vColor * lightColor, diffuse) + specular*lightColor;
  color = max(color, vColor*ambientColor*rim);
  color = mix(color, ambientColor, clamp(.1*abs(gl_FragCoord.z/gl_FragCoord.w), 0., 1.));
  fragmentColor = vec4(color + brightness, 1. -brightness);

  // float opacity = ditherBlueNoiseTexture(blend, gl_FragCoord.xy);
  // if(opacity == 1.) {
  //   discard;
  // }

  //fragmentColor  = vec4(diffuse, diffuse, diffuse, 1.);
  //fragmentColor = vec4(vec3(shadow), 1.);
  //gl_FragDepth = gl_FragCoord.z-length(vPosition.z-p.z);
}`;

export { vs, fs, shadow_vs, shadow_fs };
