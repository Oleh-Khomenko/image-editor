export const VERTEX_SRC = `
attribute vec2 a_position;
attribute vec2 a_uv;
varying vec2 v_uv;
void main() {
  v_uv = a_uv;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export const FRAGMENT_SRC = `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_image;
uniform float u_brightness;
uniform float u_contrast;
uniform float u_saturation;
uniform int u_filter;
const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
void main() {
  vec4 tex = texture2D(u_image, v_uv);
  vec3 c = tex.rgb;
  c *= u_brightness;
  c = (c - 0.5) * u_contrast + 0.5;
  float l = dot(c, LUMA);
  c = mix(vec3(l), c, u_saturation);
  if (u_filter == 1) {
    c = vec3(dot(c, LUMA));
  } else if (u_filter == 2) {
    vec3 s;
    s.r = dot(c, vec3(0.393, 0.769, 0.189));
    s.g = dot(c, vec3(0.349, 0.686, 0.168));
    s.b = dot(c, vec3(0.272, 0.534, 0.131));
    c = s;
  }
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), tex.a);
}
`;
