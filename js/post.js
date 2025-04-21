import {
  Vector2,
  RawShaderMaterial,
  RGBAFormat,
  UnsignedByteType,
  LinearFilter,
  ClampToEdgeWrapping,
  GLSL3,
  FloatType,
  NearestFilter,
} from "../third_party/three.module.min.js";

import { getFBO } from "../modules/fbo.js";
import { ShaderPass } from "../modules/shader-pass.js";
import { ShaderPingPongPass } from "../modules/shader-ping-pong-pass.js";

import { shader as orthoVertexShader } from "../shaders/ortho.js";
import { fs as vignette } from "../shaders/vignette.js";
import { fs as fxaa } from "../shaders/fxaa.js";
import { rgbShift } from "../shaders/rgb-shift.js";
import { gammaCorrect, levelRange, finalLevels } from "../shaders/levels.js";
import { blur5 } from "../shaders/fast-separable-gaussian-blur.js";
import { fs as screen } from "../shaders/screen.js";
import { fs as softLight } from "../shaders/soft-light.js";
import { fs as ditherNoise } from "../shaders/dither-noise.js";

const flipAlphaFragmentShader = `
precision highp float;

layout (location = 0) out vec4 fragmentColor;

uniform sampler2D inputTexture;
in vec2 vUv;

void main() {
  vec4 c = texture(inputTexture, vUv);
  fragmentColor = vec4(c.rgb, 1.- c.a);
}`;

const antialiasFragmentShader = `
precision highp float;

layout (location = 0) out vec4 fragmentColor;

uniform vec2 resolution;

uniform sampler2D inputTexture;
uniform sampler2D blur1Texture;
uniform sampler2D blur2Texture;
uniform sampler2D blur3Texture;
uniform sampler2D blur4Texture;
uniform sampler2D blur5Texture;

uniform float minLevel;
uniform float maxLevel;
uniform float gamma;

in vec2 vUv;
${fxaa}
${gammaCorrect}
${levelRange}
${screen}

void main() {
  vec4 color = fxaa(inputTexture, vUv );
  vec4 bloom = vec4(0.);
  bloom += 1. * texture( blur1Texture, vUv );
  bloom += 1.2 * texture( blur2Texture, vUv );
  bloom += 1.4 * texture( blur3Texture, vUv );
  bloom += 1.6 * texture( blur4Texture, vUv );
  bloom += 1.8 * texture( blur5Texture, vUv );
  bloom.rgb *= bloom.a;
  
  color= screen(color, bloom, .5);
  fragmentColor = color;
}
`;

const finalFragmentShader = `
precision highp float;

layout (location = 0) out vec4 fragmentColor;

uniform vec2 resolution;
uniform sampler2D inputTexture;
uniform float time;

in vec2 vUv;
${rgbShift}
${vignette}
${softLight}
${ditherNoise}
${gammaCorrect}
${levelRange}
${finalLevels}

vec3 ACES(vec3 x) {
    return x*(2.51*x + .03) / (x*(2.43*x + .59) + .14); // https://knarkowicz.wordpress.com/2016/01/06/aces-filmic-tone-mapping-curve/
}
vec3 ACES_Inv(vec3 x) {
    return (sqrt(-10127.*x*x + 13702.*x + 9.) + 59.*x - 3.) / (502. - 486.*x); // thanks to https://www.wolframalpha.com/input?i=2.51y%5E2%2B.03y%3Dx%282.43y%5E2%2B.59y%2B.14%29+solve+for+y
}

void main() {
  float vignetteBoost = .5;
  float vignetteReduction = .5;
  vec4 color = rgbShift(inputTexture, vUv, vec2(20.));
  color = softLight(color, vec4(vec3(vignette(vUv, vignetteBoost, vignetteReduction)),1.));
  color.rgb = finalLevels(color.rgb, vec3(0./255.), vec3(1.49), vec3(239./255.));
  // color.rgb = ACES_Inv(color.rgb);

  fragmentColor = color + .1*ditherNoise(vUv, .001*time);
}
`;

const blurFragmentShader = `
precision highp float;

layout (location = 0) out vec4 fragmentColor;

uniform vec2 resolution;
uniform sampler2D inputTexture;
uniform vec2 direction;

in vec2 vUv;

${blur5}

void main() {
  fragmentColor = blur5(inputTexture, vUv, resolution, direction);
}`;

