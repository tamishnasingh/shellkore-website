/**
 * The construction roadmap scene: one tower built from an empty plot to handover, driven by a single
 * progress value P (0 → 7, one unit per phase). Everything is deterministic in P, so scrolling backwards
 * un-builds the tower exactly.
 *
 * Rendering is on demand only (the caller renders when P, the pointer or the size changes). Repeated parts
 * are InstancedMeshes (a handful of draw calls for ~2,000 parts), surfaces use small seamless PBR textures
 * mapped in world space (triplanar), shadows are re-rendered only when geometry moves, and the device pixel
 * ratio adapts to the frame rate.
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/* ------------------------------------------------------------------ timing helpers */
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const ss = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const outBack = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/* ------------------------------------------------------------------ the building */
const FH = 3.3, SLAB = 0.28, PL = 0.7, FLOORS = 9;
const XS = [-11, -5.5, 0, 5.5, 11], ZS = [-7, -7 / 3, 7 / 3, 7];
const lvl = (i: number) => PL + i * FH;
const ROOF = lvl(FLOORS);
const T_STRUCT = 3.0, DT = 0.1; // floor i starts rising at 3 + i * DT: the frame fills phase 4 (P 3 → 4)
const T_MASON = 4.0, DM = 0.098; // masonry fills phase 5 (P 4 → 5)
const T_FACADE = 5.0, DF = 0.088; // curtain wall fills phase 6 (P 5 → 6)
/** Height of the top of the frame as built at progress P (continuous). */
export const builtTop = (P: number) => (P < 2.45 ? 0 : P < T_STRUCT ? PL * ss(2.45, 2.75, P) : PL + clamp01((P - T_STRUCT - 0.07) / (DT * FLOORS)) * FLOORS * FH);

/* ------------------------------------------------------------------ instanced layers */
type Mode = "grow" | "drop" | "pop" | "sink";
type V3 = [number, number, number];
interface Rec { p: V3; s: V3; r?: V3; t: [number, number]; out?: [number, number]; mode: Mode; c?: [number, number, number, number]; lit?: number; col?: number }

const _p = new THREE.Vector3(), _s = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _m = new THREE.Matrix4();
const _c = new THREE.Color(), _c0 = new THREE.Color(), _c1 = new THREE.Color();

class Layer {
  recs: Rec[] = [];
  mesh!: THREE.InstancedMesh;
  constructor(public geo: THREE.BufferGeometry, public mat: THREE.Material, public cast = true, public receive = true) {}
  add(r: Rec) { this.recs.push(r); }
  build(parent: THREE.Object3D) {
    const n = this.recs.length;
    let geo = this.geo;
    if (this.recs.some((r) => r.lit !== undefined)) {
      geo = geo.clone();
      geo.setAttribute("aLit", new THREE.InstancedBufferAttribute(new Float32Array(this.recs.map((r) => r.lit ?? 0)), 1));
    }
    this.mesh = new THREE.InstancedMesh(geo, this.mat, Math.max(1, n));
    this.mesh.count = n;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.castShadow = this.cast; this.mesh.receiveShadow = this.receive;
    this.mesh.frustumCulled = false;
    if (this.recs.some((r) => r.c || r.col !== undefined)) {
      this.recs.forEach((r, i) => this.mesh.setColorAt(i, _c.set(r.col ?? r.c?.[0] ?? 0xffffff)));
    }
    const w: [number, number][] = [];
    for (const r of this.recs) { w.push([r.t[0], r.t[1]]); if (r.out) w.push([r.out[0], r.out[1]]); if (r.c) w.push([r.c[2], r.c[3]]); }
    this.wins = merge(w);
    parent.add(this.mesh);
  }
  /** Per-part cache of the last state written, so unchanged parts cost nothing and nothing is re-uploaded. */
  private lastK = new Float32Array(0); private lastO = new Float32Array(0); private lastC = new Float32Array(0); private lastY = new Float32Array(0);
  /** Merged time windows in which any part of this layer changes; outside them the whole layer is skipped. */
  wins: [number, number][] = [];
  private lp = NaN;
  addWindow(a: number, b: number) { this.wins.push([a, b]); this.wins = merge(this.wins); }
  update(P: number): boolean {
    const recs = this.recs, mesh = this.mesh;
    if (this.lp === this.lp) {
      const a = Math.min(this.lp, P), b = Math.max(this.lp, P);
      let hit = false;
      for (const w of this.wins) if (b >= w[0] && a <= w[1]) { hit = true; break; }
      this.lp = P;
      if (!hit) return false;
    } else this.lp = P;
    if (this.lastK.length !== recs.length) {
      this.lastK = new Float32Array(recs.length).fill(-1); this.lastO = new Float32Array(recs.length).fill(-1);
      this.lastC = new Float32Array(recs.length).fill(-1); this.lastY = new Float32Array(recs.length).fill(NaN);
    }
    let dirtyM = false, dirtyC = false;
    for (let i = 0; i < recs.length; i++) {
      const r = recs[i];
      let k = ss(r.t[0], r.t[1], P);
      const o = r.out ? ss(r.out[0], r.out[1], P) : 0;
      if (r.c) {
        const ck = ss(r.c[2], r.c[3], P);
        if (ck !== this.lastC[i]) {
          this.lastC[i] = ck; dirtyC = true;
          mesh.setColorAt(i, _c.lerpColors(_c0.set(r.c[0]), _c1.set(r.c[1]), ck));
        }
      }
      if (k === this.lastK[i] && o === this.lastO[i] && r.p[1] === this.lastY[i]) continue;
      this.lastK[i] = k; this.lastO[i] = o; this.lastY[i] = r.p[1]; dirtyM = true;
      _p.set(r.p[0], r.p[1], r.p[2]);
      _s.set(r.s[0], r.s[1], r.s[2]);
      if (k <= 0.0005 || o >= 0.9995) { _s.set(0, 0, 0); }
      else if (r.mode === "grow") { _s.y *= k * (1 - o); }
      else if (r.mode === "drop") { _p.y += (1 - k) * 2.6; _s.multiplyScalar(0.94 + 0.06 * k); if (o) _s.y *= 1 - o; }
      else if (r.mode === "pop") { k = outBack(k) * (1 - o); _s.multiplyScalar(k); }
      else if (r.mode === "sink") { _p.y -= (1 - k) * r.s[1] + o * (r.s[1] + 0.2); }
      if (r.r) _q.setFromEuler(_e.set(r.r[0], r.r[1], r.r[2])); else _q.identity();
      mesh.setMatrixAt(i, _m.compose(_p, _q, _s));
    }
    if (dirtyM) mesh.instanceMatrix.needsUpdate = true;
    if (dirtyC && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    return dirtyM;
  }
}

function merge(w: [number, number][]): [number, number][] {
  const s = w.map(([a, b]) => [Math.min(a, b), Math.max(a, b)] as [number, number]).sort((x, y) => x[0] - y[0]);
  const out: [number, number][] = [];
  for (const iv of s) { const l = out[out.length - 1]; if (l && iv[0] <= l[1] + 1e-6) l[1] = Math.max(l[1], iv[1]); else out.push([iv[0], iv[1]]); }
  return out;
}
// Yield between build steps. Where the browser offers it, wait for an idle moment, so the build never takes a
// frame away from scrolling; the timeout keeps it from stalling on a page that is never idle.
const idle = () => new Promise<void>((r) => {
  const ric = (globalThis as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
  if (ric) ric(() => r(), { timeout: 250 }); else setTimeout(r, 0);
});

/* ------------------------------------------------------------------ materials */
/** World-space (triplanar) texturing with UDN-blended normal maps, so every box, whatever its size, gets a
 *  correctly scaled, seamless surface. */
function triplanar<T extends THREE.MeshStandardMaterial | THREE.MeshLambertMaterial>(mat: T, scale: [number, number], normalScale = 1) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTri = { value: new THREE.Vector2(scale[0], scale[1]) };
    sh.uniforms.uNs = { value: normalScale };
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vTriPos;\nvarying vec3 vTriNrm;")
      .replace("#include <project_vertex>", `#include <project_vertex>
        vec4 triW = vec4(transformed, 1.0);
        vec3 triN = objectNormal;
        #ifdef USE_INSTANCING
          triW = instanceMatrix * triW;
          triN = mat3(instanceMatrix) * triN;
        #endif
        triW = modelMatrix * triW;
        vTriPos = triW.xyz;
        vTriNrm = normalize(mat3(modelMatrix) * triN);`);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vTriPos;\nvarying vec3 vTriNrm;\nuniform vec2 uTri;\nuniform float uNs;")
      .replace("#include <map_fragment>", `
        vec3 triWN = normalize(vTriNrm);
        vec3 triB = pow(abs(triWN), vec3(6.0)); triB /= (triB.x + triB.y + triB.z);
        vec2 uvX = vTriPos.zy * uTri; vec2 uvY = vTriPos.xz * uTri.xx; vec2 uvZ = vTriPos.xy * uTri;
        #ifdef USE_MAP
          vec4 triC = texture2D(map, uvX) * triB.x + texture2D(map, uvY) * triB.y + texture2D(map, uvZ) * triB.z;
          diffuseColor *= triC;
        #endif`)
      .replace("#include <normal_fragment_maps>", `
        #ifdef USE_NORMALMAP
          vec3 tX = texture2D(normalMap, uvX).xyz * 2.0 - 1.0;
          vec3 tY = texture2D(normalMap, uvY).xyz * 2.0 - 1.0;
          vec3 tZ = texture2D(normalMap, uvZ).xyz * 2.0 - 1.0;
          tX.xy *= uNs; tY.xy *= uNs; tZ.xy *= uNs;
          vec3 sgn = sign(triWN);
          tX.x *= sgn.x; tY.x *= sgn.y; tZ.x *= -sgn.z;
          tX = vec3(tX.xy + triWN.zy, triWN.x);
          tY = vec3(tY.xy + triWN.xz, triWN.y);
          tZ = vec3(tZ.xy + triWN.xy, triWN.z);
          vec3 triPert = normalize(tX.zyx * triB.x + tY.xzy * triB.y + tZ.xyz * triB.z);
          normal = normalize((viewMatrix * vec4(triPert, 0.0)).xyz);
        #endif`);
  };
  mat.customProgramCacheKey = () => "tri" + scale.join(",") + normalScale;
  return mat;
}

