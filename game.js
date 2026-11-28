// game.js — Хряк Симулятор v4 (Открытый мир 500x500, 4 биома, радар и Нитро)
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createPigModel, preloadHryakModel, PIG_TYPES, PIG_LABELS } from './pigGenerator.js';

// ============================================================================
// ХРЯК СИМУЛЯТОР v4 — Открытый мир 500x500, 4 тематических биома, радар и Нитро
// Three.js + cannon-es + pigGenerator.js
// ============================================================================

// Полифилл roundRect для совместимости со старыми мобильными WebView
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    const rad = Array.isArray(r) ? r[0] : (r || 0);
    this.beginPath();
    this.moveTo(x + rad, y);
    this.arcTo(x + w, y, x + w, y + h, rad);
    this.arcTo(x + w, y + h, x, y + h, rad);
    this.arcTo(x, y + h, x, y, rad);
    this.arcTo(x, y, x + w, y, rad);
    this.closePath();
    return this;
  };
}

const WORLD_SIZE = 500;
const HALF_WORLD = WORLD_SIZE / 2;
const isMobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);

// ----------------------------------------------------------------------------
// КАСТОМНЫЕ INLINE SVG-ИКОНКИ
// ----------------------------------------------------------------------------
const ICONS = {
  pig: `<svg class="ui-svg" viewBox="0 0 32 32" fill="none">
    <path d="M5 11L3 5L11 8Z" fill="#e8a88c" stroke="#24140d" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M27 11L29 5L21 8Z" fill="#e8a88c" stroke="#24140d" stroke-width="2.4" stroke-linejoin="round"/>
    <ellipse cx="16" cy="18" rx="12" ry="10.5" fill="#f2bca0" stroke="#24140d" stroke-width="2.4"/>
    <path d="M11 8.2C14 7.2 18 7.2 21 8.2L20 11H12Z" fill="#2b211e"/>
    <circle cx="11" cy="14.5" r="1.7" fill="#24140d"/>
    <circle cx="21" cy="14.5" r="1.7" fill="#24140d"/>
    <ellipse cx="16" cy="20.5" rx="6.2" ry="4.4" fill="#f28d93" stroke="#24140d" stroke-width="2.2"/>
    <ellipse cx="13.8" cy="20.5" rx="1.3" ry="1.8" fill="#4f221e"/>
    <ellipse cx="18.2" cy="20.5" rx="1.3" ry="1.8" fill="#4f221e"/>
  </svg>`,

  crown: `<svg class="ui-svg" viewBox="0 0 32 32" fill="none">
    <path d="M4 23L6 10L12.5 16L16 8L19.5 16L26 10L28 23H4Z" fill="#ffd447" stroke="#24140d" stroke-width="2.4" stroke-linejoin="round"/>
    <rect x="4" y="23" width="24" height="4.5" rx="2" fill="#e89b1e" stroke="#24140d" stroke-width="2.4"/>
    <circle cx="16" cy="18.5" r="1.8" fill="#d93829"/>
  </svg>`,

  eye: `<svg class="ui-svg" viewBox="0 0 32 32" fill="none">
    <path d="M3 16C6.5 9.5 11 7 16 7C21 7 25.5 9.5 29 16C25.5 22.5 21 25 16 25C11 25 6.5 22.5 3 16Z" fill="#fff6e3" stroke="#24140d" stroke-width="2.4" stroke-linejoin="round"/>
    <circle cx="16" cy="16" r="5.5" fill="#4b89c2" stroke="#24140d" stroke-width="2.2"/>
    <circle cx="16" cy="16" r="2.4" fill="#24140d"/>
    <circle cx="14.2" cy="14" r="1.4" fill="#ffffff"/>
  </svg>`,

  eyeFp: `<svg class="ui-svg" viewBox="0 0 32 32" fill="none">
    <path d="M3 16C6.5 9.5 11 7 16 7C21 7 25.5 9.5 29 16C25.5 22.5 21 25 16 25C11 25 6.5 22.5 3 16Z" fill="#ffd970" stroke="#24140d" stroke-width="2.4" stroke-linejoin="round"/>
    <circle cx="16" cy="16" r="5" fill="#d94e28" stroke="#24140d" stroke-width="2.2"/>
    <circle cx="16" cy="16" r="2" fill="#24140d"/>
  </svg>`,

  soundOn: `<svg class="ui-svg" viewBox="0 0 32 32" fill="none">
    <path d="M6 12H11L18 6V26L11 20H6V12Z" fill="#ffd466" stroke="#24140d" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M22 11.5C23.8 13.5 23.8 18.5 22 20.5" stroke="#fff5e1" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M25.5 8.5C28.5 12.2 28.5 19.8 25.5 23.5" stroke="#e8a838" stroke-width="2.4" stroke-linecap="round"/>
  </svg>`,

  soundOff: `<svg class="ui-svg" viewBox="0 0 32 32" fill="none">
    <path d="M6 12H11L18 6V26L11 20H6V12Z" fill="#9e8777" stroke="#24140d" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M22 12L28 20M28 12L22 20" stroke="#ff7a5c" stroke-width="2.6" stroke-linecap="round"/>
  </svg>`,

  tractor: `<svg class="ui-svg" viewBox="0 0 32 32" fill="none">
    <rect x="15" y="5" width="3" height="7" rx="1" fill="#453d3a" stroke="#24140d" stroke-width="2"/>
    <path d="M6 11H16V17H26V22H6V11Z" fill="#328be0" stroke="#24140d" stroke-width="2.3" stroke-linejoin="round"/>
    <circle cx="10.5" cy="22.5" r="5.5" fill="#2b2b30" stroke="#24140d" stroke-width="2.3"/>
    <circle cx="10.5" cy="22.5" r="2.2" fill="#f2be32"/>
    <circle cx="23" cy="24" r="3.8" fill="#2b2b30" stroke="#24140d" stroke-width="2.3"/>
  </svg>`,

  exit: `<svg class="ui-svg" viewBox="0 0 32 32" fill="none">
    <rect x="5" y="5" width="13" height="22" rx="2.5" fill="#8f582b" stroke="#24140d" stroke-width="2.3"/>
    <path d="M14 16H27M27 16L22 11M27 16L22 21" stroke="#ffd970" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  nitro: `<svg class="ui-svg" viewBox="0 0 32 32" fill="none">
    <path d="M17 3L7 18H15L13 29L25 13H17L17 3Z" fill="#ffd970" stroke="#24140d" stroke-width="2.4" stroke-linejoin="round"/>
  </svg>`,

  snout: `<svg class="act-svg" viewBox="0 0 32 32" fill="none">
    <ellipse cx="16" cy="13.5" rx="11" ry="8" fill="#f29aa0" stroke="#24140d" stroke-width="2.4"/>
    <ellipse cx="12" cy="13.5" rx="2.1" ry="3" fill="#4f221e"/>
    <ellipse cx="20" cy="13.5" rx="2.1" ry="3" fill="#4f221e"/>
    <path d="M11 19.5V24.5C11 27.2 13.2 29 16 29C18.8 29 21 27.2 21 24.5V19.5" fill="#ff6699" stroke="#24140d" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M16 20V26" stroke="#b82c5c" stroke-width="1.8" stroke-linecap="round"/>
  </svg>`,

  dizzy: `<svg class="act-svg" viewBox="0 0 32 32" fill="none">
    <path d="M16 4L18.2 10.2L24.8 9.2L20.5 14.2L24.5 19.5L18 18.8L16 25L14 18.8L7.5 19.5L11.5 14.2L7.2 9.2L13.8 10.2L16 4Z" fill="#ffd970" stroke="#24140d" stroke-width="2.3" stroke-linejoin="round"/>
    <circle cx="16" cy="14.5" r="2.6" fill="#fff5e1"/>
  </svg>`,

  trickStar: `<svg class="ui-svg" style="width:14px;height:14px" viewBox="0 0 32 32" fill="none">
    <path d="M16 3L19.8 11.2L28.8 12.2L22 18.2L23.8 27L16 22.5L8.2 27L10 18.2L3.2 12.2L12.2 11.2L16 3Z" fill="#ffd970" stroke="#24140d" stroke-width="2.4" stroke-linejoin="round"/>
  </svg>`,
};

// ----------------------------------------------------------------------------
// ПРОЦЕДУРНЫЙ ЗВУК (Web Audio API)
// ----------------------------------------------------------------------------
class SoundFX {
  constructor() { this.enabled = true; this.ctx = null; }
  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }
  tone(f1, f2, dur, type = 'triangle', vol = 0.16, delay = 0) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f1, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    g.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur);
  }
  jump()    { this.tone(240, 560, 0.16, 'sine', 0.15); }
  butt()    { this.tone(185, 58, 0.15, 'sawtooth', 0.22); }
  boing()   { this.tone(170, 620, 0.26, 'sine', 0.22); this.tone(320, 740, 0.18, 'triangle', 0.12, 0.05); }
  slurp()   { this.tone(280, 720, 0.11, 'sine', 0.18); }
  release() { this.tone(540, 220, 0.10, 'sine', 0.14); }
  flop()    { this.tone(310, 105, 0.19, 'triangle', 0.18); }
  oink()    {
    const b = 175 + Math.random() * 85;
    this.tone(b, b * 1.48, 0.12, 'sawtooth', 0.13);
    this.tone(b * 1.1, b * 0.72, 0.10, 'sawtooth', 0.09, 0.09);
  }
  boom()    { this.tone(120, 26, 0.38, 'sawtooth', 0.28); this.tone(80, 22, 0.34, 'square', 0.14, 0.03); }
  woodBreak() { this.tone(190, 62, 0.13, 'sawtooth', 0.18, 0); this.tone(260, 85, 0.11, 'square', 0.12, 0.03); }
  spark()   { this.tone(920, 240, 0.18, 'sawtooth', 0.16, 0); this.tone(1350, 410, 0.14, 'square', 0.10, 0.04); }
  splash()  { this.tone(320, 110, 0.24, 'sine', 0.16); this.tone(580, 190, 0.18, 'triangle', 0.09, 0.04); }
  nitro()   { this.tone(110, 290, 0.22, 'sawtooth', 0.14); }
  acornGet() {
    this.tone(587, 784, 0.12, 'sine', 0.18, 0);
    this.tone(784, 1046, 0.14, 'triangle', 0.18, 0.09);
    this.tone(1046, 1568, 0.26, 'sine', 0.20, 0.18);
  }
  crate()   { this.tone(150 + Math.random() * 55, 65, 0.08, 'triangle', 0.12); }
  combo()   { this.tone(520, 780, 0.11, 'triangle', 0.11); }
  bank()    {
    this.tone(523, 659, 0.12, 'triangle', 0.15, 0);
    this.tone(659, 784, 0.14, 'triangle', 0.15, 0.09);
    this.tone(784, 1046, 0.22, 'sine', 0.16, 0.18);
  }
  horn()    { this.tone(330, 322, 0.22, 'sawtooth', 0.14); this.tone(415, 405, 0.22, 'square', 0.08); }
  carHit()  { this.tone(160, 48, 0.19, 'sawtooth', 0.24); this.tone(390, 130, 0.14, 'triangle', 0.14, 0.02); }
}
const sfx = new SoundFX();

// ----------------------------------------------------------------------------
// ПРОЦЕДУРНЫЕ ТЕКСТУРЫ ДЛЯ ВСЕХ БИОМОВ
// ----------------------------------------------------------------------------
function setSRGBTex(tex) {
  if ('SRGBColorSpace' in THREE) tex.colorSpace = THREE.SRGBColorSpace;
  else tex.encoding = THREE.sRGBEncoding;
}

function makeSoftTex(size, drawFn, rx = 1, ry = 1) {
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d');
  drawFn(ctx, size);
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(rx, ry);
  setSRGBTex(tex);
  return tex;
}

const texGrass = makeSoftTex(256, (ctx, s) => {
  ctx.fillStyle = '#68bd4c';
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 380; i++) {
    ctx.fillStyle = i % 3 === 0 ? 'rgba(80,162,54,0.28)' : 'rgba(136,222,98,0.22)';
    ctx.beginPath();
    ctx.arc(Math.random() * s, Math.random() * s, 6 + Math.random() * 18, 0, Math.PI * 2);
    ctx.fill();
  }
}, 64, 64);

const texPlaza = makeSoftTex(256, (ctx, s) => {
  ctx.fillStyle = '#ddd0b8';
  ctx.fillRect(0, 0, s, s);
  for (let y = 0; y < s; y += 32) {
    const off = (y / 32) % 2 === 0 ? 0 : 16;
    for (let x = -16; x < s; x += 32) {
      ctx.fillStyle = (x + y) % 64 === 0 ? '#d2c3a8' : '#e6dac4';
      ctx.beginPath();
      ctx.roundRect(x + off + 2, y + 2, 28, 28, 5);
      ctx.fill();
    }
  }
}, 9, 9);

const texRoad = makeSoftTex(256, (ctx, s) => {
  ctx.fillStyle = '#5c6370';
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 220; i++) {
    ctx.fillStyle = 'rgba(255,255,255,0.045)';
    ctx.fillRect(Math.random() * s, Math.random() * s, 5, 5);
  }
  ctx.fillStyle = '#f5d256';
  ctx.fillRect(122, 24, 12, 86);
  ctx.fillRect(122, 150, 12, 86);
  ctx.fillStyle = 'rgba(255,255,255,0.38)';
  ctx.fillRect(12, 0, 8, s);
  ctx.fillRect(s - 20, 0, 8, s);
}, 1, 44);

const texSand = makeSoftTex(256, (ctx, s) => {
  ctx.fillStyle = '#f2d388';
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 320; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(217,181,98,0.32)' : 'rgba(255,238,186,0.35)';
    ctx.beginPath();
    ctx.arc(Math.random() * s, Math.random() * s, 5 + Math.random() * 14, 0, Math.PI * 2);
    ctx.fill();
  }
}, 14, 14);

const texConcrete = makeSoftTex(256, (ctx, s) => {
  ctx.fillStyle = '#9aa1ab';
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(70,76,84,0.16)' : 'rgba(220,226,235,0.18)';
    ctx.fillRect(Math.random() * s, Math.random() * s, 8, 8);
  }
  ctx.strokeStyle = 'rgba(60,65,72,0.35)';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, s - 8, s - 8);
}, 10, 10);

const texWater = makeSoftTex(256, (ctx, s) => {
  ctx.fillStyle = '#2da8eb';
  ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = 'rgba(186, 238, 255, 0.45)';
  ctx.lineWidth = 6;
  for (let y = 24; y < s; y += 48) {
    ctx.beginPath();
    for (let x = 0; x <= s; x += 32) {
      const wy = y + Math.sin((x / s) * Math.PI * 4) * 7;
      if (x === 0) ctx.moveTo(x, wy);
      else ctx.lineTo(x, wy);
    }
    ctx.stroke();
  }
}, 12, 12);

function makeWoodWallTex(baseHex, darkHex, lightHex, rx = 2, ry = 2) {
  return makeSoftTex(256, (ctx, s) => {
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, s, s);
    const rows = 8;
    const h = s / rows;
    for (let r = 0; r < rows; r++) {
      const y = r * h;
      ctx.fillStyle = r % 2 === 0 ? lightHex : baseHex;
      ctx.globalAlpha = 0.24;
      ctx.fillRect(0, y, s, h);
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = darkHex;
      ctx.fillRect(0, y, s, 3);
    }
  }, rx, ry);
}

function makePlasterWallTex(baseHex, shadeHex) {
  return makeSoftTex(256, (ctx, s) => {
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 220; i++) {
      ctx.fillStyle = shadeHex;
      ctx.globalAlpha = 0.08 + Math.random() * 0.08;
      ctx.beginPath();
      ctx.arc(Math.random() * s, Math.random() * s, 4 + Math.random() * 14, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = '#6e4729';
    ctx.fillRect(0, 0, s, 14);
    ctx.fillRect(0, s - 14, s, 14);
    ctx.fillRect(0, 0, 14, s);
    ctx.fillRect(s - 14, 0, 14, s);
  }, 2, 1);
}

function makeRoofTileTex(baseHex, darkHex, lightHex) {
  return makeSoftTex(256, (ctx, s) => {
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, s, s);
    const rows = 8, cols = 6, rh = s / rows, cw = s / cols;
    for (let r = 0; r < rows; r++) {
      const y = r * rh;
      const off = (r % 2) * (cw * 0.5);
      for (let c = -1; c <= cols; c++) {
        const x = c * cw + off;
        ctx.fillStyle = (c + r) % 2 === 0 ? lightHex : baseHex;
        ctx.beginPath();
        ctx.roundRect(x + 2, y + 1, cw - 4, rh - 2, [0, 0, 10, 10]);
        ctx.fill();
        ctx.strokeStyle = darkHex;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x + cw * 0.5, y + rh * 0.55, cw * 0.46, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.stroke();
      }
    }
  }, 3, 3);
}

const texCrate = makeSoftTex(256, (ctx, s) => {
  ctx.fillStyle = '#d19852';
  ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = '#8c5823';
  ctx.lineWidth = 26;
  ctx.strokeRect(13, 13, s - 26, s - 26);
  ctx.lineWidth = 20;
  ctx.beginPath();
  ctx.moveTo(22, 22); ctx.lineTo(s - 22, s - 22);
  ctx.stroke();
});

const texBarrel = makeSoftTex(256, (ctx, s) => {
  const g = ctx.createLinearGradient(0, 0, 0, s);
  g.addColorStop(0, '#c4271d'); g.addColorStop(0.5, '#e63a2e'); g.addColorStop(1, '#a81d14');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  ctx.fillStyle = '#ffd13b';
  ctx.fillRect(0, 88, s, 80);
  ctx.fillStyle = '#241814';
  for (let x = -64; x < s + 64; x += 52) {
    ctx.beginPath();
    ctx.moveTo(x, 88); ctx.lineTo(x + 26, 88);
    ctx.lineTo(x - 10, 168); ctx.lineTo(x - 36, 168);
    ctx.fill();
  }
});

const texTrampoline = makeSoftTex(256, (ctx, s) => {
  const cx = s / 2, cy = s / 2;
  ctx.fillStyle = '#242933';
  ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = '#ffbe2e'; ctx.lineWidth = 14;
  ctx.beginPath(); ctx.arc(cx, cy, 82, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#ff5470'; ctx.lineWidth = 10;
  ctx.beginPath(); ctx.arc(cx, cy, 42, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#ffe55c';
  ctx.beginPath(); ctx.arc(cx, cy, 16, 0, Math.PI * 2); ctx.fill();
});

const texRamp = makeSoftTex(256, (ctx, s) => {
  ctx.fillStyle = '#f5b82e';
  ctx.fillRect(0, 0, s, s);
  ctx.fillStyle = '#2b2421';
  for (let y = 0; y < s; y += 64) {
    ctx.fillRect(0, y, 28, 32);
    ctx.fillRect(s - 28, y, 28, 32);
  }
  ctx.fillStyle = '#fff9e0';
  ctx.beginPath();
  ctx.moveTo(128, 36); ctx.lineTo(186, 114); ctx.lineTo(152, 114);
  ctx.lineTo(152, 220); ctx.lineTo(104, 220); ctx.lineTo(104, 114);
  ctx.lineTo(70, 114); ctx.closePath();
  ctx.fill();
}, 1, 2);

// ----------------------------------------------------------------------------
// THREE.JS СЦЕНА, ТУМАН (FogExp2), ДАЛЬНОСТЬ КАМЕРЫ (far = 360) И CANNON-ES
// ----------------------------------------------------------------------------
const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
if ('SRGBColorSpace' in THREE) renderer.outputColorSpace = THREE.SRGBColorSpace;
else renderer.outputEncoding = THREE.sRGBEncoding;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xcfeaff, 0.0028);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.22, 360);

// Градиентное небо + солнце
const sunDir = new THREE.Vector3(0.52, 0.68, 0.42).normalize();
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  fog: false,
  uniforms: {
    topColor:     { value: new THREE.Color(0x2884e8) },
    midColor:     { value: new THREE.Color(0x8cd0ff) },
    horizonColor: { value: new THREE.Color(0xfff0d4) },
    sunDirection: { value: sunDir },
  },
  vertexShader: `
    varying vec3 vWorldPos;
    void main() {
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWorldPos = wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `,
  fragmentShader: `
    uniform vec3 topColor;
    uniform vec3 midColor;
    uniform vec3 horizonColor;
    uniform vec3 sunDirection;
    varying vec3 vWorldPos;
    void main() {
      vec3 dir = normalize(vWorldPos);
      float h = clamp(dir.y, 0.0, 1.0);
      vec3 col = mix(horizonColor, midColor, smoothstep(0.0, 0.24, h));
      col = mix(col, topColor, smoothstep(0.20, 0.85, h));
      float sunAmt = max(dot(dir, sunDirection), 0.0);
      col += vec3(1.0, 0.94, 0.76) * pow(sunAmt, 36.0) * 0.55;
      col += vec3(1.0, 0.98, 0.90) * smoothstep(0.996, 0.999, sunAmt) * 0.9;
      gl_FragColor = vec4(col, 1.0);
    }
  `,
});
const skyDome = new THREE.Mesh(new THREE.SphereGeometry(320, 24, 16), skyMat);
scene.add(skyDome);

// Лёгкая процедурная карта окружения (PMREM) — обеспечивает реальную работу envMapIntensity и отражения на стёклах
(function setupDaylightEnvMap() {
  try {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 64;
    const ctx = c.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 64);
    grad.addColorStop(0.00, '#62b6ff');
    grad.addColorStop(0.38, '#b8e3ff');
    grad.addColorStop(0.50, '#fff4dc');
    grad.addColorStop(0.62, '#c8d9b8');
    grad.addColorStop(1.00, '#7ea86b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 64);
    const envTex = new THREE.CanvasTexture(c);
    envTex.mapping = THREE.EquirectangularReflectionMapping;
    setSRGBTex(envTex);
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    scene.environment = pmrem.fromEquirectangular(envTex).texture;
    envTex.dispose();
    pmrem.dispose();
  } catch (err) {
    console.warn('Процедурная карта окружения пропущена:', err);
  }
})();

scene.add(new THREE.HemisphereLight(0xdff3ff, 0x4d7334, 0.9));
const sun = new THREE.DirectionalLight(0xfff2d6, 1.35);
sun.position.copy(sunDir).multiplyScalar(95);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.near = 15;
sun.shadow.camera.far = 220;
const shD = 70;
sun.shadow.camera.left = -shD;
sun.shadow.camera.right = shD;
sun.shadow.camera.top = shD;
sun.shadow.camera.bottom = -shD;
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.05;
sun.shadow.radius = 3.0;
scene.add(sun);
scene.add(sun.target);

const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -24, 0) });
world.broadphase = new CANNON.SAPBroadphase(world);
world.allowSleep = true;
world.defaultContactMaterial.friction = 0.42;
world.defaultContactMaterial.restitution = 0.25;

const matWorld   = new CANNON.Material('world');
const matSlide   = new CANNON.Material('slide');
const matPlayer  = new CANNON.Material('player');
const matTractor = new CANNON.Material('tractor');
const matProp    = new CANNON.Material('prop');
const matNpc     = new CANNON.Material('npc');
const matVehicle = new CANNON.Material('vehicle');

world.addContactMaterial(new CANNON.ContactMaterial(matPlayer,  matWorld,   { friction: 0.0, restitution: 0.05 }));
world.addContactMaterial(new CANNON.ContactMaterial(matPlayer,  matSlide,   { friction: 0.005, restitution: 0.02 }));
world.addContactMaterial(new CANNON.ContactMaterial(matProp,    matSlide,   { friction: 0.01, restitution: 0.05 }));
world.addContactMaterial(new CANNON.ContactMaterial(matNpc,     matSlide,   { friction: 0.01, restitution: 0.05 }));
world.addContactMaterial(new CANNON.ContactMaterial(matTractor, matWorld,   { friction: 0.03, restitution: 0.05 }));
world.addContactMaterial(new CANNON.ContactMaterial(matProp,    matWorld,   { friction: 0.50, restitution: 0.30 }));
world.addContactMaterial(new CANNON.ContactMaterial(matNpc,     matWorld,   { friction: 0.28, restitution: 0.34 }));
world.addContactMaterial(new CANNON.ContactMaterial(matTractor, matProp,    { friction: 0.20, restitution: 0.55 }));
world.addContactMaterial(new CANNON.ContactMaterial(matVehicle, matWorld,   { friction: 0.24, restitution: 0.20 }));
world.addContactMaterial(new CANNON.ContactMaterial(matVehicle, matPlayer,  { friction: 0.12, restitution: 0.25 }));
world.addContactMaterial(new CANNON.ContactMaterial(matVehicle, matTractor, { friction: 0.18, restitution: 0.45 }));
world.addContactMaterial(new CANNON.ContactMaterial(matVehicle, matProp,    { friction: 0.30, restitution: 0.32 }));
world.addContactMaterial(new CANNON.ContactMaterial(matVehicle, matVehicle, { friction: 0.25, restitution: 0.25 }));

function stdMat(color, roughness = 0.78, metalness = 0.04) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

// ----------------------------------------------------------------------------
// СИСТЕМА ОЧКОВ, КОМБО И ТРЮКОВ
// ----------------------------------------------------------------------------
let totalScore = 0;
let comboPoints = 0;
let comboMult = 0;
let comboTimer = 0;
const COMBO_MAX_TIME = 4.2;

const scoreEl      = document.getElementById('score-val');
const scorePill    = document.getElementById('score-pill');
const comboPanel   = document.getElementById('combo-panel');
const comboPtsEl   = document.getElementById('combo-pts');
const comboMultEl  = document.getElementById('combo-mult');
const comboBarFill = document.getElementById('combo-bar-fill');
const trickFeed    = document.getElementById('trick-feed');
const floatLayer   = document.getElementById('float-layer');

// Отметка тел, получивших импульс от игрока (для честного начисления очков)
function markByPlayer(body, duration = 3.0) {
  if (!body) return;
  if (!body.userData) body.userData = {};
  body.userData.byPlayerUntil = Math.max(body.userData.byPlayerUntil || 0, elapsedTime + duration);
}

function isBodyByPlayer(body) {
  return Boolean(body && body.userData && (body.userData.byPlayerUntil || 0) >= elapsedTime);
}

// Одноразовая подсказка при запуске без локального сервера (file:// или content://)
let glbCorsHintShown = false;
function checkLocalGlbProtocolHint() {
  if (glbCorsHintShown) return;
  const proto = window.location && window.location.protocol;
  if (proto !== 'file:' && proto !== 'content:') return;
  glbCorsHintShown = true;

  const tip = document.createElement('div');
  tip.id = 'glb-cors-tip';
  tip.textContent = 'Для загрузки 3D-зданий (.glb) откройте игру через локальный сервер (Acode / Live Server)';
  document.body.appendChild(tip);

  requestAnimationFrame(() => tip.classList.add('visible'));
  setTimeout(() => {
    tip.classList.remove('visible');
    setTimeout(() => tip.remove(), 350);
  }, 5000);
}

function spawnFloatText(worldPos, text, color = '#ffe84d') {
  if (!worldPos) return;
  const v = new THREE.Vector3(worldPos.x, worldPos.y + 1.1, worldPos.z);
  v.project(camera);
  if (v.z > 1) return;
  const x = (v.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-v.y * 0.5 + 0.5) * window.innerHeight;
  const el = document.createElement('div');
  el.className = 'float-pop';
  el.style.color = color;
  el.textContent = text;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  floatLayer.appendChild(el);
  setTimeout(() => el.remove(), 960);
}

function addTrick(label, points, worldPos = null, popColor = '#ffe84d') {
  comboPoints += points;
  comboMult = Math.min(20, comboMult + 1);
  comboTimer = COMBO_MAX_TIME;

  comboPanel.classList.add('visible');
  comboPtsEl.textContent = `+${comboPoints}`;
  comboMultEl.textContent = `x${comboMult}`;

  const item = document.createElement('div');
  item.className = 'trick-item';
  item.innerHTML = `${ICONS.trickStar}<span>${label} +${points}</span>`;
  trickFeed.prepend(item);
  while (trickFeed.children.length > 1) trickFeed.lastChild.remove();

  sfx.combo();
  if (worldPos) spawnFloatText(worldPos, `${label} +${points}`, popColor);
}

function updateCombo(dt) {
  if (comboTimer <= 0) return;
  comboTimer -= dt;
  comboBarFill.style.transform = `scaleX(${Math.max(0, comboTimer / COMBO_MAX_TIME)})`;
  if (comboTimer <= 0) {
    const banked = comboPoints * Math.max(1, comboMult);
    totalScore += banked;
    scoreEl.textContent = totalScore.toLocaleString('ru-RU');
    scorePill.classList.add('bump');
    setTimeout(() => scorePill.classList.remove('bump'), 180);
    sfx.bank();
    spawnFloatText(inTractor ? tractor.body.position : playerBody.position, `БАНК! +${banked}`, '#6aff70');

    comboPoints = 0;
    comboMult = 0;
    comboPanel.classList.remove('visible');
    trickFeed.innerHTML = '';
  }
}

const particles = [];
const particleGeo = new THREE.DodecahedronGeometry(0.18, 0);
const splinterGeo = new THREE.BoxGeometry(0.38, 0.08, 0.12);

function spawnBurst(pos, colorHex, count = 10, speed = 8, scaleMul = 1, isSplinter = false) {
  const mat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: isSplinter ? 0.8 : 0.4,
    emissive: isSplinter ? 0x000000 : colorHex,
    emissiveIntensity: isSplinter ? 0 : 0.25,
  });
  for (let i = 0; i < count; i++) {
    const m = new THREE.Mesh(isSplinter ? splinterGeo : particleGeo, mat);
    m.position.set(pos.x, pos.y + 0.35, pos.z);
    m.scale.setScalar((0.6 + Math.random() * 0.7) * scaleMul);
    scene.add(m);
    const a = Math.random() * Math.PI * 2;
    const spd = (0.35 + Math.random() * 0.65) * speed;
    particles.push({
      mesh: m,
      vx: Math.cos(a) * spd,
      vy: 2.5 + Math.random() * speed * 0.85,
      vz: Math.sin(a) * spd,
      life: 0.45 + Math.random() * 0.42,
      maxLife: 0.87,
      baseScale: m.scale.x,
    });
  }
}

const shockwaves = [];
function spawnExplosionFlash(pos) {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(1, 14, 10),
    new THREE.MeshBasicMaterial({ color: 0xff8a24, transparent: true, opacity: 0.82 })
  );
  m.position.set(pos.x, pos.y + 0.4, pos.z);
  scene.add(m);
  shockwaves.push({ mesh: m, life: 0.34, maxLife: 0.34 });
}

// ----------------------------------------------------------------------------
// 1. ОТКРЫТЫЙ МИР 500x500: 5 ТЕМАТИЧЕСКИХ БИОМОВ + ПУЛ КОЛЛАЙДЕРОВ ДЕРЕВЬЕВ
// ----------------------------------------------------------------------------
const trampolines = [];
let slideZone = null;
const noTreeZones = []; // { x, z, r }
const treePositions = []; // Координаты всех деревьев для пула коллайдеров 30м!
let windmillBlades = null;
let windmillHubWorld = new THREE.Vector3(16, 13.5, -152);
let lakeMesh = null;
let waterSplashCooldown = 0;

// Пул статических цилиндрических коллайдеров (активируются только в радиусе 30м!)
const TREE_COLLIDER_POOL_SIZE = 28;
const treeColliderPool = [];
for (let i = 0; i < TREE_COLLIDER_POOL_SIZE; i++) {
  const b = new CANNON.Body({ mass: 0, material: matWorld, position: new CANNON.Vec3(0, -100, 0) });
  b.addShape(new CANNON.Cylinder(0.55, 0.62, 4.5, 8));
  b.collisionResponse = false;
  world.addBody(b);
  treeColliderPool.push(b);
}

function updateTreeColliderPool() {
  const ref = inTractor ? tractor.body.position : playerBody.position;
  let slot = 0;
  for (let i = 0; i < treePositions.length && slot < TREE_COLLIDER_POOL_SIZE; i++) {
    const tp = treePositions[i];
    const dx = tp.x - ref.x;
    const dz = tp.z - ref.z;
    if (dx * dx + dz * dz < 900) { // 30^2 = 900
      const b = treeColliderPool[slot++];
      b.position.set(tp.x, 2.2, tp.z);
      b.collisionResponse = true;
    }
  }
  for (; slot < TREE_COLLIDER_POOL_SIZE; slot++) {
    const b = treeColliderPool[slot];
    b.position.set(0, -100, 0);
    b.collisionResponse = false;
  }
}

// ----------------------------------------------------------------------------
// КЭШИРУЮЩИЙ ЗАГРУЗЧИК 3D-МОДЕЛЕЙ ОКРУЖЕНИЯ KENNEY (./models/*.glb)
// ----------------------------------------------------------------------------
const MODEL_DIR = './models/';
const KENNEY_BUILDINGS = [
  'building-a.glb', 'building-b.glb', 'building-d.glb', 'building-h.glb',
  'building-k.glb', 'building-o.glb', 'building-q.glb', 'building-t.glb',
];
const envGltfLoader = new GLTFLoader();
const envModelCache = new Map(); // filename -> Promise<THREE.Object3D | null>

function loadModel(filename) {
  if (!envModelCache.has(filename)) {
    const promise = new Promise((resolve) => {
      envGltfLoader.load(
        `${MODEL_DIR}${filename}`,
        (gltf) => {
          const root = gltf.scene || (gltf.scenes && gltf.scenes[0]);
          if (!root) {
            resolve(null);
            return;
          }
          root.traverse((obj) => {
            if (obj.isMesh) {
              obj.castShadow = true;
              obj.receiveShadow = true;
              const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
              for (const m of mats) {
                if (!m) continue;
                if (m.map) setSRGBTex(m.map);
              }
            }
          });
          resolve(root);
        },
        undefined,
        (err) => {
          console.warn(`Не удалось загрузить ${MODEL_DIR}${filename}, оставлен процедурный fallback:`, err);
          checkLocalGlbProtocolHint();
          resolve(null);
        }
      );
    });
    envModelCache.set(filename, promise);
  }
  return envModelCache.get(filename).then((template) => (template ? template.clone(true) : null));
}

// Хранилище привязок крыш для актуализации высоты золотых желудей после загрузки .glb
const roofHeightHooks = new Map(); // acornIdx -> (roofY) => void

/**
 * Ставит 3D-модель из ./models/<filename> с автоматическим расчётом Box3, масштабированием,
 * постановкой на y = yBase, тенями и точным CANNON.Box-коллайдером под реальные габариты.
 * Пока .glb грузится (или если он недоступен), отображается мягкий процедурный fallback.
 */
const placedKenneyCoords = [];

function placeKenneyModel({
  filename,
  x,
  z,
  yBase = 0,
  yaw = 0,
  targetSize = 11.0,
  scaleMode = 'maxHoriz', // 'maxHoriz' | 'height'
  pbrStyle = null,        // 'brick-house' | 'concrete-house' | 'windmill' | 'water-tower' | 'container'
  pbrTint = 0xffffff,
  fallbackBuilder,
  onLoaded = null,
}) {
  // Защита от двойного спавна постройки в одних и тех же координатах (исключает наложение стен и Z-fighting)
  for (const prev of placedKenneyCoords) {
    if (Math.hypot(prev.x - x, prev.z - z) < 1.5 && Math.abs(prev.yBase - yBase) < 1.0) {
      console.warn(`Пропущен дубликат постройки ${filename} в (${x}, ${z})`);
      return;
    }
  }
  placedKenneyCoords.push({ filename, x, z, yBase });

  const fallback = fallbackBuilder ? fallbackBuilder() : null;

  loadModel(filename).then((model) => {
    if (!model) return; // Мягкий fallback остаётся на месте

    const holder = new THREE.Group();
    holder.position.set(x, yBase, z);
    holder.rotation.y = yaw;

    const inner = new THREE.Group();
    inner.add(model);
    holder.add(inner);

    model.updateMatrixWorld(true);
    const rawBox = new THREE.Box3().setFromObject(model);
    const rawSize = new THREE.Vector3();
    rawBox.getSize(rawSize);

    const denom = scaleMode === 'height'
      ? Math.max(0.01, rawSize.y)
      : Math.max(0.01, rawSize.x, rawSize.z);
    const s = targetSize / denom;
    model.scale.multiplyScalar(s);

    inner.updateMatrixWorld(true);
    const scaledBox = new THREE.Box3().setFromObject(inner);
    const center = new THREE.Vector3();
    const finalSize = new THREE.Vector3();
    scaledBox.getCenter(center);
    scaledBox.getSize(finalSize);

    // Центрируем по X и Z, ставим основание строго на y = 0 в локальных координатах holder
    model.position.x -= center.x;
    model.position.z -= center.z;
    model.position.y -= scaledBox.min.y;
    inner.updateMatrixWorld(true);

    // Заменяем мультяшные материалы Kenney на реалистичные PBR-текстуры с корректными мировыми UV
    if (pbrStyle) {
      applyPBRToKenneyModel(inner, finalSize, pbrStyle, pbrTint);
    }

    model.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });

    // Удаляем процедурный fallback (визуал + физику)
    if (fallback) {
      if (fallback.mesh) scene.remove(fallback.mesh);
      if (fallback.body) world.removeBody(fallback.body);
    }

    scene.add(holder);

    // Точный статический физический коллайдер CANNON.Box под реальные размеры .glb
    const body = new CANNON.Body({
      mass: 0,
      material: matWorld,
      position: new CANNON.Vec3(x, yBase + finalSize.y / 2, z),
    });
    body.quaternion.setFromEuler(0, yaw, 0);
    body.addShape(new CANNON.Box(new CANNON.Vec3(
      Math.max(0.4, finalSize.x / 2),
      Math.max(0.4, finalSize.y / 2),
      Math.max(0.4, finalSize.z / 2)
    )));
    world.addBody(body);

    if (onLoaded) onLoaded(holder, finalSize, body);
  });
}

// ----------------------------------------------------------------------------
// КЭШИРУЮЩИЙ ЗАГРУЗЧИК РЕАЛИСТИЧНЫХ PBR-МАТЕРИАЛОВ (./textures/*.jpg)
// ----------------------------------------------------------------------------
const TEXTURE_DIR = './textures/';
const pbrTextureLoader = new THREE.TextureLoader();
const pbrBaseTexCache = new Map();  // url -> Promise<THREE.Texture | null>
const pbrMaterialCache = new Map(); // cacheKey -> THREE.MeshStandardMaterial

function loadCachedRawTexture(url) {
  if (!pbrBaseTexCache.has(url)) {
    const promise = new Promise((resolve) => {
      pbrTextureLoader.load(
        url,
        (tex) => resolve(tex),
        undefined,
        (err) => {
          console.warn(`PBR-текстура не загружена (${url}), оставлен процедурный fallback:`, err);
          resolve(null);
        }
      );
    });
    pbrBaseTexCache.set(url, promise);
  }
  return pbrBaseTexCache.get(url);
}

function configurePBRTexture(baseTex, repeatX, repeatY, isColor) {
  if (!baseTex || !baseTex.image) return null;
  const tex = new THREE.Texture(baseTex.image);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = Math.min(isMobile ? 4 : 8, renderer.capabilities.getMaxAnisotropy() || 1);
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  if (isColor) setSRGBTex(tex);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Загружает и кэширует PBR-материал из ./textures/<prefix>_{Color,NormalGL,Roughness}.jpg
 * с анизотропией и RepeatWrapping; до загрузки (или при ошибке) работает мягкий процедурный fallback.
 */
function loadPBRMaterial(prefix, repeatX, repeatY, options = {}) {
  const {
    fallbackMap = null,
    fallbackRoughness = 0.90,
    roughness = 0.92,
    metalness = 0.0,
    envMapIntensity = 1.0,
    polygonOffset = false,
    polygonOffsetFactor = 0,
    polygonOffsetUnits = 0,
    useNormal = false,
    useRoughness = false,
    useMetalness = false,
    normalScale = 0.5,
    color = 0xffffff,
    side = THREE.FrontSide,
  } = options;

  const key = `${prefix}|${repeatX}x${repeatY}|${roughness}|${metalness}|${envMapIntensity}|${polygonOffset}:${polygonOffsetFactor}:${polygonOffsetUnits}|${useNormal}|${useRoughness}|${useMetalness}|${normalScale}|${color}|${side}`;
  if (pbrMaterialCache.has(key)) return pbrMaterialCache.get(key);

  const mat = new THREE.MeshStandardMaterial({
    color,
    map: fallbackMap || null,
    roughness: fallbackRoughness,
    metalness: useMetalness ? Math.max(0.5, metalness) : metalness,
    envMapIntensity,
    polygonOffset,
    polygonOffsetFactor,
    polygonOffsetUnits,
    side,
  });
  pbrMaterialCache.set(key, mat);

  const colorUrl = `${TEXTURE_DIR}${prefix}_Color.jpg`;
  const normalUrl = `${TEXTURE_DIR}${prefix}_NormalGL.jpg`;
  const roughUrl = `${TEXTURE_DIR}${prefix}_Roughness.jpg`;
  const metalUrl = `${TEXTURE_DIR}${prefix}_Metalness.jpg`;

  Promise.all([
    loadCachedRawTexture(colorUrl),
    useNormal ? loadCachedRawTexture(normalUrl) : Promise.resolve(null),
    useRoughness ? loadCachedRawTexture(roughUrl) : Promise.resolve(null),
    useMetalness ? loadCachedRawTexture(metalUrl) : Promise.resolve(null),
  ]).then(([rawColor, rawNormal, rawRough, rawMetal]) => {
    let changed = false;
    if (rawColor) {
      const cTex = configurePBRTexture(rawColor, repeatX, repeatY, true);
      if (cTex) { mat.map = cTex; mat.roughness = roughness; changed = true; }
    }
    if (rawNormal) {
      const nTex = configurePBRTexture(rawNormal, repeatX, repeatY, false);
      if (nTex) {
        mat.normalMap = nTex;
        mat.normalScale = new THREE.Vector2(normalScale, normalScale);
        changed = true;
      }
    }
    if (rawRough) {
      const rTex = configurePBRTexture(rawRough, repeatX, repeatY, false);
      if (rTex) {
        mat.roughnessMap = rTex;
        changed = true;
      }
    }
    if (rawMetal) {
      const mTex = configurePBRTexture(rawMetal, repeatX, repeatY, false);
      if (mTex) {
        mat.metalnessMap = mTex;
        mat.metalness = metalness > 0 ? metalness : 1.0;
        changed = true;
      }
    }
    if (changed) mat.needsUpdate = true;
  });

  return mat;
}

// Набор реалистичных кэшированных PBR-материалов для домов, крыш, заборов, башни, мельницы и контейнеров
let worldPBRCache = null;
function getWorldPBRMaterials() {
  if (worldPBRCache) return worldPBRCache;
  worldPBRCache = {
    // Кирпичные стены домов (Bricks085): DoubleSide, светлые и без Z-fighting
    bricks: loadPBRMaterial('Bricks085_1K-JPG', 2.2, 2.2, {
      fallbackMap: texPlaza,
      fallbackRoughness: 0.75,
      roughness: 0.75,
      metalness: 0.05,
      envMapIntensity: 1.5,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
      color: 0xffffff,
      side: THREE.DoubleSide,
      useNormal: true,
      useRoughness: true,
      normalScale: 0.72,
    }),
    // Светлая штукатурка стен домов (DoubleSide)
    plasterLight: loadPBRMaterial('Concrete042C_1K-JPG', 1.8, 1.8, {
      fallbackMap: texPlaza,
      fallbackRoughness: 0.75,
      roughness: 0.75,
      metalness: 0.05,
      envMapIntensity: 1.5,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
      color: 0xffffff,
      side: THREE.DoubleSide,
      useNormal: true,
      useRoughness: true,
      normalScale: 0.34,
    }),
    // Бетонные стены домов (Concrete042C, DoubleSide)
    concrete: loadPBRMaterial('Concrete042C_1K-JPG', 1.6, 1.6, {
      fallbackMap: texConcrete,
      fallbackRoughness: 0.75,
      roughness: 0.75,
      metalness: 0.05,
      envMapIntensity: 1.5,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
      color: 0xffffff,
      side: THREE.DoubleSide,
      useNormal: true,
      useRoughness: true,
      normalScale: 0.62,
    }),
    // Водонапорная башня (Concrete042C, DoubleSide)
    concreteTower: loadPBRMaterial('Concrete042C_1K-JPG', 2, 3, {
      fallbackMap: texConcrete,
      fallbackRoughness: 0.75,
      roughness: 0.75,
      metalness: 0.05,
      envMapIntensity: 1.5,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
      color: 0xffffff,
      side: THREE.DoubleSide,
      useNormal: true,
      useRoughness: true,
      normalScale: 0.62,
    }),
    // Черепица для крыш (RoofingTiles001, DoubleSide)
    roofTiles: loadPBRMaterial('RoofingTiles001_1K-JPG', 2.4, 2.4, {
      fallbackMap: texPlaza,
      fallbackRoughness: 0.82,
      roughness: 0.85,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
      color: 0xffffff,
      side: THREE.DoubleSide,
      useNormal: true,
      useRoughness: true,
      normalScale: 0.72,
    }),
    // Деревянные доски (Planks039) для мельницы и деревянных вставок на домах (DoubleSide)
    planksWindmill: loadPBRMaterial('Planks039_1K-JPG', 2, 2, {
      fallbackMap: texCrate,
      fallbackRoughness: 0.85,
      roughness: 0.88,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
      color: 0xffffff,
      side: THREE.DoubleSide,
      useNormal: true,
      useRoughness: true,
      normalScale: 0.65,
    }),
    planksFenceRail: loadPBRMaterial('Planks039_1K-JPG', 2.2, 0.45, {
      fallbackMap: texCrate,
      fallbackRoughness: 0.85,
      roughness: 0.86,
      useNormal: true,
      useRoughness: true,
      normalScale: 0.62,
    }),
    planksFencePost: loadPBRMaterial('Planks039_1K-JPG', 0.45, 1.4, {
      fallbackMap: texCrate,
      fallbackRoughness: 0.85,
      roughness: 0.86,
      useNormal: true,
      useRoughness: true,
      normalScale: 0.62,
    }),
    // Светло-голубое глянцевое стекло с подсветкой и отрицательным polygonOffset (всегда поверх стены)
    glassWindow: new THREE.MeshStandardMaterial({
      color: 0x7fd4ff,
      emissive: new THREE.Color(0x335577),
      emissiveIntensity: 0.4,
      roughness: 0.1,
      metalness: 0.35,
      envMapIntensity: 1.4,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
    // Тёплое жилое стекло для оживления окон на домах
    warmGlassWindow: new THREE.MeshStandardMaterial({
      color: 0xffe49e,
      emissive: new THREE.Color(0x335577),
      emissiveIntensity: 0.4,
      roughness: 0.1,
      metalness: 0.25,
      envMapIntensity: 1.25,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
    // Контрастные светлые оконные рамы и подоконники
    windowFrame: new THREE.MeshStandardMaterial({
      color: 0xf7f1e3,
      roughness: 0.55,
      metalness: 0.05,
      envMapIntensity: 1.2,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
    windowMullion: new THREE.MeshStandardMaterial({
      color: 0x3b302a,
      roughness: 0.65,
      metalness: 0.08,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
    metalContainer(tintHex = 0xffffff) {
      return loadPBRMaterial('Metal041B_1K-JPG', 2, 2, {
        fallbackMap: texConcrete,
        fallbackRoughness: 0.55,
        roughness: 0.52,
        metalness: 0.92,
        useNormal: true,
        useRoughness: true,
        useMetalness: true,
        normalScale: 0.68,
        color: tintHex,
      });
    },
  };
  return worldPBRCache;
}

// Гарантирует, что материал стены здания двусторонний (DoubleSide) и никогда не имеет чёрного цвета (0x000000)
function sanitizeBuildingMaterial(mat, allowDarkTrim = false) {
  if (!mat) return mat;
  mat.side = THREE.DoubleSide;
  if (mat.color) {
    const hex = mat.color.getHex();
    const lum = 0.299 * mat.color.r + 0.587 * mat.color.g + 0.114 * mat.color.b;
    if (hex === 0x000000 || (!allowDarkTrim && lum < 0.12)) {
      mat.color.setHex(mat.map ? 0xffffff : 0xd8d0c4);
    }
  }
  if ('vertexColors' in mat && mat.map && !allowDarkTrim) {
    mat.vertexColors = false;
  }
  mat.needsUpdate = true;
  return mat;
}

// Удаляет дублирующиеся и копланарные перекрывающиеся треугольники на стенах зданий (устраняет чёрное мерцание)
// и чистит устаревший атрибут tangent перед пересчётом мировых UV для normalMap
function deduplicateBuildingGeometry(mesh, rootInverseMatrix) {
  if (!mesh || !mesh.geometry || !mesh.geometry.attributes || !mesh.geometry.attributes.position) return;
  let geo = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
  geo.deleteAttribute('tangent');
  if (!geo.attributes.normal) geo.computeVertexNormals();

  const posAttr = geo.attributes.position;
  const normAttr = geo.attributes.normal;
  const uvAttr = geo.attributes.uv;
  const colorAttr = geo.attributes.color;

  const relMat = new THREE.Matrix4().multiplyMatrices(rootInverseMatrix, mesh.matrixWorld);
  const triCount = Math.floor(posAttr.count / 3);
  const keptTris = [];
  const seenVertKeys = new Set();
  const seenPlaneCells = new Set();

  const p0 = new THREE.Vector3(), p1 = new THREE.Vector3(), p2 = new THREE.Vector3();
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), faceN = new THREE.Vector3();
  const q = (v) => Math.round(v * 250); // квант 4 мм

  for (let t = 0; t < triCount; t++) {
    const i0 = t * 3, i1 = i0 + 1, i2 = i0 + 2;
    p0.fromBufferAttribute(posAttr, i0).applyMatrix4(relMat);
    p1.fromBufferAttribute(posAttr, i1).applyMatrix4(relMat);
    p2.fromBufferAttribute(posAttr, i2).applyMatrix4(relMat);

    // Пропускаем вырожденные треугольники нулевой площади
    e1.subVectors(p1, p0);
    e2.subVectors(p2, p0);
    faceN.crossVectors(e1, e2);
    const area2Sq = faceN.lengthSq();
    if (area2Sq < 1e-8) continue;
    faceN.normalize();

    // 1) Проверка на точный дубликат треугольника (включая обратный порядок обхода)
    const k0 = `${q(p0.x)},${q(p0.y)},${q(p0.z)}`;
    const k1 = `${q(p1.x)},${q(p1.y)},${q(p1.z)}`;
    const k2 = `${q(p2.x)},${q(p2.y)},${q(p2.z)}`;
    const triKey = [k0, k1, k2].sort().join('|');
    if (seenVertKeys.has(triKey)) continue;
    seenVertKeys.add(triKey);

    // 2) Проверка на наложенные копланарные дубликаты стен (одинаковый центр и плоскость, даже с перевёрнутой нормалью)
    const cx = Math.round(((p0.x + p1.x + p2.x) / 3) * 100);
    const cy = Math.round(((p0.y + p1.y + p2.y) / 3) * 100);
    const cz = Math.round(((p0.z + p1.z + p2.z) / 3) * 100);
    const anx = Math.round(Math.abs(faceN.x) * 10);
    const any = Math.round(Math.abs(faceN.y) * 10);
    const anz = Math.round(Math.abs(faceN.z) * 10);
    const cellKey = `${cx},${cy},${cz}|${anx},${any},${anz}`;
    if (seenPlaneCells.has(cellKey)) continue;
    seenPlaneCells.add(cellKey);

    keptTris.push(t);
  }

  if (keptTris.length > 0 && keptTris.length < triCount) {
    const outCount = keptTris.length * 3;
    const newPos = new Float32Array(outCount * 3);
    const newNorm = new Float32Array(outCount * 3);
    const newUv = uvAttr ? new Float32Array(outCount * 2) : null;
    const newCol = colorAttr ? new Float32Array(outCount * colorAttr.itemSize) : null;

    for (let k = 0; k < keptTris.length; k++) {
      const srcT = keptTris[k];
      for (let c = 0; c < 3; c++) {
        const sIdx = srcT * 3 + c;
        const dIdx = k * 3 + c;
        newPos[dIdx * 3]     = posAttr.getX(sIdx);
        newPos[dIdx * 3 + 1] = posAttr.getY(sIdx);
        newPos[dIdx * 3 + 2] = posAttr.getZ(sIdx);
        newNorm[dIdx * 3]     = normAttr.getX(sIdx);
        newNorm[dIdx * 3 + 1] = normAttr.getY(sIdx);
        newNorm[dIdx * 3 + 2] = normAttr.getZ(sIdx);
        if (newUv) {
          newUv[dIdx * 2]     = uvAttr.getX(sIdx);
          newUv[dIdx * 2 + 1] = uvAttr.getY(sIdx);
        }
        if (newCol) {
          for (let ci = 0; ci < colorAttr.itemSize; ci++) {
            newCol[dIdx * colorAttr.itemSize + ci] = colorAttr.array[sIdx * colorAttr.itemSize + ci];
          }
        }
      }
    }

    const cleanGeo = new THREE.BufferGeometry();
    cleanGeo.setAttribute('position', new THREE.BufferAttribute(newPos, 3));
    cleanGeo.setAttribute('normal', new THREE.BufferAttribute(newNorm, 3));
    if (newUv) cleanGeo.setAttribute('uv', new THREE.BufferAttribute(newUv, 2));
    if (newCol) cleanGeo.setAttribute('color', new THREE.BufferAttribute(newCol, colorAttr.itemSize));
    cleanGeo.computeBoundingBox();
    cleanGeo.computeBoundingSphere();
    mesh.geometry = cleanGeo;
  } else {
    mesh.geometry = geo;
  }
}

// Генерирует аккуратные мировые Box-Projection UV в метрах для моделей Kenney
function applyWorldBoxUVs(mesh, rootInverseMatrix, uvUnitMeters = 4.0) {
  if (!mesh || !mesh.geometry || !mesh.geometry.attributes || !mesh.geometry.attributes.position) return;
  const geo = mesh.geometry.clone();
  geo.deleteAttribute('tangent');
  mesh.geometry = geo;
  if (!geo.attributes.normal) geo.computeVertexNormals();

  const relMat = new THREE.Matrix4().multiplyMatrices(rootInverseMatrix, mesh.matrixWorld);
  const normMat = new THREE.Matrix3().getNormalMatrix(relMat);
  const posAttr = geo.attributes.position;
  const normAttr = geo.attributes.normal;
  const uvArr = new Float32Array(posAttr.count * 2);

  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  const invScale = 1.0 / Math.max(0.25, uvUnitMeters);

  for (let i = 0; i < posAttr.count; i++) {
    p.fromBufferAttribute(posAttr, i).applyMatrix4(relMat);
    n.fromBufferAttribute(normAttr, i).applyMatrix3(normMat).normalize();
    const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);

    let u, v;
    if (ay >= ax && ay >= az) {
      u = p.x * invScale;
      v = p.z * invScale;
    } else if (ax >= az) {
      u = p.z * invScale;
      v = p.y * invScale;
    } else {
      u = p.x * invScale;
      v = p.y * invScale;
    }
    uvArr[i * 2] = u;
    uvArr[i * 2 + 1] = v;
  }

  geo.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2));
  geo.attributes.uv.needsUpdate = true;
}

// Проверяет, является ли материал/меш стеклом или рамой/дверью по имени или исходному цвету
function classifyHouseMaterialByMeta(oldMat, meshName) {
  const mName = `${meshName || ''} ${(oldMat && oldMat.name) || ''}`.toLowerCase();
  if (/glass|window|pane/.test(mName)) return 'glass';
  if (/door|frame|trim|shutter|sill|porch|handle/.test(mName)) return 'native';

  if (oldMat && oldMat.color) {
    const c = oldMat.color;
    const lum = 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
    // Синий/голубой исходный цвет -> стекло
    if (c.b > c.r * 1.18 && c.b > 0.28) return 'glass';
    // Тёмный (рамы, двери, козырьки) -> сохраняем родной материал
    if (lum < 0.28) return 'native';
  }
  return null;
}

// Считывает пиксели родной текстуры (colormap.png) здания в Canvas для точного распознавания окон и дверей в слитых мешах
function sampleNativeTexturePixels(tex) {
  if (!tex || !tex.image) return null;
  try {
    const img = tex.image;
    const w = img.width || img.naturalWidth;
    const h = img.height || img.naturalHeight;
    if (!w || !h) return null;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    return { data: ctx.getImageData(0, 0, w, h).data, w, h, flipY: tex.flipY !== false };
  } catch (_) {
    return null;
  }
}

// Разделяет слитый меш здания (building-*.glb) на 5 групп материалов:
// 0: основные стены (Bricks085 / светлая штукатурка / Concrete042C),
// 1: крыша (RoofingTiles001 — строго по наклону нормалей normal.y > 0.5),
// 2: глянцевое тёмно-голубое стекло (roughness: 0.1, metalness: 0.8),
// 3: родной материал рам и дверей (с сохранением оригинальных UV!),
// 4: деревянные вставки (Planks039)
function splitMergedHouseMesh(mesh, rootInverseMatrix, buildingHeight, wallMat, roofMat, glassMat, nativeMat, woodMat, hasWoodInserts) {
  deduplicateBuildingGeometry(mesh, rootInverseMatrix);
  let geo = mesh.geometry;
  if (geo.index) {
    geo = geo.toNonIndexed();
    mesh.geometry = geo;
  }
  geo.deleteAttribute('tangent');
  if (!geo.attributes.normal) geo.computeVertexNormals();

  const posAttr = geo.attributes.position;
  const normAttr = geo.attributes.normal;
  const uvAttr = geo.attributes.uv;
  const colorAttr = geo.attributes.color;
  const relMat = new THREE.Matrix4().multiplyMatrices(rootInverseMatrix, mesh.matrixWorld);
  const normMat = new THREE.Matrix3().getNormalMatrix(relMat);

  if (nativeMat && nativeMat.map) setSRGBTex(nativeMat.map);
  const texSampler = (nativeMat && nativeMat.map && uvAttr) ? sampleNativeTexturePixels(nativeMat.map) : null;

  const vCount = posAttr.count;
  const triCount = Math.floor(vCount / 3);
  const buckets = [[], [], [], [], []]; // 0:wall, 1:roof, 2:glass, 3:native(doors/frames), 4:woodInsert

  const p0 = new THREE.Vector3(), p1 = new THREE.Vector3(), p2 = new THREE.Vector3();
  const n0 = new THREE.Vector3(), n1 = new THREE.Vector3(), n2 = new THREE.Vector3();
  const invScale = 1.0 / 4.0;

  for (let t = 0; t < triCount; t++) {
    const i0 = t * 3, i1 = i0 + 1, i2 = i0 + 2;
    p0.fromBufferAttribute(posAttr, i0).applyMatrix4(relMat);
    p1.fromBufferAttribute(posAttr, i1).applyMatrix4(relMat);
    p2.fromBufferAttribute(posAttr, i2).applyMatrix4(relMat);
    n0.fromBufferAttribute(normAttr, i0).applyMatrix3(normMat).normalize();
    n1.fromBufferAttribute(normAttr, i1).applyMatrix3(normMat).normalize();
    n2.fromBufferAttribute(normAttr, i2).applyMatrix3(normMat).normalize();

    const avgY = (p0.y + p1.y + p2.y) / 3;
    const avgNy = (n0.y + n1.y + n2.y) / 3;

    // 1. Крыши отделяем строго по наклону нормалей (normal.y > 0.5) и выше цоколя
    if (avgNy > 0.5 && avgY > 0.45) {
      buckets[1].push(t);
      continue;
    }

    // 2. Определяем родной цвет треугольника (из colormap текстуры или vertexColors) для сохранения окон и дверей
    let r = -1, g = -1, b = -1;
    if (texSampler) {
      const cu = (((uvAttr.getX(i0) + uvAttr.getX(i1) + uvAttr.getX(i2)) / 3) % 1 + 1) % 1;
      let cv = (((uvAttr.getY(i0) + uvAttr.getY(i1) + uvAttr.getY(i2)) / 3) % 1 + 1) % 1;
      if (texSampler.flipY) cv = 1 - cv;
      const px = Math.min(texSampler.w - 1, Math.floor(cu * texSampler.w));
      const py = Math.min(texSampler.h - 1, Math.floor(cv * texSampler.h));
      const idx4 = (py * texSampler.w + px) * 4;
      r = texSampler.data[idx4] / 255;
      g = texSampler.data[idx4 + 1] / 255;
      b = texSampler.data[idx4 + 2] / 255;
    } else if (colorAttr) {
      r = (colorAttr.getX(i0) + colorAttr.getX(i1) + colorAttr.getX(i2)) / 3;
      g = (colorAttr.getY(i0) + colorAttr.getY(i1) + colorAttr.getY(i2)) / 3;
      b = (colorAttr.getZ(i0) + colorAttr.getZ(i1) + colorAttr.getZ(i2)) / 3;
    }

    if (r >= 0) {
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const sat = (maxC - minC) / Math.max(0.01, maxC);

      // Стёкла окон (голубой/синий оттенок или тёмно-синее стекло на стене)
      const isBlueGlass = (b > r * 1.15 && b > 0.26 && avgY > 0.55 && Math.abs(avgNy) < 0.45);
      if (isBlueGlass) {
        buckets[2].push(t);
        continue;
      }

      // Оконные рамы, двери, козырьки и тёмные/белые наличники -> оставляем родной материал и родные UV!
      const isDarkDoorOrFrame = (lum < 0.30 && Math.abs(avgNy) < 0.45);
      const isWhiteWindowTrim = (lum > 0.84 && sat < 0.14 && avgY > 0.45 && Math.abs(avgNy) < 0.45);
      if (isDarkDoorOrFrame || isWhiteWindowTrim) {
        buckets[3].push(t);
        continue;
      }
    }

    // 3. Деревянные вставки (Planks039) на верхнем ярусе / фронтонах у комбинированных домов
    if (hasWoodInserts && avgY > buildingHeight * 0.46 && Math.abs(avgNy) <= 0.5) {
      buckets[4].push(t);
      continue;
    }

    // 4. Основные стены дома (кирпич / светлая штукатурка / бетон)
    buckets[0].push(t);
  }

  const newPos = new Float32Array(vCount * 3);
  const newNorm = new Float32Array(vCount * 3);
  const newUv = new Float32Array(vCount * 2);

  let cursor = 0;
  geo.clearGroups();
  const pTmp = new THREE.Vector3();
  const nTmp = new THREE.Vector3();

  for (let matIdx = 0; matIdx < buckets.length; matIdx++) {
    const list = buckets[matIdx];
    if (list.length === 0) continue;
    const useNativeUV = (matIdx === 2 || matIdx === 3) && uvAttr;

    for (let k = 0; k < list.length; k++) {
      const srcT = list[k];
      for (let c = 0; c < 3; c++) {
        const sIdx = srcT * 3 + c;
        const dIdx = cursor + k * 3 + c;
        const vx = posAttr.getX(sIdx);
        const vy = posAttr.getY(sIdx);
        const vz = posAttr.getZ(sIdx);
        const nx = normAttr.getX(sIdx);
        const ny = normAttr.getY(sIdx);
        const nz = normAttr.getZ(sIdx);

        newPos[dIdx * 3]     = vx;
        newPos[dIdx * 3 + 1] = vy;
        newPos[dIdx * 3 + 2] = vz;
        newNorm[dIdx * 3]     = nx;
        newNorm[dIdx * 3 + 1] = ny;
        newNorm[dIdx * 3 + 2] = nz;

        if (useNativeUV) {
          newUv[dIdx * 2]     = uvAttr.getX(sIdx);
          newUv[dIdx * 2 + 1] = uvAttr.getY(sIdx);
        } else {
          pTmp.set(vx, vy, vz).applyMatrix4(relMat);
          nTmp.set(nx, ny, nz).applyMatrix3(normMat).normalize();
          const ax = Math.abs(nTmp.x), ay = Math.abs(nTmp.y), az = Math.abs(nTmp.z);
          if (ay >= ax && ay >= az) {
            newUv[dIdx * 2]     = pTmp.x * invScale;
            newUv[dIdx * 2 + 1] = pTmp.z * invScale;
          } else if (ax >= az) {
            newUv[dIdx * 2]     = pTmp.z * invScale;
            newUv[dIdx * 2 + 1] = pTmp.y * invScale;
          } else {
            newUv[dIdx * 2]     = pTmp.x * invScale;
            newUv[dIdx * 2 + 1] = pTmp.y * invScale;
          }
        }
      }
    }

    geo.addGroup(cursor, list.length * 3, matIdx);
    cursor += list.length * 3;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(newPos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(newNorm, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(newUv, 2));
  geo.deleteAttribute('tangent');
  geo.deleteAttribute('color');
  geo.attributes.position.needsUpdate = true;
  geo.attributes.normal.needsUpdate = true;
  geo.attributes.uv.needsUpdate = true;

  const safeNative = nativeMat ? sanitizeBuildingMaterial(nativeMat.clone(), true) : wallMat;
  mesh.material = [
    sanitizeBuildingMaterial(wallMat, false),
    sanitizeBuildingMaterial(roofMat, false),
    sanitizeBuildingMaterial(glassMat, false),
    safeNative,
    sanitizeBuildingMaterial(woodMat, false),
  ];
}

// Заменяет мультяшные материалы на реалистичные PBR-текстуры, сохраняя окна, рамы и двери
// Добавляет на стены домов контрастные оконные рамы со светло-голубыми/тёплыми стёклами.
// Все детали сдвинуты на 0.045 вдоль внешней нормали стены (без наложения полигонов и Z-fighting)
function addContrastingWindowsToHouse(innerRoot, finalSize, houseSeed = 0) {
  const pbr = getWorldPBRMaterials();
  const WINDOW_NORMAL_OFFSET = 0.045; // Вынос оконной рамы от стены вдоль нормали (0.03–0.05)

  innerRoot.updateMatrixWorld(true);
  const invRoot = new THREE.Matrix4().copy(innerRoot.matrixWorld).invert();
  const rootMatrix = innerRoot.matrixWorld;
  const wallMeshes = [];

  const h = Math.max(3.0, finalSize.y);
  let wallMinX = Infinity, wallMaxX = -Infinity;
  let wallMinZ = Infinity, wallMaxZ = -Infinity;
  const p = new THREE.Vector3();

  // Собираем меши стен и их контур ниже свесов крыши (14%..50% высоты здания)
  innerRoot.traverse((obj) => {
    if (!obj.isMesh || !obj.geometry || !obj.geometry.attributes || !obj.geometry.attributes.position) return;
    wallMeshes.push(obj);
    const relMat = new THREE.Matrix4().multiplyMatrices(invRoot, obj.matrixWorld);
    const posAttr = obj.geometry.attributes.position;
    const step = Math.max(1, Math.floor(posAttr.count / 600));
    for (let i = 0; i < posAttr.count; i += step) {
      p.fromBufferAttribute(posAttr, i).applyMatrix4(relMat);
      if (p.y >= h * 0.14 && p.y <= h * 0.50) {
        if (p.x < wallMinX) wallMinX = p.x;
        if (p.x > wallMaxX) wallMaxX = p.x;
        if (p.z < wallMinZ) wallMinZ = p.z;
        if (p.z > wallMaxZ) wallMaxZ = p.z;
      }
    }
  });

  if (!Number.isFinite(wallMinX) || (wallMaxX - wallMinX) < 1.5) {
    wallMinX = -finalSize.x * 0.46;
    wallMaxX = finalSize.x * 0.46;
  }
  if (!Number.isFinite(wallMinZ) || (wallMaxZ - wallMinZ) < 1.5) {
    wallMinZ = -finalSize.z * 0.46;
    wallMaxZ = finalSize.z * 0.46;
  }

  const wallW = Math.max(3.2, wallMaxX - wallMinX);
  const wallDep = Math.max(3.2, wallMaxZ - wallMinZ);
  const wallCx = (wallMinX + wallMaxX) * 0.5;
  const wallCz = (wallMinZ + wallMaxZ) * 0.5;

  const winW = Math.min(1.50, Math.max(0.92, Math.min(wallW, wallDep) * 0.16));
  const winH = Math.min(1.45, Math.max(0.92, h * 0.19));
  const frameThick = 0.12;
  const frameDepth = 0.12;
  const paneDepth = 0.04;

  const floorsY = h >= 7.6
    ? [Math.max(1.55, h * 0.25), Math.min(h * 0.55, h * 0.25 + winH + 1.35)]
    : [Math.min(h * 0.42, Math.max(1.45, h * 0.30))];

  const winGroup = new THREE.Group();
  winGroup.name = 'house_contrasting_windows';

  // Все элементы окна начинаются от z >= 0 (не заходят внутрь стены и не пересекают друг друга в одной плоскости)
  function makeSingleWindow(warm) {
    const wg = new THREE.Group();
    const glassMat = warm ? pbr.warmGlassWindow : pbr.glassWindow;
    const frameMat = pbr.windowFrame;
    const mullionMat = pbr.windowMullion;

    // Стекло: занимает z = [0.00, 0.04]
    const pane = new THREE.Mesh(new THREE.BoxGeometry(winW - 0.01, winH - 0.01, paneDepth), glassMat);
    pane.position.z = paneDepth * 0.5;

    // Перекладины рамы разнесены по Z, чтобы исключить Z-fighting на перекрестии и со стеклом
    const vMullion = new THREE.Mesh(new THREE.BoxGeometry(0.065, winH - 0.02, 0.035), mullionMat);
    vMullion.position.z = paneDepth + 0.020;
    const hMullion = new THREE.Mesh(new THREE.BoxGeometry(winW - 0.02, 0.065, 0.035), mullionMat);
    hMullion.position.set(0, winH * 0.12, paneDepth + 0.030);

    // Наружная рама и выступающий подоконник: z >= 0
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(winW + frameThick * 2, frameThick, frameDepth), frameMat);
    topBar.position.set(0, winH * 0.5 + frameThick * 0.5, frameDepth * 0.5);

    const botBar = new THREE.Mesh(new THREE.BoxGeometry(winW + frameThick * 2.4, frameThick * 1.25, frameDepth + 0.06), frameMat);
    botBar.position.set(0, -winH * 0.5 - frameThick * 0.5, (frameDepth + 0.06) * 0.5);

    const leftBar = new THREE.Mesh(new THREE.BoxGeometry(frameThick, winH, frameDepth), frameMat);
    leftBar.position.set(-winW * 0.5 - frameThick * 0.5, 0, frameDepth * 0.5);

    const rightBar = new THREE.Mesh(new THREE.BoxGeometry(frameThick, winH, frameDepth), frameMat);
    rightBar.position.set(winW * 0.5 + frameThick * 0.5, 0, frameDepth * 0.5);

    wg.add(pane, vMullion, hMullion, topBar, botBar, leftBar, rightBar);
    wg.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    return wg;
  }

  // Лучевая проверка точной плоскости стены в локальных координатах innerRoot
  const raycaster = new THREE.Raycaster();
  const rayOriginWorld = new THREE.Vector3();
  const rayDirWorld = new THREE.Vector3();
  const localHit = new THREE.Vector3();
  const worldNormal = new THREE.Vector3();
  const localNormal = new THREE.Vector3();
  const invNormalMat = new THREE.Matrix3().getNormalMatrix(invRoot);
  const rootRotMat = new THREE.Matrix3().getNormalMatrix(rootMatrix);

  function probeFlatWall(localOrigin, localDir, expectedNormal, halfU, halfV, uAxis) {
    // Проверяем центр и 4 угла окна, чтобы оно гарантированно легло на ровный участок стены
    const offsets = [
      [0, 0],
      [-halfU, -halfV],
      [ halfU, -halfV],
      [-halfU,  halfV],
      [ halfU,  halfV],
    ];
    let maxOutwardCoord = -Infinity;
    let minOutwardCoord = Infinity;

    for (const [du, dv] of offsets) {
      const oLoc = localOrigin.clone();
      oLoc.y += dv;
      if (uAxis === 'x') oLoc.x += du;
      else oLoc.z += du;

      rayOriginWorld.copy(oLoc).applyMatrix4(rootMatrix);
      rayDirWorld.copy(localDir).applyMatrix3(rootRotMat).normalize();
      raycaster.set(rayOriginWorld, rayDirWorld);
      const hits = raycaster.intersectObjects(wallMeshes, false);
      if (hits.length === 0) return null;

      const hit = hits[0];
      if (!hit.face) return null;
      const objNormMat = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
      worldNormal.copy(hit.face.normal).applyMatrix3(objNormMat).normalize();
      localNormal.copy(worldNormal).applyMatrix3(invNormalMat).normalize();

      // Должна быть именно вертикальная плоская стена, обращённая наружу (не крыша и не скос)
      if (localNormal.dot(expectedNormal) < 0.88) return null;

      localHit.copy(hit.point).applyMatrix4(invRoot);
      const proj = localHit.dot(expectedNormal);
      if (proj > maxOutwardCoord) maxOutwardCoord = proj;
      if (proj < minOutwardCoord) minOutwardCoord = proj;
    }

    // Если стена в этом месте имеет ступеньку/выступ > 0.14 м, пропускаем окно, чтобы не было наложений
    if ((maxOutwardCoord - minOutwardCoord) > 0.14) return null;
    return maxOutwardCoord + WINDOW_NORMAL_OFFSET;
  }

  const frontCols = wallW >= 7.4 ? [wallCx - wallW * 0.25, wallCx + wallW * 0.25] : [wallCx];
  const sideCols = wallDep >= 7.4 ? [wallCz - wallDep * 0.25, wallCz + wallDep * 0.25] : [wallCz];
  const halfU = winW * 0.45;
  const halfV = winH * 0.45;
  let idx = 0;

  const nFront = new THREE.Vector3(0, 0,  1), dFront = new THREE.Vector3(0, 0, -1);
  const nBack  = new THREE.Vector3(0, 0, -1), dBack  = new THREE.Vector3(0, 0,  1);
  const nRight = new THREE.Vector3( 1, 0, 0), dRight = new THREE.Vector3(-1, 0, 0);
  const nLeft  = new THREE.Vector3(-1, 0, 0), dLeft  = new THREE.Vector3( 1, 0, 0);

  for (const wy of floorsY) {
    for (const cx of frontCols) {
      const zFront = probeFlatWall(new THREE.Vector3(cx, wy, wallMaxZ + 2.5), dFront, nFront, halfU, halfV, 'x');
      if (zFront !== null) {
        const wFront = makeSingleWindow(((houseSeed + idx++) % 3) === 0);
        wFront.position.set(cx, wy, zFront);
        winGroup.add(wFront);
      }

      const zBackProj = probeFlatWall(new THREE.Vector3(cx, wy, wallMinZ - 2.5), dBack, nBack, halfU, halfV, 'x');
      if (zBackProj !== null) {
        const wBack = makeSingleWindow(((houseSeed + idx++) % 3) === 1);
        wBack.position.set(cx, wy, -zBackProj);
        wBack.rotation.y = Math.PI;
        winGroup.add(wBack);
      }
    }
    for (const cz of sideCols) {
      const xRight = probeFlatWall(new THREE.Vector3(wallMaxX + 2.5, wy, cz), dRight, nRight, halfU, halfV, 'z');
      if (xRight !== null) {
        const wRight = makeSingleWindow(((houseSeed + idx++) % 3) === 0);
        wRight.position.set(xRight, wy, cz);
        wRight.rotation.y = Math.PI / 2;
        winGroup.add(wRight);
      }

      const xLeftProj = probeFlatWall(new THREE.Vector3(wallMinX - 2.5, wy, cz), dLeft, nLeft, halfU, halfV, 'z');
      if (xLeftProj !== null) {
        const wLeft = makeSingleWindow(((houseSeed + idx++) % 3) === 1);
        wLeft.position.set(-xLeftProj, wy, cz);
        wLeft.rotation.y = -Math.PI / 2;
        winGroup.add(wLeft);
      }
    }
  }

  innerRoot.add(winGroup);

  // Вешаем реалистичные роллеты (rollershutter_window_03_1k.gltf) на фасад каждого второго дома (с выносом от стены)
  if ((houseSeed % 2) === 0) {
    const shutterY = Math.min(h * 0.34, Math.max(1.55, h * 0.27));
    const zShutter = probeFlatWall(new THREE.Vector3(wallCx, shutterY, wallMaxZ + 2.5), dFront, nFront, 0.95, 0.70, 'x');
    if (zShutter !== null) {
      loadNormalizedGltfTemplate('rollershutter_window_03_1k.gltf', 2.35, 'maxHoriz', false).then((tpl) => {
        if (!tpl) return;
        const sh = tpl.template.clone(true);
        const halfD = Math.max(0.05, tpl.size.z * 0.5);
        sh.position.set(wallCx, shutterY, zShutter + halfD + 0.02);
        winGroup.add(sh);
      });
    }
  }
}

function applyPBRToKenneyModel(innerRoot, finalSize, style, tintHex = 0xffffff) {
  const pbr = getWorldPBRMaterials();
  innerRoot.updateMatrixWorld(true);
  const invRoot = new THREE.Matrix4().copy(innerRoot.matrixWorld).invert();

  const meshes = [];
  innerRoot.traverse((obj) => {
    if (obj.isMesh && obj.geometry) meshes.push(obj);
  });
  if (meshes.length === 0) return;

  if (style === 'water-tower') {
    for (const m of meshes) {
      applyWorldBoxUVs(m, invRoot, 5.0);
      m.material = pbr.concreteTower;
    }
    return;
  }

  if (style === 'container') {
    const metalMat = pbr.metalContainer(tintHex);
    for (const m of meshes) {
      applyWorldBoxUVs(m, invRoot, 3.6);
      m.material = metalMat;
    }
    return;
  }

  if (style === 'windmill') {
    for (const m of meshes) {
      applyWorldBoxUVs(m, invRoot, 4.2);
      const nameStr = `${m.name || ''} ${(m.material && m.material.name) || ''}`.toLowerCase();
      if (/cloth|canvas/.test(nameStr)) continue;
      if (/roof|cap|tile/.test(nameStr)) {
        m.material = pbr.roofTiles;
      } else {
        m.material = pbr.planksWindmill;
      }
    }
    return;
  }

  // Разнообразие домов: красный кирпич (Bricks085), светлая штукатурка, бетон (Concrete042C) и деревянные вставки (Planks039)
  let wallMat = pbr.bricks;
  let hasWoodInserts = false;
  if (style === 'plaster-house') {
    wallMat = pbr.plasterLight;
  } else if (style === 'concrete-house') {
    wallMat = pbr.concrete;
  } else if (style === 'wood-accent-house') {
    wallMat = pbr.plasterLight;
    hasWoodInserts = true;
  } else if (style === 'brick-wood-house') {
    wallMat = pbr.bricks;
    hasWoodInserts = true;
  }
  const roofMat = pbr.roofTiles;

  // Если здание пришло единым слитым мешем с 1 материалом — разделяем стены, крышу (normal.y > 0.5), окна, двери и вставки!
  const singleMergedMesh = meshes.length === 1 && !Array.isArray(meshes[0].material);
  if (singleMergedMesh) {
    const nativeMat = meshes[0].material;
    splitMergedHouseMesh(
      meshes[0],
      invRoot,
      Math.max(2.0, finalSize.y),
      wallMat,
      roofMat,
      pbr.glassWindow,
      nativeMat,
      pbr.planksWindmill,
      hasWoodInserts
    );
    addContrastingWindowsToHouse(innerRoot, finalSize, Math.round(finalSize.x * 11 + finalSize.z * 5));
    return;
  }

  // Многомешевые / многоматериальные здания: сохраняем родные материалы окон, рам и дверей!
  const pickHouseMaterial = (oldMat, meshName, meshBox, avgNy) => {
    const metaClass = classifyHouseMaterialByMeta(oldMat, meshName);
    if (metaClass === 'glass') return pbr.glassWindow;
    if (metaClass === 'native') {
      if (oldMat && oldMat.map) setSRGBTex(oldMat.map);
      return oldMat;
    }

    const mName = `${meshName || ''} ${(oldMat && oldMat.name) || ''}`.toLowerCase();
    if (/roof|tile|shingle|chimney/.test(mName)) return roofMat;
    if (/wood|plank|gable/.test(mName)) return pbr.planksWindmill;
    if (/concrete|stone|base|foundation|step|gutter/.test(mName)) return pbr.concrete;

    // Крышу отделяем строго по наклону нормалей (normal.y > 0.5)
    if (avgNy > 0.5 && (!meshBox || meshBox.min.y > 0.45)) {
      return roofMat;
    }
    if (hasWoodInserts && meshBox && meshBox.min.y > finalSize.y * 0.45) {
      return pbr.planksWindmill;
    }
    return wallMat;
  };

  for (const m of meshes) {
    deduplicateBuildingGeometry(m, invRoot);
    const relMat = new THREE.Matrix4().multiplyMatrices(invRoot, m.matrixWorld);
    const normMat = new THREE.Matrix3().getNormalMatrix(relMat);
    const posAttr = m.geometry.attributes.position;
    const normAttr = m.geometry.attributes.normal;
    const mBox = new THREE.Box3();
    const p = new THREE.Vector3();
    const n = new THREE.Vector3();
    let nySum = 0;
    const step = Math.max(1, Math.floor(posAttr.count / 120));
    let samples = 0;
    for (let i = 0; i < posAttr.count; i += step) {
      p.fromBufferAttribute(posAttr, i).applyMatrix4(relMat);
      mBox.expandByPoint(p);
      if (normAttr) {
        n.fromBufferAttribute(normAttr, i).applyMatrix3(normMat).normalize();
        nySum += n.y;
        samples++;
      }
    }
    const avgNy = samples > 0 ? nySum / samples : 0;

    // Проверяем, является ли весь меш окном/дверью/рамой — тогда не трогаем его родные UV!
    const singleMat = !Array.isArray(m.material) ? m.material : null;
    const singleMeta = singleMat ? classifyHouseMaterialByMeta(singleMat, m.name) : null;
    if (singleMeta === 'glass') {
      m.material = pbr.glassWindow;
      continue;
    }
    if (singleMeta === 'native') {
      if (singleMat) {
        if (singleMat.map) setSRGBTex(singleMat.map);
        m.material = sanitizeBuildingMaterial(singleMat.clone(), true);
      }
      continue;
    }

    applyWorldBoxUVs(m, invRoot, 4.0);
    if (Array.isArray(m.material)) {
      m.material = m.material.map((oldMat) => sanitizeBuildingMaterial(pickHouseMaterial(oldMat, m.name, mBox, avgNy), false));
    } else {
      m.material = sanitizeBuildingMaterial(pickHouseMaterial(m.material, m.name, mBox, avgNy), false);
    }
  }

  addContrastingWindowsToHouse(innerRoot, finalSize, Math.round(finalSize.x * 13 + finalSize.z * 7));
}

// ----------------------------------------------------------------------------
// ЗАГРУЗЧИК 3D-РАСТЕНИЙ (.gltf) И ПРЕОБРАЗОВАНИЕ В INSTANCEDMESH
// ----------------------------------------------------------------------------
const gltfPlantCache = new Map(); // filename -> Promise<Array<Array<{ geometry, material }>> | null>

function prepareFoliageMaterial(srcMat) {
  if (!srcMat) return new THREE.MeshStandardMaterial({ color: 0x5da844, roughness: 0.85, side: THREE.DoubleSide });
  const mat = srcMat.clone();
  if (mat.map) {
    setSRGBTex(mat.map);
    mat.map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy() || 1);
  }
  mat.alphaTest = 0.35;
  mat.side = THREE.DoubleSide;
  mat.transparent = false;
  mat.depthWrite = true;
  mat.normalMap = null;
  mat.roughnessMap = null;
  if ('roughness' in mat) mat.roughness = 0.9;
  if ('metalness' in mat) mat.metalness = 0.0;
  mat.needsUpdate = true;
  return mat;
}

function bakeNodeToNormalizedParts(node, scaleMode = 'height') {
  node.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(node);
  if (box.isEmpty()) return [];

  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const denom = scaleMode === 'maxHoriz'
    ? Math.max(0.001, size.x, size.z)
    : Math.max(0.001, size.y);
  const normScale = 1.0 / denom;

  // Переносим центр по X/Z в 0, низ ставим на y = 0 и приводим к единичному масштабу (1м)
  const normMat = new THREE.Matrix4()
    .makeScale(normScale, normScale, normScale)
    .multiply(new THREE.Matrix4().makeTranslation(-center.x, -box.min.y, -center.z));

  const parts = [];
  node.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;
    const geo = child.geometry.clone();
    const baked = new THREE.Matrix4().multiplyMatrices(normMat, child.matrixWorld);
    geo.applyMatrix4(baked);
    geo.computeBoundingSphere();

    const mat = Array.isArray(child.material)
      ? child.material.map(prepareFoliageMaterial)
      : prepareFoliageMaterial(child.material);

    parts.push({ geometry: geo, material: mat });
  });
  return parts;
}

/**
 * Загружает .gltf растение 1 раз и автоматически разделяет его на варианты,
 * если в файле несколько отдельных кустов/пучков, либо сохраняет как единое составное растение.
 */
function loadPlantVariants(filename, scaleMode = 'height') {
  const cacheKey = `${filename}|${scaleMode}`;
  if (!gltfPlantCache.has(cacheKey)) {
    const promise = new Promise((resolve) => {
      envGltfLoader.load(
        `${MODEL_DIR}${filename}`,
        (gltf) => {
          const root = gltf.scene || (gltf.scenes && gltf.scenes[0]);
          if (!root) {
            resolve(null);
            return;
          }
          root.updateMatrixWorld(true);

          // Находим уровень узлов, содержащий возможные варианты (как в наборах Poly Haven)
          let container = root;
          while (container.children.length === 1 && !container.children[0].isMesh && container.children[0].children.length > 0) {
            container = container.children[0];
          }

          const candidates = container.children.filter((ch) => {
            let hasMesh = false;
            ch.traverse((o) => { if (o.isMesh) hasMesh = true; });
            return hasMesh;
          });

          // Проверяем, разнесены ли дочерние объекты по плоскости XZ (набор вариантов) или это части одного растения
          let treatAsVariants = false;
          if (candidates.length > 1) {
            const boxes = candidates.map((ch) => new THREE.Box3().setFromObject(ch));
            let separatedPairs = 0;
            let totalPairs = 0;
            for (let i = 0; i < boxes.length; i++) {
              const ci = new THREE.Vector3(), si = new THREE.Vector3();
              boxes[i].getCenter(ci); boxes[i].getSize(si);
              for (let j = i + 1; j < boxes.length; j++) {
                const cj = new THREE.Vector3(), sj = new THREE.Vector3();
                boxes[j].getCenter(cj); boxes[j].getSize(sj);
                const distXZ = Math.hypot(ci.x - cj.x, ci.z - cj.z);
                const avgSpan = (Math.max(si.x, si.z) + Math.max(sj.x, sj.z)) * 0.35;
                totalPairs++;
                if (distXZ > Math.max(0.18, avgSpan)) separatedPairs++;
              }
            }
            treatAsVariants = totalPairs > 0 && (separatedPairs / totalPairs) >= 0.5;
          }

          const variants = [];
          if (treatAsVariants) {
            for (const ch of candidates) {
              const parts = bakeNodeToNormalizedParts(ch, scaleMode);
              if (parts.length > 0) variants.push(parts);
            }
          } else {
            const parts = bakeNodeToNormalizedParts(root, scaleMode);
            if (parts.length > 0) variants.push(parts);
          }

          resolve(variants.length > 0 ? variants : null);
        },
        undefined,
        (err) => {
          console.warn(`3D-растение ${MODEL_DIR}${filename} не загружено, используется процедурный fallback:`, err);
          checkLocalGlbProtocolHint();
          resolve(null);
        }
      );
    });
    gltfPlantCache.set(cacheKey, promise);
  }
  return gltfPlantCache.get(cacheKey);
}

/**
 * Расставляет массив трансформов [{ x, y, z, rotY, tiltX, tiltZ, sx, sy, sz }]
 * по всем вариантам загруженного .gltf через THREE.InstancedMesh.
 */
function buildInstancedPlantGroup(variants, transforms, { castShadow = false, receiveShadow = true } = {}) {
  const group = new THREE.Group();
  const buckets = variants.map(() => []);
  transforms.forEach((tr, idx) => {
    buckets[idx % variants.length].push(tr);
  });

  const dummy = new THREE.Object3D();
  variants.forEach((parts, vIdx) => {
    const list = buckets[vIdx];
    if (list.length === 0) return;

    for (const part of parts) {
      const inst = new THREE.InstancedMesh(part.geometry, part.material, list.length);
      inst.castShadow = castShadow;
      inst.receiveShadow = receiveShadow;
      inst.frustumCulled = false;

      for (let i = 0; i < list.length; i++) {
        const t = list[i];
        dummy.position.set(t.x, t.y || 0, t.z);
        dummy.rotation.set(t.tiltX || 0, t.rotY || 0, t.tiltZ || 0);
        dummy.scale.set(t.sx, t.sy, t.sz);
        dummy.updateMatrix();
        inst.setMatrixAt(i, dummy.matrix);
      }
      inst.instanceMatrix.needsUpdate = true;
      group.add(inst);
    }
  });

  scene.add(group);
  return group;
}

function buildWorld() {
  // Основная земля
  const groundBody = new CANNON.Body({ mass: 0, material: matWorld });
  groundBody.addShape(new CANNON.Plane());
  groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(groundBody);

  const grassMat = loadPBRMaterial('Grass004_1K-JPG', 75, 75, {
    fallbackMap: texGrass,
    fallbackRoughness: 0.92,
    roughness: 0.95,
    useNormal: true,
    useRoughness: false,
    normalScale: 0.5,
  });
  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD_SIZE + 180, WORLD_SIZE + 180),
    grassMat
  );
  grass.rotation.x = -Math.PI / 2;
  grass.receiveShadow = true;
  scene.add(grass);

  // Невидимые физические границы долины 500x500 (чтобы не вылететь за край мира)
  const borderDefs = [
    [0, 4.0, -HALF_WORLD, WORLD_SIZE + 10, 8, 2.0],
    [0, 4.0,  HALF_WORLD, WORLD_SIZE + 10, 8, 2.0],
    [-HALF_WORLD, 4.0, 0, 2.0, 8, WORLD_SIZE + 10],
    [ HALF_WORLD, 4.0, 0, 2.0, 8, WORLD_SIZE + 10],
  ];
  for (const [x, y, z, w, h, dep] of borderDefs) {
    const b = new CANNON.Body({ mass: 0, material: matWorld, position: new CANNON.Vec3(x, y, z) });
    b.addShape(new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, dep / 2)));
    world.addBody(b);
  }

  // Плотная естественная гряда зелёных холмов, скал и леса по всему периметру карты 500x500
  const hillMats = [
    stdMat(0x5eb348, 0.90),
    stdMat(0x4b9c3c, 0.90),
    stdMat(0x3b8531, 0.92),
  ];
  const rimPts = [];
  const stepsPerSide = 18;
  for (let s = 0; s < stepsPerSide; s++) {
    const t = -HALF_WORLD + (s / stepsPerSide) * WORLD_SIZE;
    rimPts.push([t, -HALF_WORLD - 12], [t, HALF_WORLD + 12], [-HALF_WORLD - 12, t], [HALF_WORLD + 12, t]);
  }
  rimPts.forEach(([bx, bz], idx) => {
    const jitterX = Math.sin(idx * 12.9898) * 9;
    const jitterZ = Math.cos(idx * 78.233) * 9;
    const rad = 28 + (idx % 4) * 7;
    const h = 16 + (idx % 5) * 4.5;
    const hill = new THREE.Mesh(
      new THREE.SphereGeometry(rad, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
      hillMats[idx % hillMats.length]
    );
    hill.scale.set(1.25, h / rad, 1.25);
    hill.position.set(bx + jitterX, -0.6, bz + jitterZ);
    scene.add(hill);
  });

  // Скалы и валуны у подножия гряды по периметру (InstancedMesh)
  const RIM_ROCK_COUNT = isMobile ? 110 : 160;
  const rimRockGeo = new THREE.DodecahedronGeometry(1.0, 0);
  const rimRockInst = new THREE.InstancedMesh(rimRockGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92 }), RIM_ROCK_COUNT);
  const rimDummy = new THREE.Object3D();
  const rimCol = new THREE.Color();
  for (let i = 0; i < RIM_ROCK_COUNT; i++) {
    const side = i % 4;
    const along = (Math.random() - 0.5) * (WORLD_SIZE - 8);
    const offset = HALF_WORLD - 2 + Math.random() * 8;
    const rx = side === 0 ? along : (side === 1 ? along : (side === 2 ? -offset : offset));
    const rz = side === 0 ? -offset : (side === 1 ? offset : along);
    const sc = 2.0 + Math.random() * 2.6;
    rimDummy.position.set(rx, sc * 0.42, rz);
    rimDummy.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    rimDummy.scale.set(sc * 1.2, sc * 0.85, sc);
    rimDummy.updateMatrix();
    rimRockInst.setMatrixAt(i, rimDummy.matrix);
    const gShade = 0.46 + Math.random() * 0.18;
    rimCol.setRGB(gShade + 0.04, gShade + 0.03, gShade);
    rimRockInst.setColorAt(i, rimCol);
  }
  rimRockInst.instanceMatrix.needsUpdate = true;
  if (rimRockInst.instanceColor) rimRockInst.instanceColor.needsUpdate = true;
  scene.add(rimRockInst);

  // Густая лесная опушка вдоль границ карты: заменяем конусные деревья на ./models/pine_tree_low-poly.glb
  const RIM_TREE_COUNT = isMobile ? 110 : 165;
  const rimTreeTransforms = [];
  for (let i = 0; i < RIM_TREE_COUNT; i++) {
    const side = i % 4;
    const along = (Math.random() - 0.5) * (WORLD_SIZE - 12);
    const offset = HALF_WORLD - 5 - Math.random() * 9;
    const tx = side === 0 ? along : (side === 1 ? along : (side === 2 ? -offset : offset));
    const tz = side === 0 ? -offset : (side === 1 ? offset : along);
    const hScale = 8.5 + Math.random() * 5.0;
    const wScale = hScale * (0.85 + Math.random() * 0.25);
    rimTreeTransforms.push({
      x: tx,
      y: 0,
      z: tz,
      rotY: Math.random() * Math.PI * 2,
      sx: wScale,
      sy: hScale,
      sz: wScale,
    });
  }
  loadPlantVariants('pine_tree_low-poly.glb', 'height').then((variants) => {
    if (variants) {
      buildInstancedPlantGroup(variants, rimTreeTransforms, { castShadow: false, receiveShadow: false });
      return;
    }
    // Мягкий fallback, если pine_tree_low-poly.glb недоступен
    const rimTrunkGeo = new THREE.CylinderGeometry(0.36, 0.60, 4.0, 7);
    rimTrunkGeo.translate(0, 2.0, 0);
    const rimCrownGeo = new THREE.ConeGeometry(2.4, 5.6, 8);
    rimCrownGeo.translate(0, 5.4, 0);
    const rimTrunkInst = new THREE.InstancedMesh(rimTrunkGeo, stdMat(0x6e4324, 0.9), RIM_TREE_COUNT);
    const rimCrownInst = new THREE.InstancedMesh(rimCrownGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.84 }), RIM_TREE_COUNT);
    rimTreeTransforms.forEach((t, i) => {
      const sc = t.sy / 9.0;
      rimDummy.position.set(t.x, 0, t.z);
      rimDummy.rotation.set(0, t.rotY, 0);
      rimDummy.scale.set(sc, sc, sc);
      rimDummy.updateMatrix();
      rimTrunkInst.setMatrixAt(i, rimDummy.matrix);
      rimCrownInst.setMatrixAt(i, rimDummy.matrix);
      rimCol.setHSL(0.30 + (Math.random() - 0.5) * 0.05, 0.55, 0.30 + Math.random() * 0.14);
      rimCrownInst.setColorAt(i, rimCol);
    });
    rimTrunkInst.instanceMatrix.needsUpdate = true;
    rimCrownInst.instanceMatrix.needsUpdate = true;
    if (rimCrownInst.instanceColor) rimCrownInst.instanceColor.needsUpdate = true;
    scene.add(rimTrunkInst, rimCrownInst);
  });

  // Сеть магистральных дорог с PBR-материалом Road012B_1K-JPG (разметка строго вдоль полотна)
  const roadMat = loadPBRMaterial('Road012B_1K-JPG', 1, 42, {
    fallbackMap: texRoad,
    fallbackRoughness: 0.85,
    roughness: 0.90,
    useNormal: true,
    useRoughness: false,
    normalScale: 0.5,
  });
  const rNS = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 390), roadMat);
  rNS.rotation.x = -Math.PI / 2; rNS.position.y = 0.022; rNS.receiveShadow = true;
  scene.add(rNS);

  const rEW = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 390), roadMat);
  rEW.rotation.x = -Math.PI / 2; rEW.rotation.z = Math.PI / 2; rEW.position.y = 0.018; rEW.receiveShadow = true;
  scene.add(rEW);

  // Облака над всей долиной 500x500
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 });
  const cloudGeo = new THREE.IcosahedronGeometry(4.5, 1);
  for (let i = 0; i < 26; i++) {
    const cg = new THREE.Group();
    cg.position.set((Math.random() - 0.5) * 460, 42 + Math.random() * 18, (Math.random() - 0.5) * 460);
    for (let j = 0; j < 3; j++) {
      const p = new THREE.Mesh(cloudGeo, cloudMat);
      p.position.set((j - 1) * 4.2, j === 1 ? 1.1 : 0, (Math.random() - 0.5) * 1.8);
      p.scale.set(1.25, 0.62, 0.95);
      cg.add(p);
    }
    scene.add(cg);
  }

  // Хелпер коттеджей
  function createCottage(x, z, yaw, wallTex, roofTex, w = 9.5, h = 5.2, dep = 8.2) {
    noTreeZones.push({ x, z, r: Math.max(w, dep) * 0.85 });
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = yaw;

    const pbrMats = getWorldPBRMaterials();
    const wallMat = (wallTex === 'concrete') ? pbrMats.concrete
      : (wallTex === 'plaster') ? pbrMats.plasterLight
      : pbrMats.bricks;
    const roofMat = pbrMats.roofTiles;
    const trimMat = pbrMats.concrete;
    const doorMat = pbrMats.planksWindmill;
    const winMat  = pbrMats.glassWindow;

    const base = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.52, dep + 0.4), stdMat(0x85807a, 0.9));
    base.position.y = 0.26; base.receiveShadow = true; base.castShadow = true;
    const walls = new THREE.Mesh(new THREE.BoxGeometry(w, h, dep), wallMat);
    walls.position.y = h / 2 + 0.45; walls.castShadow = true; walls.receiveShadow = true;

    const roofR = dep * 0.68;
    const roofGeo = new THREE.CylinderGeometry(roofR, roofR, w + 1.3, 3);
    roofGeo.rotateZ(Math.PI / 2); roofGeo.rotateX(Math.PI / 6);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.scale.set(1.0, 0.75, 1.0); roof.position.y = h + 1.55;
    roof.castShadow = true; roof.receiveShadow = true;

    const chim = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.4, 1.1), stdMat(0xa64b3a, 0.85));
    chim.position.set(w * 0.24, h + 2.5, -dep * 0.16); chim.castShadow = true;

    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.98, 2.9, 0.14), trimMat);
    doorFrame.position.set(0, 1.9, dep / 2 + 0.11);
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.72, 2.72, 0.08), doorMat);
    door.position.set(0, 1.85, dep / 2 + 0.18);

    g.add(base, walls, roof, chim, doorFrame, door);
    for (const sx of [-w * 0.29, w * 0.29]) {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.84, 1.84, 0.12), pbrMats.windowFrame);
      frame.position.set(sx, 3.3, dep / 2 + 0.10);
      const glass = new THREE.Mesh(new THREE.BoxGeometry(1.44, 1.44, 0.06), winMat);
      glass.position.set(sx, 3.3, dep / 2 + 0.17);
      g.add(frame, glass);
    }
    scene.add(g);

    const body = new CANNON.Body({ mass: 0, material: matWorld, position: new CANNON.Vec3(x, (h + 2) / 2, z) });
    body.quaternion.setFromEuler(0, yaw, 0);
    body.addShape(new CANNON.Box(new CANNON.Vec3(w / 2 + 0.15, (h + 2) / 2, dep / 2 + 0.15)));
    world.addBody(body);
    return { mesh: g, body };
  }

  const HOUSE_STYLE_CYCLE = [
    'brick-house',
    'plaster-house',
    'concrete-house',
    'wood-accent-house',
    'brick-wood-house',
  ];
  let glbHouseIndex = 0;
  function createGlbHouse(filename, x, z, yaw, targetSize, wallTex, roofTex, fw = 9.5, fh = 5.2, fdep = 8.2, acornIdx = -1, wallKind = null) {
    noTreeZones.push({ x, z, r: targetSize * 0.88 });
    const chosenStyle = wallKind || HOUSE_STYLE_CYCLE[glbHouseIndex++ % HOUSE_STYLE_CYCLE.length];
    const fallbackKind = chosenStyle.includes('concrete') ? 'concrete'
      : (chosenStyle.includes('plaster') || chosenStyle === 'wood-accent-house') ? 'plaster'
      : 'brick';
    placeKenneyModel({
      filename,
      x,
      z,
      yaw,
      targetSize,
      scaleMode: 'maxHoriz',
      pbrStyle: chosenStyle,
      fallbackBuilder: () => createCottage(x, z, yaw, fallbackKind, roofTex, fw, fh, fdep),
      onLoaded: (holder, finalSize) => {
        if (acornIdx >= 0 && roofHeightHooks.has(acornIdx)) {
          roofHeightHooks.get(acornIdx)(finalSize.y + 1.15);
        }
      },
    });
  }

  function createFallbackWaterTower(x, z) {
    noTreeZones.push({ x, z, r: 9.0 });
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const pbrMats = getWorldPBRMaterials();
    const concreteMat = pbrMats.concreteTower;
    for (const sx of [-2.1, 2.1]) {
      for (const sz of [-2.1, 2.1]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.34, 10.5, 8), concreteMat);
        leg.position.set(sx, 5.25, sz); leg.castShadow = true; leg.receiveShadow = true;
        g.add(leg);
      }
    }
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 4.2, 14), concreteMat);
    tank.position.y = 12.2; tank.castShadow = true; tank.receiveShadow = true;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(3.6, 2.2, 14), concreteMat);
    cap.position.y = 15.2; cap.castShadow = true;
    g.add(tank, cap);
    scene.add(g);
    const body = new CANNON.Body({ mass: 0, material: matWorld, position: new CANNON.Vec3(x, 8.0, z) });
    body.addShape(new CANNON.Box(new CANNON.Vec3(3.0, 8.0, 3.0)));
    world.addBody(body);
    return { mesh: g, body };
  }

  function createFallbackContainer(x, z, yaw, colorHex = 0xd94b38, yBase = 0) {
    noTreeZones.push({ x, z, r: 6.5 });
    const m = new THREE.Mesh(new THREE.BoxGeometry(3.0, 2.9, 7.6), getWorldPBRMaterials().metalContainer(colorHex));
    m.position.set(x, yBase + 1.45, z); m.rotation.y = yaw;
    m.castShadow = true; m.receiveShadow = true;
    scene.add(m);
    const body = new CANNON.Body({ mass: 0, material: matWorld, position: new CANNON.Vec3(x, yBase + 1.45, z) });
    body.quaternion.setFromEuler(0, yaw, 0);
    body.addShape(new CANNON.Box(new CANNON.Vec3(1.5, 1.45, 3.8)));
    world.addBody(body);
    return { mesh: m, body };
  }

  function createFallbackTank(x, z, yaw = 0) {
    noTreeZones.push({ x, z, r: 6.0 });
    const g = new THREE.Group();
    g.position.set(x, 0, z); g.rotation.y = yaw;
    const bodyMesh = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 6.2, 16), stdMat(0xb8c2cc, 0.35, 0.55));
    bodyMesh.position.y = 3.1; bodyMesh.castShadow = true; bodyMesh.receiveShadow = true;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(2.3, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), stdMat(0xd97a26, 0.45, 0.3));
    dome.position.y = 6.2; dome.castShadow = true;
    g.add(bodyMesh, dome);
    scene.add(g);
    const body = new CANNON.Body({ mass: 0, material: matWorld, position: new CANNON.Vec3(x, 3.4, z) });
    body.quaternion.setFromEuler(0, yaw, 0);
    body.addShape(new CANNON.Box(new CANNON.Vec3(2.3, 3.4, 2.3)));
    world.addBody(body);
    return { mesh: g, body };
  }

  function createTrampoline(x, z, radius = 2.6, power = 23.5, yBase = 0) {
    noTreeZones.push({ x, z, r: radius + 2.5 });
    const g = new THREE.Group();
    g.position.set(x, yBase, z);

    const rimMat = stdMat(0x2c82e0, 0.55, 0.15);
    const legMat = stdMat(0x3a3f4a, 0.5, 0.4);
    const padMat = new THREE.MeshStandardMaterial({ map: texTrampoline, roughness: 0.65 });

    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.8, 8), legMat);
      leg.position.set(Math.cos(a) * (radius - 0.25), 0.4, Math.sin(a) * (radius - 0.25));
      leg.castShadow = true;
      g.add(leg);
    }
    const rim = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.26, 10, 24), rimMat);
    rim.rotation.x = Math.PI / 2; rim.position.y = 0.82;
    rim.castShadow = true; rim.receiveShadow = true;
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(radius - 0.12, radius - 0.12, 0.14, 24), padMat);
    pad.position.y = 0.80; pad.receiveShadow = true;
    g.add(rim, pad);
    scene.add(g);

    const body = new CANNON.Body({ mass: 0, material: matWorld, position: new CANNON.Vec3(x, yBase + 0.45, z) });
    body.addShape(new CANNON.Cylinder(radius + 0.1, radius + 0.1, 0.85, 14));
    world.addBody(body);

    trampolines.push({ x, yBase, z, radius, power, group: g, pad, bounceAnim: 0, cooldowns: new Map() });
  }

  function createRamp(x, z, yaw, width = 6.2, length = 8.6, angle = 0.35, yBase = 0) {
    noTreeZones.push({ x, z, r: Math.max(width, length) * 0.85 });
    const thickness = 0.55;
    const cy = yBase + (length / 2) * Math.sin(angle) - (thickness / 2) * Math.cos(angle) - 0.03;
    const rg = new THREE.Group();
    rg.position.set(x, 0, z);
    rg.rotation.y = yaw;

    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(width, thickness, length),
      new THREE.MeshStandardMaterial({ map: texRamp, roughness: 0.62 })
    );
    deck.position.y = cy; deck.rotation.x = angle;
    deck.castShadow = true; deck.receiveShadow = true;
    rg.add(deck);

    const highH = length * Math.sin(angle);
    const pMat = stdMat(0x403b38, 0.8);
    for (const sx of [-width / 2 + 0.45, width / 2 - 0.45]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.30, highH, 8), pMat);
      p.position.set(sx, yBase + highH / 2, -length / 2 + 0.6);
      p.castShadow = true;
      rg.add(p);
    }
    scene.add(rg);

    const qFinal = new CANNON.Quaternion().setFromEuler(0, yaw, 0).mult(new CANNON.Quaternion().setFromEuler(angle, 0, 0));
    const body = new CANNON.Body({ mass: 0, material: matWorld, position: new CANNON.Vec3(x, cy, z), quaternion: qFinal });
    body.addShape(new CANNON.Box(new CANNON.Vec3(width / 2, thickness / 2, length / 2)));
    world.addBody(body);
  }

  const wallPlasterWarm  = makePlasterWallTex('#ffe5a8', '#d9b56c');
  const wallPlasterCream = makePlasterWallTex('#f7ebd7', '#cbb899');
  const wallPlasterBlue  = makePlasterWallTex('#c2e8ff', '#87bee0');
  const wallWoodPeach    = makeWoodWallTex('#f2b68d', '#a6653c', '#ffd0ad');
  const wallWoodMint     = makeWoodWallTex('#bfe89c', '#6e9e49', '#daf7be');
  const wallWoodLavender = makeWoodWallTex('#ecc7eb', '#9e689d', '#fadcf9');
  const wallBarnRed      = makeWoodWallTex('#d94136', '#7a1c16', '#f26257', 4, 3);
  const wallWoodSand     = makeWoodWallTex('#f2d494', '#a6823f', '#ffe8b5');

  const roofRed    = makeRoofTileTex('#cf4436', '#7a1f16', '#e86154');
  const roofBlue   = makeRoofTileTex('#3b6fd9', '#1d3e85', '#588cf5');
  const roofGreen  = makeRoofTileTex('#3c994a', '#1d5c26', '#56ba65');
  const roofBrown  = makeRoofTileTex('#8c4a2b', '#4d2310', '#ab623f');
  const roofViolet = makeRoofTileTex('#7346bd', '#3f2073', '#9263de');
  const roofDark   = makeRoofTileTex('#4f322a', '#261511', '#6e493e');

  // ==========================================================================
  // БИОМ 1: ЦЕНТР (0, 0) — ДЕРЕВЕНСКАЯ ПЛОЩАДЬ
  // ==========================================================================
  noTreeZones.push({ x: 0, z: 0, r: 34 });
  const plazaMat = loadPBRMaterial('Concrete049_1K-JPG', 6, 6, {
    fallbackMap: texPlaza,
    fallbackRoughness: 0.88,
    roughness: 0.90,
    useNormal: false,
    useRoughness: false,
  });
  const plaza = new THREE.Mesh(
    new THREE.CylinderGeometry(20, 20.4, 0.08, 32),
    plazaMat
  );
  plaza.position.y = 0.035; plaza.receiveShadow = true;
  scene.add(plaza);

  createGlbHouse('building-a.glb',  26, -24, -0.35, 11.5, wallPlasterWarm,  roofRed,    10.0, 5.2, 8.2);
  createGlbHouse('building-b.glb', -28,  24,  2.85, 11.0, wallPlasterBlue,  roofBlue,    9.6, 5.0, 8.0);
  createGlbHouse('building-d.glb',  28,  25, -2.80, 11.5, wallWoodPeach,    roofGreen,  10.0, 5.2, 8.4);
  createGlbHouse('building-h.glb', -46, -12,  1.57, 10.5, wallWoodMint,     roofBrown,   9.5, 5.0, 8.0);
  createGlbHouse('building-k.glb',  46,  14, -1.57, 10.5, wallWoodLavender, roofViolet,  9.5, 5.0, 8.0);
  createGlbHouse('building-o.glb',  44, -22, -1.35, 10.0, wallPlasterCream, roofRed,     9.2, 4.9, 7.8);

  // Водонапорная башня (~16м) в центре деревни — ориентир с крышей и батутом рядом
  placeKenneyModel({
    filename: 'water-tower.glb',
    x: -20,
    z: 12,
    yaw: 0.4,
    targetSize: 16.0,
    scaleMode: 'height',
    pbrStyle: 'water-tower',
    fallbackBuilder: () => createFallbackWaterTower(-20, 12),
  });

  // Морской контейнер за центральным трамплином (можно запрыгивать на крышу!)
  placeKenneyModel({
    filename: 'shipping-container-a.glb',
    x: 14,
    z: -14.5,
    yaw: Math.PI / 2,
    targetSize: 7.8,
    scaleMode: 'maxHoriz',
    pbrStyle: 'container',
    pbrTint: 0xf0c2b8,
    fallbackBuilder: () => createFallbackContainer(14, -14.5, Math.PI / 2, 0xf0c2b8),
  });

  // Цистерна рядом с взрывными бочками в центре
  placeKenneyModel({
    filename: 'detail-tank-large.glb',
    x: -11.5,
    z: 7.5,
    yaw: 0.3,
    targetSize: 6.2,
    scaleMode: 'height',
    fallbackBuilder: () => createFallbackTank(-11.5, 7.5, 0.3),
  });

  createTrampoline( 10.5,   6.5, 2.7, 23.5);
  createTrampoline(-24.5, -18.5, 2.8, 25.5);
  createRamp( 14, -4, 0.0, 6.2, 8.6, 0.35);

  // Вышка с горкой в центре
  (function createTowerWithSlide() {
    const tx = -18, tz = -18, deckH = 9.0, deckW = 5.6;
    noTreeZones.push({ x: -8, z: -22, r: 22 });
    const woodMat = stdMat(0xa66b38, 0.82), pillarMat = stdMat(0x704422, 0.85);
    const railMat = stdMat(0xf5e8cf, 0.78), slideMat = stdMat(0xffa724, 0.25, 0.15), sideMat = stdMat(0xe84838, 0.35, 0.12);

    const tg = new THREE.Group();
    tg.position.set(tx, 0, tz);
    for (const sx of [-2.3, 2.3]) {
      for (const sz of [-2.3, 2.3]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, deckH, 8), pillarMat);
        post.position.set(sx, deckH / 2, sz); post.castShadow = true; post.receiveShadow = true;
        tg.add(post);
      }
    }
    const deck = new THREE.Mesh(new THREE.BoxGeometry(deckW, 0.55, deckW), woodMat);
    deck.position.y = deckH; deck.castShadow = true; deck.receiveShadow = true;
    tg.add(deck);
    scene.add(tg);

    const deckBody = new CANNON.Body({ mass: 0, material: matWorld, position: new CANNON.Vec3(tx, deckH, tz) });
    deckBody.addShape(new CANNON.Box(new CANNON.Vec3(deckW / 2, 0.28, deckW / 2)));
    world.addBody(deckBody);

    const stairLen = 19.5, stairAng = Math.asin(deckH / stairLen);
    const stairZ = tz - deckW / 2 - (stairLen / 2) * Math.cos(stairAng) + 0.2;
    const stairY = deckH / 2 - 0.15;
    const stairMesh = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.45, stairLen), woodMat);
    stairMesh.position.set(tx, stairY, stairZ); stairMesh.rotation.x = -stairAng;
    stairMesh.castShadow = true; stairMesh.receiveShadow = true;
    scene.add(stairMesh);

    const stairBody = new CANNON.Body({ mass: 0, material: matWorld, position: new CANNON.Vec3(tx, stairY, stairZ) });
    stairBody.quaternion.setFromEuler(-stairAng, 0, 0);
    stairBody.addShape(new CANNON.Box(new CANNON.Vec3(1.7, 0.225, stairLen / 2)));
    world.addBody(stairBody);

    const slideLen = 21.5, slideW = 3.5, slideAng = Math.asin((deckH - 0.35) / slideLen);
    const slideX = tx + deckW / 2 + (slideLen / 2) * Math.cos(slideAng) - 0.25;
    const slideY = (deckH + 0.2) / 2;
    const sg = new THREE.Group();
    sg.position.set(slideX, slideY, tz); sg.rotation.z = -slideAng;
    const chuteFloor = new THREE.Mesh(new THREE.BoxGeometry(slideLen, 0.35, slideW), slideMat);
    chuteFloor.castShadow = true; chuteFloor.receiveShadow = true;
    const wallL = new THREE.Mesh(new THREE.BoxGeometry(slideLen, 0.95, 0.26), sideMat);
    wallL.position.set(0, 0.45, -slideW / 2 - 0.1);
    const wallR = new THREE.Mesh(new THREE.BoxGeometry(slideLen, 0.95, 0.26), sideMat);
    wallR.position.set(0, 0.45,  slideW / 2 + 0.1);
    sg.add(chuteFloor, wallL, wallR);
    scene.add(sg);

    const slideBody = new CANNON.Body({ mass: 0, material: matSlide, position: new CANNON.Vec3(slideX, slideY, tz) });
    slideBody.quaternion.setFromEuler(0, 0, -slideAng);
    slideBody.addShape(new CANNON.Box(new CANNON.Vec3(slideLen / 2, 0.18, slideW / 2)));
    slideBody.addShape(new CANNON.Box(new CANNON.Vec3(slideLen / 2, 0.52, 0.15)), new CANNON.Vec3(0, 0.45, -slideW / 2 - 0.1));
    slideBody.addShape(new CANNON.Box(new CANNON.Vec3(slideLen / 2, 0.52, 0.15)), new CANNON.Vec3(0, 0.45,  slideW / 2 + 0.1));
    world.addBody(slideBody);

    slideZone = { xMin: tx + 2.2, xMax: slideX + slideLen * 0.46, zCenter: tz, halfW: slideW * 0.65 };
  })();

  // ==========================================================================
  // БИОМ 2: СЕВЕР (0, -140) — БОЛЬШАЯ ФЕРМА (Амбар, Ветряная мельница, Лабиринт)
  // ==========================================================================
  noTreeZones.push({ x: 0, z: -140, r: 46 });
  // Фермерский двор
  const farmYard = new THREE.Mesh(
    new THREE.CylinderGeometry(32, 33, 0.06, 28),
    new THREE.MeshStandardMaterial({ map: texPlaza, roughness: 0.9 })
  );
  farmYard.position.set(0, 0.02, -140);
  farmYard.receiveShadow = true;
  scene.add(farmYard);

  // Большая ферма (Север): главные здания building-t.glb, building-q.glb + цистерна + ветряк windmill.glb (~16м)
  createGlbHouse('building-t.glb', -16, -152, 0.22, 13.0, wallBarnRed, roofDark, 14.0, 7.2, 10.5, 3);
  createGlbHouse('building-q.glb', -34, -138, 0.65, 10.5, wallWoodPeach, roofBrown, 9.6, 5.2, 8.0);

  placeKenneyModel({
    filename: 'detail-tank-large.glb',
    x: -28,
    z: -156,
    yaw: 0.2,
    targetSize: 7.5,
    scaleMode: 'height',
    fallbackBuilder: () => createFallbackTank(-28, -156, 0.2),
  });

  // Ветряк windmill.glb (~16м) покрытый досками Planks039 с мягким fallback на процедурную мельницу
  placeKenneyModel({
    filename: 'windmill.glb',
    x: 16,
    z: -152,
    yaw: 0,
    targetSize: 16.0,
    scaleMode: 'height',
    pbrStyle: 'windmill',
    fallbackBuilder: () => {
      const wx = 16, wz = -152;
      const wg = new THREE.Group();
      wg.position.set(wx, 0, wz);

      const tower = new THREE.Mesh(
        new THREE.CylinderGeometry(2.2, 3.6, 14.5, 12),
        getWorldPBRMaterials().planksWindmill
      );
      tower.position.y = 7.25; tower.castShadow = true; tower.receiveShadow = true;
      const cap = new THREE.Mesh(new THREE.ConeGeometry(2.7, 3.4, 12), stdMat(0x8f3a26, 0.72));
      cap.position.y = 16.0; cap.castShadow = true;
      wg.add(tower, cap);

      const hub = new THREE.Group();
      hub.position.set(0, 12.2, 2.6);
      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.65, 10, 8), stdMat(0x52311d, 0.7));
      hub.add(nose);

      const sailWood = stdMat(0x7a4822, 0.8);
      const sailCloth = stdMat(0xfff5dc, 0.85);
      for (let i = 0; i < 4; i++) {
        const blade = new THREE.Group();
        blade.rotation.z = (i * Math.PI) / 2;
        const spar = new THREE.Mesh(new THREE.BoxGeometry(0.28, 10.6, 0.24), sailWood);
        spar.position.y = 5.3; spar.castShadow = true;
        const cloth = new THREE.Mesh(new THREE.BoxGeometry(1.65, 8.2, 0.10), sailCloth);
        cloth.position.set(0.75, 6.1, 0.06); cloth.castShadow = true;
        blade.add(spar, cloth);
        hub.add(blade);
      }
      wg.add(hub);
      scene.add(wg);

      windmillBlades = hub;
      windmillHubWorld.set(wx, 12.2, wz + 2.6);

      const millBody = new CANNON.Body({ mass: 0, material: matWorld, position: new CANNON.Vec3(wx, 7.25, wz) });
      millBody.addShape(new CANNON.Cylinder(2.3, 3.5, 14.5, 10));
      world.addBody(millBody);
      return { mesh: wg, body: millBody };
    },
    onLoaded: (holder, finalSize) => {
      // Ищем узел лопастей в windmill.glb, если он отделён в иерархии
      let foundRotor = null;
      holder.traverse((obj) => {
        if (obj.name && /blade|fan|sail|rotor|prop|wheel/i.test(obj.name)) {
          foundRotor = obj;
        }
      });
      windmillBlades = foundRotor;
      windmillHubWorld.set(16, finalSize.y * 0.74, -152 + finalSize.z * 0.35);
    },
  });

  // Лабиринт из тюков сена на ферме (0, -124)
  (function createHayMaze() {
    const hayWallMat = new THREE.MeshStandardMaterial({
      map: makeWoodWallTex('#e6bf53', '#b58d28', '#f7d877', 4, 2),
      roughness: 0.92,
    });
    const walls = [
      // Внешний контур лабиринта 22x18 (с входом с юга и севера)
      [-6.5, -115, 9, 2.2, 1.8], [ 6.5, -115, 9, 2.2, 1.8],
      [-6.5, -133, 9, 2.2, 1.8], [ 6.5, -133, 9, 2.2, 1.8],
      [-11,  -124, 1.8, 2.2, 18], [ 11, -124, 1.8, 2.2, 18],
      // Внутренние перегородки лабиринта
      [-3.5, -120, 11, 2.2, 1.8],
      [ 3.5, -124, 11, 2.2, 1.8],
      [-3.5, -128, 11, 2.2, 1.8],
    ];
    for (const [hx, hz, hw, hh, hd] of walls) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(hw, hh, hd), hayWallMat);
      m.position.set(hx, hh / 2, hz); m.castShadow = true; m.receiveShadow = true;
      scene.add(m);
      const b = new CANNON.Body({ mass: 0, material: matWorld, position: new CANNON.Vec3(hx, hh / 2, hz) });
      b.addShape(new CANNON.Box(new CANNON.Vec3(hw / 2, hh / 2, hd / 2)));
      world.addBody(b);
    }
  })();
  createTrampoline(16, -138, 2.7, 24.5);

  // ==========================================================================
  // БИОМ 3: ВОСТОК (140, 0) — СТРОЙКА (Леса, бетон, мега-трамплин!)
  // ==========================================================================
  noTreeZones.push({ x: 140, z: 0, r: 46 });
  const siteConcreteMat = loadPBRMaterial('Concrete049_1K-JPG', 10, 10, {
    fallbackMap: texConcrete,
    fallbackRoughness: 0.90,
    roughness: 0.92,
    useNormal: false,
    useRoughness: false,
  });
  const siteGround = new THREE.Mesh(
    new THREE.BoxGeometry(66, 0.08, 66),
    siteConcreteMat
  );
  siteGround.position.set(140, 0.02, 0); siteGround.receiveShadow = true;
  scene.add(siteGround);

  // Многоярусные строительные леса с пандусами (148, -14)
  (function createScaffolding() {
    const sx = 148, sz = -14;
    const steelMat = stdMat(0xd9721e, 0.45, 0.55);
    const plankMat = stdMat(0xc48b4b, 0.85);
    const sg = new THREE.Group();
    sg.position.set(sx, 0, sz);

    // 2 яруса платформ (высота 4.2м и 8.4м)
    for (let tier = 1; tier <= 2; tier++) {
      const y = tier * 4.2;
      const deck = new THREE.Mesh(new THREE.BoxGeometry(10, 0.35, 7), plankMat);
      deck.position.y = y; deck.castShadow = true; deck.receiveShadow = true;
      sg.add(deck);

      const b = new CANNON.Body({ mass: 0, material: matWorld, position: new CANNON.Vec3(sx, y, sz) });
      b.addShape(new CANNON.Box(new CANNON.Vec3(5, 0.18, 3.5)));
      world.addBody(b);
    }
    // Стойки лесов
    for (const px of [-4.7, 0, 4.7]) {
      for (const pz of [-3.2, 3.2]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 9.6, 8), steelMat);
        pole.position.set(px, 4.8, pz); pole.castShadow = true;
        sg.add(pole);
      }
    }
    scene.add(sg);

    // Заездные трамплины на ярусы лесов
    createRamp(136, -14, -Math.PI / 2, 4.6, 11.5, 0.37, 0);
    createRamp(156, -14,  Math.PI / 2, 4.4, 11.5, 0.37, 4.2);
  })();

  // ОГРОМНЫЙ МЕГА-ТРАМПЛИН ДЛЯ РЕКОРДНЫХ ПОЛЁТОВ (136, 14)
  createRamp(136, 14, -Math.PI / 2, 8.2, 15.0, 0.44, 0);
  createTrampoline(124, 14, 2.9, 27.5);

  // Трюковые морские контейнеры (shipping-container-a.glb) из металла Metal041B (с Metalness) у трамплинов стройки
  placeKenneyModel({
    filename: 'shipping-container-a.glb',
    x: 148,
    z: 14,
    yaw: 0,
    targetSize: 8.2,
    scaleMode: 'maxHoriz',
    pbrStyle: 'container',
    pbrTint: 0xc2d8f0,
    fallbackBuilder: () => createFallbackContainer(148, 14, 0, 0xc2d8f0),
  });
  placeKenneyModel({
    filename: 'shipping-container-a.glb',
    x: 148,
    z: 21,
    yaw: 0.14,
    targetSize: 8.2,
    scaleMode: 'maxHoriz',
    pbrStyle: 'container',
    pbrTint: 0xf0c2b8,
    fallbackBuilder: () => createFallbackContainer(148, 21, 0.14, 0xf0c2b8),
  });
  placeKenneyModel({
    filename: 'shipping-container-a.glb',
    x: 124,
    z: -14,
    yaw: Math.PI / 2,
    targetSize: 7.6,
    scaleMode: 'maxHoriz',
    pbrStyle: 'container',
    pbrTint: 0xf2dfc0,
    fallbackBuilder: () => createFallbackContainer(124, -14, Math.PI / 2, 0xf2dfc0),
  });

  // Цистерны (detail-tank-large.glb) рядом со взрывными бочками на стройке
  placeKenneyModel({
    filename: 'detail-tank-large.glb',
    x: 132,
    z: -10.5,
    yaw: 0.25,
    targetSize: 6.8,
    scaleMode: 'height',
    fallbackBuilder: () => createFallbackTank(132, -10.5, 0.25),
  });
  placeKenneyModel({
    filename: 'detail-tank-large.glb',
    x: 142,
    z: 26.5,
    yaw: -0.4,
    targetSize: 6.8,
    scaleMode: 'height',
    fallbackBuilder: () => createFallbackTank(142, 26.5, -0.4),
  });

  // Бытовка/здание на стройплощадке
  createGlbHouse('building-k.glb', 164, -24, -1.57, 11.0, wallPlasterCream, roofBrown, 9.5, 5.0, 8.0);

  // Бетонные трубы и плиты на стройке
  const pipeMat = stdMat(0x88909c, 0.85);
  for (let i = 0; i < 3; i++) {
    const px = 128 + i * 3.4, pz = -22;
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 4.2, 14, 1, true), pipeMat);
    pipe.rotation.z = Math.PI / 2; pipe.position.set(px, 1.15, pz); pipe.castShadow = true;
    scene.add(pipe);
    const pb = new CANNON.Body({ mass: 0, material: matWorld, position: new CANNON.Vec3(px, 1.15, pz) });
    pb.addShape(new CANNON.Box(new CANNON.Vec3(2.1, 1.15, 1.15)));
    world.addBody(pb);
  }

  // ==========================================================================
  // БИОМ 4: ЮГ (0, 140) — ОЗЕРО И ПЛЯЖ (Песок, вода, пирс, трамплины над водой)
  // ==========================================================================
  noTreeZones.push({ x: 0, z: 146, r: 54 });
  // Песчаный пляж
  const beach = new THREE.Mesh(
    new THREE.CylinderGeometry(48, 49, 0.06, 36),
    new THREE.MeshStandardMaterial({ map: texSand, roughness: 0.92 })
  );
  beach.position.set(0, 0.02, 146); beach.receiveShadow = true;
  scene.add(beach);

  // Бирюзовая гладь озера (0, 156)
  lakeMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(32, 32, 0.12, 36),
    new THREE.MeshStandardMaterial({
      map: texWater,
      color: 0x45c4ff,
      roughness: 0.14,
      metalness: 0.12,
      transparent: true,
      opacity: 0.86,
    })
  );
  lakeMesh.position.set(0, 0.09, 156);
  lakeMesh.receiveShadow = true;
  scene.add(lakeMesh);

  // Деревянный пирс над водой + трамплин на конце пирса!
  (function createPier() {
    const pierMat = new THREE.MeshStandardMaterial({ map: makeWoodWallTex('#9c6334', '#573316', '#ba7a45', 2, 6), roughness: 0.82 });
    const postMat = stdMat(0x5c3618, 0.88);
    const pier = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.35, 22), pierMat);
    pier.position.set(0, 0.65, 134); pier.castShadow = true; pier.receiveShadow = true;
    scene.add(pier);

    for (let z = 124; z <= 144; z += 5) {
      for (const sx of [-1.9, 1.9]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.4, 8), postMat);
        post.position.set(sx, 0.55, z); post.castShadow = true;
        scene.add(post);
      }
    }

    const pierBody = new CANNON.Body({ mass: 0, material: matWorld, position: new CANNON.Vec3(0, 0.65, 134) });
    pierBody.addShape(new CANNON.Box(new CANNON.Vec3(2.2, 0.18, 11)));
    world.addBody(pierBody);

    // Трамплин прямо с пирса над водой + плавучий батут посреди озера!
    createRamp(0, 144, Math.PI, 4.4, 6.2, 0.36, 0.75);
    createTrampoline(0, 160, 3.0, 26.5, 0.05);
    createTrampoline(-15, 154, 2.7, 24.5, 0.05);
  })();

  createGlbHouse('building-d.glb', -30, 124,  0.65, 10.0, wallWoodSand, roofBlue, 9.2, 4.8, 7.6, 7);
  createGlbHouse('building-o.glb',  30, 126, -0.65,  9.8, wallPlasterWarm, roofGreen, 9.0, 4.8, 7.6);

  // ==========================================================================
  // БИОМ 5: ЗАПАД (-140, 0) — ХОЛМИСТЫЙ ЛЕС И СВИНСКИЙ СКЕЙТ-ПАРК
  // ==========================================================================
  noTreeZones.push({ x: -140, z: 0, r: 44 });
  const skateConcreteMat = loadPBRMaterial('Concrete049_1K-JPG', 9, 8, {
    fallbackMap: texConcrete,
    fallbackRoughness: 0.78,
    roughness: 0.86,
    useNormal: false,
    useRoughness: false,
  });
  const skatePad = new THREE.Mesh(
    new THREE.BoxGeometry(62, 0.08, 56),
    skateConcreteMat
  );
  skatePad.position.set(-140, 0.02, 0); skatePad.receiveShadow = true;
  scene.add(skatePad);

  // Огромная свинская полутруба (Half-Pipe) для сальто! (-144, 0)
  (function createHalfPipe() {
    const cx = -144, cz = 0;
    const width = 18;
    const segments = 10;
    const radius = 11.5;
    const deckMat = new THREE.MeshStandardMaterial({ map: makeWoodWallTex('#d99b52', '#8f5d24', '#f0b66e', 3, 2), roughness: 0.45 });
    const railMat = stdMat(0xe84838, 0.35, 0.4);

    // Бортики безопасности по краям полутрубы
    for (const sz of [-width / 2 - 0.3, width / 2 + 0.3]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(22, 6.8, 0.4), railMat);
      wall.position.set(cx, 3.4, cz + sz); wall.castShadow = true;
      scene.add(wall);
    }

    // Сегменты дуги полутрубы (гладкий съезд и вылет вверх с обеих сторон)
    for (let i = 0; i < segments; i++) {
      const t = (i + 0.5) / segments; // 0..1
      const theta = (t - 0.5) * Math.PI * 0.86; // от -77° до +77°
      const px = cx + Math.sin(theta) * radius;
      const py = radius - Math.cos(theta) * radius + 0.12;
      const segLen = (Math.PI * 0.86 * radius) / segments + 0.25;

      const m = new THREE.Mesh(new THREE.BoxGeometry(segLen, 0.45, width), deckMat);
      m.position.set(px, py, cz);
      m.rotation.z = theta;
      m.castShadow = true; m.receiveShadow = true;
      scene.add(m);

      const b = new CANNON.Body({ mass: 0, material: matSlide, position: new CANNON.Vec3(px, py, cz) });
      b.quaternion.setFromEuler(0, 0, theta);
      b.addShape(new CANNON.Box(new CANNON.Vec3(segLen / 2, 0.22, width / 2)));
      world.addBody(b);
    }

    // Батуты на вылетах полутрубы для космических сальто!
    createTrampoline(cx - 12.2, cz, 2.4, 23.0, 5.2);
    createTrampoline(cx + 12.2, cz, 2.4, 23.0, 5.2);
  })();

  // Крутые скейт-горки сбоку от полутрубы + морской контейнер для трюков и лесные домики
  createRamp(-136, -18,  Math.PI / 2, 6.0, 9.5, 0.40);
  createRamp(-136,  18, -Math.PI / 2, 6.0, 9.5, 0.40);
  placeKenneyModel({
    filename: 'shipping-container-a.glb',
    x: -124,
    z: 18,
    yaw: 0.25,
    targetSize: 7.8,
    scaleMode: 'maxHoriz',
    pbrStyle: 'container',
    pbrTint: 0xc4e0cc,
    fallbackBuilder: () => createFallbackContainer(-124, 18, 0.25, 0xc4e0cc),
  });
  createGlbHouse('building-h.glb', -164, -26, 1.2, 10.5, wallWoodMint, roofBrown, 9.4, 5.0, 7.8);
  createGlbHouse('building-q.glb', -164,  26, 2.0, 10.5, wallPlasterBlue, roofViolet, 9.4, 5.0, 7.8);
  createGlbHouse('building-b.glb', -118, -32, 0.4,  9.8, wallWoodPeach, roofRed, 9.2, 4.9, 7.6);

  // ==========================================================================
  // ОПТИМИЗАЦИЯ: 180+ ДЕРЕВЬЕВ, КУСТОВ, КАМНЕЙ И ЦВЕТОВ ЧЕРЕЗ INSTANCEDMESH
  // ==========================================================================
  function isClearGround(x, z) {
    // Центральные дороги (крест 500x500)
    if (Math.abs(x) < 6.5 && Math.abs(z) < 200) return false;
    if (Math.abs(z) < 6.5 && Math.abs(x) < 200) return false;
    for (const nz of noTreeZones) {
      if (Math.hypot(x - nz.x, z - nz.z) < nz.r) return false;
    }
    return true;
  }

  const dummy = new THREE.Object3D();
  const tempColor = new THREE.Color();

  // 1) КАМНИ (180 шт. через InstancedMesh — остаются всегда как природный декор)
  const ROCK_COUNT = isMobile ? 140 : 210;
  const rockGeo = new THREE.DodecahedronGeometry(0.35, 0);
  const rockInst = new THREE.InstancedMesh(
    rockGeo,
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }),
    ROCK_COUNT
  );
  rockInst.castShadow = !isMobile; rockInst.receiveShadow = true;

  let placed = 0, tries = 0;
  while (placed < ROCK_COUNT && tries < ROCK_COUNT * 8) {
    tries++;
    const x = (Math.random() - 0.5) * (WORLD_SIZE - 16);
    const z = (Math.random() - 0.5) * (WORLD_SIZE - 16);
    if (!isClearGround(x, z)) continue;
    const s = 0.55 + Math.random() * 1.25;
    dummy.position.set(x, s * 0.16, z);
    dummy.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    dummy.scale.set(s * 1.25, s * 0.72, s);
    dummy.updateMatrix();
    rockInst.setMatrixAt(placed, dummy.matrix);
    const shade = 0.52 + Math.random() * 0.22;
    tempColor.setRGB(shade + 0.03, shade + 0.02, shade);
    rockInst.setColorAt(placed, tempColor);
    placed++;
  }
  rockInst.count = placed;
  rockInst.instanceMatrix.needsUpdate = true;
  if (rockInst.instanceColor) rockInst.instanceColor.needsUpdate = true;
  scene.add(rockInst);

  // 2) МЯГКИЙ FALLBACK: процедурные деревья-шарики, кусты, плоская трава и ромашки
  //    Создаются только если соответствующий .gltf не смог загрузиться!
  function spawnFallbackTreesAndBushes() {
    const TREE_TOTAL = isMobile ? 120 : 170;
    const trunkGeo = new THREE.CylinderGeometry(0.32, 0.54, 3.6, 7);
    trunkGeo.translate(0, 1.8, 0);
    const crownGeo = new THREE.IcosahedronGeometry(2.1, 1);
    crownGeo.translate(0, 4.5, 0);

    const trunkInst = new THREE.InstancedMesh(trunkGeo, stdMat(0x784c2c, 0.9), TREE_TOTAL);
    const crownInst = new THREE.InstancedMesh(crownGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82 }), TREE_TOTAL);
    trunkInst.castShadow = true; trunkInst.receiveShadow = true;
    crownInst.castShadow = true; crownInst.receiveShadow = true;

    let cnt = 0, tr = 0;
    treePositions.length = 0;
    while (cnt < TREE_TOTAL && tr < TREE_TOTAL * 10) {
      tr++;
      const x = cnt < 40 ? (-85 - Math.random() * 125) : (Math.random() - 0.5) * (WORLD_SIZE - 24);
      const z = cnt < 40 ? ((Math.random() - 0.5) * 240) : (Math.random() - 0.5) * (WORLD_SIZE - 24);
      if (!isClearGround(x, z)) continue;
      const s = 0.85 + Math.random() * 0.55;
      dummy.position.set(x, 0, z);
      dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
      dummy.scale.set(s, s * (0.9 + Math.random() * 0.35), s);
      dummy.updateMatrix();
      trunkInst.setMatrixAt(cnt, dummy.matrix);
      dummy.scale.set(s * 1.15, s * 0.95, s * 1.15);
      dummy.updateMatrix();
      crownInst.setMatrixAt(cnt, dummy.matrix);
      tempColor.setHSL(0.28 + (Math.random() - 0.5) * 0.05, 0.56, 0.38 + Math.random() * 0.14);
      crownInst.setColorAt(cnt, tempColor);
      treePositions.push({ x, z });
      cnt++;
    }
    trunkInst.count = cnt; crownInst.count = cnt;
    trunkInst.instanceMatrix.needsUpdate = true; crownInst.instanceMatrix.needsUpdate = true;
    if (crownInst.instanceColor) crownInst.instanceColor.needsUpdate = true;
    scene.add(trunkInst, crownInst);
    updateTreeColliderPool();
  }

  function spawnFallbackGrass() {
    const grassBladeGeo = new THREE.ConeGeometry(0.16, 0.55, 4);
    grassBladeGeo.translate(0, 0.25, 0);
    const GRASS_COUNT = isMobile ? 500 : 800;
    const grassInst = new THREE.InstancedMesh(grassBladeGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 }), GRASS_COUNT);
    let cnt = 0, tr = 0;
    while (cnt < GRASS_COUNT && tr < GRASS_COUNT * 6) {
      tr++;
      const x = (Math.random() - 0.5) * (WORLD_SIZE - 14);
      const z = (Math.random() - 0.5) * (WORLD_SIZE - 14);
      if (!isClearGround(x, z)) continue;
      dummy.position.set(x, 0, z);
      dummy.rotation.set((Math.random() - 0.5) * 0.25, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.25);
      const s = 0.7 + Math.random() * 0.9;
      dummy.scale.set(s * 1.2, s * (0.8 + Math.random() * 0.6), s * 1.2);
      dummy.updateMatrix();
      grassInst.setMatrixAt(cnt, dummy.matrix);
      tempColor.setHSL(0.27 + (Math.random() - 0.5) * 0.04, 0.58, 0.44 + Math.random() * 0.14);
      grassInst.setColorAt(cnt, tempColor);
      cnt++;
    }
    grassInst.count = cnt;
    grassInst.instanceMatrix.needsUpdate = true;
    if (grassInst.instanceColor) grassInst.instanceColor.needsUpdate = true;
    scene.add(grassInst);
  }

  function spawnFallbackFlowers() {
    const DAISY_COUNT = isMobile ? 160 : 240;
    const daisyPetals = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.18, 0.08, 0.04, 7), stdMat(0xffffff, 0.7), DAISY_COUNT);
    const daisyCenters = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 6, 5), stdMat(0xffd426, 0.5), DAISY_COUNT);
    let cnt = 0, tr = 0;
    while (cnt < DAISY_COUNT && tr < DAISY_COUNT * 6) {
      tr++;
      const x = (Math.random() - 0.5) * (WORLD_SIZE - 14);
      const z = (Math.random() - 0.5) * (WORLD_SIZE - 14);
      if (!isClearGround(x, z)) continue;
      const h = 0.14 + Math.random() * 0.14;
      const s = 0.75 + Math.random() * 0.65;
      dummy.position.set(x, h, z);
      dummy.rotation.set((Math.random() - 0.5) * 0.3, Math.random() * Math.PI, (Math.random() - 0.5) * 0.3);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      daisyPetals.setMatrixAt(cnt, dummy.matrix);
      dummy.position.set(x, h + 0.025, z);
      dummy.updateMatrix();
      daisyCenters.setMatrixAt(cnt, dummy.matrix);
      cnt++;
    }
    daisyPetals.count = cnt; daisyCenters.count = cnt;
    daisyPetals.instanceMatrix.needsUpdate = true; daisyCenters.instanceMatrix.needsUpdate = true;
    scene.add(daisyPetals, daisyCenters);
  }

  // 3) РЕАЛИСТИЧНЫЕ 3D-РАСТЕНИЯ (.gltf) ЧЕРЕЗ THREE.InstancedMesh (60 FPS НА ТЕЛЕФОНЕ!)
  function sampleMeadowPoint(preferNearBiomes = false) {
    for (let attempt = 0; attempt < 30; attempt++) {
      let x, z;
      if (preferNearBiomes && Math.random() < 0.55) {
        // Концентрируем часть травы и цветов вокруг основных живых зон долины
        const hubs = [
          [0, 0, 72],
          [0, -140, 68],
          [0, 146, 76],
          [-140, 0, 76],
          [140, 0, 64],
        ];
        const h = hubs[Math.floor(Math.random() * hubs.length)];
        const ang = Math.random() * Math.PI * 2;
        const rad = 24 + Math.random() * h[2];
        x = h[0] + Math.cos(ang) * rad;
        z = h[1] + Math.sin(ang) * rad;
      } else {
        x = (Math.random() - 0.5) * (WORLD_SIZE - 20);
        z = (Math.random() - 0.5) * (WORLD_SIZE - 20);
      }
      if (Math.abs(x) > HALF_WORLD - 10 || Math.abs(z) > HALF_WORLD - 10) continue;
      if (isClearGround(x, z)) return { x, z };
    }
    return null;
  }

  // 3a) Клонированные 3D-ёлки ./models/pine_tree_low-poly.glb со случайным поворотом по Y
  (function spawnPineTrees() {
    const TREE_TOTAL = isMobile ? 76 : 112;
    treePositions.length = 0;
    const pineSpecs = [];
    let cnt = 0, tr = 0;
    while (cnt < TREE_TOTAL && tr < TREE_TOTAL * 12) {
      tr++;
      const x = cnt < 34 ? (-82 - Math.random() * 130) : (Math.random() - 0.5) * (WORLD_SIZE - 26);
      const z = cnt < 34 ? ((Math.random() - 0.5) * 235) : (Math.random() - 0.5) * (WORLD_SIZE - 26);
      if (!isClearGround(x, z)) continue;

      let tooClose = false;
      for (let k = Math.max(0, treePositions.length - 40); k < treePositions.length; k++) {
        if (Math.hypot(x - treePositions[k].x, z - treePositions[k].z) < 5.8) { tooClose = true; break; }
      }
      if (tooClose) continue;

      const s = 0.78 + Math.random() * 0.48;
      const sy = s * (0.90 + Math.random() * 0.30);
      const rotY = Math.random() * Math.PI * 2;
      treePositions.push({ x, z });
      pineSpecs.push({ x, z, s, sy, rotY });
      cnt++;
    }
    updateTreeColliderPool();

    loadModel('pine_tree_low-poly.glb').then((rawPine) => {
      if (!rawPine) {
        spawnFallbackTreesAndBushes();
        return;
      }

      // Нормализуем шаблон ёлки 1 раз (высота ~9.2м, центр по X/Z, основание строго на y = 0)
      const pineTemplate = new THREE.Group();
      pineTemplate.add(rawPine);
      rawPine.updateMatrixWorld(true);
      const rawBox = new THREE.Box3().setFromObject(rawPine);
      const rawSize = new THREE.Vector3();
      rawBox.getSize(rawSize);
      const normScale = 9.2 / Math.max(0.01, rawSize.y);
      rawPine.scale.multiplyScalar(normScale);

      pineTemplate.updateMatrixWorld(true);
      const scaledBox = new THREE.Box3().setFromObject(pineTemplate);
      const center = new THREE.Vector3();
      scaledBox.getCenter(center);
      rawPine.position.x -= center.x;
      rawPine.position.z -= center.z;
      rawPine.position.y -= scaledBox.min.y;
      rawPine.traverse((obj) => {
        if (obj.isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = false;
        }
      });

      const pineGroup = new THREE.Group();
      pineGroup.name = 'pine_trees_group';
      for (const sp of pineSpecs) {
        const clone = pineTemplate.clone(true);
        clone.position.set(sp.x, 0, sp.z);
        clone.rotation.y = sp.rotY;
        clone.scale.set(sp.s, sp.sy, sp.s);
        pineGroup.add(clone);
      }
      scene.add(pineGroup);
    });
  })();

  // 3b) ~150 пучков 3D-травы (grass_medium_01_1k.gltf) — без теней для 60 FPS на Android
  loadPlantVariants('grass_medium_01_1k.gltf', 'height').then((variants) => {
    if (!variants) {
      spawnFallbackGrass();
      return;
    }
    const transforms = [];
    const targetCount = 150;
    for (let i = 0; i < targetCount; i++) {
      const pt = sampleMeadowPoint(true);
      if (!pt) continue;
      const h = 0.45 + Math.random() * 0.42;
      const w = h * (0.85 + Math.random() * 0.35);
      transforms.push({
        x: pt.x,
        y: 0,
        z: pt.z,
        rotY: Math.random() * Math.PI * 2,
        tiltX: (Math.random() - 0.5) * 0.12,
        tiltZ: (Math.random() - 0.5) * 0.12,
        sx: w,
        sy: h,
        sz: w,
      });
    }
    buildInstancedPlantGroup(variants, transforms, { castShadow: false, receiveShadow: false });
  });

  // 3c) ~100 полевых цветов (flower_empodium_1k.gltf) — без теней
  loadPlantVariants('flower_empodium_1k.gltf', 'height').then((variants) => {
    if (!variants) {
      spawnFallbackFlowers();
      return;
    }
    const transforms = [];
    const targetCount = 100;
    for (let i = 0; i < targetCount; i++) {
      const pt = sampleMeadowPoint(true);
      if (!pt) continue;
      const h = 0.38 + Math.random() * 0.32;
      const w = h * (0.9 + Math.random() * 0.25);
      transforms.push({
        x: pt.x,
        y: 0,
        z: pt.z,
        rotY: Math.random() * Math.PI * 2,
        tiltX: (Math.random() - 0.5) * 0.10,
        tiltZ: (Math.random() - 0.5) * 0.10,
        sx: w,
        sy: h,
        sz: w,
      });
    }
    buildInstancedPlantGroup(variants, transforms, { castShadow: false, receiveShadow: false });
  });

  // 3d) ~25 сухих веток и коряг (dry_branches_medium_01_1k.gltf) в лесу и у озера — без теней
  loadPlantVariants('dry_branches_medium_01_1k.gltf', 'maxHoriz').then((variants) => {
    if (!variants) return;
    const transforms = [];
    const targetCount = 25;
    for (let i = 0; i < targetCount; i++) {
      let x = 0, z = 0, ok = false;
      for (let attempt = 0; attempt < 35; attempt++) {
        if (i < 15) {
          x = -78 - Math.random() * 137;
          z = (Math.random() - 0.5) * 290;
          if (!isClearGround(x, z)) continue;
        } else {
          const ang = Math.random() * Math.PI * 2;
          const rad = 34 + Math.random() * 34;
          x = Math.cos(ang) * rad;
          z = 156 + Math.sin(ang) * rad;
          if (Math.abs(x) < 6.5 && z < 146) continue;
          if (Math.abs(x) > HALF_WORLD - 12 || Math.abs(z) > HALF_WORLD - 12) continue;
        }
        ok = true;
        break;
      }
      if (!ok) continue;
      const len = 1.45 + Math.random() * 1.45;
      transforms.push({
        x,
        y: -0.02,
        z,
        rotY: Math.random() * Math.PI * 2,
        tiltX: (Math.random() - 0.5) * 0.14,
        tiltZ: (Math.random() - 0.5) * 0.14,
        sx: len,
        sy: len * (0.85 + Math.random() * 0.3),
        sz: len,
      });
    }
    buildInstancedPlantGroup(variants, transforms, { castShadow: false, receiveShadow: false });
  });
}

// ----------------------------------------------------------------------------
// 2. РАЗРУШАЕМЫЕ ОБЪЕКТЫ (ЗАБОРЫ, СКАМЕЙКИ, ФОНАРИ, ПОЧТОВЫЕ ЯЩИКИ)
// ----------------------------------------------------------------------------
const breakables = [];
const debrisList = [];

function spawnDebrisPiece(mesh, pos, quat, mass, impulse, angVel) {
  mesh.position.copy(pos);
  mesh.quaternion.copy(quat);
  mesh.castShadow = true; mesh.receiveShadow = true;
  scene.add(mesh);

  const box = new THREE.Box3().setFromObject(mesh);
  const sz = new THREE.Vector3();
  box.getSize(sz);
  const body = new CANNON.Body({
    mass,
    material: matProp,
    linearDamping: 0.14,
    angularDamping: 0.18,
    position: new CANNON.Vec3(pos.x, pos.y, pos.z),
    quaternion: new CANNON.Quaternion(quat.x, quat.y, quat.z, quat.w),
  });
  body.addShape(new CANNON.Box(new CANNON.Vec3(Math.max(0.08, sz.x * 0.45), Math.max(0.08, sz.y * 0.45), Math.max(0.08, sz.z * 0.45))));
  body.velocity.set(impulse.x, impulse.y, impulse.z);
  body.angularVelocity.set(angVel.x, angVel.y, angVel.z);
  world.addBody(body);

  debrisList.push({ mesh, body, life: 6.5 });
}

function shatterBreakable(brk, hitDir, speed = 10, awardPoints = true) {
  if (brk.broken) return;
  brk.broken = true;
  world.removeBody(brk.sensorBody);
  scene.remove(brk.group);

  const pos = brk.pos;
  const dir = new THREE.Vector3(hitDir.x || 0, 0, hitDir.z || 1);
  if (dir.lengthSq() < 0.001) dir.set(Math.random() - 0.5, 0, Math.random() - 0.5);
  dir.normalize();
  const power = Math.max(7, Math.min(18, speed * 0.95));

  if (brk.kind === 'fence') {
    sfx.woodBreak(); spawnBurst(pos, 0xb87a42, 10, 7, 1.0, true);
    if (awardPoints) addTrick('Забор в щепки!', 120, pos, '#ffcf66');
  } else if (brk.kind === 'bench') {
    sfx.woodBreak(); spawnBurst(pos, 0xc48246, 10, 8, 1.0, true);
    if (awardPoints) addTrick('Скамейка-катапульта!', 140, pos, '#ffcf66');
  } else if (brk.kind === 'lamp') {
    sfx.spark(); spawnBurst(pos, 0xfff059, 14, 10, 0.9, false); spawnBurst(pos, 0x70e5ff, 8, 8, 0.7, false);
    if (awardPoints) addTrick('Искра-фонарь!', 160, pos, '#fff059');
  } else if (brk.kind === 'mailbox') {
    sfx.woodBreak(); spawnBurst(pos, 0xffffff, 12, 8, 1.1, true);
    if (awardPoints) addTrick('Почта улетела!', 150, pos, '#ff8cc8');
  }

  brk.group.updateMatrixWorld(true);
  const children = [...brk.group.children];
  children.forEach((child, idx) => {
    const wp = new THREE.Vector3(), wq = new THREE.Quaternion();
    child.getWorldPosition(wp); child.getWorldQuaternion(wq);
    brk.group.remove(child);
    const spread = (idx - children.length / 2) * 1.4;
    spawnDebrisPiece(
      child, wp, wq, 3.5,
      new THREE.Vector3(dir.x * power + (-dir.z) * spread + (Math.random() - 0.5) * 3, 4.5 + Math.random() * 5.5, dir.z * power + dir.x * spread + (Math.random() - 0.5) * 3),
      new THREE.Vector3((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14)
    );
  });
}

function clearAndSpawnBreakables() {
  for (const b of breakables) {
    if (!b.broken) { scene.remove(b.group); world.removeBody(b.sensorBody); }
  }
  breakables.length = 0;
  for (const d of debrisList) { scene.remove(d.mesh); world.removeBody(d.body); }
  debrisList.length = 0;

  const pbrMats = getWorldPBRMaterials();
  const woodMat = pbrMats.planksFencePost;
  const plankMat = pbrMats.planksFenceRail;
  const ironMat = stdMat(0x2d3138, 0.45, 0.65), glowMat = new THREE.MeshBasicMaterial({ color: 0xfff3a8 });
  const redBoxMat = stdMat(0xd9362b, 0.45, 0.25);

  function registerBreakable(kind, group, x, y, z, yaw, halfExtents) {
    group.position.set(x, 0, z); group.rotation.y = yaw;
    group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(group);

    const sensorBody = new CANNON.Body({ mass: 0, material: matWorld, position: new CANNON.Vec3(x, y, z) });
    sensorBody.quaternion.setFromEuler(0, yaw, 0);
    sensorBody.addShape(new CANNON.Box(halfExtents));

    const brk = { kind, group, sensorBody, pos: new THREE.Vector3(x, y, z), broken: false };
    sensorBody.userData = { breakable: brk };

    sensorBody.addEventListener('collide', (e) => {
      if (brk.broken) return;
      const other = e.body;
      const spd = other.velocity ? other.velocity.length() : 0;
      const isPlayerDirectly = (other === playerBody) || (other === tractor.body && inTractor);
      const isByPlayer = isBodyByPlayer(other) && spd > 2.2;
      if (isPlayerDirectly || isByPlayer) {
        const hitDir = other.velocity && spd > 0.5 ? other.velocity : brk.pos.clone().sub(other.position);
        shatterBreakable(brk, hitDir, Math.max(8, spd), true);
      }
    });
    world.addBody(sensorBody);
    breakables.push(brk);
  }

  function spawnFenceSection(x, z, yaw) {
    const g = new THREE.Group();
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.35, 0.22), woodMat); p1.position.set(-1.35, 0.675, 0);
    const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.35, 0.22), woodMat); p2.position.set( 1.35, 0.675, 0);
    const rt = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.20, 0.12), plankMat); rt.position.set(0, 1.05, 0);
    const rb = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.20, 0.12), plankMat); rb.position.set(0, 0.52, 0);
    g.add(p1, p2, rt, rb);
    registerBreakable('fence', g, x, 0.7, z, yaw, new CANNON.Vec3(1.55, 0.7, 0.22));
  }

  function spawnBench(x, z, yaw) {
    const g = new THREE.Group();
    const l1 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.55, 0.62), ironMat); l1.position.set(-0.95, 0.275, 0);
    const l2 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.55, 0.62), ironMat); l2.position.set( 0.95, 0.275, 0);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.12, 0.64), plankMat); seat.position.set(0, 0.56, 0.02);
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.52, 0.12), plankMat); back.position.set(0, 0.88, -0.26); back.rotation.x = -0.18;
    g.add(l1, l2, seat, back);
    registerBreakable('bench', g, x, 0.55, z, yaw, new CANNON.Vec3(1.15, 0.55, 0.36));
  }

  function spawnLamp(x, z) {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 0.45, 8), ironMat); base.position.y = 0.225;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 3.6, 8), ironMat); pole.position.y = 2.0;
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.20, 0.52, 6), glowMat); head.position.y = 3.95;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.28, 6), ironMat); cap.position.y = 4.32;
    g.add(base, pole, head, cap);
    registerBreakable('lamp', g, x, 2.0, z, 0, new CANNON.Vec3(0.28, 2.0, 0.28));
  }

  function spawnMailbox(x, z, yaw) {
    const g = new THREE.Group();
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.15, 0.16), woodMat); post.position.y = 0.575;
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.38, 0.68), redBoxMat); box.position.set(0, 1.28, 0);
    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.28, 0.12), stdMat(0xffe042, 0.4)); flag.position.set(0.23, 1.38, 0.1);
    g.add(post, box, flag);
    registerBreakable('mailbox', g, x, 0.75, z, yaw, new CANNON.Vec3(0.32, 0.75, 0.38));
  }

  // Заборы (Центр + Ферма + Пляж)
  [
    [-21, -13, 0], [-24.2, -13, 0], [21, -13, 0], [24.2, -13, 0],
    [-21,  14, 0], [-24.2,  14, 0], [21,  14, 0], [24.2,  14, 0],
    [-22, -136, 0], [-25.2, -136, 0], [22, -136, 0], [25.2, -136, 0],
    [-24, 114, 0], [-27.2, 114, 0],
  ].forEach(([x, z, y]) => spawnFenceSection(x, z, y));

  // Скамейки (Площадь + Пляж + Скейт-парк)
  [
    [-14.5, -11.5, 0.75], [14.5, 11.5, -2.35], [-14.5, 11.5, 2.35], [15.5, -11.5, -0.75],
    [-16, 126, 0.4], [16, 126, -0.4], [-118, -14, Math.PI / 2], [-118, 14, Math.PI / 2],
  ].forEach(([x, z, y]) => spawnBench(x, z, y));

  // Фонари вдоль всех 4 магистралей и на площади
  [
    [-13.5, -13.5], [13.5, 13.5], [-13.5, 13.5], [16.5, -8.5],
    [-6, -45], [6, -45], [-6, -90], [6, -90],
    [-6,  45], [6,  45], [-6,  90], [6,  90],
    [-45, -6], [-45, 6], [-90, -6], [-90, 6],
    [ 45, -6], [ 45, 6], [ 90, -6], [ 90, 6],
  ].forEach(([x, z]) => spawnLamp(x, z));

  // Почтовые ящики
  [
    [20.5, -19.5, -0.35], [-22.5, 19.5, 2.85], [22.5, 20.0, -2.80],
    [-40.5, -12.0, 1.57], [40.5, 14.0, -1.57], [-10, -142, 0.22], [-25, 118, 0.65],
  ].forEach(([x, z, y]) => spawnMailbox(x, z, y));
}

// ----------------------------------------------------------------------------
// 3. 10 ЗОЛОТЫХ ЖЕЛУДЕЙ ПО ВСЕМ 5 ЗОНАМ МИРА 500x500
// ----------------------------------------------------------------------------
const goldenAcorns = [];
let acornsCollected = 0;
let goldenSkinUnlocked = false;
const acornHudVal  = document.getElementById('acorn-val');
const acornHudPill = document.getElementById('acorn-pill');

function spawnGoldenAcorns() {
  const nutMat  = new THREE.MeshStandardMaterial({ color: 0xffd633, roughness: 0.18, metalness: 0.88, emissive: 0x4d3200 });
  const capMat  = new THREE.MeshStandardMaterial({ color: 0xb87614, roughness: 0.32, metalness: 0.75 });
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffe866, transparent: true, opacity: 0.45, side: THREE.DoubleSide });

  const acornLocations = [
    { x: -18.0, y: 10.4, z:  -18.0 }, // 1. Центр: вершина вышки
    { x:  10.5, y:  6.8, z:    6.5 }, // 2. Центр: над батутом площади
    { x:   0.0, y:  1.4, z: -124.0 }, // 3. Север: центр лабиринта из сена
    { x: -16.0, y: 11.2, z: -152.0 }, // 4. Север: крыша большого фермерского амбара
    { x: 148.0, y:  9.8, z:  -14.0 }, // 5. Восток: верхний ярус строительных лесов
    { x: 156.0, y:  9.5, z:   14.0 }, // 6. Восток: в полёте за мега-трамплином стройки
    { x:   0.0, y:  6.5, z:  160.0 }, // 7. Юг: над плавучим батутом посреди озера
    { x: -30.0, y:  8.0, z:  124.0 }, // 8. Юг: крыша пляжного домика
    { x: -144.0, y: 11.0, z:   0.0 }, // 9. Запад: высоко над центром свинской полутрубы
    { x: -168.0, y:  1.4, z: -55.0 }, // 10. Запад: в густом холмистом лесу
  ];

  acornLocations.forEach((loc, idx) => {
    const g = new THREE.Group();
    g.position.set(loc.x, loc.y, loc.z);

    const nut = new THREE.Mesh(new THREE.SphereGeometry(0.45, 14, 12), nutMat);
    nut.scale.set(0.88, 1.25, 0.88);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.25, 10), nutMat);
    tip.rotation.x = Math.PI; tip.position.y = -0.56;
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.48, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.48), capMat);
    cap.scale.set(0.95, 0.65, 0.95); cap.position.y = 0.23;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.25, 8), capMat);
    stem.position.y = 0.58;
    const halo = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.82, 20), ringMat);
    halo.rotation.x = Math.PI / 2; halo.position.y = -0.35;

    g.add(nut, tip, cap, stem, halo);
    scene.add(g);
    const acObj = { id: idx, group: g, halo, baseY: loc.y, collected: false };
    goldenAcorns.push(acObj);
    if (idx === 3 || idx === 7) {
      roofHeightHooks.set(idx, (newY) => {
        acObj.baseY = newY;
        acObj.group.position.y = newY;
      });
    }
  });
}

function updateGoldenAcorns(dt) {
  const pPos = inTractor ? tractor.body.position : playerBody.position;
  for (const ac of goldenAcorns) {
    if (ac.collected) continue;
    ac.group.rotation.y += dt * 2.2;
    ac.group.position.y = ac.baseY + Math.sin(elapsedTime * 3.0 + ac.id) * 0.24;
    ac.halo.rotation.z -= dt * 1.8;

    const dist = Math.hypot(pPos.x - ac.group.position.x, (pPos.y + 0.4) - ac.group.position.y, pPos.z - ac.group.position.z);
    if (dist < (inTractor ? 2.8 : 1.85)) {
      ac.collected = true;
      ac.group.visible = false;
      acornsCollected++;
      acornHudVal.textContent = `${acornsCollected}/10`;
      acornHudPill.classList.add('bump');
      setTimeout(() => acornHudPill.classList.remove('bump'), 200);

      sfx.acornGet();
      spawnBurst(ac.group.position, 0xffe44a, 16, 10, 1.2);
      addTrick(`Золотой жёлудь (${acornsCollected}/10)!`, 500, ac.group.position, '#ffe44a');

      if (acornsCollected >= 10 && !goldenSkinUnlocked) {
        goldenSkinUnlocked = true;
        acornHudPill.classList.add('unlocked');
        setTimeout(() => {
          sfx.bank();
          spawnBurst(pPos, 0xffd700, 26, 13, 1.4);
          addTrick('Все 10 золотых желудей!', 2500, pPos, '#ffd970');
        }, 350);
      }
    }
  }
}

// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// КЭШИРУЮЩИЙ ЗАГРУЗЧИК 14 НОВЫХ 3D-МОДЕЛЕЙ ПРОПСОВ (./models/*.gltf + ./models/textures/)
// ----------------------------------------------------------------------------
const gltfPropTemplateCache = new Map(); // cacheKey -> Promise<{ template, size } | null>

function loadNormalizedGltfTemplate(filename, targetSize = 1.0, scaleMode = 'height', groundAligned = true, autoHorizontalCar = false) {
  const cacheKey = `${filename}|${targetSize}|${scaleMode}|${groundAligned}|${autoHorizontalCar}`;
  if (!gltfPropTemplateCache.has(cacheKey)) {
    const promise = new Promise((resolve) => {
      envGltfLoader.load(
        `${MODEL_DIR}${filename}`,
        (gltf) => {
          const raw = gltf.scene || (gltf.scenes && gltf.scenes[0]);
          if (!raw) {
            resolve(null);
            return;
          }

          const wrapper = new THREE.Group();
          const orient = new THREE.Group();
          orient.add(raw);
          wrapper.add(orient);
          wrapper.updateMatrixWorld(true);

          const rawBox = new THREE.Box3().setFromObject(orient);
          if (rawBox.isEmpty()) {
            resolve(null);
            return;
          }
          const rawSize = new THREE.Vector3();
          rawBox.getSize(rawSize);

          if (autoHorizontalCar) {
            if (rawSize.y > Math.max(rawSize.x, rawSize.z) * 1.05) {
              orient.rotation.x = -Math.PI / 2;
              orient.updateMatrixWorld(true);
            }
            const hBox = new THREE.Box3().setFromObject(orient);
            const hSize = new THREE.Vector3();
            hBox.getSize(hSize);
            if (hSize.x > hSize.z * 1.12) {
              orient.rotation.y += Math.PI / 2;
              orient.updateMatrixWorld(true);
            }
          }

          const orientedBox = new THREE.Box3().setFromObject(orient);
          const orientedSize = new THREE.Vector3();
          orientedBox.getSize(orientedSize);

          const denom = scaleMode === 'maxHoriz'
            ? Math.max(0.01, orientedSize.x, orientedSize.z)
            : Math.max(0.01, orientedSize.y);
          const s = targetSize / denom;
          orient.scale.multiplyScalar(s);

          wrapper.updateMatrixWorld(true);
          const scaledBox = new THREE.Box3().setFromObject(wrapper);
          const center = new THREE.Vector3();
          const finalSize = new THREE.Vector3();
          scaledBox.getCenter(center);
          scaledBox.getSize(finalSize);

          orient.position.x -= center.x;
          orient.position.z -= center.z;
          orient.position.y -= groundAligned ? scaledBox.min.y : center.y;

          const isBush = /bush/i.test(filename);
          wrapper.traverse((obj) => {
            if (!obj.isMesh) return;
            obj.castShadow = isBush ? !isMobile : true;
            obj.receiveShadow = !isBush;
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            for (const m of mats) {
              if (!m) continue;
              if (m.map) setSRGBTex(m.map);
              if (isBush) {
                m.side = THREE.DoubleSide;
                if (m.transparent || m.alphaMap) {
                  m.alphaTest = 0.35;
                  m.transparent = false;
                  m.depthWrite = true;
                }
              }
              if ('envMapIntensity' in m) m.envMapIntensity = 1.15;
              m.needsUpdate = true;
            }
          });

          resolve({ template: wrapper, size: finalSize });
        },
        undefined,
        (err) => {
          console.warn(`Не удалось загрузить 3D-пропс ${MODEL_DIR}${filename}:`, err);
          checkLocalGlbProtocolHint();
          resolve(null);
        }
      );
    });
    gltfPropTemplateCache.set(cacheKey, promise);
  }
  return gltfPropTemplateCache.get(cacheKey);
}

// Расставляет тяжёлые/статичные объекты на обочинах и полянах (валуны, кусты, машины под тентом, складские роллеты)
function spawnStaticWorldModels() {
  // 1. Тяжёлые валуны (namaqualand_boulder_05_1k.gltf) на обочинах дорог, у озера и на лесных полянах
  const BOULDER_SPOTS = [
    { x: -16.5, z:  28.0, size: 3.1, yaw: 0.4 },
    { x:  19.0, z:  34.0, size: 2.8, yaw: 1.9 },
    { x: -34.0, z: -26.0, size: 3.6, yaw: 2.7 },
    { x:  38.0, z: -38.0, size: 3.3, yaw: 0.9 },
    { x: -12.0, z: -78.0, size: 3.2, yaw: 1.3 },
    { x:  14.0, z: -96.0, size: 3.9, yaw: 3.8 },
    { x: -24.0, z:-122.0, size: 3.4, yaw: 5.1 },
    { x:  62.0, z:  14.0, size: 3.5, yaw: 2.2 },
    { x:  98.0, z: -16.0, size: 4.1, yaw: 0.6 },
    { x: -62.0, z:  16.0, size: 3.7, yaw: 4.4 },
    { x: -96.0, z: -18.0, size: 4.3, yaw: 1.7 },
    { x: -34.0, z: 148.0, size: 3.8, yaw: 2.5 },
    { x:  36.0, z: 150.0, size: 3.4, yaw: 0.2 },
    { x:  18.0, z:  88.0, size: 3.0, yaw: 3.1 },
  ];
  for (const b of BOULDER_SPOTS) noTreeZones.push({ x: b.x, z: b.z, r: b.size * 0.95 });

  loadNormalizedGltfTemplate('namaqualand_boulder_05_1k.gltf', 1.0, 'maxHoriz', true).then((tpl) => {
    if (!tpl) return;
    const grp = new THREE.Group();
    grp.name = 'static_boulders';
    for (const sp of BOULDER_SPOTS) {
      const clone = tpl.template.clone(true);
      clone.position.set(sp.x, -0.08, sp.z);
      clone.rotation.y = sp.yaw;
      clone.scale.setScalar(sp.size);
      grp.add(clone);

      const hx = Math.max(0.5, (tpl.size.x * sp.size) * 0.44);
      const hy = Math.max(0.45, (tpl.size.y * sp.size) * 0.46);
      const hz = Math.max(0.5, (tpl.size.z * sp.size) * 0.44);
      const body = new CANNON.Body({
        mass: 0,
        material: matWorld,
        position: new CANNON.Vec3(sp.x, hy - 0.05, sp.z),
      });
      body.quaternion.setFromEuler(0, sp.yaw, 0);
      body.addShape(new CANNON.Box(new CANNON.Vec3(hx, hy, hz)));
      world.addBody(body);
    }
    scene.add(grp);
  });

  // 2. Кусты (wild_rooibos_bush_1k.gltf) на обочинах, полянах и у заборов через clone()
  const BUSH_SPOTS = [
    [-19, -8, 1.35], [19, -11, 1.45], [-19, 17, 1.30], [18, 19, 1.50],
    [-33, 14, 1.60], [34, -15, 1.55], [-11, -30, 1.35], [11, -44, 1.45],
    [-10, -56, 1.50], [10, -74, 1.40], [-11, -108, 1.55], [24, -134, 1.65],
    [-10, 32, 1.40], [11, 48, 1.50], [-11, 68, 1.45], [12, 92, 1.60],
    [-22, 118, 1.50], [22, 118, 1.45], [28, -11, 1.35], [52, 11, 1.55],
    [82, -11, 1.50], [108, 12, 1.45], [-28, 11, 1.40], [-54, -11, 1.60],
    [-86, 12, 1.70], [-108, -14, 1.55], [-128, 28, 1.65], [38, 134, 1.50],
  ];
  loadNormalizedGltfTemplate('wild_rooibos_bush_1k.gltf', 1.0, 'height', true).then((tpl) => {
    if (!tpl) return;
    const grp = new THREE.Group();
    grp.name = 'static_rooibos_bushes';
    BUSH_SPOTS.forEach(([bx, bz, bh], idx) => {
      const clone = tpl.template.clone(true);
      clone.position.set(bx, -0.02, bz);
      clone.rotation.y = (idx * 1.618) % (Math.PI * 2);
      const wScale = bh * (0.92 + (idx % 3) * 0.08);
      clone.scale.set(wScale, bh, wScale);
      grp.add(clone);
    });
    scene.add(grp);
  });

  // 3. Тяжёлые статичные машины под тентом (covered_car_1k.gltf) на обочинах и полянах у домов
  const COVERED_CAR_SPOTS = [
    { x:  34.5, z: -15.5, yaw:  0.20 }, // Центральная деревня — у дома на северо-востоке
    { x: -35.5, z:  16.5, yaw: -0.45 }, // Центральная деревня — у дома на юго-западе
    { x: -24.0, z:-144.0, yaw:  0.30 }, // Большая ферма — рядом с амбаром
    { x: 154.0, z: -26.0, yaw: -1.45 }, // Стройплощадка — на обочине у бытовки
    { x: -24.0, z: 118.0, yaw:  0.65 }, // Пляж — у домика на берегу
    { x:-152.0, z: -24.0, yaw:  1.10 }, // Западный лес — на опушке у домика
  ];
  for (const c of COVERED_CAR_SPOTS) noTreeZones.push({ x: c.x, z: c.z, r: 5.5 });

  loadNormalizedGltfTemplate('covered_car_1k.gltf', 4.8, 'maxHoriz', true, true).then((tpl) => {
    if (!tpl) return;
    const grp = new THREE.Group();
    grp.name = 'static_covered_cars';
    for (const sp of COVERED_CAR_SPOTS) {
      const clone = tpl.template.clone(true);
      clone.position.set(sp.x, 0, sp.z);
      clone.rotation.y = sp.yaw;
      grp.add(clone);

      const hx = Math.max(0.75, tpl.size.x * 0.48);
      const hy = Math.max(0.65, tpl.size.y * 0.50);
      const hz = Math.max(1.20, tpl.size.z * 0.48);
      const body = new CANNON.Body({
        mass: 0,
        material: matWorld,
        position: new CANNON.Vec3(sp.x, hy, sp.z),
      });
      body.quaternion.setFromEuler(0, sp.yaw, 0);
      body.addShape(new CANNON.Box(new CANNON.Vec3(hx, hy, hz)));
      world.addBody(body);
    }
    scene.add(grp);
  });

  // 4. Отдельные роллеты на стойке у стройплощадки (rollershutter_window_03_1k.gltf)
  loadNormalizedGltfTemplate('rollershutter_window_03_1k.gltf', 2.4, 'maxHoriz', true).then((tpl) => {
    if (!tpl) return;
    const spots = [
      { x: 158.0, z: -18.5, yaw: -1.57 },
      { x: -10.5, z:-145.5, yaw:  0.22 },
    ];
    for (const sp of spots) {
      const clone = tpl.template.clone(true);
      clone.position.set(sp.x, 0, sp.z);
      clone.rotation.y = sp.yaw;
      scene.add(clone);
    }
  });
}

// 4. ФИЗИЧЕСКИЕ ЯЩИКИ, ВЗРЫВНЫЕ БОЧКИ И ТЮКИ СЕНА (С ОПТИМИЗАЦИЕЙ СНА > 75м)
// ----------------------------------------------------------------------------
const dynamicProps = [];
let propSpawnEpoch = 0;

// Конфигурация динамических 3D-пропсов из ./models/*.gltf (обычные + взрывоопасные)
const GLTF_DYNAMIC_PROP_SPECS = {
  explosive_barrel: {
    file: 'Barrel_01_1k.gltf',
    targetSize: 1.22,
    scaleMode: 'height',
    mass: 13,
    name: 'Взрывная бочка',
    points: 300,
    explosive: true,
    burstColor: 0xff5a1f,
  },
  propane_tank: {
    file: 'propane_tank_1k.gltf',
    targetSize: 1.08,
    scaleMode: 'height',
    mass: 11,
    name: 'Газовый баллон',
    points: 350,
    explosive: true,
    burstColor: 0xff7a29,
  },
  barrel_normal: {
    file: 'Barrel_03_1k.gltf',
    targetSize: 1.18,
    scaleMode: 'height',
    mass: 14,
    name: 'Бочка',
    points: 140,
    explosive: false,
    burstColor: 0x9aa4b0,
  },
  cardboard_box: {
    file: 'cardboard_box_01_1k.gltf',
    targetSize: 0.78,
    scaleMode: 'height',
    mass: 5,
    name: 'Коробка',
    points: 110,
    explosive: false,
    burstColor: 0xd4a46a,
  },
  trashbag: {
    file: 'trashbag_1k.gltf',
    targetSize: 0.78,
    scaleMode: 'height',
    mass: 4.5,
    name: 'Мусорный мешок',
    points: 100,
    explosive: false,
    burstColor: 0x454a52,
  },
  cement_bag: {
    file: 'cement_bag_1k.gltf',
    targetSize: 0.92,
    scaleMode: 'maxHoriz',
    mass: 12,
    name: 'Мешок цемента',
    points: 130,
    explosive: false,
    burstColor: 0xc8c4b8,
  },
  trash_can: {
    file: 'metal_trash_can_1k.gltf',
    targetSize: 0.96,
    scaleMode: 'height',
    mass: 8,
    name: 'Металлическая урна',
    points: 135,
    explosive: false,
    burstColor: 0xaeb5bd,
  },
  old_tyre: {
    file: 'old_tyre_1k.gltf',
    targetSize: 0.86,
    scaleMode: 'maxHoriz',
    mass: 9,
    name: 'Покрышка',
    points: 125,
    explosive: false,
    burstColor: 0x2c2e33,
  },
  wheel_rim: {
    file: 'rusted_wheel_rim_02_1k.gltf',
    targetSize: 0.64,
    scaleMode: 'maxHoriz',
    mass: 10,
    name: 'Колёсный диск',
    points: 145,
    explosive: false,
    burstColor: 0x9e6340,
  },
  metal_rack: {
    file: 'worn_metal_rack_1k.gltf',
    targetSize: 1.92,
    scaleMode: 'height',
    mass: 18,
    name: 'Металлический стеллаж',
    points: 175,
    explosive: false,
    burstColor: 0x8d959e,
  },
};

function clearAndSpawnProps() {
  propSpawnEpoch++;
  const myEpoch = propSpawnEpoch;
  if (grabbedObj && grabbedObj.kind !== 'npc' && grabbedObj.kind !== 'vehicle') releaseGrabbed(false);
  for (const p of dynamicProps) { scene.remove(p.mesh); world.removeBody(p.body); }
  dynamicProps.length = 0;

  const crateMat  = new THREE.MeshStandardMaterial({ map: texCrate, roughness: 0.78 });
  const hayMat    = stdMat(0xe5bd53, 0.92);

  function bindPropCollisions(propObj) {
    const body = propObj.body;
    body.userData = { propObj };
    body.addEventListener('collide', (e) => {
      const other = e.body;
      const impact = Math.abs(e.contact.getImpactVelocityAlongNormal());
      if (other === playerBody && !inTractor) {
        markByPlayer(body, 3.2);
        const pSpd = playerBody.velocity.length();
        // Пинаем мелкие предметы при разбеге с начислением очков!
        if (pSpd > 1.8 && !propObj.explosive && propObj.hitCooldown <= 0) {
          propObj.hitCooldown = 0.85;
          const dir = body.position.vsub(playerBody.position);
          dir.y = 0;
          if (dir.lengthSquared() > 0.001) dir.normalize();
          body.wakeUp();
          const kickPower = Math.min(130, pSpd * (isRagdoll ? 14 : 11));
          body.applyImpulse(new CANNON.Vec3(dir.x * kickPower, 28 + pSpd * 3.5, dir.z * kickPower));
          sfx.crate();
          spawnBurst(body.position, propObj.burstColor || 0xd49b50, 5, 5, 0.85);
          addTrick(`Пнул: ${propObj.name}!`, propObj.points || 120, body.position, '#ffd970');
        }
        // Сильный набег/рэгдолл в взрывоопасную бочку или газовый баллон -> взрыв!
        if (propObj.explosive && !propObj.exploded && (impact > 8.5 || (isRagdoll && pSpd > 5.2))) {
          explodeBarrel(propObj);
        }
      } else if (other === tractor.body && inTractor) {
        markByPlayer(body, 3.5);
        if (propObj.explosive && !propObj.exploded && impact > 5.0) {
          explodeBarrel(propObj);
        }
      } else if (isBodyByPlayer(other) && impact > 2.2) {
        markByPlayer(body, 3.0);
        if (propObj.explosive && !propObj.exploded && impact > 9.0) {
          explodeBarrel(propObj);
        }
      } else if (propObj.explosive && !propObj.exploded && impact > 11.5) {
        explodeBarrel(propObj);
      }
    });
  }

  function spawnProp(kind, x, y, z) {
    let mesh, body;
    if (kind === 'crate') {
      const s = 1.24;
      mesh = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), crateMat);
      body = new CANNON.Body({ mass: 10, material: matProp, linearDamping: 0.1, angularDamping: 0.15 });
      body.addShape(new CANNON.Box(new CANNON.Vec3(s / 2, s / 2, s / 2)));
    } else {
      mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 1.35, 12), hayMat);
      mesh.rotation.z = Math.PI / 2;
      const g = new THREE.Group(); g.add(mesh); mesh = g;
      body = new CANNON.Body({ mass: 8, material: matProp, linearDamping: 0.14, angularDamping: 0.18 });
      body.addShape(new CANNON.Box(new CANNON.Vec3(0.68, 0.65, 0.65)));
    }

    mesh.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    body.position.set(x, y, z);
    body.sleepSpeedLimit = 0.25;
    body.sleepTimeLimit = 1.0;

    const propObj = {
      kind,
      name: kind === 'crate' ? 'Ящик' : 'Тюк сена',
      points: 120,
      explosive: false,
      burstColor: 0xd49b50,
      mesh,
      body,
      hitCooldown: 0,
      exploded: false,
    };
    bindPropCollisions(propObj);
    scene.add(mesh);
    world.addBody(body);
    dynamicProps.push(propObj);
  }

  // Спавн клонированного динамического .gltf предмета с точным коллайдером по его Box3
  function spawnGltfDynamicProp(typeKey, x, z, yaw = 0, yExtra = 0) {
    const spec = GLTF_DYNAMIC_PROP_SPECS[typeKey];
    if (!spec) return;
    loadNormalizedGltfTemplate(spec.file, spec.targetSize, spec.scaleMode, false).then((tpl) => {
      if (!tpl || myEpoch !== propSpawnEpoch) return;

      const mesh = tpl.template.clone(true);
      const hx = Math.max(0.18, tpl.size.x * 0.5);
      const hy = Math.max(0.16, tpl.size.y * 0.5);
      const hz = Math.max(0.18, tpl.size.z * 0.5);

      const body = new CANNON.Body({
        mass: spec.mass,
        material: matProp,
        linearDamping: 0.12,
        angularDamping: 0.16,
        position: new CANNON.Vec3(x, hy + 0.04 + yExtra, z),
      });
      body.quaternion.setFromEuler(0, yaw, 0);
      body.addShape(new CANNON.Box(new CANNON.Vec3(hx, hy, hz)));
      body.sleepSpeedLimit = 0.24;
      body.sleepTimeLimit = 1.0;

      mesh.position.copy(body.position);
      mesh.quaternion.copy(body.quaternion);

      const propObj = {
        kind: spec.explosive ? 'barrel' : typeKey,
        propType: typeKey,
        name: spec.name,
        points: spec.points,
        explosive: spec.explosive,
        burstColor: spec.burstColor,
        mesh,
        body,
        hitCooldown: 0,
        exploded: false,
      };
      bindPropCollisions(propObj);
      scene.add(mesh);
      world.addBody(body);
      dynamicProps.push(propObj);
    });
  }

  // Центр: пирамиды деревянных ящиков
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3 - row; col++) {
      spawnProp('crate', 7.5, 0.65 + row * 1.26, -19.8 + col * 1.28 + row * 0.64);
    }
  }
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3 - row; col++) {
      spawnProp('crate', 155.0, 0.65 + row * 1.26, 11.8 + col * 1.28 + row * 0.64);
    }
  }

  // Ферма (Север): тюки сена у амбара
  const hays = [
    [-6, 0.7, -148], [-4.4, 0.7, -148], [-5.2, 2.0, -148],
    [6, 0.7, -144], [7.6, 0.7, -144],
  ];
  for (const [hx, hy, hz] of hays) spawnProp('hay', hx, hy, hz);

  // ВЗРЫВООПАСНЫЕ БОЧКИ (Barrel_01_1k.gltf) И ГАЗОВЫЕ БАЛЛОНЫ (propane_tank_1k.gltf)
  const explosiveSpawns = [
    // Прямо у центральной площади (легко проверить сразу после старта!)
    ['explosive_barrel', -8.4,  6.2, 0.2],
    ['explosive_barrel', -7.2,  6.2, 1.1],
    ['propane_tank',     -7.8,  7.4, 0.5],
    ['propane_tank',      5.4,  7.6, 1.8],
    ['explosive_barrel',  6.6,  7.6, 0.4],
    ['propane_tank',     16.5, -18.5, 2.1],
    ['explosive_barrel', -21.5, 19.0, 0.9],
    // Большая ферма (Север)
    ['propane_tank',     -8.5,-144.0, 0.6],
    ['explosive_barrel', -9.8,-144.0, 1.5],
    ['propane_tank',      9.5,-148.0, 2.4],
    // Стройплощадка (Восток)
    ['explosive_barrel', 132.0, -6.0, 0.3],
    ['explosive_barrel', 133.4, -6.0, 1.2],
    ['propane_tank',     132.7, -4.7, 2.0],
    ['explosive_barrel', 152.2, 13.4, 0.8],
    ['propane_tank',     152.2, 14.8, 1.9],
    ['propane_tank',     142.0, 22.0, 0.4],
    // Пляж (Юг) и Скейт-парк (Запад)
    ['propane_tank',     -22.0, 121.0, 1.2],
    ['explosive_barrel',-128.0,  14.5, 0.7],
  ];
  for (const [typeKey, x, z, yaw] of explosiveSpawns) {
    spawnGltfDynamicProp(typeKey, x, z, yaw);
  }

  // МЕЛКИЕ ДИНАМИЧЕСКИЕ ПРЕДМЕТЫ У ДОМОВ (коробки, мешки, цемент, урны, покрышки, диски, стеллажи, Barrel_03)
  const housePropSpawns = [
    // Центральная площадь и ближайшие дома (сразу перед глазами игрока)
    ['cardboard_box',  4.6,  11.0, 0.3],
    ['cardboard_box',  5.5,  11.6, 1.1],
    ['trash_can',     -6.2,  11.8, 0.0],
    ['trashbag',      -5.3,  12.1, 0.7],
    ['old_tyre',       8.2,   2.2, 0.5],
    ['wheel_rim',      9.2,   2.6, 1.4],
    ['barrel_normal', -14.2, -9.2, 0.2],
    ['cement_bag',    -13.2, -8.5, 0.9],
    ['metal_rack',     19.5, -18.5, -0.35],
    ['cardboard_box',  18.8, -17.2, 0.6],
    ['trash_can',      21.2, -16.5, 0.2],
    ['trashbag',       22.0, -16.2, 1.5],
    ['barrel_normal', -22.0,  17.5, 0.4],
    ['old_tyre',      -20.8,  18.0, 1.2],
    ['wheel_rim',     -19.9,  17.6, 0.3],
    ['metal_rack',     22.0,  19.0, 2.7],
    ['cement_bag',     20.8,  19.6, 0.5],
    ['cardboard_box',  20.0,  18.8, 1.3],
    ['trash_can',     -39.0, -10.0, 1.5],
    ['trashbag',      -38.4,  -9.3, 2.2],
    ['barrel_normal',  39.0,  12.0, 0.8],
    ['old_tyre',       38.2,  13.2, 0.4],
    ['wheel_rim',      38.5, -19.5, 1.1],
    ['cement_bag',     37.6, -20.2, 0.2],

    // Большая ферма (Север)
    ['barrel_normal', -12.0,-141.0, 0.4],
    ['cement_bag',    -10.8,-140.5, 1.1],
    ['old_tyre',      -26.0,-134.0, 0.8],
    ['wheel_rim',     -24.8,-133.5, 2.1],
    ['metal_rack',    -25.5,-142.0, 0.6],
    ['cardboard_box', -24.2,-141.5, 0.2],
    ['trash_can',      11.0,-142.0, 0.0],
    ['trashbag',       11.9,-141.8, 1.7],

    // Стройплощадка (Восток)
    ['cement_bag',    139.0, -19.5, 0.3],
    ['cement_bag',    140.2, -19.2, 1.2],
    ['metal_rack',    156.5, -22.0, -1.5],
    ['barrel_normal', 155.0, -20.5, 0.6],
    ['old_tyre',      129.0,  -4.0, 0.9],
    ['wheel_rim',     130.0,  -3.6, 1.8],
    ['cardboard_box', 156.0, -24.5, 0.5],
    ['trash_can',     157.0, -26.0, 0.0],

    // Озеро и пляж (Юг)
    ['trash_can',     -23.0, 123.0, 0.6],
    ['trashbag',      -22.2, 123.6, 1.4],
    ['cardboard_box',  23.5, 124.0, 0.8],
    ['barrel_normal',  24.5, 125.0, 0.2],
    ['old_tyre',      -18.0, 129.0, 1.0],

    // Лес и скейт-парк (Запад)
    ['metal_rack',   -155.0, -22.0, 1.2],
    ['barrel_normal',-154.0,  22.0, 0.5],
    ['old_tyre',     -114.0, -26.0, 0.9],
    ['wheel_rim',    -113.0, -25.4, 2.0],
    ['trash_can',    -115.0, -27.5, 0.3],
    ['trashbag',     -114.2, -28.0, 1.1],
    ['cardboard_box',-153.5,  23.5, 0.7],
    ['cement_bag',   -153.0, -20.5, 1.6],
  ];
  for (const [typeKey, x, z, yaw] of housePropSpawns) {
    spawnGltfDynamicProp(typeKey, x, z, yaw);
  }
}

function explodeBarrel(barrelProp) {
  if (barrelProp.exploded) return;
  barrelProp.exploded = true;
  const causedByPlayer = isBodyByPlayer(barrelProp.body);
  if (grabbedObj === barrelProp) releaseGrabbed(false);

  const pos = barrelProp.body.position.clone();
  const isPropane = barrelProp.propType === 'propane_tank';
  sfx.boom();
  spawnExplosionFlash(pos);
  spawnBurst(pos, 0xff5414, 22, 17, 1.45);
  spawnBurst(pos, 0xffe44a, 14, 13, 1.15);
  spawnBurst(pos, 0xff2600, 10, 15, 1.10);
  spawnBurst(pos, 0x3b3634, 10, 8, 1.50);

  if (causedByPlayer) {
    addTrick(
      isPropane ? 'Газовый взрыв!' : 'Взрывная бочка!',
      isPropane ? 350 : 300,
      pos,
      '#ff6e3a'
    );
  }

  barrelProp.body.wakeUp();
  barrelProp.body.applyImpulse(new CANNON.Vec3((Math.random() - 0.5) * 110, 260, (Math.random() - 0.5) * 110));
  barrelProp.body.angularVelocity.set(16, 12, -14);

  const radius = 11.5;
  for (const p of dynamicProps) {
    if (p === barrelProp) continue;
    const dist = p.body.position.distanceTo(pos);
    if (dist < radius && dist > 0.05) {
      const dir = p.body.position.vsub(pos);
      dir.normalize();
      const power = (1 - dist / radius) * 240;
      p.body.wakeUp();
      if (causedByPlayer) markByPlayer(p.body, 3.5);
      p.body.applyImpulse(new CANNON.Vec3(dir.x * power, power * 1.05 + 70, dir.z * power));
      if (p.explosive && !p.exploded && dist < 6.8) {
        setTimeout(() => explodeBarrel(p), 110 + Math.random() * 140);
      }
    }
  }
  for (const brk of breakables) {
    if (!brk.broken && brk.pos.distanceTo(pos) < radius) {
      shatterBreakable(brk, brk.pos.clone().sub(pos), 16, causedByPlayer);
    }
  }
  for (const npc of npcs) {
    const dist = npc.body.position.distanceTo(pos);
    if (dist < radius) {
      const dir = npc.body.position.vsub(pos);
      dir.normalize();
      if (causedByPlayer) markByPlayer(npc.body, 3.5);
      knockNpc(npc, dir, 24, null, causedByPlayer);
    }
  }
  for (const v of vehicles) {
    const dist = v.body.position.distanceTo(pos);
    if (dist < 12.5 && dist > 0.05) {
      const dir = v.body.position.vsub(pos);
      dir.normalize();
      const power = (1 - dist / 12.5) * 740;
      v.body.wakeUp();
      if (causedByPlayer) markByPlayer(v.body, 4.0);
      v.body.applyImpulse(new CANNON.Vec3(dir.x * power, power * 0.72 + 190, dir.z * power));
      v.body.angularVelocity.set((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5);
      if (causedByPlayer && v.hitCooldown <= 0) {
        v.hitCooldown = 1.0;
        addTrick(`Авто-взлёт: ${v.name}!`, 260, v.body.position, '#ff8e3c');
      }
    }
  }
  if (!inTractor) {
    const distP = playerBody.position.distanceTo(pos);
    if (distP < 9.5) {
      const dir = playerBody.position.vsub(pos);
      if (dir.lengthSquared() < 0.01) dir.set(0.3, 1, 0.3);
      dir.normalize();
      const falloff = 1 - distP / 9.5;
      const k = falloff * 18 + 4;
      playerBody.velocity.x += dir.x * k;
      playerBody.velocity.y = Math.max(playerBody.velocity.y, 17.5 + falloff * 11.5);
      playerBody.velocity.z += dir.z * k;
      if (causedByPlayer) {
        addTrick('Взрывной полёт!', 300, playerBody.position, '#ffbe3b');
      }
    }
  }
}

// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// 4b. ИНТЕРАКТИВНЫЕ МАШИНЫ (maintenance_vehicles.glb + bokaroo_67_-_low-poly_model.glb)
//     Вдоль дорог и на площади — хряк может их бодать, сдвигать и получать очки!
// ----------------------------------------------------------------------------
const vehicles = [];
const vehicleVariantsCache = new Map(); // filename -> Promise<Array<{ template, size }> | null>

function normalizeVehicleSubtree(node, targetLength) {
  const wrapper = new THREE.Group();
  const orientGroup = new THREE.Group();
  const inner = node.clone(true);

  // Сохраняем мировую ориентацию родительских узлов glTF (например, поворот Sketchfab_model), сбрасывая только позицию
  node.updateMatrixWorld(true);
  const worldQuat = new THREE.Quaternion();
  node.getWorldQuaternion(worldQuat);
  inner.quaternion.copy(worldQuat);
  inner.position.set(0, 0, 0);

  orientGroup.add(inner);
  wrapper.add(orientGroup);
  wrapper.updateMatrixWorld(true);

  const rawBox = new THREE.Box3().setFromObject(orientGroup);
  if (rawBox.isEmpty()) return null;
  const rawSize = new THREE.Vector3();
  rawBox.getSize(rawSize);

  // 1. Если машина стоит вертикально на бампере (самая длинная сторона по Y), укладываем её горизонтально
  if (rawSize.y > Math.max(rawSize.x, rawSize.z) * 1.02) {
    orientGroup.rotation.x = -Math.PI / 2;
    orientGroup.updateMatrixWorld(true);
    const afterXBox = new THREE.Box3().setFromObject(orientGroup);
    const afterXSize = new THREE.Vector3();
    afterXBox.getSize(afterXSize);
    // Если после наклона машина легла на бок (высота по X больше ширины по Y), доворачиваем по Z
    if (afterXSize.y > afterXSize.x * 1.18) {
      orientGroup.rotation.z = Math.PI / 2;
      orientGroup.updateMatrixWorld(true);
    }
  }

  // 2. Выравниваем самую длинную горизонтальную сторону строго вдоль оси Z (вдоль дороги)
  const horizBox = new THREE.Box3().setFromObject(orientGroup);
  const horizSize = new THREE.Vector3();
  horizBox.getSize(horizSize);
  if (horizSize.x > horizSize.z * 1.12) {
    const yawAlign = new THREE.Group();
    wrapper.remove(orientGroup);
    yawAlign.add(orientGroup);
    yawAlign.rotation.y = Math.PI / 2;
    wrapper.add(yawAlign);
  }

  wrapper.updateMatrixWorld(true);
  const rotBox = new THREE.Box3().setFromObject(wrapper);
  const rotSize = new THREE.Vector3();
  rotBox.getSize(rotSize);

  // 3. Проверяем, что колёса снизу, а сужающаяся кабина/крыша сверху (иначе переворачиваем на 180° вокруг Z)
  const midY = (rotBox.min.y + rotBox.max.y) * 0.5;
  const spanY = Math.max(0.01, rotSize.y);
  let bottomW = 0, bottomN = 0, topW = 0, topN = 0;
  const vTmp = new THREE.Vector3();
  wrapper.traverse((obj) => {
    if (!obj.isMesh || !obj.geometry || !obj.geometry.attributes.position) return;
    const pos = obj.geometry.attributes.position;
    const step = Math.max(1, Math.floor(pos.count / 120));
    for (let i = 0; i < pos.count; i += step) {
      vTmp.fromBufferAttribute(pos, i).applyMatrix4(obj.matrixWorld);
      const normY = (vTmp.y - rotBox.min.y) / spanY;
      if (normY < 0.35) { bottomW += Math.abs(vTmp.x); bottomN++; }
      else if (normY > 0.65) { topW += Math.abs(vTmp.x); topN++; }
    }
  });
  if (bottomN > 0 && topN > 0 && (topW / topN) > (bottomW / bottomN) * 1.18) {
    const flipGroup = new THREE.Group();
    while (wrapper.children.length > 0) flipGroup.add(wrapper.children[0]);
    flipGroup.rotation.z = Math.PI;
    wrapper.add(flipGroup);
    wrapper.updateMatrixWorld(true);
  }

  // 4. Масштабируем по самой длинной горизонтальной стороне и центрируем по (0, 0, 0) для CANNON.Box
  const alignedBox = new THREE.Box3().setFromObject(wrapper);
  const alignedSize = new THREE.Vector3();
  alignedBox.getSize(alignedSize);

  const maxHoriz = Math.max(0.01, alignedSize.x, alignedSize.z);
  const s = targetLength / maxHoriz;
  const rootTransform = new THREE.Group();
  while (wrapper.children.length > 0) rootTransform.add(wrapper.children[0]);
  rootTransform.scale.setScalar(s);
  wrapper.add(rootTransform);

  wrapper.updateMatrixWorld(true);
  const scaledBox = new THREE.Box3().setFromObject(wrapper);
  const center = new THREE.Vector3();
  const finalSize = new THREE.Vector3();
  scaledBox.getCenter(center);
  scaledBox.getSize(finalSize);

  rootTransform.position.x -= center.x;
  rootTransform.position.y -= center.y;
  rootTransform.position.z -= center.z;

  wrapper.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of mats) {
        if (!m) continue;
        if (m.map) setSRGBTex(m.map);
      }
    }
  });

  return { template: wrapper, size: finalSize };
}

function loadVehicleVariants(filename, targetLength = 4.6) {
  const cacheKey = `${filename}|${targetLength}`;
  if (!vehicleVariantsCache.has(cacheKey)) {
    const promise = new Promise((resolve) => {
      envGltfLoader.load(
        `${MODEL_DIR}${filename}`,
        (gltf) => {
          const root = gltf.scene || (gltf.scenes && gltf.scenes[0]);
          if (!root) {
            resolve(null);
            return;
          }
          root.updateMatrixWorld(true);

          // Спускаемся к уровню возможных вариантов (например, если в maintenance_vehicles.glb несколько машин в ряд)
          let container = root;
          while (container.children.length === 1 && !container.children[0].isMesh && container.children[0].children.length > 0) {
            container = container.children[0];
          }

          const candidates = container.children.filter((ch) => {
            let hasMesh = false;
            ch.traverse((o) => { if (o.isMesh) hasMesh = true; });
            return hasMesh;
          });

          let treatAsPack = false;
          if (candidates.length >= 2 && candidates.length <= 16) {
            const boxes = candidates.map((ch) => new THREE.Box3().setFromObject(ch));
            let separatedPairs = 0;
            let totalPairs = 0;
            for (let i = 0; i < boxes.length; i++) {
              const ci = new THREE.Vector3(), si = new THREE.Vector3();
              boxes[i].getCenter(ci); boxes[i].getSize(si);
              for (let j = i + 1; j < boxes.length; j++) {
                const cj = new THREE.Vector3(), sj = new THREE.Vector3();
                boxes[j].getCenter(cj); boxes[j].getSize(sj);
                const distXZ = Math.hypot(ci.x - cj.x, ci.z - cj.z);
                const minSep = Math.max(si.x, si.z, sj.x, sj.z) * 0.65;
                totalPairs++;
                if (distXZ > Math.max(0.4, minSep)) separatedPairs++;
              }
            }
            treatAsPack = totalPairs > 0 && (separatedPairs / totalPairs) >= 0.55;
          }

          const variants = [];
          if (treatAsPack) {
            for (const ch of candidates) {
              const norm = normalizeVehicleSubtree(ch, targetLength);
              if (norm) variants.push(norm);
            }
          } else {
            const norm = normalizeVehicleSubtree(root, targetLength);
            if (norm) variants.push(norm);
          }

          resolve(variants.length > 0 ? variants : null);
        },
        undefined,
        (err) => {
          console.warn(`Не удалось загрузить машину ${MODEL_DIR}${filename}:`, err);
          checkLocalGlbProtocolHint();
          resolve(null);
        }
      );
    });
    vehicleVariantsCache.set(cacheKey, promise);
  }
  return vehicleVariantsCache.get(cacheKey);
}

const VEHICLE_SPAWNS = [
  // Центральная площадь (рядом со стартом, не мешают спавну хряка и трактору)
  { file: 'bokaroo_67_-_low-poly_model.glb', x: -12.5, z:  -5.5, yaw:  0.45, len: 4.5, name: 'Бокару-67' },
  { file: 'bokaroo_67_-_low-poly_model.glb', x:  10.5, z:  13.5, yaw: -0.65, len: 4.5, name: 'Бокару-67' },
  { file: 'maintenance_vehicles.glb',        x:  -9.5, z:  15.5, yaw:  0.80, len: 5.2, name: 'спецтехнику' },

  // Северная дорога -> Большая ферма
  { file: 'bokaroo_67_-_low-poly_model.glb', x:   2.6, z: -34.0, yaw:  0.06, len: 4.5, name: 'Бокару-67' },
  { file: 'maintenance_vehicles.glb',        x:  -2.7, z: -64.0, yaw:  Math.PI - 0.05, len: 5.2, name: 'спецтехнику' },
  { file: 'maintenance_vehicles.glb',        x:   2.7, z:-102.0, yaw:  0.00, len: 5.2, name: 'спецтехнику' },
  { file: 'bokaroo_67_-_low-poly_model.glb', x:  11.5, z:-132.0, yaw: -0.40, len: 4.5, name: 'Бокару-67' },

  // Южная дорога -> Озеро и пляж
  { file: 'bokaroo_67_-_low-poly_model.glb', x:  -2.6, z:  36.0, yaw:  Math.PI, len: 4.5, name: 'Бокару-67' },
  { file: 'maintenance_vehicles.glb',        x:   2.7, z:  72.0, yaw:  0.04, len: 5.2, name: 'спецтехнику' },
  { file: 'bokaroo_67_-_low-poly_model.glb', x: -11.0, z: 112.0, yaw:  0.55, len: 4.5, name: 'Бокару-67' },

  // Восточная дорога -> Стройплощадка
  { file: 'maintenance_vehicles.glb',        x:  34.0, z:   2.7, yaw:  Math.PI / 2, len: 5.2, name: 'спецтехнику' },
  { file: 'bokaroo_67_-_low-poly_model.glb', x:  76.0, z:  -2.7, yaw: -Math.PI / 2, len: 4.5, name: 'Бокару-67' },
  { file: 'maintenance_vehicles.glb',        x: 118.0, z:  -2.5, yaw:  Math.PI / 2 + 0.15, len: 5.2, name: 'спецтехнику' },
  { file: 'maintenance_vehicles.glb',        x: 136.0, z: -24.0, yaw:  0.35, len: 5.2, name: 'спецтехнику' },

  // Западная дорога -> Лес и скейт-парк
  { file: 'bokaroo_67_-_low-poly_model.glb', x: -36.0, z:  -2.7, yaw: -Math.PI / 2, len: 4.5, name: 'Бокару-67' },
  { file: 'maintenance_vehicles.glb',        x: -78.0, z:   2.7, yaw:  Math.PI / 2, len: 5.2, name: 'спецтехнику' },
  { file: 'bokaroo_67_-_low-poly_model.glb', x:-114.0, z:   7.5, yaw: -Math.PI / 2 - 0.25, len: 4.5, name: 'Бокару-67' },
];

// Резервируем площадки под припаркованные машины, чтобы деревья в них не прорастали
for (const vs of VEHICLE_SPAWNS) {
  noTreeZones.push({ x: vs.x, z: vs.z, r: 5.0 });
}

let vehicleSpawnEpoch = 0;

function clearAndSpawnVehicles() {
  vehicleSpawnEpoch++;
  const myEpoch = vehicleSpawnEpoch;
  if (grabbedObj && grabbedObj.kind === 'vehicle') releaseGrabbed(false);
  for (const v of vehicles) {
    scene.remove(v.mesh);
    world.removeBody(v.body);
  }
  vehicles.length = 0;

  let maintCounter = 0;
  for (const spec of VEHICLE_SPAWNS) {
    const isMaint = spec.file === 'maintenance_vehicles.glb';
    const variantIdx = isMaint ? (maintCounter++) : 0;

    // Спавним ТОЛЬКО реальные 3D-модели .glb (без примитивных кубических коробок на колёсах)
    loadVehicleVariants(spec.file, spec.len).then((variants) => {
      if (!variants || myEpoch !== vehicleSpawnEpoch) return;
      const picked = variants[variantIdx % variants.length];
      if (!picked) return;

      const visualHolder = new THREE.Group();
      const modelClone = picked.template.clone(true);
      visualHolder.add(modelClone);

      const hx = Math.max(0.55, picked.size.x * 0.5);
      const hy = Math.max(0.45, picked.size.y * 0.5);
      const hz = Math.max(0.70, picked.size.z * 0.5);

      const body = new CANNON.Body({
        mass: 68,
        material: matVehicle,
        linearDamping: 0.26,
        angularDamping: 0.34,
        position: new CANNON.Vec3(spec.x, hy + 0.05, spec.z),
      });
      body.quaternion.setFromEuler(0, spec.yaw, 0);
      body.addShape(new CANNON.Box(new CANNON.Vec3(hx, hy, hz)));
      body.sleepSpeedLimit = 0.22;
      body.sleepTimeLimit = 1.0;

      visualHolder.position.copy(body.position);
      visualHolder.quaternion.copy(body.quaternion);
      scene.add(visualHolder);

      const vehObj = {
        kind: 'vehicle',
        name: spec.name,
        mesh: visualHolder,
        body,
        hitCooldown: 0,
        pushCooldown: 0,
        halfY: hy,
        startSpec: spec,
      };
      body.userData = { vehicleObj: vehObj };

      // Реакция на толчок/сдвиг хряком и столкновение с другими объектами
      body.addEventListener('collide', (e) => {
        const other = e.body;
        if (other === playerBody && !inTractor) {
          const pSpd = playerBody.velocity.length();
          if (pSpd > 1.8) {
            markByPlayer(body, 3.8);
            body.wakeUp();
            const pushDir = body.position.vsub(playerBody.position);
            pushDir.y = 0;
            if (pushDir.lengthSquared() > 0.001) pushDir.normalize();
            const shove = Math.min(260, pSpd * (isRagdoll ? 26 : 19));
            body.applyImpulse(new CANNON.Vec3(pushDir.x * shove, isRagdoll ? 75 : 35, pushDir.z * shove));
            if (vehObj.pushCooldown <= 0) {
              vehObj.pushCooldown = 1.15;
              sfx.carHit();
              spawnBurst(body.position, 0xffe44a, 6, 6, 0.9);
              if (isRagdoll) addTrick('Рэгдолл-ДТП!', 240, body.position, '#ffbe3b');
              else addTrick(`Сдвинул ${vehObj.name}!`, 140, body.position, '#75e6ff');
            }
          }
        } else if (other === tractor.body && inTractor) {
          markByPlayer(body, 4.0);
        } else if (isBodyByPlayer(other)) {
          const impact = Math.abs(e.contact.getImpactVelocityAlongNormal());
          if (impact > 2.5) markByPlayer(body, 3.5);
        }
      });

      world.addBody(body);
      vehicles.push(vehObj);
    });
  }
}

// 5. ТРАКТОР (МАКС. СКОРОСТЬ 32 + НИТРО/УСКОРЕНИЕ!)
// ----------------------------------------------------------------------------
function buildTractor(startX, startZ) {
  const visual = new THREE.Group();
  const blueMat  = stdMat(0x2488eb, 0.45, 0.25);
  const creamMat = stdMat(0xf5edd8, 0.65);
  const darkMat  = stdMat(0x2b2c30, 0.65, 0.3);
  const tireMat  = stdMat(0x202126, 0.92);
  const rimMat   = stdMat(0xf2be32, 0.45, 0.3);
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xa6e6ff, transparent: true, opacity: 0.42, roughness: 0.15 });
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff49c });

  const addPart = (geo, mat, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
    visual.add(m); return m;
  };

  addPart(new THREE.BoxGeometry(1.5, 0.68, 2.95), darkMat, 0, 0.02, 0.05);
  addPart(new THREE.BoxGeometry(1.36, 0.84, 1.85), blueMat, 0, 0.66, 0.70);
  const nose = addPart(new THREE.CylinderGeometry(0.68, 0.68, 0.84, 12), blueMat, 0, 0.66, 1.56);
  nose.scale.set(1.0, 1.0, 0.25);
  addPart(new THREE.SphereGeometry(0.16, 10, 8), lightMat, -0.48, 0.78, 1.72);
  addPart(new THREE.SphereGeometry(0.16, 10, 8), lightMat,  0.48, 0.78, 1.72);
  const exhaust = addPart(new THREE.CylinderGeometry(0.09, 0.11, 1.25, 10), darkMat, 0.56, 1.48, 1.02);

  addPart(new THREE.BoxGeometry(1.60, 0.26, 1.44), blueMat, 0, 0.32, -0.70);
  addPart(new THREE.BoxGeometry(1.72, 0.16, 1.58), creamMat, 0, 2.25, -0.70);
  for (const sx of [-0.74, 0.74]) {
    for (const sz of [-0.04, -1.36]) {
      addPart(new THREE.CylinderGeometry(0.07, 0.07, 1.88, 8), blueMat, sx, 1.30, sz);
    }
  }
  const ws = new THREE.Mesh(new THREE.BoxGeometry(1.36, 1.15, 0.06), glassMat);
  ws.position.set(0, 1.55, -0.02); visual.add(ws);

  const wheelPivot = new THREE.Group();
  wheelPivot.position.set(0, 1.05, -0.18);
  wheelPivot.rotation.x = -0.55;
  const sw = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.04, 8, 16), darkMat);
  sw.rotation.x = Math.PI / 2;
  wheelPivot.add(sw);
  visual.add(wheelPivot);

  const driverSeat = new THREE.Group();
  driverSeat.position.set(0, 0.45, -0.72);
  const driverPig = createPigModel(PIG_TYPES.MEME, { scale: 0.66 });
  driverPig.userData.disposeShadow();
  driverPig.visible = false;
  driverSeat.add(driverPig);
  visual.add(driverSeat);

  function makeWheel(r, w) {
    const wg = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 16), tireMat);
    tire.rotation.z = Math.PI / 2; tire.castShadow = true;
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.52, r * 0.52, w + 0.05, 12), rimMat);
    rim.rotation.z = Math.PI / 2;
    const bar = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, r * 0.85, 0.13), darkMat);
    wg.add(tire, rim, bar);
    return wg;
  }

  const rearWheels = [], frontSteerPivots = [], frontWheels = [];
  for (const side of [-1, 1]) {
    const rw = makeWheel(0.76, 0.58);
    rw.position.set(side * 1.12, 0.11, -0.95);
    visual.add(rw); rearWheels.push(rw);

    const fp = new THREE.Group();
    fp.position.set(side * 0.96, -0.15, 1.15);
    const fw = makeWheel(0.50, 0.38);
    fp.add(fw); visual.add(fp);
    frontSteerPivots.push(fp); frontWheels.push(fw);
  }
  scene.add(visual);

  const body = new CANNON.Body({
    mass: 420,
    material: matTractor,
    linearDamping: 0.06,
    angularDamping: 0.55,
    position: new CANNON.Vec3(startX, 1.0, startZ),
  });
  body.addShape(new CANNON.Sphere(0.65), new CANNON.Vec3(-1.05, 0.0, -0.95));
  body.addShape(new CANNON.Sphere(0.65), new CANNON.Vec3( 1.05, 0.0, -0.95));
  body.addShape(new CANNON.Sphere(0.50), new CANNON.Vec3(-0.95, -0.15, 1.15));
  body.addShape(new CANNON.Sphere(0.50), new CANNON.Vec3( 0.95, -0.15, 1.15));
  body.addShape(new CANNON.Box(new CANNON.Vec3(0.85, 0.65, 1.55)), new CANNON.Vec3(0, 0.55, 0.05));
  body.addShape(new CANNON.Box(new CANNON.Vec3(0.78, 0.55, 0.72)), new CANNON.Vec3(0, 1.65, -0.70));
  body.allowSleep = false;
  world.addBody(body);

  const tractor = { visual, body, driverPig, driverSeat, wheelPivot, exhaust, rearWheels, frontWheels, frontSteerPivots, lastGrounded: 0, steerVisual: 0, smokeTimer: 0 };

  body.addEventListener('collide', (e) => {
    const up = new CANNON.Vec3();
    if (e.contact.bi.id === body.id) e.contact.ni.negate(up);
    else up.copy(e.contact.ni);
    if (up.y > 0.42) tractor.lastGrounded = elapsedTime;

    const speed = body.velocity.length();
    if (speed < 2.2) return;

    const other = e.body;
    const causedByPlayer = inTractor || isBodyByPlayer(body);
    if (other.userData && other.userData.breakable && causedByPlayer) {
      shatterBreakable(other.userData.breakable, body.velocity, speed, true);
    } else if (other.userData && other.userData.propObj && speed >= 3.0) {
      const p = other.userData.propObj;
      if (causedByPlayer) markByPlayer(other, 3.0);
      if (p.explosive && speed > 5.0) {
        explodeBarrel(p);
      } else if (p.hitCooldown <= 0) {
        p.hitCooldown = 0.55;
        const dir = other.position.vsub(body.position); dir.normalize();
        other.wakeUp();
        other.applyImpulse(new CANNON.Vec3(dir.x * speed * 15, speed * 9 + 30, dir.z * speed * 15));
        sfx.crate();
        spawnBurst(other.position, 0xd49b50, 6, 7, 1.0, true);
        if (causedByPlayer) addTrick('Тракторный погром', 150, other.position);
      }
    } else if (other.userData && other.userData.vehicleObj && speed >= 3.0) {
      const v = other.userData.vehicleObj;
      if (causedByPlayer) markByPlayer(other, 4.0);
      if (v.hitCooldown <= 0) {
        v.hitCooldown = 0.75;
        const dir = other.position.vsub(body.position); dir.y = 0;
        if (dir.lengthSquared() > 0.001) dir.normalize();
        other.wakeUp();
        other.applyImpulse(new CANNON.Vec3(dir.x * speed * 42, speed * 14 + 130, dir.z * speed * 42));
        other.angularVelocity.set((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 4);
        sfx.carHit();
        spawnBurst(other.position, 0xffe44a, 10, 9);
        if (causedByPlayer) addTrick('Тракторный таран!', 260, other.position, '#ff9640');
      }
    } else if (other.userData && other.userData.npc && speed >= 3.0) {
      const dir = other.position.vsub(body.position); dir.y = 0; dir.normalize();
      if (causedByPlayer) markByPlayer(other, 3.0);
      knockNpc(other.userData.npc, dir, Math.min(30, speed * 1.5 + 8), 'Свинский страйк!', causedByPlayer);
    }
  });

  return tractor;
}

// ----------------------------------------------------------------------------
// 6. ИГРОК, RAGDOLL И ЛИПКИЙ ПЯТАК
// ----------------------------------------------------------------------------
const BREED_ORDER = [
  PIG_TYPES.CLASSIC,
  PIG_TYPES.CURLY,
  PIG_TYPES.APPLE,
  PIG_TYPES.SPOTTED,
  PIG_TYPES.BOAR,
  PIG_TYPES.BLACK,
];
let currentBreedIdx = 0;
const PLAYER_SCALE = 0.45 * 1.45; // Увеличение в 1.45x (~0.6525): крупнее лавочек, по верхний край двери контейнера
const PLAYER_SPHERE_R = 0.58 * PLAYER_SCALE;
const PLAYER_VISUAL_Y_OFFSET = -PLAYER_SPHERE_R;
const CAM_DIST_NORMAL = 3.4 * 1.45;
const CAM_DIST_RAGDOLL = 4.2 * 1.45;
const CAM_HEIGHT_OFFSET = 0.72 * 1.45;
const CAM_LOOK_Y_OFFSET = 0.36 * 1.45;

let playerPig = createPigModel(BREED_ORDER[0], { scale: PLAYER_SCALE });
scene.add(playerPig);

const playerBody = new CANNON.Body({
  mass: 22,
  material: matPlayer,
  fixedRotation: true,
  linearDamping: 0.05,
  angularDamping: 0.25,
  position: new CANNON.Vec3(0, 1.5, 11),
});
playerBody.addShape(new CANNON.Sphere(PLAYER_SPHERE_R));
playerBody.allowSleep = false;
world.addBody(playerBody);

let playerLastGrounded = 0;
let playerWasGrounded = true;
let playerPrevVelY = 0;
let onSlideNow = false;
let slideTrickCooldown = 0;
let isRagdoll = false;
let airTime = 0;
let airSpinAccum = 0;
let hoofDustStepTimer = 0;
let hoofDustSide = 1;

playerBody.addEventListener('collide', (e) => {
  const up = new CANNON.Vec3();
  if (e.contact.bi.id === playerBody.id) e.contact.ni.negate(up);
  else up.copy(e.contact.ni);
  if (up.y > 0.42) playerLastGrounded = elapsedTime;

  const other = e.body;
  const spd = playerBody.velocity.length();

  if (other.userData && other.userData.breakable && (spd > 6.8 || isRagdoll)) {
    shatterBreakable(other.userData.breakable, playerBody.velocity, Math.max(9, spd));
  }

  if (isRagdoll && spd > 5.5) {
    if (other.userData && other.userData.propObj) {
      const p = other.userData.propObj;
      markByPlayer(other, 3.0);
      if (p.explosive && !p.exploded) explodeBarrel(p);
      else if (p.hitCooldown <= 0) {
        p.hitCooldown = 0.5;
        const dir = other.position.vsub(playerBody.position); dir.normalize();
        other.wakeUp();
        other.applyImpulse(new CANNON.Vec3(dir.x * spd * 11, spd * 6 + 20, dir.z * spd * 11));
        sfx.crate();
        addTrick('Рэгдолл-боулинг!', 200, other.position);
      }
    } else if (other.userData && other.userData.npc) {
      const dir = other.position.vsub(playerBody.position); dir.y = 0; dir.normalize();
      markByPlayer(other, 3.0);
      knockNpc(other.userData.npc, dir, spd * 1.4, 'Свино-кегли!', true);
    }
  }
});

const fpRig = new THREE.Group();
const fpSnout = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 10), stdMat(0xf29aa0, 0.55));
fpSnout.scale.set(1.15, 0.86, 0.58);
fpSnout.position.set(0, -0.34, -0.60);
const fpNostrilGeo = new THREE.SphereGeometry(0.042, 8, 8);
const fpNostrilMat = stdMat(0x4c2420, 0.9);
for (const side of [-1, 1]) {
  const n = new THREE.Mesh(fpNostrilGeo, fpNostrilMat);
  n.position.set(side * 0.065, -0.01, 0.14);
  fpSnout.add(n);
}
fpRig.add(fpSnout);
fpRig.visible = false;
camera.add(fpRig);
scene.add(camera);

const tongueMesh = new THREE.Mesh(
  new THREE.CylinderGeometry(0.055, 0.085, 1, 10),
  new THREE.MeshStandardMaterial({ color: 0xff6da8, roughness: 0.25, metalness: 0.05 })
);
tongueMesh.visible = false;
scene.add(tongueMesh);

let grabbedObj = null;
const grabBadge  = document.getElementById('grab-badge');
const btnSnout   = document.getElementById('btn-snout');
const btnRagdoll = document.getElementById('btn-ragdoll');

function toggleStickySnout() {
  if (inTractor) return;
  if (grabbedObj) { releaseGrabbed(true); return; }

  const origin = playerBody.position;
  const aim = getAimDirection();
  const fwd = new THREE.Vector3(aim.x, 0, aim.z).normalize();

  let best = null, bestScore = Infinity;
  for (const p of dynamicProps) {
    const dx = p.body.position.x - origin.x, dy = p.body.position.y - origin.y, dz = p.body.position.z - origin.z;
    const dist = Math.hypot(dx, dy, dz);
    if (dist > 4.6) continue;
    const dot = (dx * fwd.x + dz * fwd.z) / Math.max(0.1, Math.hypot(dx, dz));
    if (dot < -0.15 && dist > 2.2) continue;
    const score = dist - dot * 1.4;
    if (score < bestScore) { bestScore = score; best = p; }
  }
  for (const npc of npcs) {
    const dx = npc.body.position.x - origin.x, dy = npc.body.position.y - origin.y, dz = npc.body.position.z - origin.z;
    const dist = Math.hypot(dx, dy, dz);
    if (dist > 4.8) continue;
    const dot = (dx * fwd.x + dz * fwd.z) / Math.max(0.1, Math.hypot(dx, dz));
    if (dot < -0.15 && dist > 2.2) continue;
    const score = dist - dot * 1.6;
    if (score < bestScore) {
      bestScore = score;
      best = { kind: 'npc', name: PIG_LABELS[npc.breed] || 'Хряк', body: npc.body, npc };
    }
  }

  for (const v of vehicles) {
    const dx = v.body.position.x - origin.x, dy = v.body.position.y - origin.y, dz = v.body.position.z - origin.z;
    const dist = Math.hypot(dx, dy, dz);
    if (dist > 5.8) continue;
    const dot = (dx * fwd.x + dz * fwd.z) / Math.max(0.1, Math.hypot(dx, dz));
    if (dot < -0.15 && dist > 3.0) continue;
    const score = dist - dot * 1.3;
    if (score < bestScore) { bestScore = score; best = v; }
  }

  if (!best) {
    sfx.release();
    spawnFloatText(origin, 'НЕ ДОТЯНУЛСЯ!');
    return;
  }

  grabbedObj = best;
  markByPlayer(grabbedObj.body, 3.0);
  if (grabbedObj.npc) {
    grabbedObj.npc.state = 'ragdoll';
    grabbedObj.npc.ragdollTimer = 999;
    grabbedObj.npc.body.angularFactor.set(1, 1, 1);
    sfx.oink();
  }
  grabbedObj.body.wakeUp();
  sfx.slurp();
  btnSnout.classList.add('active-mode');
  btnSnout.innerHTML = `${ICONS.snout}<span>БРОСИТЬ</span>`;
  grabBadge.style.display = 'inline-flex';
  grabBadge.innerHTML = `${ICONS.snout}<span>Схвачено: ${grabbedObj.name} — нажми БОДНУТЬ</span>`;
  addTrick(`Липкий пятак: ${grabbedObj.name}`, 75, grabbedObj.body.position, '#ff8cc8');
}

function releaseGrabbed(playSfx = true) {
  if (!grabbedObj) return;
  if (grabbedObj.npc) {
    grabbedObj.npc.ragdollTimer = 1.4;
    grabbedObj.npc.fleeTimer = 5.0;
  }
  grabbedObj = null;
  tongueMesh.visible = false;
  btnSnout.classList.remove('active-mode');
  btnSnout.innerHTML = `${ICONS.snout}<span>ПЯТАК</span>`;
  grabBadge.style.display = 'none';
  if (playSfx) sfx.release();
}

function updateStickySnout() {
  if (!grabbedObj || inTractor) { tongueMesh.visible = false; return; }

  const snoutWorld = new THREE.Vector3();
  if (firstPerson) fpSnout.getWorldPosition(snoutWorld);
  else playerPig.userData.snoutTip.getWorldPosition(snoutWorld);

  const aim = getAimDirection();
  const fwd = new THREE.Vector3(aim.x, Math.max(-0.2, Math.min(0.45, aim.y)), aim.z).normalize();
  const holdDist = grabbedObj.kind === 'vehicle' ? 2.95 : (1.42 * 1.45);
  const target = new THREE.Vector3(
    playerBody.position.x + fwd.x * holdDist,
    Math.max(0.72, playerBody.position.y + (0.24 + fwd.y * 0.85) * 1.45),
    playerBody.position.z + fwd.z * holdDist
  );

  const ob = grabbedObj.body;
  markByPlayer(ob, 3.0);
  ob.wakeUp();
  const dx = target.x - ob.position.x, dy = target.y - ob.position.y, dz = target.z - ob.position.z;
  const pull = 12.5, maxV = 24;
  ob.velocity.set(
    Math.max(-maxV, Math.min(maxV, playerBody.velocity.x + dx * pull)),
    Math.max(-maxV, Math.min(maxV, playerBody.velocity.y + dy * pull)),
    Math.max(-maxV, Math.min(maxV, playerBody.velocity.z + dz * pull))
  );

  if (Math.hypot(dx, dy, dz) > 7.5) { releaseGrabbed(true); return; }

  const objVec = new THREE.Vector3(ob.position.x, ob.position.y, ob.position.z);
  const diff = objVec.clone().sub(snoutWorld);
  const len = diff.length();
  if (len > 0.05) {
    tongueMesh.visible = true;
    tongueMesh.position.copy(snoutWorld).addScaledVector(diff, 0.5);
    tongueMesh.scale.set(PLAYER_SCALE, len, PLAYER_SCALE);
    tongueMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), diff.normalize());
  }
}

function toggleRagdoll() {
  if (inTractor) return;
  if (!isRagdoll) {
    isRagdoll = true;
    playerBody.fixedRotation = false;
    playerBody.angularFactor.set(1, 1, 1);
    playerBody.updateMassProperties();
    playerBody.wakeUp();

    const aim = getAimDirection();
    const fwd = new THREE.Vector3(aim.x, 0, aim.z).normalize();
    playerBody.velocity.x += fwd.x * 3.8;
    playerBody.velocity.y = Math.max(playerBody.velocity.y, 4.2);
    playerBody.velocity.z += fwd.z * 3.8;
    playerBody.angularVelocity.set(fwd.z * 7.5 + (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 6, -fwd.x * 7.5 + (Math.random() - 0.5) * 4);

    sfx.flop();
    btnRagdoll.classList.add('active-mode');
    btnRagdoll.innerHTML = `${ICONS.pig}<span>ВСТАТЬ</span>`;
    spawnFloatText(playerBody.position, 'ОБМЯК!', '#ffd970');
  } else {
    isRagdoll = false;
    playerBody.fixedRotation = true;
    playerBody.angularFactor.set(0, 0, 0);
    playerBody.angularVelocity.set(0, 0, 0);
    playerBody.quaternion.set(0, 0, 0, 1);
    playerBody.updateMassProperties();
    playerBody.position.y += 0.16;
    playerBody.velocity.y = Math.max(playerBody.velocity.y, 4.2);

    sfx.jump();
    btnRagdoll.classList.remove('active-mode');
    btnRagdoll.innerHTML = `${ICONS.dizzy}<span>РЭГДОЛЛ</span>`;
  }
}

// ----------------------------------------------------------------------------
// 7. NPC-ХРЯКИ ПО ВСЕМ 5 ЗОНАМ (С АВТО-СНОМ ДАЛЬШЕ 75м ДЛЯ 60 FPS!)
// ----------------------------------------------------------------------------
const npcs = [];
const NPC_PHRASES = ['ХРЮЮЮ!', 'АЙ-ЯЙ!', 'ПОЛЕТЕЛИ!', 'УИИИИ!', 'СВИНСКИЙ БЕСПРЕДЕЛ!'];

function spawnNpcs() {
  // Спавн NPC-хряков отключён для экономии FPS (массив npcs остаётся пустым)
  npcs.length = 0;
}

function knockNpc(npc, dirVec, power = 16, customTrick = null, awardPoints = true) {
  if (npc.knockCooldown > 0) return;
  npc.knockCooldown = 0.5;
  npc.state = 'ragdoll';
  npc.ragdollTimer = 2.1;
  npc.fleeTimer = 5.5;

  npc.body.wakeUp();
  npc.body.angularFactor.set(1, 1, 1);
  npc.body.velocity.set(dirVec.x * power, Math.max(8.0, power * 0.65), dirVec.z * power);
  npc.body.angularVelocity.set((Math.random() - 0.5) * 16, (Math.random() - 0.5) * 16, (Math.random() - 0.5) * 16);

  sfx.oink();
  spawnBurst(npc.body.position, 0xffe44a, 8, 8);
  if (awardPoints) {
    const label = customTrick || NPC_PHRASES[Math.floor(Math.random() * NPC_PHRASES.length)];
    addTrick(label, 180, npc.body.position);
  }
}

function updateNpcs(dt) {
  if (npcs.length === 0) return;
  const threatPos = inTractor ? tractor.body.position : playerBody.position;
  for (const npc of npcs) {
    if (npc.knockCooldown > 0) npc.knockCooldown -= dt;

    // Оптимизация FPS: если NPC дальше 75м от игрока/трактора — усыпляем физику и пропускаем анимацию!
    const distToPlayer = Math.hypot(npc.body.position.x - threatPos.x, npc.body.position.z - threatPos.z);
    if (distToPlayer > 75 && (!grabbedObj || grabbedObj.npc !== npc)) {
      if (npc.body.sleepState !== CANNON.Body.SLEEPING) {
        npc.body.velocity.set(0, 0, 0);
        npc.body.angularVelocity.set(0, 0, 0);
        npc.body.sleep();
      }
      npc.model.visible = distToPlayer < 160;
      npc.model.userData.contactShadow.visible = false;
      continue;
    }

    npc.model.visible = true;
    if (npc.body.sleepState === CANNON.Body.SLEEPING) npc.body.wakeUp();

    if (npc.state === 'ragdoll') {
      npc.ragdollTimer -= dt;
      npc.model.position.copy(npc.body.position);
      npc.model.quaternion.copy(npc.body.quaternion);
      npc.model.userData.update(dt, 'ragdoll');
      npc.model.userData.updateShadow(0.03);

      if (npc.ragdollTimer <= 0 && npc.body.position.y < 1.3 && (!grabbedObj || grabbedObj.npc !== npc)) {
        npc.state = 'flee';
        npc.body.angularFactor.set(0, 1, 0);
        npc.body.angularVelocity.set(0, 0, 0);
        npc.body.quaternion.set(0, 0, 0, 1);
      }
      continue;
    }

    let speed = 0, anim = 'idle';
    if (npc.state === 'flee') {
      npc.fleeTimer -= dt;
      npc.targetAngle = Math.atan2(npc.body.position.x - threatPos.x, npc.body.position.z - threatPos.z);
      speed = 8.4; anim = 'run';
      if (npc.fleeTimer <= 0) { npc.state = 'wander'; npc.stateTimer = 2.0; }
    } else {
      npc.stateTimer -= dt;
      if (npc.stateTimer <= 0) {
        if (Math.random() < 0.35) { npc.stateTimer = 1.6 + Math.random() * 2; npc.idleMove = false; }
        else {
          npc.stateTimer = 2.5 + Math.random() * 3.5; npc.idleMove = true;
          // Гуляют в радиусе 24м от своего родного района
          const dxHome = npc.homeX - npc.body.position.x;
          const dzHome = npc.homeZ - npc.body.position.z;
          if (Math.hypot(dxHome, dzHome) > 24) {
            npc.targetAngle = Math.atan2(dxHome, dzHome) + (Math.random() - 0.5) * 0.7;
          } else {
            npc.targetAngle = Math.random() * Math.PI * 2;
          }
        }
      }
      if (npc.idleMove) { speed = 3.2; anim = 'walk'; }
      else anim = (Math.floor(elapsedTime + npc.yaw) % 2 === 0) ? 'sniff' : 'idle';
    }

    if (speed > 0) {
      npc.body.velocity.x = Math.sin(npc.targetAngle) * speed;
      npc.body.velocity.z = Math.cos(npc.targetAngle) * speed;
      let diff = npc.targetAngle - npc.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      npc.yaw += diff * Math.min(1, dt * 8);
    } else {
      npc.body.velocity.x *= 0.85; npc.body.velocity.z *= 0.85;
    }

    npc.model.position.set(npc.body.position.x, npc.body.position.y - 0.56, npc.body.position.z);
    npc.model.rotation.set(0, npc.yaw, 0);
    npc.model.userData.update(dt, anim);
    npc.model.userData.updateShadow(0.03);
  }
}

// ----------------------------------------------------------------------------
// 8. БОДНУТЬ (HEADBUTT)
// ----------------------------------------------------------------------------
let kickAnimTimer = 0;
let actionCooldown = 0;

function getAimDirection() {
  const dir = new THREE.Vector3(0, 0, -1);
  dir.applyQuaternion(camera.quaternion);
  return dir.normalize();
}

function doTractorHorn() {
  sfx.horn();
  const tPos = tractor.body.position;
  spawnFloatText(tPos, 'БИП-БИП!', '#ffd970');
  spawnBurst(new THREE.Vector3(tPos.x, tPos.y + 1.1, tPos.z), 0xffe44a, 10, 9, 1.1);

  let scaredCount = 0;
  for (const npc of npcs) {
    const dx = npc.body.position.x - tPos.x;
    const dz = npc.body.position.z - tPos.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 24 && npc.state !== 'ragdoll') {
      scaredCount++;
      npc.state = 'flee';
      npc.fleeTimer = 6.0;
      npc.body.wakeUp();
      npc.body.velocity.y = Math.max(npc.body.velocity.y, 4.8);
      if (scaredCount <= 3) {
        spawnFloatText(npc.body.position, 'ШУХЕР!', '#ff9e7d');
      }
    }
  }
  if (scaredCount > 0) {
    sfx.oink();
    addTrick(`Гудок трактора (x${scaredCount})`, 80 * scaredCount, tPos, '#75e6ff');
  }
}

function doHeadbutt() {
  if (inTractor) {
    doTractorHorn();
    return;
  }
  if (actionCooldown > 0) return;
  actionCooldown = 0.28;
  kickAnimTimer = 0.25;
  if (playerPig.userData && playerPig.userData.triggerHeadbutt) {
    playerPig.userData.triggerHeadbutt();
  }
  sfx.butt();

  const aim = getAimDirection();
  const fwd = new THREE.Vector3(aim.x, 0, aim.z).normalize();

  if (grabbedObj) {
    const obj = grabbedObj;
    releaseGrabbed(false);
    markByPlayer(obj.body, 3.5);
    obj.body.wakeUp();
    const launchSpeed = 30;
    obj.body.velocity.set(aim.x * launchSpeed, Math.max(7.5, aim.y * launchSpeed + 9.5), aim.z * launchSpeed);
    obj.body.angularVelocity.set(12, 8, -10);
    if (obj.npc) {
      obj.npc.ragdollTimer = 2.4;
      obj.npc.fleeTimer = 6.0;
      sfx.oink();
    }
    spawnBurst(obj.body.position, 0xff80ba, 10, 9);
    addTrick(`Свинский запуск: ${obj.name}!`, 175, obj.body.position, '#ff96d0');
    return;
  }

  const origin = playerBody.position;
  const wavePos = new THREE.Vector3(origin.x + fwd.x * 1.3, origin.y + 0.2, origin.z + fwd.z * 1.3);
  spawnBurst(wavePos, 0xffffff, 7, 6);

  let hitCount = 0;
  for (const brk of breakables) {
    if (brk.broken) continue;
    const toBrk = new THREE.Vector3(brk.pos.x - origin.x, 0, brk.pos.z - origin.z);
    const dist = toBrk.length();
    if (dist < 4.6 && (toBrk.normalize().dot(fwd) > 0.20 || dist < 2.0)) {
      hitCount++;
      shatterBreakable(brk, fwd, 14, true);
    }
  }

  for (const p of dynamicProps) {
    const toObj = new THREE.Vector3(p.body.position.x - origin.x, p.body.position.y - origin.y, p.body.position.z - origin.z);
    const dist = toObj.length();
    if (dist < 4.5 && (toObj.normalize().dot(fwd) > 0.22 || dist < 1.9)) {
      hitCount++;
      markByPlayer(p.body, 3.0);
      if (p.explosive && !p.exploded) {
        explodeBarrel(p);
      } else {
        p.body.wakeUp();
        p.body.applyImpulse(new CANNON.Vec3(fwd.x * 195, 115, fwd.z * 195));
        p.body.angularVelocity.set((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
        sfx.crate();
        spawnBurst(p.body.position, p.burstColor || 0xd49b50, 6, 6, 1.0, true);
        addTrick(`Боднул: ${p.name}!`, p.points || 150, p.body.position);
      }
    }
  }

  for (const npc of npcs) {
    const toNpc = new THREE.Vector3(npc.body.position.x - origin.x, 0, npc.body.position.z - origin.z);
    const dist = toNpc.length();
    if (dist < 4.6 && (toNpc.normalize().dot(fwd) > 0.18 || dist < 1.9)) {
      hitCount++;
      markByPlayer(npc.body, 3.0);
      knockNpc(npc, new CANNON.Vec3(fwd.x, 0, fwd.z), 20, 'Мощный бод!', true);
    }
  }

  for (const v of vehicles) {
    const toCar = new THREE.Vector3(v.body.position.x - origin.x, 0, v.body.position.z - origin.z);
    const dist = toCar.length();
    if (dist < 5.6 && (toCar.clone().normalize().dot(fwd) > 0.16 || dist < 3.1)) {
      hitCount++;
      markByPlayer(v.body, 4.0);
      v.body.wakeUp();
      v.body.applyImpulse(new CANNON.Vec3(fwd.x * 620, 290, fwd.z * 620));
      v.body.angularVelocity.set(
        fwd.z * 3.8 + (Math.random() - 0.5) * 2.5,
        (Math.random() - 0.5) * 4.5,
        -fwd.x * 3.8 + (Math.random() - 0.5) * 2.5
      );
      sfx.carHit();
      if (Math.random() < 0.45) sfx.horn();
      spawnBurst(v.body.position, 0xffe44a, 10, 9);
      addTrick(`Боднул ${v.name}!`, 220, v.body.position, '#ffd970');
    }
  }

  const toTr = new THREE.Vector3(tractor.body.position.x - origin.x, 0, tractor.body.position.z - origin.z);
  if (toTr.length() < 4.8 && toTr.normalize().dot(fwd) > 0.2) {
    markByPlayer(tractor.body, 3.0);
    tractor.body.wakeUp();
    tractor.body.applyImpulse(new CANNON.Vec3(fwd.x * 800, 320, fwd.z * 800));
    hitCount++;
    addTrick('Боднул трактор!', 120, tractor.body.position);
  }

  playerBody.velocity.x += fwd.x * (hitCount > 0 ? 3.5 : 6.0);
  playerBody.velocity.z += fwd.z * (hitCount > 0 ? 3.5 : 6.0);
}

// ----------------------------------------------------------------------------
// 9. ОБНОВЛЕНИЕ БАТУТОВ И ВЕТРЯНОЙ МЕЛЬНИЦЫ
// ----------------------------------------------------------------------------
let millHitCooldown = 0;

function updateWorldMechanics(dt) {
  // Крутящиеся лопасти ветряной мельницы (сбивают и подбрасывают игрока!)
  if (windmillBlades) {
    windmillBlades.rotation.z += dt * 1.45;
    if (millHitCooldown > 0) millHitCooldown -= dt;

    const targetPos = inTractor ? tractor.body.position : playerBody.position;
    const distToHub = Math.hypot(targetPos.x - windmillHubWorld.x, targetPos.z - windmillHubWorld.z);
    if (distToHub < 14 && targetPos.y > 1.2 && targetPos.y < 23 && millHitCooldown <= 0) {
      // Проверяем расстояние до креста лопастей в плоскости XY
      const lx = targetPos.x - windmillHubWorld.x;
      const ly = targetPos.y - windmillHubWorld.y;
      const lz = Math.abs(targetPos.z - windmillHubWorld.z);
      if (lz < 1.8) {
        const ang = -windmillBlades.rotation.z;
        const rx = lx * Math.cos(ang) - ly * Math.sin(ang);
        const ry = lx * Math.sin(ang) + ly * Math.cos(ang);
        const hitBlade = (Math.abs(rx) < 1.2 && Math.abs(ry) < 10.6) || (Math.abs(ry) < 1.2 && Math.abs(rx) < 10.6);
        if (hitBlade) {
          millHitCooldown = 0.9;
          sfx.boing();
          spawnBurst(targetPos, 0xffe44a, 14, 11);
          if (inTractor) {
            tractor.body.velocity.set((Math.random() - 0.5) * 18, 17, 16);
            addTrick('Мельница-катапульта!', 350, targetPos, '#ffd970');
          } else {
            if (!isRagdoll) toggleRagdoll();
            playerBody.velocity.set((Math.random() - 0.5) * 16, 22, 18);
            addTrick('Унесённый ветряком!', 350, targetPos, '#ffd970');
          }
        }
      }
    }
  }

  // Плеск в озере на Юге
  if (waterSplashCooldown > 0) waterSplashCooldown -= dt;
  const p = inTractor ? tractor.body.position : playerBody.position;
  if (Math.hypot(p.x, p.z - 156) < 31 && p.y < 0.75) {
    if (waterSplashCooldown <= 0 && (inTractor ? tractor.body.velocity.length() : playerBody.velocity.length()) > 3.5) {
      waterSplashCooldown = 0.55;
      sfx.splash();
      spawnBurst(p, 0x8ce8ff, 8, 6, 1.0);
    }
  }

  // Батуты (поддержка yBase для батутов на вылетах полутрубы!)
  for (const tr of trampolines) {
    if (tr.bounceAnim > 0) {
      tr.bounceAnim = Math.max(0, tr.bounceAnim - dt * 4.5);
      const s = 1 + Math.sin(tr.bounceAnim * Math.PI * 3) * 0.18 * tr.bounceAnim;
      tr.pad.position.y = 0.80 - Math.sin(tr.bounceAnim * Math.PI * 3) * 0.14 * tr.bounceAnim;
      tr.pad.scale.set(s, 1, s);
    } else {
      tr.pad.position.y = 0.80;
      tr.pad.scale.set(1, 1, 1);
    }

    if (!inTractor) {
      const dist = Math.hypot(playerBody.position.x - tr.x, playerBody.position.z - tr.z);
      if (dist < tr.radius && Math.abs(playerBody.position.y - (tr.yBase + 1.0)) < 0.95 && playerBody.velocity.y < 6) {
        const last = tr.cooldowns.get('player') || -10;
        if (elapsedTime - last > 0.35) {
          tr.cooldowns.set('player', elapsedTime);
          tr.bounceAnim = 1.0;
          playerBody.velocity.y = tr.power;
          const mv = getMoveInputs();
          const hasInput = Math.hypot(mv.mx, mv.mz) > 0.12;
          const sinY = Math.sin(camYaw), cosY = Math.cos(camYaw);
          const dirX = hasInput ? (mv.mx * cosY + mv.mz * sinY) : Math.sin(playerYaw);
          const dirZ = hasInput ? (-mv.mx * sinY + mv.mz * cosY) : Math.cos(playerYaw);
          const boostHoriz = hasInput ? 13.5 : 6.8;
          playerBody.velocity.x = dirX * boostHoriz;
          playerBody.velocity.z = dirZ * boostHoriz;
          sfx.boing();
          spawnBurst(new THREE.Vector3(tr.x, tr.yBase + 0.9, tr.z), 0xffe24a, 10, 8);
          addTrick('Батутный космонавт', 250, playerBody.position, '#6be8ff');
        }
      }
    } else {
      const dist = Math.hypot(tractor.body.position.x - tr.x, tractor.body.position.z - tr.z);
      if (dist < tr.radius + 0.6 && Math.abs(tractor.body.position.y - (tr.yBase + 1.2)) < 1.2 && tractor.body.velocity.y < 5) {
        const last = tr.cooldowns.get('tractor') || -10;
        if (elapsedTime - last > 0.5) {
          tr.cooldowns.set('tractor', elapsedTime);
          tr.bounceAnim = 1.0;
          tractor.body.velocity.y = tr.power * 0.72;
          sfx.boing();
          addTrick('Летающий трактор!', 400, tractor.body.position, '#6be8ff');
        }
      }
    }
  }
}

// ----------------------------------------------------------------------------
// 10. КРУГЛЫЙ РАДАР (МИНИ-КАРТА 90x90 PX) И ИНДИКАТОР РАЙОНА
// ----------------------------------------------------------------------------
const radarCanvas = document.getElementById('radar-canvas');
const radarCtx = radarCanvas.getContext('2d');
const zonePill = document.getElementById('zone-pill');

const RADAR_BIOMES = [
  { name: 'Деревенская площадь', x: 0,    z: 0,    r: 22, color: '#d8c5a3' },
  { name: 'Большая ферма',       x: 0,    z: -140, r: 34, color: '#d95345' },
  { name: 'Стройплощадка',       x: 140,  z: 0,    r: 34, color: '#9ba3ad' },
  { name: 'Озеро и пляж',        x: 0,    z: 146,  r: 44, color: '#edd082' },
  { name: 'Озеро и пляж',        x: 0,    z: 156,  r: 30, color: '#32a8eb' },
  { name: 'Лес и скейт-парк',    x: -140, z: 0,    r: 34, color: '#7e8996' },
];

function updateRadarAndZone() {
  const ref = inTractor ? tractor.body.position : playerBody.position;

  // Определяем текущий биом для компактной подписи рядом с радаром
  let currentZone = 'Долина';
  for (const b of RADAR_BIOMES) {
    if (Math.hypot(ref.x - b.x, ref.z - b.z) < b.r + 12) {
      currentZone = b.name;
      break;
    }
  }
  if (zonePill.textContent !== currentZone) zonePill.textContent = currentZone;

  const size = 90;
  const cx = size / 2;
  const cy = size / 2;
  const scale = 0.22; // 1 метр = 0.22 px (видимый радиус ~200м вокруг хряка)

  radarCtx.clearRect(0, 0, size, size);
  radarCtx.fillStyle = '#4e963d';
  radarCtx.fillRect(0, 0, size, size);

  radarCtx.save();
  radarCtx.translate(cx, cy);
  // Вращаем радар по направлению камеры (camYaw = 0 -> вверх смотрит -Z)
  radarCtx.rotate(camYaw);

  // Дороги (крест 390м)
  radarCtx.fillStyle = '#6e7682';
  const rLen = 390 * scale;
  const rW = 10 * scale;
  radarCtx.fillRect(-ref.x * scale - rW / 2, -ref.z * scale - rLen / 2, rW, rLen);
  radarCtx.fillRect(-ref.x * scale - rLen / 2, -ref.z * scale - rW / 2, rLen, rW);

  // Тематические зоны (биомы)
  for (const b of RADAR_BIOMES) {
    const bx = (b.x - ref.x) * scale;
    const bz = (b.z - ref.z) * scale;
    radarCtx.fillStyle = b.color;
    radarCtx.beginPath();
    radarCtx.arc(bx, bz, b.r * scale, 0, Math.PI * 2);
    radarCtx.fill();
  }

  // Несобранные Золотые жёлуди (мерцающие точки)
  radarCtx.fillStyle = '#ffe44a';
  for (const ac of goldenAcorns) {
    if (ac.collected) continue;
    const ax = (ac.group.position.x - ref.x) * scale;
    const az = (ac.group.position.z - ref.z) * scale;
    if (ax * ax + az * az < 38 * 38) {
      radarCtx.beginPath();
      radarCtx.arc(ax, az, 2.0, 0, Math.PI * 2);
      radarCtx.fill();
    }
  }

  // Машины вдоль дорог и на площади (оранжевые метки на радаре)
  radarCtx.fillStyle = '#ff8c42';
  for (const v of vehicles) {
    const vx = (v.body.position.x - ref.x) * scale;
    const vz = (v.body.position.z - ref.z) * scale;
    if (vx * vx + vz * vz < 38 * 38) {
      radarCtx.beginPath();
      radarCtx.arc(vx, vz, 2.0, 0, Math.PI * 2);
      radarCtx.fill();
    }
  }

  // Позиция трактора (синий маркер с белой обводкой)
  if (!inTractor) {
    const tx = (tractor.body.position.x - ref.x) * scale;
    const tz = (tractor.body.position.z - ref.z) * scale;
    const d = Math.hypot(tx, tz);
    const clampD = Math.min(d, 38);
    const ang = Math.atan2(tz, tx);
    const px = Math.cos(ang) * clampD;
    const pz = Math.sin(ang) * clampD;

    radarCtx.fillStyle = '#2da0ff';
    radarCtx.strokeStyle = '#ffffff';
    radarCtx.lineWidth = 1.4;
    radarCtx.beginPath();
    radarCtx.arc(px, pz, 3.4, 0, Math.PI * 2);
    radarCtx.fill();
    radarCtx.stroke();
  }

  radarCtx.restore();

  // Стрелка самого игрока в центре радара (всегда смотрит вперёд)
  radarCtx.fillStyle = '#ff96a8';
  radarCtx.strokeStyle = '#24140d';
  radarCtx.lineWidth = 1.5;
  radarCtx.beginPath();
  radarCtx.moveTo(cx, cy - 5.5);
  radarCtx.lineTo(cx + 4.2, cy + 4.5);
  radarCtx.lineTo(cx, cy + 2.2);
  radarCtx.lineTo(cx - 4.2, cy + 4.5);
  radarCtx.closePath();
  radarCtx.fill();
  radarCtx.stroke();

  // Буква «С» (Север) на краю ободка радара
  const northAng = camYaw - Math.PI / 2;
  const nx = cx + Math.cos(northAng) * 37;
  const ny = cy + Math.sin(northAng) * 37;
  radarCtx.fillStyle = '#ffd970';
  radarCtx.font = '900 9px sans-serif';
  radarCtx.textAlign = 'center';
  radarCtx.textBaseline = 'middle';
  radarCtx.fillText('С', nx, ny);
}

let firstPerson = false;
let inTractor = false;
let nitroActive = false;
let camYaw = 0;
let camPitch = 0.28;
let playerYaw = Math.PI;
let targetYaw = Math.PI;
let elapsedTime = 0;

function lerpAngle(currentYaw, targetAngle, t) {
  const twoPi = Math.PI * 2;
  let diff = ((targetAngle - currentYaw + Math.PI) % twoPi + twoPi) % twoPi - Math.PI;
  return currentYaw + diff * Math.min(1, Math.max(0, t));
}

// ----------------------------------------------------------------------------
// 11. СТРОИМ МИР, ТРАКТОР, NPC, ПРОПСЫ И ЖЁЛУДИ
// ----------------------------------------------------------------------------
preloadHryakModel();
buildWorld();
spawnStaticWorldModels();
clearAndSpawnProps();
clearAndSpawnVehicles();
clearAndSpawnBreakables();
spawnGoldenAcorns();
const tractor = buildTractor(-3, -2);
spawnNpcs();
updateTreeColliderPool();

// ----------------------------------------------------------------------------
// 12. УПРАВЛЕНИЕ, НИТРО ТРАКТОРА И СМЕНА ПОРОДЫ
// ----------------------------------------------------------------------------

const keys = {};
const joy = { x: 0, y: 0, active: false, id: null };

window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'Space') { e.preventDefault(); triggerJump(); }
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') setNitro(true);
  if (e.code === 'KeyR') toggleRagdoll();
  if (e.code === 'KeyE' || e.code === 'KeyQ') toggleStickySnout();
  if (e.code === 'KeyF') doHeadbutt();
  if (e.code === 'KeyT') toggleTractor();
  if (e.code === 'KeyV') toggleCameraMode();
  // Смена породы (KeyC) временно отключена до добавления новых 3D-моделей
});
window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') setNitro(false);
});

let mouseDragging = false;
canvas.addEventListener('mousedown', (e) => {
  sfx.init();
  if (e.button === 0) {
    if (document.pointerLockElement === canvas) doHeadbutt();
    else {
      mouseDragging = true;
      doHeadbutt();
      if (!isMobile && canvas.requestPointerLock) {
        try { canvas.requestPointerLock(); } catch (_) {}
      }
    }
  } else if (e.button === 2) toggleStickySnout();
});
window.addEventListener('mouseup', () => { mouseDragging = false; });
window.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement === canvas || mouseDragging) {
    camYaw -= e.movementX * 0.0038;
    camPitch = Math.max(-0.55, Math.min(1.15, camPitch + e.movementY * 0.0032));
  }
});

const joyZone = document.getElementById('joystick-zone');
const joyKnob = document.getElementById('joystick-knob');

function updateJoystick(cx0, cy0) {
  const rect = joyZone.getBoundingClientRect();
  const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
  const maxR = rect.width * 0.36;
  let dx = cx0 - cx, dy = cy0 - cy;
  const dist = Math.hypot(dx, dy);
  if (dist > maxR) { dx = (dx / dist) * maxR; dy = (dy / dist) * maxR; }
  joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  joy.x = dx / maxR; joy.y = dy / maxR;
}
joyZone.addEventListener('pointerdown', (e) => {
  e.stopPropagation(); sfx.init();
  joyZone.setPointerCapture(e.pointerId);
  joy.active = true; joy.id = e.pointerId;
  updateJoystick(e.clientX, e.clientY);
});
joyZone.addEventListener('pointermove', (e) => {
  if (!joy.active || e.pointerId !== joy.id) return;
  e.stopPropagation(); updateJoystick(e.clientX, e.clientY);
});
function endJoy(e) {
  if (e.pointerId !== joy.id) return;
  joy.active = false; joy.id = null; joy.x = 0; joy.y = 0;
  joyKnob.style.transform = 'translate(-50%, -50%)';
}
joyZone.addEventListener('pointerup', endJoy);
joyZone.addEventListener('pointercancel', endJoy);

let camTouchId = null, lastTX = 0, lastTY = 0;
canvas.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'touch') return;
  sfx.init();
  if (camTouchId === null) { camTouchId = e.pointerId; lastTX = e.clientX; lastTY = e.clientY; }
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'touch' || e.pointerId !== camTouchId) return;
  camYaw -= (e.clientX - lastTX) * 0.0065;
  camPitch = Math.max(-0.5, Math.min(1.12, camPitch + (e.clientY - lastTY) * 0.0052));
  lastTX = e.clientX; lastTY = e.clientY;
});
function endCamTouch(e) { if (e.pointerId === camTouchId) camTouchId = null; }
canvas.addEventListener('pointerup', endCamTouch);
canvas.addEventListener('pointercancel', endCamTouch);

const btnBreed   = document.getElementById('btn-breed');
const btnCam     = document.getElementById('btn-cam');
const btnSound   = document.getElementById('btn-sound');
const btnReset   = document.getElementById('btn-reset');
const btnButt    = document.getElementById('btn-butt');
const btnJump    = document.getElementById('btn-jump');
const tractorBtn  = document.getElementById('tractor-btn');
const btnTrNitro  = document.getElementById('btn-tr-nitro');
const btnTrHorn   = document.getElementById('btn-tr-horn');
const crosshair   = document.getElementById('crosshair');

function updateActionPadMode() {
  btnButt.style.display    = inTractor ? 'none' : 'flex';
  btnSnout.style.display   = inTractor ? 'none' : 'flex';
  btnRagdoll.style.display = inTractor ? 'none' : 'flex';
  btnTrNitro.style.display = inTractor ? 'flex' : 'none';
  btnTrHorn.style.display  = inTractor ? 'flex' : 'none';
}

function setNitro(active) {
  if (!inTractor) {
    nitroActive = false;
    btnTrNitro.classList.remove('boosting', 'pressed');
    return;
  }
  if (active && !nitroActive) {
    sfx.nitro();
    const fwd = new CANNON.Vec3(0, 0, 1);
    tractor.body.quaternion.vmult(fwd, fwd);
    tractor.body.wakeUp();
    tractor.body.velocity.x += fwd.x * 7.5;
    tractor.body.velocity.z += fwd.z * 7.5;
  }
  nitroActive = active;
  btnTrNitro.classList.toggle('boosting', active);
  btnTrNitro.classList.toggle('pressed', active);
}

btnTrNitro.addEventListener('pointerdown', (e) => {
  e.stopPropagation(); e.preventDefault(); sfx.init();
  setNitro(true);
});
['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => {
  btnTrNitro.addEventListener(ev, () => setNitro(false));
});

// Выбор породы/скинов временно отключён, пока не добавлены отдельные 3D-модели
if (btnBreed) btnBreed.style.display = 'none';
function switchPlayerBreed() {}

function toggleCameraMode() {
  firstPerson = !firstPerson;
  btnCam.innerHTML = `${firstPerson ? ICONS.eyeFp : ICONS.eye}<span>${firstPerson ? '1-е лицо' : '3-е лицо'}</span>`;
  btnCam.classList.toggle('active', firstPerson);
  crosshair.style.display = firstPerson ? 'block' : 'none';
  fpRig.visible = firstPerson && !inTractor;
  if (!inTractor) playerPig.visible = !firstPerson;
  else tractor.driverPig.visible = !firstPerson;
}

function triggerJump() {
  if (inTractor) {
    if (elapsedTime - tractor.lastGrounded < 0.22) {
      tractor.body.velocity.y = 8.8;
      sfx.jump();
    }
    return;
  }
  if (isRagdoll) {
    if (elapsedTime - playerLastGrounded < 0.25) {
      playerBody.velocity.y = 9.8;
      playerBody.angularVelocity.x += (Math.random() - 0.5) * 14;
      playerBody.angularVelocity.z += (Math.random() - 0.5) * 14;
      playerLastGrounded = -10;
      sfx.flop();
    }
    return;
  }
  if (elapsedTime - playerLastGrounded < 0.24) {
    playerBody.velocity.y = 11.8;
    playerLastGrounded = -10;
    sfx.jump();
    spawnBurst(new THREE.Vector3(playerBody.position.x, Math.max(0.04, playerBody.position.y - PLAYER_SPHERE_R), playerBody.position.z), 0xeff7dc, 6, 3.2, 0.65);
  }
}

function canEnterTractor() {
  if (inTractor) return true;
  return playerBody.position.distanceTo(tractor.body.position) < 4.8;
}

function toggleTractor() {
  if (!inTractor) {
    if (!canEnterTractor()) return;
    if (isRagdoll) toggleRagdoll();
    if (grabbedObj) releaseGrabbed(false);
    inTractor = true;
    playerPig.visible = false;
    playerBody.collisionResponse = false;
    playerBody.type = CANNON.Body.KINEMATIC;
    playerBody.velocity.set(0, 0, 0);
    tractor.driverPig.visible = !firstPerson;
    fpRig.visible = false;
    updateActionPadMode();
    sfx.horn();
    spawnFloatText(tractor.body.position, 'ПОГНАЛИ!');
  } else {
    inTractor = false;
    setNitro(false);
    updateActionPadMode();
    tractor.driverPig.visible = false;
    const sideOffset = new CANNON.Vec3(2.3, 1.0, 0);
    tractor.body.quaternion.vmult(sideOffset, sideOffset);
    playerBody.type = CANNON.Body.DYNAMIC;
    playerBody.collisionResponse = true;
    const trFwd = new CANNON.Vec3(0, 0, 1);
    tractor.body.quaternion.vmult(trFwd, trFwd);
    playerYaw = Math.atan2(trFwd.x, trFwd.z);
    targetYaw = playerYaw;
    playerBody.position.copy(tractor.body.position).vadd(sideOffset, playerBody.position);
    playerBody.velocity.set(tractor.body.velocity.x * 0.35, 3.8, tractor.body.velocity.z * 0.35);
    playerPig.visible = !firstPerson;
    fpRig.visible = firstPerson;
  }
}

function resetSandbox() {
  if (grabbedObj) releaseGrabbed(false);
  if (isRagdoll) toggleRagdoll();
  clearAndSpawnProps();
  clearAndSpawnVehicles();
  clearAndSpawnBreakables();
  tractor.body.position.set(-3, 1.3, -2);
  tractor.body.velocity.set(0, 0, 0);
  tractor.body.angularVelocity.set(0, 0, 0);
  tractor.body.quaternion.set(0, 0, 0, 1);
  spawnFloatText(playerBody.position, 'СБРОС ПЕСОЧНИЦЫ!', '#75ff88');
}

// Кнопка смены породы скрыта и отключена
btnCam.addEventListener('click', (e) => { e.stopPropagation(); toggleCameraMode(); });
btnSound.addEventListener('click', (e) => {
  e.stopPropagation(); sfx.enabled = !sfx.enabled;
  btnSound.innerHTML = sfx.enabled ? ICONS.soundOn : ICONS.soundOff;
});
btnReset.addEventListener('click', (e) => { e.stopPropagation(); resetSandbox(); });
tractorBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleTractor(); });

function bindTouchBtn(el, fn) {
  el.addEventListener('pointerdown', (e) => {
    e.stopPropagation(); e.preventDefault(); sfx.init();
    el.classList.add('pressed'); fn();
  });
  const un = () => el.classList.remove('pressed');
  el.addEventListener('pointerup', un);
  el.addEventListener('pointercancel', un);
  el.addEventListener('pointerleave', un);
}

bindTouchBtn(btnJump, triggerJump);
bindTouchBtn(btnButt, doHeadbutt);
bindTouchBtn(btnSnout, toggleStickySnout);
bindTouchBtn(btnRagdoll, toggleRagdoll);
bindTouchBtn(btnTrHorn, doTractorHorn);

document.getElementById('rotate-tip').addEventListener('click', function () { this.style.display = 'none'; });

// ----------------------------------------------------------------------------
// 13. ГЛАВНЫЙ ЦИКЛ (С ОПТИМИЗАЦИЕЙ ПРОПСОВ И ТЕНЕЙ В МИРЕ 500x500)
// ----------------------------------------------------------------------------
function getMoveInputs() {
  let mx = 0, mz = 0;
  if (keys.KeyW || keys.ArrowUp)    mz -= 1;
  if (keys.KeyS || keys.ArrowDown)  mz += 1;
  if (keys.KeyA || keys.ArrowLeft)  mx -= 1;
  if (keys.KeyD || keys.ArrowRight) mx += 1;
  if (joy.active) { mx += joy.x; mz += joy.y; }
  const len = Math.hypot(mx, mz);
  if (len > 1) { mx /= len; mz /= len; }
  return { mx, mz };
}

function updatePlayer(dt, input) {
  const { mx, mz } = input;
  const moving = Math.hypot(mx, mz) > 0.08;
  const grounded = (elapsedTime - playerLastGrounded) < 0.20;

  // Сжатие-растяжение (squash & stretch) и лёгкая пыль при приземлении на землю
  if (!playerWasGrounded && grounded && playerPrevVelY < -3.2) {
    const landStrength = Math.min(1.4, Math.abs(playerPrevVelY) / 11.5);
    if (playerPig.userData && playerPig.userData.triggerLand) {
      playerPig.userData.triggerLand(landStrength);
    }
    if (landStrength > 0.55) {
      spawnBurst(new THREE.Vector3(playerBody.position.x, Math.max(0.04, playerBody.position.y - PLAYER_SPHERE_R), playerBody.position.z), 0xeff7dc, 5, 3.0, 0.58);
    }
  }
  playerWasGrounded = grounded;
  playerPrevVelY = playerBody.velocity.y;

  const sinY = Math.sin(camYaw), cosY = Math.cos(camYaw);
  const moveX = mx * cosY + mz * sinY;
  const moveZ = -mx * sinY + mz * cosY;

  if (Math.abs(camera.fov - 62) > 0.05) {
    camera.fov += (62 - camera.fov) * Math.min(1, dt * 8);
    camera.updateProjectionMatrix();
  }
  const p = playerBody.position;
  onSlideNow = slideZone && p.x > slideZone.xMin && p.x < slideZone.xMax &&
               Math.abs(p.z - slideZone.zCenter) < slideZone.halfW && p.y > 0.45 && p.y < 10.5;
  if (slideTrickCooldown > 0) slideTrickCooldown -= dt;
  if (onSlideNow) {
    playerBody.velocity.x += 12 * dt;
    if (slideTrickCooldown <= 0 && playerBody.velocity.x > 8) {
      slideTrickCooldown = 4.0;
      addTrick('Свинская горка!', 300, p, '#ffbe3b');
    }
  }

  if (!grounded && p.y > 2.2) {
    airTime += dt;
    const angSpd = playerBody.angularVelocity.length();
    airSpinAccum += (isRagdoll ? angSpd : (moving ? 2.5 : 0)) * dt;
    if (airSpinAccum > 5.2) {
      airSpinAccum -= 5.2;
      addTrick('Безумное сальто!', 400, p, '#ff73e5');
    }
  } else {
    if (airTime > 1.85) {
      addTrick(`Долгий полёт (${airTime.toFixed(1)}с)`, Math.round(airTime * 110), p, '#75e6ff');
    }
    airTime = 0;
    airSpinAccum = 0;
  }

  if (isRagdoll) {
    if (moving) {
      playerBody.angularVelocity.x += moveZ * dt * 16;
      playerBody.angularVelocity.z -= moveX * dt * 16;
      if (!grounded) {
        playerBody.velocity.x += moveX * dt * 4.5;
        playerBody.velocity.z += moveZ * dt * 4.5;
      }
    }
    playerPig.position.copy(playerBody.position);
    playerPig.quaternion.copy(playerBody.quaternion);
    playerPig.userData.update(dt, 'ragdoll');
  } else {
    const moveSpeed = (grounded ? 13.5 : 16.5) * 0.7; // Скорость движения уменьшена на 30%
    const accel = grounded ? 18 : (moving ? 14.0 : 1.0);
    if (!onSlideNow) {
      if (grounded || moving) {
        playerBody.velocity.x += ((moving ? moveX * moveSpeed : 0) - playerBody.velocity.x) * Math.min(1, dt * accel);
        playerBody.velocity.z += ((moving ? moveZ * moveSpeed : 0) - playerBody.velocity.z) * Math.min(1, dt * accel);
      } else {
        playerBody.velocity.x *= Math.max(0, 1 - dt * 0.9);
        playerBody.velocity.z *= Math.max(0, 1 - dt * 0.9);
      }
    } else if (moving) {
      playerBody.velocity.z += moveZ * dt * 10;
    }

    // Гасим любые паразитные вращения физического сферического коллайдера при столкновениях
    playerBody.angularVelocity.set(0, 0, 0);
    playerBody.quaternion.set(0, 0, 0, 1);

    if (firstPerson) {
      targetYaw = camYaw + Math.PI;
      playerYaw = targetYaw;
    } else {
      // Целевой угол поворота вычисляется ИСКЛЮЧИТЕЛЬНО из отклонения джойстика/клавиш управления
      if (moving) {
        targetYaw = Math.atan2(moveX, moveZ);
      }
      const turnRate = grounded ? (dt * 10) : (dt * 5);
      playerYaw = lerpAngle(playerYaw, targetYaw, turnRate);
    }

    playerPig.position.set(p.x, p.y + PLAYER_VISUAL_Y_OFFSET, p.z);
    playerPig.rotation.set(0, playerYaw, 0);

    const horizSpeed = Math.hypot(playerBody.velocity.x, playerBody.velocity.z);
    let anim = 'idle';
    if (kickAnimTimer > 0) anim = 'kick';
    else if (!grounded) anim = 'jump';
    else if (moving) anim = 'run';
    else anim = 'idle';

    playerPig.userData.update(dt, anim);

    // Спавн лёгких частиц пыли под копытами при беге (speed > 0.1)
    if (grounded && horizSpeed > 0.1) {
      hoofDustStepTimer -= dt * (1.0 + horizSpeed * 0.14);
      if (hoofDustStepTimer <= 0) {
        hoofDustStepTimer = 0.24;
        hoofDustSide *= -1;
        const sideX = Math.cos(playerYaw) * (0.34 * PLAYER_SCALE) * hoofDustSide;
        const sideZ = -Math.sin(playerYaw) * (0.34 * PLAYER_SCALE) * hoofDustSide;
        const backX = -Math.sin(playerYaw) * (0.42 * PLAYER_SCALE);
        const backZ = -Math.cos(playerYaw) * (0.42 * PLAYER_SCALE);
        spawnBurst(
          new THREE.Vector3(p.x + sideX + backX, 0.04, p.z + sideZ + backZ),
          0xd8cfb8,
          2,
          1.8,
          0.36
        );
      }
    } else {
      hoofDustStepTimer = 0.08;
    }
  }

  playerPig.userData.updateShadow(0.03);

  p.x = Math.max(-HALF_WORLD + 2.5, Math.min(HALF_WORLD - 2.5, p.x));
  p.z = Math.max(-HALF_WORLD + 2.5, Math.min(HALF_WORLD - 2.5, p.z));

  if (firstPerson) {
    const bob = moving ? Math.sin(elapsedTime * 15) * 0.032 : Math.sin(elapsedTime * 2.5) * 0.008;
    const kickZ = kickAnimTimer > 0 ? -0.22 : 0;
    fpSnout.position.set(0, -0.34 + bob, -0.60 + kickZ);
  }
}

function updateTractor(dt, input) {
  const b = tractor.body;
  // Надёжная проверка контакта колёс с землёй, чтобы трактор не терял тягу на поворотах
  if (b.position.y <= 1.22 && Math.abs(b.velocity.y) < 3.5) {
    tractor.lastGrounded = elapsedTime;
  }
  const grounded = (elapsedTime - tractor.lastGrounded) < 0.32;

  const fwd = new CANNON.Vec3(0, 0, 1); b.quaternion.vmult(fwd, fwd);
  const right = new CANNON.Vec3(1, 0, 0); b.quaternion.vmult(right, right);
  const up = new CANNON.Vec3(0, 1, 0); b.quaternion.vmult(up, up);

  // Горизонтальная проекция направления вперёд (чтобы наклон корпуса не гасил скорость)
  const flatFwd = new THREE.Vector3(fwd.x, 0, fwd.z);
  if (flatFwd.lengthSq() > 0.0001) flatFwd.normalize();
  else flatFwd.set(0, 0, 1);
  const flatRight = new THREE.Vector3(flatFwd.z, 0, -flatFwd.x);

  const forwardSpeed = b.velocity.x * flatFwd.x + b.velocity.z * flatFwd.z;
  const lateralSpeed = b.velocity.x * flatRight.x + b.velocity.z * flatRight.z;

  // Активный стабилизатор против опрокидывания на бок (Anti-Roll), как на видео
  b.angularVelocity.x *= Math.max(0, 1 - dt * 12);
  b.angularVelocity.z *= Math.max(0, 1 - dt * 12);
  if (grounded) {
    const yawOnly = Math.atan2(flatFwd.x, flatFwd.z);
    const uprightQ = new CANNON.Quaternion().setFromEuler(0, yawOnly, 0);
    b.quaternion.slerp(uprightQ, Math.min(1, dt * 10), b.quaternion);
    b.quaternion.normalize();
  } else if (up.y < 0.45) {
    const yawOnly = Math.atan2(flatFwd.x, flatFwd.z);
    b.quaternion.slerp(new CANNON.Quaternion().setFromEuler(0, yawOnly, 0), Math.min(1, dt * 4.5), b.quaternion);
    b.quaternion.normalize();
  }

  if (inTractor) {
    b.wakeUp();
    // Полноценная тяга при диагональном отклонении джойстика + подгазовка при развороте на месте
    let throttle = 0;
    if (nitroActive) {
      throttle = 1.0;
    } else if (-input.mz > 0.10) {
      throttle = Math.min(1.0, Math.hypot(input.mx * 0.72, input.mz));
    } else if (input.mz > 0.14) {
      throttle = -Math.min(1.0, Math.hypot(input.mx * 0.72, input.mz));
    } else if (Math.abs(input.mx) > 0.25 && Math.abs(forwardSpeed) < 3.5) {
      throttle = 0.45;
    }

    const steer = -input.mx;
    tractor.steerVisual += (steer * 0.50 - tractor.steerVisual) * Math.min(1, dt * 12);

    if (grounded) {
      const maxFwd = nitroActive ? 46.0 : 32.0;
      const accelRate = nitroActive ? 54.0 : 38.0;
      if (Math.abs(throttle) > 0.04) {
        const desired = Math.max(-15, Math.min(maxFwd, forwardSpeed + throttle * (throttle > 0 ? accelRate : 28) * dt));
        const dv = desired - forwardSpeed;
        b.velocity.x += flatFwd.x * dv;
        b.velocity.z += flatFwd.z * dv;
      } else {
        b.velocity.x *= Math.max(0, 1 - dt * 1.8);
        b.velocity.z *= Math.max(0, 1 - dt * 1.8);
      }

      // Уверенное сцепление колёс без бокового заноса
      const grip = Math.min(1, dt * 11.5);
      b.velocity.x -= flatRight.x * lateralSpeed * grip;
      b.velocity.z -= flatRight.z * lateralSpeed * grip;

      const sFactor = forwardSpeed < -0.8 ? -1 : 1;
      const turnAuthority = Math.min(1, Math.abs(forwardSpeed) / 4.0 + 0.45);
      b.angularVelocity.y = steer * 2.75 * sFactor * turnAuthority;
    } else {
      b.angularVelocity.y += steer * dt * 1.6;
    }

    playerBody.position.copy(b.position);
    tractor.driverPig.userData.update(dt, Math.abs(forwardSpeed) > 1 ? 'run' : 'idle');

    tractor.smokeTimer -= dt;
    if (tractor.smokeTimer <= 0) {
      tractor.smokeTimer = nitroActive ? 0.03 : (Math.abs(forwardSpeed) > 3 ? 0.08 : 0.24);
      const exW = new THREE.Vector3();
      tractor.exhaust.getWorldPosition(exW); exW.y += 0.62;
      if (nitroActive) {
        spawnBurst(exW, 0xff5500, 1, 5.2, 1.35);
        spawnBurst(exW, 0xffd438, 1, 4.2, 1.05);
        spawnBurst(exW, 0xdce2e8, 1, 3.0, 1.15);
      } else {
        spawnBurst(exW, 0xdce2e8, 1, 2.0, 0.9);
      }
    }
  } else if (grounded) {
    b.velocity.x *= Math.max(0, 1 - dt * 2.4);
    b.velocity.z *= Math.max(0, 1 - dt * 2.4);
    tractor.steerVisual *= Math.max(0, 1 - dt * 6);
  }

  const spin = forwardSpeed * dt * 1.4;
  for (const rw of tractor.rearWheels) rw.rotation.x += spin * 0.72;
  for (const fw of tractor.frontWheels) fw.rotation.x += spin * 1.1;
  for (const fp of tractor.frontSteerPivots) fp.rotation.y = tractor.steerVisual;
  tractor.wheelPivot.rotation.y = tractor.steerVisual * 2.2;
  tractor.visual.position.copy(b.position);
  tractor.visual.quaternion.copy(b.quaternion);
}

const startDist = CAM_DIST_NORMAL;
const smoothCamPos = new THREE.Vector3(
  playerBody.position.x + Math.sin(camYaw) * Math.cos(camPitch) * startDist,
  playerBody.position.y + CAM_HEIGHT_OFFSET + Math.sin(camPitch) * startDist,
  playerBody.position.z + Math.cos(camYaw) * Math.cos(camPitch) * startDist
);
const smoothLookAt = new THREE.Vector3(
  playerBody.position.x,
  playerBody.position.y + CAM_LOOK_Y_OFFSET,
  playerBody.position.z
);
playerPig.position.set(playerBody.position.x, playerBody.position.y + PLAYER_VISUAL_Y_OFFSET, playerBody.position.z);
playerPig.rotation.set(0, playerYaw, 0);
camera.position.copy(smoothCamPos);
camera.lookAt(smoothLookAt);

function updateCamera(dt) {
  const ref = inTractor ? tractor.visual.position : playerBody.position;
  // Двигаем купол неба и солнце за игроком по карте 500x500, чтобы тени оставались чёткими в любом биоме!
  skyDome.position.set(ref.x, 0, ref.z);
  sun.position.set(ref.x + sunDir.x * 95, sunDir.y * 95, ref.z + sunDir.z * 95);
  sun.target.position.set(ref.x, 0, ref.z);

  if (inTractor) {
    const tPos = tractor.visual.position;
    const tQuat = tractor.visual.quaternion;
    if (firstPerson) {
      const eye = new THREE.Vector3(0, 1.55, -0.42).applyQuaternion(tQuat);
      const look = new THREE.Vector3(0, 1.42, 4.5).applyQuaternion(tQuat);
      camera.position.copy(tPos).add(eye);
      camera.lookAt(tPos.x + look.x, tPos.y + look.y, tPos.z + look.z);
      return;
    }
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(tQuat);
    if (tractor.body.velocity.length() > 2.5 && camTouchId === null && !mouseDragging && document.pointerLockElement !== canvas) {
      const ty = Math.atan2(-fwd.x, -fwd.z);
      let diff = ty - camYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      camYaw += diff * Math.min(1, dt * 2.4);
    }
    const targetFov = nitroActive ? 68 : 62;
    if (Math.abs(camera.fov - targetFov) > 0.05) {
      camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 8);
      camera.updateProjectionMatrix();
    }
    const dist = nitroActive ? 11.2 : 10.2;
    smoothCamPos.lerp(new THREE.Vector3(
      tPos.x + Math.sin(camYaw) * Math.cos(camPitch) * dist,
      Math.max(1.2, tPos.y + 2.4 + Math.sin(camPitch) * dist),
      tPos.z + Math.cos(camYaw) * Math.cos(camPitch) * dist
    ), Math.min(1, dt * 10));
    smoothLookAt.lerp(new THREE.Vector3(tPos.x, tPos.y + 1.35, tPos.z), Math.min(1, dt * 12));
    camera.position.copy(smoothCamPos);
    camera.lookAt(smoothLookAt);
    return;
  }

  const p = playerBody.position;
  if (firstPerson) {
    camera.position.set(p.x, p.y + 0.32 * 1.45, p.z);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = camYaw;
    camera.rotation.x = -camPitch;
    camera.rotation.z = isRagdoll ? Math.sin(elapsedTime * 8) * 0.25 : 0;
  } else {
    const dist = isRagdoll ? CAM_DIST_RAGDOLL : CAM_DIST_NORMAL;
    smoothCamPos.lerp(new THREE.Vector3(
      p.x + Math.sin(camYaw) * Math.cos(camPitch) * dist,
      Math.max(0.45, p.y + CAM_HEIGHT_OFFSET + Math.sin(camPitch) * dist),
      p.z + Math.cos(camYaw) * Math.cos(camPitch) * dist
    ), Math.min(1, dt * 11));
    smoothLookAt.lerp(new THREE.Vector3(p.x, p.y + CAM_LOOK_Y_OFFSET, p.z), Math.min(1, dt * 14));
    camera.position.copy(smoothCamPos);
    camera.lookAt(smoothLookAt);
  }
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
let poolUpdateTimer = 0;

function syncGroundedFromContacts() {
  for (let i = 0; i < world.contacts.length; i++) {
    const c = world.contacts[i];
    if (c.bi === playerBody || c.bj === playerBody) {
      const ny = (c.bi === playerBody) ? -c.ni.y : c.ni.y;
      if (ny > 0.35) playerLastGrounded = elapsedTime;
    }
    if (c.bi === tractor.body || c.bj === tractor.body) {
      const ny = (c.bi === tractor.body) ? -c.ni.y : c.ni.y;
      if (ny > 0.35) tractor.lastGrounded = elapsedTime;
    }
  }
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsedTime += dt;
  if (kickAnimTimer > 0) kickAnimTimer -= dt;
  if (actionCooldown > 0) actionCooldown -= dt;

  // Обновляем пул физических коллайдеров деревьев (радиус 30м) 5 раз в секунду
  poolUpdateTimer -= dt;
  if (poolUpdateTimer <= 0) {
    poolUpdateTimer = 0.2;
    updateTreeColliderPool();
  }

  const input = getMoveInputs();

  if (!inTractor) updatePlayer(dt, input);
  else playerPig.userData.updateShadow(0.03);

  updateTractor(dt, input);
  updateNpcs(dt);
  updateWorldMechanics(dt);
  updateStickySnout();
  updateGoldenAcorns(dt);
  updateCombo(dt);

  world.step(1 / 60, dt, 3);
  syncGroundedFromContacts();

  // Динамические пропсы: авто-сон дальше 75м для экономии CPU на телефонах
  const refPos = inTractor ? tractor.body.position : playerBody.position;
  for (const p of dynamicProps) {
    if (p.hitCooldown > 0) p.hitCooldown -= dt;
    const dist = Math.hypot(p.body.position.x - refPos.x, p.body.position.z - refPos.z);
    if (dist > 75 && p !== grabbedObj) {
      if (p.body.sleepState !== CANNON.Body.SLEEPING) p.body.sleep();
      continue;
    }
    p.mesh.position.copy(p.body.position);
    p.mesh.quaternion.copy(p.body.quaternion);
  }

  // Интерактивные машины: синхронизация физики и авто-сон дальше 85м
  for (const v of vehicles) {
    if (v.hitCooldown > 0) v.hitCooldown -= dt;
    if (v.pushCooldown > 0) v.pushCooldown -= dt;
    const dist = Math.hypot(v.body.position.x - refPos.x, v.body.position.z - refPos.z);
    if (dist > 85 && v !== grabbedObj) {
      if (v.body.sleepState !== CANNON.Body.SLEEPING) v.body.sleep();
      continue;
    }
    v.mesh.position.copy(v.body.position);
    v.mesh.quaternion.copy(v.body.quaternion);
  }

  for (let i = debrisList.length - 1; i >= 0; i--) {
    const d = debrisList[i];
    d.life -= dt;
    d.mesh.position.copy(d.body.position);
    d.mesh.quaternion.copy(d.body.quaternion);
    if (d.life < 1.2) d.mesh.scale.setScalar(Math.max(0.01, d.life / 1.2));
    if (d.life <= 0) { scene.remove(d.mesh); world.removeBody(d.body); debrisList.splice(i, 1); }
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const pt = particles[i];
    pt.life -= dt;
    pt.vy -= 18 * dt;
    pt.mesh.position.x += pt.vx * dt;
    pt.mesh.position.y = Math.max(0.12, pt.mesh.position.y + pt.vy * dt);
    pt.mesh.position.z += pt.vz * dt;
    pt.mesh.rotation.x += dt * 5;
    pt.mesh.rotation.y += dt * 4;
    pt.mesh.scale.setScalar(Math.max(0.01, (pt.life / pt.maxLife) * pt.baseScale));
    if (pt.life <= 0) { scene.remove(pt.mesh); particles.splice(i, 1); }
  }

  for (let i = shockwaves.length - 1; i >= 0; i--) {
    const sw = shockwaves[i];
    sw.life -= dt;
    const prog = 1 - sw.life / sw.maxLife;
    sw.mesh.scale.setScalar(1 + prog * 6.5);
    sw.mesh.material.opacity = Math.max(0, (1 - prog) * 0.78);
    if (sw.life <= 0) { scene.remove(sw.mesh); shockwaves.splice(i, 1); }
  }

  const nearTr = canEnterTractor();
  if (nearTr) {
    tractorBtn.style.display = 'inline-flex';
    tractorBtn.innerHTML = inTractor
      ? `${ICONS.exit}<span>${isMobile ? 'ВЫЙТИ' : 'ВЫЙТИ [T]'}</span>`
      : `${ICONS.tractor}<span>${isMobile ? 'СЕСТЬ В ТРАКТОР' : 'СЕСТЬ В ТРАКТОР [T]'}</span>`;
  } else {
    tractorBtn.style.display = 'none';
  }

  updateCamera(dt);
  updateRadarAndZone();
  renderer.render(scene, camera);
}

checkLocalGlbProtocolHint();
animate();
