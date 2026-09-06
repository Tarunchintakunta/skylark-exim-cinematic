import * as THREE from 'three'

export const oceanUniforms = () => ({
  uTime: { value: 0 },
  uSwell: { value: 0.55 },
  uSunDir: { value: new THREE.Vector3(0.55, 0.62, 0.35).normalize() },
  uShallow: { value: new THREE.Color('#2FA889') },
  uDeep: { value: new THREE.Color('#062634') },
  uSky: { value: new THREE.Color('#BFE0EC') },
  uFoam: { value: new THREE.Color('#EAF6F8') },
  uHaze: { value: 0.55 },
  uDepthBias: { value: 0.12 },
})


/** Shared Gerstner sum. Anything that must sit on the water reuses this. */
export const gerstnerGLSL = /* glsl */ `
float sk_band(vec2 dir, float amp, float len, float speed, vec2 p, float t) {
  float k = 6.28318 / len;
  return amp * sin(k * (dot(normalize(dir), p) - speed * t));
}
vec3 sk_disp(vec2 dir, float amp, float len, float speed, vec2 p, float t) {
  float k = 6.28318 / len;
  float f = k * (dot(normalize(dir), p) - speed * t);
  vec2 d = normalize(dir);
  return vec3(d.x * amp * cos(f), d.y * amp * cos(f), amp * sin(f));
}
/** Full displacement in ocean-plane local space: xy lateral, z vertical. */
vec3 skOceanDisp(vec2 p, float t, float s) {
  vec3 d = vec3(0.0);
  d += sk_disp(vec2(1.0, 0.22),  1.55 * s, 62.0, 6.2, p, t);
  d += sk_disp(vec2(0.78, -0.6), 0.90 * s, 34.0, 4.6, p, t);
  d += sk_disp(vec2(-0.4, 0.9),  0.46 * s, 17.5, 3.4, p, t);
  d += sk_disp(vec2(0.2, 1.0),   0.20 * s, 7.6,  2.4, p, t);
  d += sk_disp(vec2(-0.9, 0.15), 0.09 * s, 3.1,  1.8, p, t);
  return d;
}
float skOceanHeight(vec2 p, float t, float s) { return skOceanDisp(p, t, s).z; }
`

/** Live swell amplitude, shared between the ocean and everything riding it. */
export const swellRef = { current: 0.55 }

export const oceanVertex = /* glsl */ `
uniform float uTime;
uniform float uSwell;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vCrest;

// Gerstner-style band
vec3 wave(vec2 dir, float amp, float len, float speed, vec2 p, inout vec3 n) {
  float k = 6.28318 / len;
  float f = k * (dot(normalize(dir), p) - speed * uTime);
  float a = amp;
  vec3 d;
  d.x = normalize(dir).x * a * cos(f);
  d.y = normalize(dir).y * a * cos(f);
  d.z = a * sin(f);
  n.x -= normalize(dir).x * k * a * cos(f);
  n.y -= normalize(dir).y * k * a * cos(f);
  return d;
}

void main() {
  vec3 pos = position;
  vec2 p = position.xy;
  vec3 n = vec3(0.0, 0.0, 1.0);
  float s = uSwell;
  vec3 d = vec3(0.0);
  d += wave(vec2(1.0, 0.22),  1.55 * s, 62.0, 6.2, p, n);
  d += wave(vec2(0.78, -0.6), 0.90 * s, 34.0, 4.6, p, n);
  d += wave(vec2(-0.4, 0.9),  0.46 * s, 17.5, 3.4, p, n);
  d += wave(vec2(0.2, 1.0),   0.20 * s, 7.6,  2.4, p, n);
  d += wave(vec2(-0.9, 0.15), 0.09 * s, 3.1,  1.8, p, n);
  pos += d;
  vCrest = clamp((d.z / max(0.35, 2.2 * s)) * 0.5 + 0.5, 0.0, 1.0);
  vNormal = normalize(n);
  vec4 wp = modelMatrix * vec4(pos, 1.0);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

export const oceanFragment = /* glsl */ `
uniform vec3 uShallow;
uniform vec3 uDeep;
uniform vec3 uSky;
uniform vec3 uFoam;
uniform vec3 uSunDir;
uniform float uHaze;
uniform float uDepthBias;
uniform float uTime;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vCrest;

void main() {
  vec3 n = normalize(vec3(vNormal.x, vNormal.y, vNormal.z));
  vec3 viewDir = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - clamp(dot(n, viewDir), 0.0, 1.0), 3.0);

  float dist = length(vWorld.xz - cameraPosition.xz);
  float depthMix = smoothstep(20.0, 340.0, dist);
  // open water is deep water: away from the harbour the colour drops toward navy,
  // which is what lets white foam and a wake read from directly overhead
  vec3 base = mix(uShallow, uDeep, clamp(0.34 + uDepthBias + 0.34 * depthMix, 0.0, 1.0));

  // sun glint
  vec3 h = normalize(uSunDir + viewDir);
  float spec = pow(max(dot(n, h), 0.0), 190.0) * 1.9;
  float sheen = pow(max(dot(n, h), 0.0), 22.0) * 0.30;

  // crest foam
  // crest foam. A wide threshold turned whole wave faces into flat pale slabs
  // that read as floes from a high camera, so it starts nearer the crest.
  float foam = smoothstep(0.968, 0.999, vCrest) * 0.22;
  foam += smoothstep(0.986, 1.0, vCrest) * 0.30;

  vec3 col = mix(base, uSky, fres * 0.55);
  // water reflects weakly when you look straight down at it and strongly at
  // grazing angles. Without this the aerial chapter caught a full-frame sheen
  // that washed the open Bay to grey and swallowed the wake.
  float glint = 0.25 + 0.75 * pow(1.0 - clamp(dot(n, viewDir), 0.0, 1.0), 1.5);
  col += vec3(1.0, 0.96, 0.86) * (spec + sheen) * glint;
  col = mix(col, uFoam, clamp(foam, 0.0, 0.62));

  // humid coastal haze toward the horizon
  float haze = smoothstep(180.0, 900.0, dist) * uHaze;
  col = mix(col, uSky, haze);

  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`

export function makeOceanMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: oceanUniforms(),
    vertexShader: oceanVertex,
    fragmentShader: oceanFragment,
    side: THREE.DoubleSide,
  })
}