/** Glass whose windows can glow warm at dusk, per instance (attribute aLit). */
function litGlass(mat: THREE.MeshStandardMaterial, u: { uDusk: { value: number }; uLitCol: { value: THREE.Color } }) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uDusk = u.uDusk; sh.uniforms.uLitCol = u.uLitCol;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aLit;\nvarying float vLit;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvLit = aLit;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vLit;\nuniform float uDusk;\nuniform vec3 uLitCol;")
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance += uLitCol * vLit * uDusk;");
  };
  mat.customProgramCacheKey = () => "litglass";
  return mat;
}

/* ------------------------------------------------------------------ small geometry helpers */
const unitBox = () => new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
/** A thin bar from a to b (for lattices: crane, scaffolding braces). */
function bar(a: THREE.Vector3, b: THREE.Vector3, t: number) {
  const d = new THREE.Vector3().subVectors(b, a), len = d.length();
  const g = new THREE.BoxGeometry(t, t, len);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d.normalize()));
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return g;
}
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
function rng(seed: number) { return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; }

function labelTexture(text: string) {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = "#FFFFFF"; g.beginPath(); g.arc(64, 64, 52, 0, Math.PI * 2); g.fill();
  g.lineWidth = 7; g.strokeStyle = "#16150F"; g.stroke();
  g.fillStyle = "#16150F"; g.font = "600 58px system-ui, -apple-system, Segoe UI, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(text, 64, 68);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function mullionTexture() {
  const c = document.createElement("canvas"); c.width = 256; c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#FFFFFF"; g.fillRect(0, 0, 256, 256);
  g.fillStyle = "#3A3F44";
  g.fillRect(0, 0, 256, 9); g.fillRect(0, 247, 256, 9); g.fillRect(0, 0, 8, 256); g.fillRect(248, 0, 8, 256);
  for (const x of [64, 128, 192]) g.fillRect(x - 3, 0, 6, 256);
  g.fillRect(0, 46, 256, 5); // transom
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

/* ------------------------------------------------------------------ quality: chosen before the first frame */
// new key: tiers remembered under the old (lower-resolution) scheme are discarded
const TIER_KEY = "sk3d-q2";
let gpuName: string | null = null;
/** The GPU's name, read once from a throwaway context (so the real one can be created with the right settings). */
function probeGpu(): string {
  if (gpuName !== null) return gpuName;
  gpuName = "";
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl2") || c.getContext("webgl")) as WebGLRenderingContext | null;
    if (gl) {
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      gpuName = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || "");
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
  } catch { /* unknown GPU: start at the default tier */ }
  return gpuName;
}
/** Starting tier: phones and integrated / software GPUs start one step down; a tier this device needed before is remembered. */
function startTier(mobile: boolean): number {
  const gpu = probeGpu();
  let t = mobile ? 1 : 0;
  if (!/apple/i.test(gpu) && /intel|mali|adreno|powervr|swiftshader|llvmpipe|basic render|software|microsoft/i.test(gpu)) t = Math.max(t, 1);
  try { const saved = Number(localStorage.getItem(TIER_KEY)); if (Number.isFinite(saved) && saved > 0) t = Math.max(t, Math.min(3, saved)); } catch { /* storage blocked */ }
  return t;
}

/* ------------------------------------------------------------------ public API */
export type Scene = {
  update: (P: number, px: number, py: number) => void;
  render: (settle?: boolean) => void;
  resize: (w: number, h: number, dpr: number) => void;
  /** Screen position (CSS px within the canvas) of a phase's callout anchor, or null if behind the camera. */
  anchor: (phase: number, P: number) => { x: number; y: number } | null;
  /** Hero mode: the finished tower with a scan line; real below it, the digital twin above. t in seconds. */
  hero: (t: number, px: number, py: number) => { scan: number; level: number; pins: ({ x: number; y: number } | null)[] };
  dispose: () => void;
  /** Lowest quality tier: shadows redraw only when the scroll settles. */
  setLiveShadows: (on: boolean) => void;
  setTier: (n: number) => boolean;
  readonly tier: number;
  gpuMs: () => number;
  resetGpu: () => void;
  readonly dpr: number;
};

type Opts = { tex: Record<string, string>; mobile: boolean; reduce: boolean; mode?: "roadmap" | "hero" };

