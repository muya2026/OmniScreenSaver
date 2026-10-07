import { setup2D, drawName, random, TAU } from "./common.js";

const VERTEX_SHADER = `
attribute vec2 a_position;
varying vec2 v_uv;
void main(){ v_uv = a_position * 0.5 + 0.5; gl_Position = vec4(a_position, 0.0, 1.0); }
`;
const FRAGMENT_SHADER = `
precision mediump float;
varying vec2 v_uv;
uniform vec2 u_resolution;
uniform float u_time;
uniform sampler2D u_name;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
void main(){
  vec2 uv = v_uv;
  float t = u_time * 0.12;
  vec3 color = mix(vec3(0.012,0.025,0.09), vec3(0.035,0.04,0.13), uv.y);
  float curtainA = sin(uv.x * 7.0 + sin(uv.y * 4.0 + t) * 1.6 + t * 1.4);
  float curtainB = sin(uv.x * 4.4 - sin(uv.y * 5.0 - t * 0.8) * 1.8 - t);
  float bandA = pow(max(0.0, 0.5 + 0.5 * curtainA), 8.0) * smoothstep(0.08,0.73,uv.y) * (1.0-smoothstep(0.78,1.0,uv.y));
  float bandB = pow(max(0.0, 0.5 + 0.5 * curtainB), 6.0) * smoothstep(0.08,0.66,uv.y) * (1.0-smoothstep(0.7,0.96,uv.y));
  color += vec3(0.09,0.78,0.55) * bandA * (0.7 + 0.3*sin(uv.x*3.0+t));
  color += vec3(0.26,0.31,0.91) * bandB * 0.56;
  color += vec3(0.57,0.17,0.52) * pow(max(0.0, 0.5 + 0.5*sin(uv.x*8.0+uv.y*3.0-t)),12.0) * smoothstep(0.15,0.68,uv.y) * 0.35;
  vec2 cell = floor(uv * u_resolution / 3.0);
  float star = step(0.997, hash(cell));
  float twinkle = 0.55 + 0.45 * sin(u_time * 1.4 + hash(cell+4.0)*8.0);
  color += vec3(0.62,0.75,1.0) * star * twinkle;
  vec4 nameSample = texture2D(u_name, uv);
  float nameMask = nameSample.a;
  vec3 nameColor = mix(vec3(0.4,1.0,0.79), vec3(0.75,0.72,1.0), 0.5+0.5*sin(u_time*0.4));
  color += nameColor * nameMask * (0.72 + 0.24*sin(u_time*0.8));
  float halo = texture2D(u_name, uv + vec2(0.002,0.0)).a + texture2D(u_name, uv - vec2(0.002,0.0)).a + texture2D(u_name, uv + vec2(0.0,0.005)).a + texture2D(u_name, uv - vec2(0.0,0.005)).a;
  color += vec3(0.18,0.74,0.6) * max(0.0,halo-0.1) * 0.11;
  float vignette = 1.0 - smoothstep(0.18,1.15,length((uv-0.5)*vec2(1.0,0.74)));
  color *= 0.58 + vignette * 0.42;
  gl_FragColor = vec4(color,1.0);
}
`;

function makeShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source); gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader); gl.deleteShader(shader); throw new Error(log || "Aurora shader could not compile");
  }
  return shader;
}