function Post(params = {}) {
  let w = 1;
  let h = 1;

  const colorFBO = getFBO(w, h); //, { type: FloatType });
  if (params.helper) {
    params.helper.attach(colorFBO, "color_post");
  }

  const blurPasses = [];
  const levels = 5;
  const blurShader = new RawShaderMaterial({
    uniforms: {
      inputTexture: { value: null },
      resolution: { value: new Vector2(1, 1) },
      direction: { value: new Vector2(0, 1) },
    },
    vertexShader: orthoVertexShader,
    fragmentShader: blurFragmentShader,
    glslVersion: GLSL3,
  });
  let tw = w;
  let th = h;
  for (let i = 0; i < levels; i++) {
    tw /= 2;
    th /= 2;
    tw = Math.round(tw);
    th = Math.round(th);
    const blurPass = new ShaderPingPongPass(blurShader);
    blurPasses.push(blurPass);
    if (params.helper) {
      params.helper.attach(blurPass.fbo, `blur ${i}`);
    }
  }

  const antialiasShader = new RawShaderMaterial({
    uniforms: {
      resolution: { value: new Vector2(1, 1) },
      inputTexture: { value: colorFBO.texture },
      blur1Texture: { value: blurPasses[0].fbo.texture },
      blur2Texture: { value: blurPasses[1].fbo.texture },
      blur3Texture: { value: blurPasses[2].fbo.texture },
      blur4Texture: { value: blurPasses[3].fbo.texture },
      blur5Texture: { value: blurPasses[4].fbo.texture },
      minLevel: { value: params.minLevel || 0 },
      maxLevel: { value: params.maxLevel || 0.8 },
      gamma: { value: params.gamma || 1.4 },
    },
    vertexShader: orthoVertexShader,
    fragmentShader: antialiasFragmentShader,
    glslVersion: GLSL3,
  });
  const antialiasPass = new ShaderPass(antialiasShader, {
    minFilter: NearestFilter,
    magFilter: NearestFilter,
  });

  const finalShader = new RawShaderMaterial({
    uniforms: {
      resolution: { value: new Vector2(1, 1) },
      inputTexture: { value: antialiasPass.fbo.texture },
      time: { value: 0 },
    },
    vertexShader: orthoVertexShader,
    fragmentShader: finalFragmentShader,
    glslVersion: GLSL3,
  });
  const finalPass = new ShaderPass(finalShader, {
    minFilter: NearestFilter,
    magFilter: NearestFilter,
  });
  finalPass.setSize(w, h);

  const flipShader = new RawShaderMaterial({
    uniforms: {
      inputTexture: { value: colorFBO.texture },
    },
    vertexShader: orthoVertexShader,
    fragmentShader: flipAlphaFragmentShader,
    glslVersion: GLSL3,
  });
  const flipPass = new ShaderPass(flipShader, {
    minFilter: NearestFilter,
    magFilter: NearestFilter,
  });
  flipPass.setSize(w, h);

  function render(renderer, scene, camera) {
    const size = new Vector2();
    renderer.getSize(size);
    if (size.width !== w || size.height !== h) {
      console.log(`Resize ${size.width}, ${size.height}`);
      w = size.width;
      h = size.height;
      const dPR = renderer.getPixelRatio();
      colorFBO.setSize(w * dPR, h * dPR);
      flipPass.setSize(w * dPR, h * dPR);
      antialiasPass.setSize(w * dPR, h * dPR);
      antialiasShader.uniforms.resolution.value.set(w * dPR, h * dPR);
      finalPass.setSize(w * dPR, h * dPR);
      finalShader.uniforms.resolution.value.set(w * dPR, h * dPR);
      let tw = w;
      let th = h;
      for (let i = 0; i < levels; i++) {
        tw /= 2;
        th /= 2;
        tw = Math.round(tw);
        th = Math.round(th);
        blurPasses[i].setSize(tw, th);
        if (params.helper) {
          params.helper.refreshFBO(blurPasses[i].fbo, tw, th);
        }
      }
      if (params.helper) {
        params.helper.setSize(w, h);
        params.helper.refreshFBO(colorFBO);
      }
    }

    renderer.setRenderTarget(colorFBO);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);

    flipPass.render(renderer);

    let offset = 1; // w / size.x;
    let tw = w;
    let th = h;
    blurShader.uniforms.inputTexture.value = flipPass.fbo.texture;
    for (let j = 0; j < levels; j++) {
      tw /= 2;
      th /= 2;
      tw = Math.round(tw);
      th = Math.round(th);
      blurShader.uniforms.resolution.value.set(tw, th);
      blurShader.uniforms.direction.value.set(offset, 0);
      const blurPass = blurPasses[j];
      blurPass.render(renderer);
      blurShader.uniforms.inputTexture.value = blurPass.texture;
      blurShader.uniforms.direction.value.set(0, offset);
      blurPass.render(renderer);
      blurShader.uniforms.inputTexture.value = blurPass.texture;
    }
    antialiasPass.render(renderer);
    finalPass.shader.uniforms.time.value = performance.now();
    finalPass.render(renderer, true);
  }

  return {
    render,
  };
}

export { Post };
