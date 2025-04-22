export const vs = `precision highp float;

in vec3 position;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

export const fs = `
precision highp float;

out vec4 fragmentColor;

void main() {
  fragmentColor = vec4(1., 1., 1., .1);
}`;