function createCanvasFallback(canvas, name, showName) {
  const surface = setup2D(canvas, "#061029");
  const { ctx } = surface;
  let width = 1, height = 1, lights = [];
  function resize(w, h, ratio) { surface.resize(w, h, ratio); width = w; height = h; lights = Array.from({ length: 12 }, (_, i) => ({ x: i / 11, y: random(.28, .74), phase: random(0, TAU), hue: random(150, 280) })); }
  function frame(dt, time) {
    const gradient = ctx.createLinearGradient(0, 0, 0, height); gradient.addColorStop(0, "#07142e"); gradient.addColorStop(.62, "#0b233d"); gradient.addColorStop(1, "#050813"); ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
    for (const light of lights) {
      const x = light.x * width + Math.sin(time * .16 + light.phase) * width * .06;
      const y = light.y * height + Math.sin(time * .3 + light.phase) * height * .06;
      const glow = ctx.createRadialGradient(x, y, 1, x, y, width * .19); glow.addColorStop(0, `hsla(${light.hue},95%,66%,.28)`); glow.addColorStop(1, `hsla(${light.hue},95%,48%,0)`); ctx.fillStyle = glow; ctx.fillRect(x - width * .19, y - width * .19, width * .38, width * .38);
    }
    if (showName) drawName(ctx, name, width / 2, height * .52, { maxWidth: width * .66, maxHeight: height * .2, size: 138, color: "#c6ffe9", shadow: "#46ebbe", blur: 28, alpha: .8 + .16 * Math.sin(time) });
  }
  return { resize, frame, destroy() {} };
}

export function createMode({ canvas, name, showName }) {
  let gl;
  try { gl = canvas.getContext("webgl", { alpha: false, antialias: false, powerPreference: "low-power", preserveDrawingBuffer: false }); } catch { gl = null; }
  if (!gl) return createCanvasFallback(canvas, name, showName);
  let program, position, timeLocation, resolutionLocation, textureLocation, texture, textCanvas, textCtx, width = 1, height = 1;
  try {
    const vertex = makeShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragment = makeShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    program = gl.createProgram(); gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || "Aurora program could not link");
    gl.useProgram(program);
    position = gl.getAttribLocation(program, "a_position"); timeLocation = gl.getUniformLocation(program, "u_time"); resolutionLocation = gl.getUniformLocation(program, "u_resolution"); textureLocation = gl.getUniformLocation(program, "u_name");
    const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    textCanvas = document.createElement("canvas"); textCanvas.width = 1024; textCanvas.height = 256; textCtx = textCanvas.getContext("2d");
    if (showName) {
      textCtx.textAlign = "center"; textCtx.textBaseline = "middle"; textCtx.font = `700 142px "Baloo Da 2", "Hind Siliguri", sans-serif`;
      let fontSize = 142; while (textCtx.measureText(name).width > 940 && fontSize > 60) { fontSize -= 6; textCtx.font = `700 ${fontSize}px "Baloo Da 2", "Hind Siliguri", sans-serif`; }
      const paint = textCtx.createLinearGradient(0, 55, 0, 205); paint.addColorStop(0, "rgba(220,255,244,.98)"); paint.addColorStop(.5, "rgba(125,255,212,.91)"); paint.addColorStop(1, "rgba(198,172,255,.94)");
      textCtx.shadowColor = "#55f6c5"; textCtx.shadowBlur = 14; textCtx.fillStyle = paint; textCtx.fillText(name, 512, 128, 940);
    }
    texture = gl.createTexture(); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textCanvas);
    gl.uniform1i(textureLocation, 0);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
  } catch {
    if (program) { try { gl.deleteProgram(program); } catch {} }
    function resizeFallback(w, h, ratio) {
      const pixelRatio = Math.min(2, Math.max(1, ratio || 1));
      canvas.width = Math.round(w * pixelRatio); canvas.height = Math.round(h * pixelRatio);
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    function frameFallback(dt, time) {
      gl.clearColor(.018 + .008 * Math.sin(time * .12), .035, .095 + .02 * Math.sin(time * .08), 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    return { resize: resizeFallback, frame: frameFallback, destroy() {} };
  }
  function resize(w, h, ratio) {
    width = w; height = h;
    const pixelRatio = Math.min(2, Math.max(1, ratio || 1));
    canvas.width = Math.round(w * pixelRatio); canvas.height = Math.round(h * pixelRatio);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  function frame(dt, time) {
    gl.useProgram(program);
    gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
    gl.uniform1f(timeLocation, time % 8192);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  return { resize, frame, destroy() { if (texture) gl.deleteTexture(texture); if (program) gl.deleteProgram(program); } };
}
