const fs = `
uniform sampler2D blueNoiseTexture;
  
float ditherBlueNoiseTexture(float v, vec2 uv) {
  vec2 blueNoiseUV = uv / vec2(1024.0, 1024.0);
  float blueNoise = texture(blueNoiseTexture, blueNoiseUV).r;
  return step(v, blueNoise);
}`;

export { fs };