export async function createScene(canvas: HTMLCanvasElement, opts: Opts): Promise<Scene> {
  // MSAA only where pixels are big enough to need it; on high-density screens the pixels do the smoothing
  const devDpr = window.devicePixelRatio || 1;
  // the screen's real pixel density (capped at 2: beyond that the eye can't tell, the GPU can)
  const native = Math.max(1, Math.min(devDpr, 2));
  const hiDpi = native >= 1.75;
  // Quality tiers. Resolution is the last thing to go: the first steps only make shadows redraw when the
  // scroll settles. Even the lightest tier never drops below one pixel per CSS pixel, and a frame at rest
  // is always redrawn at the screen's full density (see render), so the model is never soft when you look at it.
  const TIERS = [
    { dpr: native, live: true },
    { dpr: native, live: false },
    { dpr: Math.max(1, Math.min(native, 1.5)), live: false },
    { dpr: Math.max(1, native * 0.75), live: false },
  ];
  let tier = startTier(opts.mobile);
  let liveShadows = TIERS[tier].live;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !hiDpi, alpha: false, powerPreference: "high-performance", stencil: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.5, 1400);

  /* ---------- textures */
  // decoded off the main thread where the browser can (ImageBitmap), so no frame waits on image decoding.
  // Every texture here is seamless and flip-agnostic, so the bitmap's orientation doesn't matter.
  const loader = new THREE.TextureLoader();
  const bitmaps = typeof createImageBitmap === "function" ? new THREE.ImageBitmapLoader() : null;
  const maxAniso = Math.min(opts.mobile ? 8 : 16, renderer.capabilities.getMaxAnisotropy());
  const textures: THREE.Texture[] = [];
  const fetchTex = async (url: string): Promise<THREE.Texture> => {
    if (bitmaps) {
      try { const bmp = await bitmaps.loadAsync(url); const t = new THREE.Texture(bmp as unknown as HTMLImageElement); t.flipY = false; t.needsUpdate = true; return t; } catch { /* fall back */ }
    }
    return loader.loadAsync(url);
  };
  const load = (key: string, srgb: boolean, rep = 1) =>
    fetchTex(opts.tex[key]).then((t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep);
      t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = maxAniso;
      textures.push(t);
      return t;
    });
  const [concrete, concreteN, soil, soilN, brick, brickN, grass, grassN, asphalt, asphaltN, ply, blob] = await Promise.all([
    load("concrete", true), load("concrete_n", false), load("soil", true, 9), load("soil_n", false, 9),
    load("brick", true), load("brick_n", false), load("grass", true, 10), load("grass_n", false, 10),
    load("asphalt", true, 1), load("asphalt_n", false, 1), load("ply", true), load("blob", true),
  ]);

  await idle();

  /* ---------- light: soft daylight that turns golden at handover */
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  // no scene-wide environment: sampling it on every surface was the single biggest cost per frame.
  // Reflections are kept where they read (glass, metal); the rest is lit by the sun and a sky light.
  const fill = new THREE.AmbientLight(0xf9f7f3, 0.18); scene.add(fill);
  const hemi = new THREE.HemisphereLight(0xfdfbf8, 0xafada9, 1.2);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xf7f5f1, 2.6);
  sun.castShadow = true;
  const sm = opts.mobile ? 1536 : 2048;
  sun.shadow.mapSize.set(sm, sm);
  Object.assign(sun.shadow.camera, { left: -46, right: 46, top: 46, bottom: -46, near: 10, far: 220 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04; sun.shadow.radius = opts.mobile ? 1.6 : 2.4;
  scene.add(sun, sun.target);

  const DAY = { top: new THREE.Color("#DCE3E8"), hor: new THREE.Color("#F3F1EC"), bot: new THREE.Color("#ECE9E3") };
  const DUSK = { top: new THREE.Color("#CDD2DB"), hor: new THREE.Color("#ECE9E4"), bot: new THREE.Color("#E6E3DD") };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(600, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { uTop: { value: DAY.top.clone() }, uHor: { value: DAY.hor.clone() }, uBot: { value: DAY.bot.clone() } },
      vertexShader: "varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }",
      fragmentShader: `uniform vec3 uTop; uniform vec3 uHor; uniform vec3 uBot; varying vec3 vW;
        void main(){ float h = normalize(vW - cameraPosition).y;
          vec3 c = h > 0.0 ? mix(uHor, uTop, pow(smoothstep(0.0, 0.85, h), 0.7)) : mix(uHor, uBot, smoothstep(0.0, -0.25, h));
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`,
    }),
  );
  sky.renderOrder = -1;
  scene.add(sky);
  scene.fog = new THREE.Fog(DAY.hor.clone(), 110, 420);

  await idle();

  /* ---------- materials (phones skip the world-mapped normal maps: same look at arm's length, far less work) */
  const LITE = opts.mobile;
  const M = {
    concrete: triplanar(new THREE.MeshLambertMaterial({ map: concrete, normalMap: LITE ? undefined : concreteN, color: 0xffffff }), [1 / 3, 1 / 3], 0.9),
    plaster: triplanar(new THREE.MeshLambertMaterial({ map: concrete, normalMap: LITE ? undefined : concreteN, color: 0xfbf8f2 }), [1 / 2.4, 1 / 2.4], 0.5),
    brick: triplanar(new THREE.MeshLambertMaterial({ map: brick, normalMap: LITE ? undefined : brickN }), [1 / 0.9, 1 / 0.6], 1.2),
    ply: triplanar(new THREE.MeshLambertMaterial({ map: ply }), [1 / 1.6, 1 / 1.6]),
    steel: new THREE.MeshStandardMaterial({ color: 0x9aa3a8, metalness: 0.65, roughness: 0.38 }),
    rebar: new THREE.MeshLambertMaterial({ color: 0x4b4844 }),
    brand: new THREE.MeshStandardMaterial({ color: 0x2c2b27, metalness: 0.4, roughness: 0.45 }),
    white: new THREE.MeshLambertMaterial({ color: 0xf3f1ec }),
    dark: new THREE.MeshLambertMaterial({ color: 0x24262a }),
    tint: new THREE.MeshStandardMaterial({ color: 0x2f3a42, metalness: 0.8, roughness: 0.12 }),
    bag: new THREE.MeshLambertMaterial({ color: 0xd7d5d1 }),
    solar: new THREE.MeshStandardMaterial({ color: 0x233246, metalness: 0.6, roughness: 0.25 }),
    leaf: new THREE.MeshLambertMaterial({ color: 0xffffff }),
    bark: new THREE.MeshLambertMaterial({ color: 0x5c5a56 }),
    block: new THREE.MeshLambertMaterial({ color: 0xf1ede6 }),
    rail: new THREE.MeshStandardMaterial({ color: 0xcfe2ea, metalness: 0.2, roughness: 0.05, transparent: true, opacity: 0.32, depthWrite: false }),
    lamp: new THREE.MeshLambertMaterial({ color: 0xf7f5f1, emissive: 0xf4f2ee, emissiveIntensity: 0 }),
  };
  const HERO = opts.mode === "hero";
  const solidClip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e6);
  const glassU = { uDusk: { value: 0 }, uLitCol: { value: new THREE.Color(1.0, 0.9, 0.74).multiplyScalar(0.85) } };
  const glass = litGlass(new THREE.MeshStandardMaterial({ color: 0x9fbccb, metalness: 0.92, roughness: 0.07, map: mullionTexture(), envMapIntensity: 1.6 }), glassU);
  const glassPlain = litGlass(new THREE.MeshStandardMaterial({ color: 0x8eaab8, metalness: 0.9, roughness: 0.08, envMapIntensity: 1.5 }), glassU);
  for (const m of [glass, glassPlain, M.rail, M.tint, M.solar, M.steel, M.brand]) { m.envMap = env; m.envMapIntensity = m === glass || m === glassPlain ? 1.6 : 0.7; }

  if (HERO) {
    for (const m of [M.concrete, M.plaster, M.brick, M.steel, M.rail, M.solar, M.tint, glass, glassPlain]) m.clippingPlanes = [solidClip];
  }

  /* ---------- ground: soft paper-coloured world, the plot, road and pavement */
  const world = new THREE.Group(); scene.add(world);
  const groundMat = new THREE.MeshLambertMaterial({ color: 0xe8e4dc });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), groundMat);
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; ground.receiveShadow = true; world.add(ground);

  const PLOT = { x0: -28, x1: 28, z0: -20, z1: 24 };
  const plotGeo = new THREE.PlaneGeometry(PLOT.x1 - PLOT.x0, PLOT.z1 - PLOT.z0);
  const plot = new THREE.Mesh(plotGeo, new THREE.MeshLambertMaterial({ map: soil, normalMap: soilN, normalScale: new THREE.Vector2(1.2, 1.2) }));
  plot.rotation.x = -Math.PI / 2; plot.position.set(0, 0, (PLOT.z0 + PLOT.z1) / 2); plot.receiveShadow = true; world.add(plot);

  // excavated pad (darker, slightly lower-looking earth) under the footprint
  const digMap = soil.clone(); digMap.repeat.set(4.5, 3.2); const digN = soilN.clone(); digN.repeat.set(4.5, 3.2);
  const dig = new THREE.Mesh(new THREE.PlaneGeometry(28, 20), new THREE.MeshLambertMaterial({ map: digMap, normalMap: digN, color: 0x898783, polygonOffset: true, polygonOffsetFactor: -1 }));
  dig.rotation.x = -Math.PI / 2; dig.position.set(0, 0.005, 0.5); dig.receiveShadow = true; world.add(dig);

  const asphaltMat = new THREE.MeshLambertMaterial({ map: asphalt, normalMap: asphaltN });
  asphalt.repeat.set(240, 2); asphaltN.repeat.set(240, 2);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(1200, 10), asphaltMat);
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0.01, 31); road.receiveShadow = true; world.add(road);
  const walk = new THREE.Mesh(new THREE.BoxGeometry(1200, 0.16, 2.6).translate(0, 0.08, 0), M.plaster);
  walk.position.set(0, 0, 24.9); walk.receiveShadow = true; world.add(walk);
  const walk2 = walk.clone(); walk2.position.z = 37.3; world.add(walk2);

  const L: Record<string, Layer> = {
    marks: new Layer(new THREE.BoxGeometry(3, 0.02, 0.18).translate(0, 0.01, 0), M.white, false, true),
    stake: new Layer(new THREE.CylinderGeometry(0.07, 0.09, 1, 6).translate(0, 0.5, 0), M.ply, true, false),
    stakeTip: new Layer(new THREE.BoxGeometry(0.62, 0.4, 0.03).translate(0.31, -0.2, 0), M.brand, true, false),
    footing: new Layer(unitBox(), M.concrete),
    plinth: new Layer(unitBox(), M.concrete),
    col: new Layer(unitBox(), M.concrete),
    slab: new Layer(unitBox(), M.concrete),
    core: new Layer(unitBox(), M.plaster),
    roof: new Layer(unitBox(), M.plaster),
    solar: new Layer(new THREE.BoxGeometry(1.7, 0.05, 1.0).translate(0, 0.025, 0), M.solar),
    brick: new Layer(unitBox(), M.brick),
    glassFront: new Layer(unitBox(), glass, false, true),
    glassWin: new Layer(unitBox(), glassPlain, false, true),
    rail: new Layer(unitBox(), M.rail, false, false),
    handrail: new Layer(unitBox(), M.steel, false, false),
    scaf: new Layer(unitBox(), M.steel, true, false),
    plank: new Layer(unitBox(), M.ply, true, true),
    fence: new Layer(unitBox(), M.ply),
    fenceTop: new Layer(unitBox(), M.brand, false, false),
    office: new Layer(unitBox(), M.white),
    officeBand: new Layer(unitBox(), M.brand, false, false),
    officeWin: new Layer(unitBox(), M.tint, false, false),
    pallet: new Layer(unitBox(), M.ply),
    bag: new Layer(unitBox(), M.bag),
    bar: new Layer(new THREE.CylinderGeometry(0.05, 0.05, 1, 5).translate(0, 0.5, 0), M.rebar),
    bricks: new Layer(unitBox(), M.brick),
    trunk: new Layer(new THREE.CylinderGeometry(0.16, 0.24, 1, 7).translate(0, 0.5, 0), M.bark),
    crown: new Layer(new THREE.IcosahedronGeometry(1, 3), M.leaf),
    pole: new Layer(new THREE.CylinderGeometry(0.07, 0.09, 1, 6).translate(0, 0.5, 0), M.dark, true, false),
    lamp: new Layer(new THREE.BoxGeometry(0.9, 0.12, 0.32), M.lamp, false, false),
    block: new Layer(unitBox(), M.block),
    paver: new Layer(new THREE.BoxGeometry(1, 0.06, 1).translate(0, 0.03, 0), M.plaster, false, true),
  };

  /* road dashes, always there */
  for (let x = -300; x <= 300; x += 7) L.marks.add({ p: [x, 0.012, 31], s: [1, 1, 1], t: [-2, -1], mode: "grow" });

  /* --- phase 0: set-out stakes at every grid intersection */
  let k = 0;
  for (const x of XS) for (const z of ZS) {
    const t0 = 0.05 + (k++ % 20) * 0.025;
    L.stake.add({ p: [x + 0.6, 0, z + 0.6], s: [1, 1.7, 1], t: [t0, t0 + 0.12], out: [2.0, 2.15], mode: "pop" });
    L.stakeTip.add({ p: [x + 0.6, 1.7, z + 0.6], s: [1, 1, 1], t: [t0 + 0.05, t0 + 0.15], out: [2.0, 2.15], mode: "pop" });
  }

  /* --- phase 2: footings, plinth */
  k = 0;
  for (const x of XS) for (const z of ZS) {
    const d = Math.hypot(x, z) / 13;
    L.footing.add({ p: [x, 0, z], s: [1.7, 0.6, 1.7], t: [2.1 + d * 0.14, 2.2 + d * 0.14], mode: "grow", c: [0x8d8880, 0xffffff, 2.3, 2.5] });
  }
  L.plinth.add({ p: [0, 0, 0.3], s: [24.4, PL, 16.6], t: [2.45, 2.75], mode: "grow", c: [0x8c877f, 0xffffff, 2.7, 2.95] });

  /* --- phase 3: frame, floor by floor */
  for (let i = 0; i < FLOORS; i++) {
    const t = T_STRUCT + i * DT, y = lvl(i), h = FH - SLAB;
    for (const x of XS) for (const z of ZS) {
      L.col.add({ p: [x, y, z], s: [0.55, h, 0.55], t: [t, t + 0.08], mode: "grow", c: [0x8a857d, 0xffffff, t + 0.08, t + 0.3] });
    }
    L.core.add({ p: [0, y, 0], s: [5.2, h, 4.2], t: [t - 0.02, t + 0.08], mode: "grow", c: [0x948f86, 0xffffff, t + 0.08, t + 0.3] });
    L.slab.add({ p: [0, y + h, 0], s: [23.6, SLAB, 15.6], t: [t + 0.07, t + 0.15], mode: "drop", c: [0x9c978e, 0xffffff, t + 0.12, t + 0.24] });
    if (i < FLOORS - 1) L.slab.add({ p: [0, y + FH - 0.22, 8.6], s: [20.4, 0.22, 1.9], t: [t + 0.1, t + 0.17], mode: "drop", c: [0x9c978e, 0xffffff, t + 0.14, t + 0.26] });
  }
  // roof: parapet, lift room, tank, solar
  const tr = T_STRUCT + FLOORS * DT;
  for (const [px, pz, sx, sz] of [[0, 7.7, 23.6, 0.22], [0, -7.7, 23.6, 0.22], [11.7, 0, 0.22, 15.6], [-11.7, 0, 0.22, 15.6]] as const)
    L.roof.add({ p: [px, ROOF, pz], s: [sx, 1.1, sz], t: [tr, tr + 0.08], mode: "grow" });
  L.roof.add({ p: [0, ROOF, 0], s: [5.4, 3.4, 4.4], t: [tr + 0.03, tr + 0.12], mode: "grow" });
  L.roof.add({ p: [-6.5, ROOF, -3.5], s: [3.2, 2.2, 2.4], t: [tr + 0.06, tr + 0.14], mode: "grow" });
  for (let a = 0; a < 2; a++) for (let b = 0; b < 5; b++)
    L.solar.add({ p: [3.4 + b * 1.85, ROOF + 0.5, -4.6 + a * 2.6], s: [1, 1, 1], r: [-0.26, 0, 0], t: [tr + 0.08 + b * 0.012, tr + 0.14 + b * 0.012], mode: "pop" });

  /* --- phase 4: masonry with window openings (sides and back), floor by floor */
  const wallBay = (axis: "x" | "z", fixed: number, a0: number, a1: number, y: number, t: number, win: [number, number, number]) => {
    const L0 = a1 - a0 - 0.55, mid = (a0 + a1) / 2, h = FH - SLAB, [ww, wh, sill] = win, th = 0.24;
    const put = (along: number, len: number, yy: number, hh: number) => {
      const p: V3 = axis === "x" ? [fixed, yy, along] : [along, yy, fixed];
      const s: V3 = axis === "x" ? [th, hh, len] : [len, hh, th];
      L.brick.add({ p, s, t: [t, t + 0.12], mode: "grow" });
    };
    put(mid, L0, y, sill);
    put(mid, L0, y + sill + wh, h - sill - wh);
    const pier = (L0 - ww) / 2;
    put(mid - ww / 2 - pier / 2, pier, y + sill, wh);
    put(mid + ww / 2 + pier / 2, pier, y + sill, wh);
    const gp: V3 = axis === "x" ? [fixed, y + sill, mid] : [mid, y + sill, fixed];
    const gs: V3 = axis === "x" ? [0.08, wh, ww] : [ww, wh, 0.08];
    L.glassWin.add({ p: gp, s: gs, t: [t + 0.09, t + 0.15], mode: "grow", lit: 0 });
  };
  const R = rng(17);
  for (let i = 0; i < FLOORS; i++) {
    const t = T_MASON + i * DM, y = lvl(i);
    for (const side of [-11, 11]) for (let b = 0; b < 3; b++) wallBay("x", side, ZS[b], ZS[b + 1], y, t, [1.5, 1.5, 0.9]);
    for (let b = 0; b < 4; b++) wallBay("z", -7, XS[b], XS[b + 1], y, t, [3.4, 1.6, 0.9]);
  }
  // window glow at dusk: decide which homes have their lights on
  L.glassWin.recs.forEach((r) => (r.lit = R() < 0.42 ? 0.35 + R() * 0.65 : 0));

  /* --- phase 5: curtain wall, balcony rails (front), bottom-up */
  for (let i = 0; i < FLOORS; i++) {
    const t = T_FACADE + i * DF, y = lvl(i), h = FH - SLAB;
    for (let b = 0; b < 4; b++) {
      const mx = (XS[b] + XS[b + 1]) / 2;
      L.glassFront.add({ p: [mx, y, 7.05], s: [5.5 - 0.56, h, 0.1], t: [t, t + 0.1], mode: "grow", lit: R() < 0.38 ? 0.3 + R() * 0.7 : 0 });
      if (i > 0) {
        L.rail.add({ p: [mx, y, 9.45], s: [5.3, 1.05, 0.04], t: [t + 0.04, t + 0.12], mode: "grow" });
        L.handrail.add({ p: [mx, y + 1.05, 9.45], s: [5.3, 0.05, 0.09], t: [t + 0.08, t + 0.12], mode: "grow" });
      }
    }
  }

  /* --- scaffolding on the right side and the back: rises with the frame, comes down top-first */
  const scafFloor = (i: number) => {
    const t = T_STRUCT + i * DT + 0.12, y = lvl(i), out: [number, number] = [5.62 + (FLOORS - 1 - i) * 0.038, 5.68 + (FLOORS - 1 - i) * 0.038];
    const add = (p: V3, s: V3, r?: V3, lay = L.scaf) => lay.add({ p, s, r, t: [t, t + 0.09], out, mode: "grow" });
    // right side
    for (let zz = -8.4; zz <= 8.41; zz += 2.4) { add([12.2, y, zz], [0.07, FH, 0.07]); add([13.2, y, zz], [0.07, FH, 0.07]); }
    add([12.2, y + FH - 0.05, 0], [0.06, 0.06, 16.8]); add([13.2, y + FH - 0.05, 0], [0.06, 0.06, 16.8]);
    add([12.7, y + FH - 0.12, 0], [1.0, 0.06, 16.8], undefined, L.plank);
    for (let zz = -8.4; zz < 6; zz += 4.8) add([13.25, y, zz], [0.05, Math.hypot(FH, 2.4), 0.05], [Math.atan2(2.4, FH), 0, 0]);
    for (let xx = -12.6; xx < 10; xx += 5.04) add([xx, y, -9.25], [0.05, Math.hypot(FH, 2.52), 0.05], [0, 0, -Math.atan2(2.52, FH)]);
    // back
    for (let xx = -12.6; xx <= 12.61; xx += 2.52) { add([xx, y, -8.2], [0.07, FH, 0.07]); add([xx, y, -9.2], [0.07, FH, 0.07]); }
    add([0, y + FH - 0.05, -8.2], [25.2, 0.06, 0.06]); add([0, y + FH - 0.05, -9.2], [25.2, 0.06, 0.06]);
    add([0, y + FH - 0.12, -8.7], [25.2, 0.06, 1.0], undefined, L.plank);
  };
  for (let i = 0; i < FLOORS; i++) scafFloor(i);

  /* --- site set-up: hoarding with a brand band, site office, material stacks */
  k = 0;
  const fenceAt = (x: number, z: number, along: "x" | "z") => {
    const t0 = 2.0 + (k++ % 40) * 0.006;
    const s: V3 = along === "x" ? [2.36, 2.2, 0.06] : [0.06, 2.2, 2.36];
    L.fence.add({ p: [x, 0, z], s, t: [t0, t0 + 0.1], out: [6.08, 6.22], mode: "sink" });
    L.fenceTop.add({ p: [x, 2.2, z], s: along === "x" ? [2.36, 0.22, 0.08] : [0.08, 0.22, 2.36], t: [t0 + 0.05, t0 + 0.12], out: [6.08, 6.22], mode: "sink" });
  };
  for (let x = PLOT.x0 + 1.2; x < PLOT.x1; x += 2.4) { if (x < 2 || x > 10.5) fenceAt(x, PLOT.z1, "x"); fenceAt(x, PLOT.z0, "x"); }
  for (let z = PLOT.z0 + 1.2; z < PLOT.z1; z += 2.4) { fenceAt(PLOT.x0, z, "z"); fenceAt(PLOT.x1, z, "z"); }

  const off = (p: V3, s: V3, lay = L.office) => lay.add({ p, s, t: [2.05, 2.2], out: [6.06, 6.2], mode: "sink" });
  off([21.5, 0, 18], [6.1, 2.6, 2.44]);
  off([21.5, 1.95, 18], [6.14, 0.26, 2.48], L.officeBand);
  off([20.6, 0.9, 19.23], [1.6, 0.9, 0.04], L.officeWin);
  off([23.2, 0.9, 19.23], [1.1, 0.9, 0.04], L.officeWin);
  off([21.5, 2.6, 13.6], [6.1, 2.6, 2.44]);
  off([21.5, 4.55, 13.6], [6.14, 0.26, 2.48], L.officeBand);
  off([19.9, 3.5, 14.83], [3.4, 0.9, 0.04], L.officeWin);

  // cement on pallets
  k = 0;
  for (const [px, pz] of [[16.5, 5], [18.5, 5], [16.5, 7.4], [18.5, 7.4], [20.5, 5], [20.5, 7.4]]) {
    const t0 = 2.42 + k++ * 0.018, out: [number, number] = [3.25 + k * 0.08, 3.33 + k * 0.08];
    L.pallet.add({ p: [px, 0, pz], s: [1.3, 0.14, 1.1], t: [t0, t0 + 0.06], out: [6.02, 6.1], mode: "pop" });
    for (let a = 0; a < 3; a++) for (let bx = 0; bx < 2; bx++) for (let bz = 0; bz < 2; bz++)
      L.bag.add({ p: [px - 0.3 + bx * 0.6, 0.14 + a * 0.16, pz - 0.25 + bz * 0.5], s: [0.58, 0.15, 0.48], t: [t0 + 0.02, t0 + 0.08], out, mode: "pop", col: [0xd7d5d1, 0xcdcbc7, 0xdfddd9][(a + bx + bz) % 3] });
  }
  // rebar bundles
  for (let bnd = 0; bnd < 3; bnd++) for (let rod = 0; rod < 9; rod++) {
    const pz = 9 + bnd * 1.6 + (rod % 3) * 0.11, py = 0.12 + Math.floor(rod / 3) * 0.1;
    L.bar.add({ p: [-25.5, py, pz], s: [1, 9, 1], r: [0, 0, -Math.PI / 2], t: [2.48 + bnd * 0.02, 2.56 + bnd * 0.02], out: [3.45 + bnd * 0.14, 3.55 + bnd * 0.14], mode: "pop" });
  }
  // starter bars on top of the frame while it is being built
  const starterStart = L.bar.recs.length;
  for (const x of XS) for (const z of ZS) for (const [dx, dz] of [[-0.16, -0.16], [0.16, -0.16], [-0.16, 0.16], [0.16, 0.16]])
    L.bar.add({ p: [x + dx, 0, z + dz], s: [0.55, 1.3, 0.55], t: [2.22, 2.36], out: [3.95, 4.01], mode: "grow" });
  // brick stacks for the masonry phase
  k = 0;
  for (const [px, pz] of [[-16, 14], [-14.6, 14], [-13.2, 14], [-16, 15.6], [-14.6, 15.6], [-13.2, 15.6]])
    L.bricks.add({ p: [px, 0, pz], s: [1.2, 1.0, 1.2], t: [3.86 + k * 0.012, 3.94 + k++ * 0.012], out: [4.7 + k * 0.04, 4.8 + k * 0.04], mode: "pop" });

  /* --- handover: trees, street lamps, driveway */
  const trees: [number, number, number][] = [[-24, 21, 1], [-17, 21, 0.9], [16, 21, 1], [24.5, 21, 1.1], [-25, 10, 1.05], [-25, -2, 0.95], [-25, -14, 1], [25, 2, 1], [25, -9, 1.1], [25, -17, 0.9], [-12, -17, 1], [0, -17.5, 1.05], [12, -17, 0.95], [-6, 19, 0.85]];
  const RT = rng(5);
  trees.forEach(([x, z, sc], i) => {
    const t0 = 6.3 + i * 0.016;
    L.trunk.add({ p: [x, 0, z], s: [sc, 2.6 * sc, sc], t: [t0, t0 + 0.08], mode: "grow" });
    for (let c = 0; c < 3; c++) {
      const rr = (1.5 + RT() * 0.7) * sc;
      L.crown.add({ p: [x + (RT() - 0.5) * 1.6 * sc, (2.8 + c * 0.9 + RT() * 0.5) * sc, z + (RT() - 0.5) * 1.6 * sc], s: [rr, rr * 0.9, rr], t: [t0 + 0.04, t0 + 0.14], mode: "pop", col: [0x7e9b68, 0x6f8e5c, 0x8ba673][c] });
    }
  });
  for (let x = -60; x <= 60; x += 15) {
    L.pole.add({ p: [x, 0.16, 25.9], s: [1, 6.5, 1], t: [-2, -1], mode: "grow" });
    L.lamp.add({ p: [x, 6.6, 26.3], s: [1, 1, 1], t: [-2, -1], mode: "grow" });
  }
  for (let z = 10.6; z < 24; z += 1.05) for (let x = 2.6; x < 10; x += 1.05)
    L.paver.add({ p: [x, 0, z], s: [1, 1, 1], t: [6.16 + (24 - z) * 0.006, 6.24 + (24 - z) * 0.006], mode: "pop" });

  /* --- the neighbourhood: quiet massing blocks that sit back in the haze */
  const RB = rng(23);
  for (let i = 0; i < 90; i++) {
    const a = RB() * Math.PI * 2, d = 62 + RB() * 150;
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    // only behind and beside the plot, never between the camera path and the tower
    if (z > -22 && !(Math.abs(x) > 75 && z < 12)) continue;
    L.block.add({ p: [x, 0, z], s: [12 + RB() * 18, 6 + RB() * 24, 10 + RB() * 16], r: [0, RB() * 0.3 - 0.15, 0], t: [-2, -1], mode: "grow" });
  }

  await idle();
  Object.values(L).forEach((l) => l.build(world));
  // the starter bars move with the top of the frame for the whole structure phase
  L.bar.addWindow(2.2, 4.05);
  const STATIC = new Set([L.marks, L.block, L.pole, L.lamp]);
  STATIC.forEach((l) => l.update(0));

  /* soft contact shadow under the tower */
  const blobMesh = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), new THREE.MeshBasicMaterial({ map: blob, transparent: true, opacity: 0, depthWrite: false, color: 0x24221e }));
  blobMesh.rotation.x = -Math.PI / 2; blobMesh.position.set(0, 0.03, 0.5); world.add(blobMesh);

  /* --- grass lawns appear at handover */
  const lawnMat = new THREE.MeshLambertMaterial({ map: grass, normalMap: grassN, color: 0xf2f0dc, transparent: true, opacity: 0, polygonOffset: true, polygonOffsetFactor: -2 });
  const lawns = new THREE.Group();
  for (const [x0, x1, z0, z1] of [[-28, -12.6, -20, 24], [12.6, 28, -20, 24], [-12.6, 12.6, -20, -9.2], [-12.6, 2, 10.2, 24], [10.4, 12.6, 10.2, 24]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), lawnMat);
    m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, 0.02, (z0 + z1) / 2); m.receiveShadow = true;
    lawns.add(m);
  }
  world.add(lawns);

  /* --- phase 0–1: the drawing on the ground, axis labels, the digital twin */
  // set-out: painted tapes along every grid line and the footprint, rolled out one after another
  const tapeMat = new THREE.MeshBasicMaterial({ color: 0xf6f4ef, transparent: true, opacity: 1, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
  const tapeGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0.5, 0, 0);
  const tapes: { m: THREE.Mesh; len: number; t0: number }[] = [];
  const tape = (x0: number, z0: number, x1: number, z1: number, w: number, t0: number) => {
    const m = new THREE.Mesh(tapeGeo, tapeMat), len = Math.hypot(x1 - x0, z1 - z0);
    m.position.set(x0, 0.035, z0); m.rotation.y = -Math.atan2(z1 - z0, x1 - x0); m.scale.set(len, 1, w);
    world.add(m); tapes.push({ m, len, t0 });
  };
  ZS.forEach((z, i) => tape(-17, z, 17, z, 0.28, 0.1 + i * 0.07));
  XS.forEach((x, i) => tape(x, -12, x, 12, 0.28, 0.3 + i * 0.06));
  const outline = [[-11.8, -7.8], [11.8, -7.8], [11.8, 7.8], [-11.8, 7.8]];
  for (let i = 0; i < 4; i++) { const a = outline[i], b = outline[(i + 1) % 4]; tape(a[0], a[1], b[0], b[1], 0.5, 0.55 + i * 0.06); }

  const labels: THREE.Sprite[] = [];
  ["A", "B", "C", "D", "E"].forEach((s, i) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(s), transparent: true, depthWrite: false })); sp.position.set(XS[i], 0.9, -13); labels.push(sp); });
  ["1", "2", "3", "4"].forEach((s, i) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(s), transparent: true, depthWrite: false })); sp.position.set(-17.5, 0.9, ZS[i]); labels.push(sp); });
  labels.forEach((l) => world.add(l));

  const ghostClip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  const ghostLineMat = new THREE.LineBasicMaterial({ color: 0x16150f, transparent: true, opacity: 0, clippingPlanes: [ghostClip], depthWrite: false });
  const ghostFaceMat = new THREE.MeshBasicMaterial({ color: 0x16150f, transparent: true, opacity: 0, depthWrite: false, clippingPlanes: [ghostClip], side: THREE.DoubleSide });
  const gv: number[] = [];
  const rect = (y: number, x0: number, x1: number, z0: number, z1: number) => { const p = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]; for (let i = 0; i < 4; i++) { const a = p[i], b = p[(i + 1) % 4]; gv.push(a[0], y, a[1], b[0], y, b[1]); } };
  for (let i = 0; i <= FLOORS; i++) { rect(lvl(i), -11.8, 11.8, -7.8, 7.8); if (i > 0 && i < FLOORS) rect(lvl(i), -10.2, 10.2, 7.8, 9.55); }
  for (const x of XS) for (const z of ZS) gv.push(x, PL, z, x, ROOF, z);
  for (const [x, z] of [[-11.8, -7.8], [11.8, -7.8], [11.8, 7.8], [-11.8, 7.8]]) gv.push(x, 0, z, x, ROOF, z);
  rect(ROOF + 3.4, -2.7, 2.7, -2.2, 2.2); for (const [x, z] of [[-2.7, -2.2], [2.7, -2.2], [2.7, 2.2], [-2.7, 2.2]]) gv.push(x, ROOF, z, x, ROOF + 3.4, z);
  const ghostGeo = new THREE.BufferGeometry(); ghostGeo.setAttribute("position", new THREE.Float32BufferAttribute(gv, 3));
  const ghost = new THREE.Group();
  ghost.add(new THREE.LineSegments(ghostGeo, ghostLineMat));
  const gface = new THREE.Mesh(new THREE.BoxGeometry(23.6, ROOF, 15.6).translate(0, ROOF / 2, 0), ghostFaceMat);
  ghost.add(gface);
  world.add(ghost);
  const scan = new THREE.Mesh(new THREE.PlaneGeometry(30, 22), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
  scan.rotation.x = -Math.PI / 2; world.add(scan);

  /* --- vehicles: a flatbed that delivers, a transit mixer that pours */
  const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.36, 14).rotateX(Math.PI / 2);
  function truck(mixer: boolean) {
    const g = new THREE.Group(); const wheels: THREE.Mesh[] = [];
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
    const under = new THREE.Mesh(new THREE.PlaneGeometry(11, 4.4), new THREE.MeshBasicMaterial({ map: blob, transparent: true, opacity: 0.55, depthWrite: false, color: 0x24221e }));
    under.rotation.x = -Math.PI / 2; under.position.y = 0.03; g.add(under);
    add(new THREE.BoxGeometry(8.6, 0.35, 2.3), M.dark, 0, 0.75, 0);
    add(new THREE.BoxGeometry(2.1, 2.1, 2.4), M.white, 3.35, 1.95, 0);
    add(new THREE.BoxGeometry(0.06, 0.9, 2.1), M.tint, 4.42, 2.35, 0);
    add(new THREE.BoxGeometry(2.12, 0.25, 2.42), M.brand, 3.35, 1.25, 0);
    for (const [x, z] of [[3.2, 1.05], [3.2, -1.05], [-1.6, 1.05], [-1.6, -1.05], [-2.8, 1.05], [-2.8, -1.05]]) wheels.push(add(wheelGeo, M.dark, x, 0.5, z));
    let spin: THREE.Object3D | null = null, cargo: THREE.Group | null = null;
    if (mixer) {
      const drum = new THREE.Group();
      const d = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.25, 4.6, 18, 1).rotateZ(Math.PI / 2 - 0.18), M.white); drum.add(d);
      for (let s = 0; s < 3; s++) { const st = new THREE.Mesh(new THREE.TorusGeometry(1.06 - s * 0.12, 0.07, 6, 24).rotateY(Math.PI / 2), M.brand); st.position.x = -1 + s * 1.1; drum.add(st); }
      drum.position.set(-1.2, 2.35, 0); g.add(drum); spin = drum;
    } else {
      add(new THREE.BoxGeometry(5.8, 0.18, 2.36), M.brand, -1.4, 1.02, 0);
      cargo = new THREE.Group();
      for (let a = 0; a < 2; a++) for (let b = 0; b < 3; b++) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.14, 1.05), M.ply); p.position.set(-3.6 + b * 1.45, 1.18, -0.55 + a * 1.1); cargo.add(p);
        const s = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.5, 0.95), M.bag); s.position.set(-3.6 + b * 1.45, 1.5, -0.55 + a * 1.1); cargo.add(s);
      }
      g.add(cargo);
    }
    world.add(g);
    return { g, wheels, spin, cargo };
  }
  const flat = truck(false), mix = truck(true);

  /* --- the tower crane, in Shellkore orange */
  const crane = new THREE.Group(); crane.position.set(-19.5, 0, -3.5); world.add(crane);
  const seg: THREE.BufferGeometry[] = [];
  const C = 0.8;
  for (const [x, z] of [[-C, -C], [C, -C], [C, C], [-C, C]]) seg.push(bar(v(x, 0, z), v(x, 3, z), 0.13));
  for (const y of [0, 3]) for (const [a, b] of [[[-C, -C], [C, -C]], [[C, -C], [C, C]], [[C, C], [-C, C]], [[-C, C], [-C, -C]]]) seg.push(bar(v(a[0], y, a[1]), v(b[0], y, b[1]), 0.08));
  seg.push(bar(v(-C, 0, -C), v(C, 3, -C), 0.06), bar(v(C, 0, -C), v(C, 3, C), 0.06), bar(v(C, 0, C), v(-C, 3, C), 0.06), bar(v(-C, 0, C), v(-C, 3, -C), 0.06));
  const segGeo = mergeGeometries(seg);
  const MAST_N = 16;
  const mast = new THREE.InstancedMesh(segGeo, M.brand, MAST_N); mast.castShadow = false; mast.frustumCulled = false; crane.add(mast);
  const base = new THREE.Mesh(new THREE.BoxGeometry(4, 0.8, 4).translate(0, 0.4, 0), M.concrete); base.castShadow = base.receiveShadow = true; crane.add(base);
  const head = new THREE.Group(); crane.add(head);
  const jib: THREE.BufferGeometry[] = [];
  const JL = 34, CJ = 11;
  jib.push(bar(v(-CJ, 0, -0.7), v(JL, 0, -0.7), 0.12), bar(v(-CJ, 0, 0.7), v(JL, 0, 0.7), 0.12), bar(v(0, 1.5, 0), v(JL, 0.4, 0), 0.1));
  for (let x = 0; x < JL; x += 2.4) { jib.push(bar(v(x, 0, -0.7), v(x + 1.2, 1.5 - (x / JL) * 1.1, 0), 0.05), bar(v(x + 1.2, 1.5 - (x / JL) * 1.1, 0), v(x + 2.4, 0, 0.7), 0.05), bar(v(x, 0, -0.7), v(x, 0, 0.7), 0.05)); }
  for (let x = -CJ; x < 0; x += 2.2) jib.push(bar(v(x, 0, -0.7), v(x, 0, 0.7), 0.06), bar(v(x, 0, -0.7), v(x + 2.2, 0, 0.7), 0.05));
  jib.push(bar(v(-C, 0, -C), v(0, 6, 0), 0.12), bar(v(C, 0, -C), v(0, 6, 0), 0.12), bar(v(C, 0, C), v(0, 6, 0), 0.12), bar(v(-C, 0, C), v(0, 6, 0), 0.12));
  jib.push(bar(v(0, 6, 0), v(JL * 0.62, 0.9, 0), 0.04), bar(v(0, 6, 0), v(-CJ + 0.6, 0.1, 0), 0.04));
  const jibMesh = new THREE.Mesh(mergeGeometries(jib), M.brand); head.add(jibMesh);
  const cw = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.2, 1.9).translate(-CJ + 1.6, -1.1, 0), M.concrete); head.add(cw);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2, 2.1, 1.7).translate(1.6, -1.2, 1.5), M.white); head.add(cab);
  const cabWin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.1, 1.4).translate(2.62, -0.9, 1.5), M.tint); head.add(cabWin);
  const trolley = new THREE.Group(); head.add(trolley);
  trolley.add(new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.35, 1.6).translate(0, -0.2, 0), M.dark));
  const cable = new THREE.Mesh(new THREE.BoxGeometry(0.035, 1, 0.035).translate(0, -0.5, 0), M.dark); trolley.add(cable);
  const hook = new THREE.Group(); trolley.add(hook);
  const hb = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.4), M.brand); hook.add(hb);
  const loadG: THREE.BufferGeometry[] = [];
  for (let r = 0; r < 7; r++) loadG.push(new THREE.CylinderGeometry(0.05, 0.05, 6, 5).rotateZ(Math.PI / 2).translate(0, -1.4 - (r % 2) * 0.1, -0.3 + (r % 4) * 0.12));
  loadG.push(bar(v(0, -0.35, 0), v(-2.4, -1.35, 0), 0.025), bar(v(0, -0.35, 0), v(2.4, -1.35, 0), 0.025));
  const craneLoad = new THREE.Mesh(mergeGeometries(loadG), M.rebar); hook.add(craneLoad);

  /* ------------------------------------------------------------------ per-frame state */
  async function warm() {
    const hidden: THREE.Object3D[] = [];
    scene.traverse((o) => { if (!o.visible) { hidden.push(o); o.visible = true; } });
    renderer.setSize(64, 64, false);
    camera.aspect = 1; camera.updateProjectionMatrix();
    camera.position.set(70, 55, 80); camera.lookAt(0, 10, 0);
    sun.position.set(0.62, 0.86, 0.5).multiplyScalar(110);
    for (const t of textures) renderer.initTexture(t);
    // compile every program up front; in parallel (off the main thread) where the GPU driver supports it
    try {
      if (renderer.extensions.has("KHR_parallel_shader_compile")) await renderer.compileAsync(scene, camera);
      else renderer.compile(scene, camera);
    } catch { /* compiled on first render instead */ }
    renderer.shadowMap.needsUpdate = true;
    renderer.render(scene, camera); // also builds the shadow-pass programs
    hidden.forEach((o) => (o.visible = false));
  }
  let W = 2, H = 2, dpr = TIERS[tier].dpr, bufDpr = 0;
  const sunDay = new THREE.Vector3(0.62, 0.86, 0.5).normalize();
  const sunDusk = new THREE.Vector3(-0.7, 0.42, 0.62).normalize();
  const sunDir = new THREE.Vector3();
  const colDay = new THREE.Color(0xf9f7f3), colDusk = new THREE.Color(0xf4f2ee);
  const camKeys = [
    // r, azimuth (deg, 0 = from the road), elevation (deg), target y
    [92, 30, 50, 0],
    [84, 20, 32, 11],
    [64, 44, 30, 2],
    [70, 30, 22, 9],
    [80, 50, 17, 14],
    [80, 26, 14, 15],
    [84, -28, 15, 15],
    [112, -46, 19, 15],
  ];
  const tmp = [0, 0, 0, 0];
  function camAt(P: number) {
    const n = camKeys.length - 1, x = Math.min(n - 1e-6, Math.max(0, P)), i = Math.floor(x), t = x - i;
    const p0 = camKeys[Math.max(0, i - 1)], p1 = camKeys[i], p2 = camKeys[Math.min(n, i + 1)], p3 = camKeys[Math.min(n, i + 2)];
    const t2 = t * t, t3 = t2 * t;
    for (let j = 0; j < 4; j++) tmp[j] = 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3);
    return tmp;
  }
  const look = new THREE.Vector3();
  const _a = new THREE.Vector3();
  const anchors = (P: number): THREE.Vector3[] => [
    v(11.6, 1.1, 7.6), v(0, ROOF + 3.6, 0), v(12.2, PL, 8.3), v(11.8, Math.max(PL, builtTop(P)), 7.8),
    v(11.2, lvl(4) + 1.6, 0), v(5.5, lvl(5) + 1.5, 9.5), v(-5.5, lvl(6) + 1.2, 9.5),
  ];

  function update(P: number, px: number, py: number) {
    // starter bars follow the top of the frame
    const top = builtTop(P);
    for (let i = starterStart; i < L.bar.recs.length; i++) L.bar.recs[i].p[1] = Math.max(0.55, top - 0.35);
    let moved = false;
    for (const l of Object.values(L)) if (!STATIC.has(l) && l.update(P) && l.cast) moved = true;
    if (moved) shadowDirty = true;

    // ground drawing, labels, stakes
    const gFade = 1 - ss(1.7, 2.15, P);
    tapeMat.opacity = gFade;
    for (const t of tapes) { const d = ss(t.t0, t.t0 + 0.28, P); t.m.scale.x = Math.max(0.0001, t.len * d); t.m.visible = d > 0 && gFade > 0; }
    labels.forEach((l, i) => { const a = outBack(ss(0.3 + i * 0.03, 0.5 + i * 0.03, P)) * gFade; l.scale.setScalar(1.5 * a); l.visible = a > 0.01; });

    // the digital twin rises behind a scan line, then fades as the real building takes its place
    const scanH = lerp(-0.5, ROOF + 4, ss(1.05, 1.75, P));
    ghostClip.constant = scanH;
    const gOn = ss(1.02, 1.12, P) * (1 - ss(2.3, 3.9, P) * 0.8) * (1 - ss(3.9, 4.5, P));
    ghostLineMat.opacity = 0.6 * gOn; ghostFaceMat.opacity = 0.07 * gOn; ghost.visible = gOn > 0.01;
    scan.position.y = scanH; (scan.material as THREE.MeshBasicMaterial).opacity = 0.42 * ss(1.02, 1.1, P) * (1 - ss(1.68, 1.8, P)); scan.visible = P > 1.0 && P < 1.82;

    // site
    dig.visible = P > 1.98; dig.scale.set(ss(1.98, 2.12, P) || 0.001, ss(1.98, 2.12, P) || 0.001, 1);
    (blobMesh.material as THREE.MeshBasicMaterial).opacity = 0.35 * ss(3.0, 3.9, P);
    lawnMat.opacity = ss(6.18, 6.42, P); lawns.visible = lawnMat.opacity > 0.01; lawnMat.transparent = lawnMat.opacity < 0.99; lawnMat.depthWrite = !lawnMat.transparent;

    // vehicles
    const fIn = ss(2.0, 2.42, P), fOut = ss(2.62, 2.95, P);
    const fx = lerp(lerp(-110, 6.2, fIn), 120, fOut);
    flat.g.position.set(fx, 0, 29.2); flat.g.visible = P > 1.98 && P < 2.97;
    flat.wheels.forEach((w) => (w.rotation.z = -fx / 0.5));
    if (flat.cargo) flat.cargo.visible = P < 2.47;
    const mIn = ss(3.02, 3.26, P), mOut = ss(3.78, 4.04, P);
    const mx = lerp(lerp(110, 9.5, mIn), -120, mOut);
    mix.g.position.set(mx, 0, 33); mix.g.rotation.y = Math.PI; mix.g.visible = P > 3.0 && P < 4.06;
    mix.wheels.forEach((w) => (w.rotation.z = mx / 0.5));
    if (mix.spin) mix.spin.rotation.x = P * 22;

    // the crane climbs with the frame, swings while it works, and is dismantled before handover
    const craneIn = ss(2.72, 3.0, P), craneOut = ss(6.02, 6.28, P);
    const mastH = Math.max(14 * craneIn, top + 9.5);
    crane.visible = craneIn > 0.001 && craneOut < 0.999;
    crane.position.y = -craneOut * (mastH + 8);
    for (let i = 0; i < MAST_N; i++) {
      const s = clamp01((mastH - i * 3) / 3);
      _m.compose(_p.set(0, i * 3 + 0.8, 0), _q.identity(), _s.set(1, s || 0.0001, 1));
      if (!s) _m.makeScale(0, 0, 0);
      mast.setMatrixAt(i, _m);
    }
    mast.instanceMatrix.needsUpdate = true;
    head.position.y = mastH + 0.8;
    head.rotation.y = 2.35 - P * 1.15 + Math.sin(P * 3.1) * 0.35;
    const tx = 11 + 15 * (0.5 + 0.5 * Math.sin(P * 4.3));
    trolley.position.x = tx;
    const drop = 5 + 7 * (0.5 + 0.5 * Math.cos(P * 3.7));
    cable.scale.y = drop; hook.position.y = -drop - 0.4;
    craneLoad.visible = P < 3.97;

    // daylight → golden hour at handover
    const dusk = ss(6.3, 6.95, P);
    sunDir.copy(sunDay).lerp(sunDusk, dusk).normalize();
    sun.position.copy(sunDir).multiplyScalar(110); sun.target.position.set(0, 0, 0);
    sun.color.lerpColors(colDay, colDusk, dusk); sun.intensity = lerp(2.7, 2.2, dusk);
    hemi.intensity = lerp(1.2, 0.8, dusk); fill.intensity = lerp(0.18, 0.12, dusk);
    glassU.uDusk.value = dusk;
    M.lamp.emissiveIntensity = dusk * 3;
    const su = (sky.material as THREE.ShaderMaterial).uniforms;
    su.uTop.value.lerpColors(DAY.top, DUSK.top, dusk); su.uHor.value.lerpColors(DAY.hor, DUSK.hor, dusk); su.uBot.value.lerpColors(DAY.bot, DUSK.bot, dusk);
    (scene.fog as THREE.Fog).color.copy(su.uHor.value);
    groundMat.color.set(0xe8e4dc).lerp(new THREE.Color(0xe3e0da), dusk);

    // camera on its path, with a little lean toward the pointer
    const [r, az, el, ty] = camAt(P);
    const narrow = W / H < 1 ? Math.pow(1 / (W / H), 0.55) : 1;
    const A = THREE.MathUtils.degToRad(az + px * 4), E = THREE.MathUtils.degToRad(Math.max(6, el - py * 3));
    const rr = r * narrow;
    look.set(0, ty, 0.5);
    camera.position.set(Math.sin(A) * Math.cos(E) * rr, ty + Math.sin(E) * rr, Math.cos(A) * Math.cos(E) * rr);
    camera.lookAt(look);
    const fog = scene.fog as THREE.Fog; fog.near = rr + 45; fog.far = rr + 360;
    sky.position.copy(camera.position);
  }
  let shadowDirty = true;
  // GPU time per frame, measured with timer queries where the browser offers them (Chrome desktop). This is what
  // the quality tiers are tuned on: it shows real headroom, which frame intervals on a 60 Hz screen can't.
  const gl = renderer.getContext() as WebGL2RenderingContext;
  type TQ = { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number };
  const tq = (typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext ? gl.getExtension("EXT_disjoint_timer_query_webgl2") : null) as TQ | null;
  const pending: WebGLQuery[] = [], gpuTimes: number[] = [];
  function poll() {
    if (!tq) return;
    while (pending.length) {
      const q = pending[0];
      if (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) break;
      const disjoint = gl.getParameter(tq.GPU_DISJOINT_EXT);
      const ns = gl.getQueryParameter(q, gl.QUERY_RESULT) as number;
      pending.shift(); gl.deleteQuery(q);
      if (!disjoint) { gpuTimes.push(ns / 1e6); if (gpuTimes.length > 30) gpuTimes.shift(); }
    }
  }
  /** Render. Shadows are redrawn only when a shadow-casting part has moved; on the lighter tiers only once the
   *  scroll settles. */
  function draw(settle = false) {
    if (shadowDirty && (liveShadows || settle)) { renderer.shadowMap.needsUpdate = true; shadowDirty = false; }
    let q: WebGLQuery | null = null;
    if (tq && pending.length < 4) { q = gl.createQuery(); if (q) gl.beginQuery(tq.TIME_ELAPSED_EXT, q); }
    renderer.render(scene, camera);
    if (q && tq) { gl.endQuery(tq.TIME_ELAPSED_EXT); pending.push(q); }
    poll();
  }

  /* ---------- hero: the twin above the scan line, the built tower below it */
  const scanRing = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints([v(-12.6, 0, -8.6), v(12.6, 0, -8.6), v(12.6, 0, 10.2), v(-12.6, 0, 10.2)]),
    new THREE.LineBasicMaterial({ color: 0x16150f, transparent: true, opacity: 0.9 }),
  );
  scanRing.visible = false; world.add(scanRing);
  const heroCam = (t: number, px: number, py: number) => {
    const narrow = W / H < 1;
    const az = THREE.MathUtils.degToRad(-34 + Math.sin(t * 0.06) * 9 + px * 5);
    const el = THREE.MathUtils.degToRad((narrow ? 12 : 9) + Math.sin(t * 0.045) * 1.5 - py * 2.5);
    const r = narrow ? 64 / Math.pow(W / H, 0.7) : 96, ty = narrow ? 17 : 16.5;
    look.set(0, ty, 0.5);
    camera.position.set(Math.sin(az) * Math.cos(el) * r, ty + Math.sin(el) * r, Math.cos(az) * Math.cos(el) * r);
    camera.lookAt(look);
    sky.position.copy(camera.position);
    const fog = scene.fog as THREE.Fog; fog.near = r + 45; fog.far = r + 360;
  };
  const heroPins = [v(11.9, 0, 9.6), v(0, ROOF + 3.6, 0), v(-11.9, lvl(2) + 1.4, 7.8)];
  function hero(t: number, px: number, py: number) {
    // the scan line climbs and settles back down, easing at both ends (about 20 s a cycle)
    const k = 0.5 - 0.5 * Math.cos(t * 0.31);
    const h = lerp(PL + 4.5, ROOF + 4.2, k);
    solidClip.constant = h;
    ghostClip.normal.set(0, 1, 0); ghostClip.constant = -h;
    ghost.visible = true; ghostLineMat.opacity = 0.62; ghostFaceMat.opacity = 0.04;
    scan.visible = true; scan.position.y = h; (scan.material as THREE.MeshBasicMaterial).opacity = 0.42;
    scanRing.visible = true; scanRing.position.y = h + 0.02;
    heroCam(t, px, py);
    heroPins[0].y = h;
    const pins = heroPins.map((p) => { _a.copy(p).project(camera); return _a.z > 1 ? null : { x: (_a.x * 0.5 + 0.5) * W, y: (-_a.y * 0.5 + 0.5) * H }; });
    draw(true);
    return { scan: h, level: Math.max(0, Math.min(FLOORS, Math.floor((h - PL) / FH))), pins };
  }

  function resize(w: number, h: number, d: number) {
    const nw = Math.max(2, w), nh = Math.max(2, h);
    const same = nw === W && nh === H && d === bufDpr;
    W = nw; H = nh; dpr = d;
    // one drawing-buffer reallocation (setPixelRatio + setSize would do two), and none when nothing changed
    if (!same) { renderer.setDrawingBufferSize(W, H, d); bufDpr = d; }
    camera.aspect = W / H;
    camera.fov = W / H < 1 ? 42 : 34;
    // on wide screens the words sit on the left, so the tower is framed slightly right of centre
    const shift = W / H > 1.2 && !opts.mobile ? -W * (HERO ? 0.25 : 0.13) : 0;
    // hero on a phone: the tower sits in the lower part of the screen, under the headline
    const lift = HERO && W / H < 1 ? H * 0.24 : 0;
    camera.setViewOffset(W, H, shift, -lift, W, H);
    camera.updateProjectionMatrix();
  }

  await idle();
  await warm();

  return {
    hero,
    setLiveShadows(on: boolean) { liveShadows = on; },
    /** Move to another quality tier (0 best … 3 lightest). Remembered for this device's next visit. */
    setTier(n: number) {
      const next = Math.max(0, Math.min(TIERS.length - 1, n));
      if (next === tier) return false;
      tier = next; liveShadows = TIERS[tier].live;
      try { localStorage.setItem(TIER_KEY, String(tier)); } catch { /* storage blocked */ }
      resize(W, H, TIERS[tier].dpr);
      shadowDirty = true;
      return true;
    },
    get tier() { return tier; },
    /** Median GPU milliseconds over the last frames, or -1 where the browser can't measure it. */
    gpuMs() {
      if (!tq || gpuTimes.length < 8) return -1;
      const s2 = gpuTimes.slice().sort((a, b) => a - b); return s2[s2.length >> 1];
    },
    resetGpu() { gpuTimes.length = 0; },
    update,
    // at rest, a lighter tier redraws once at full density; it goes back to its own resolution when things move
    render: (settle?: boolean) => {
      const want = settle ? native : dpr;
      if (want !== bufDpr) { renderer.setDrawingBufferSize(W, H, want); bufDpr = want; }
      draw(settle);
    },
    resize,
    anchor(phase, P) {
      _a.copy(anchors(P)[phase]).project(camera);
      if (_a.z > 1) return null;
      return { x: (_a.x * 0.5 + 0.5) * W, y: (-_a.y * 0.5 + 0.5) * H };
    },
    dispose() {
      renderer.dispose(); pmrem.dispose(); env.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => { Object.values(x).forEach((val) => (val as THREE.Texture)?.isTexture && (val as THREE.Texture).dispose()); x.dispose(); });
      });
    },
    get dpr() { return dpr; },
  };
}
