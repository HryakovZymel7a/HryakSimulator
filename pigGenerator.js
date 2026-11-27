// pigGenerator.js — Загрузчик ./models/hryak.glb с кэшированием, анимацией и процедурным fallback
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const PIG_TYPES = Object.freeze({
  MEME: 'classic',      // Главный мемный хряк (оригинальная зашитая текстура hryak.glb)
  CLASSIC: 'classic',   // 1. Обычный мемный хряк
  CURLY: 'curly',       // 2. Кудрявый
  APPLE: 'apple',       // 3. Яблочный
  SPOTTED: 'spotted',   // 4. Пятнистый
  BOAR: 'boar',         // 5. Кабан
  BLACK: 'black',       // 6. Чёрный
  GOLDEN: 'golden',     // 7. Секретный Золотой хряк (за 10 золотых желудей!)
});

export const PIG_LABELS = Object.freeze({
  classic: 'Обычный хряк',
  curly: 'Кудрявый',
  apple: 'Яблочный',
  spotted: 'Пятнистый',
  boar: 'Кабан',
  black: 'Чёрный',
  golden: 'Золотой хряк',
});

const HRYAK_MODEL_URL = './models/hryak.glb';
const HRYAK_TARGET_LENGTH = 2.4; // Увеличенный масштаб (~2.3–2.4 м, солидный размер на фоне домов Kenney)
const HRYAK_FORWARD_YAW = 0;     // Базовый разворот модели (+Z вперёд)

const resourceCache = {
  breedMaterials: new Map(),
  bodyGeoStandard: null,
  bodyGeoApple: null,
  tailGeo: null,
  earGeo: null,
  contactShadowTex: null,
};

// Кэш загруженной 3D-модели ./models/hryak.glb (грузится ровно 1 раз!)
let hryakTemplateCache = null; // { template, size, snoutPos, triangles, materialsByBreed }
let hryakLoadPromise = null;
const hryakLoader = new GLTFLoader();

function setSRGB(tex) {
  if ('SRGBColorSpace' in THREE) tex.colorSpace = THREE.SRGBColorSpace;
  else tex.encoding = THREE.sRGBEncoding;
}

// Сбор и кэширование материалов для каждой породы поверх базовой зашитой текстуры hryak.glb
function buildCachedGlbBreedMaterials(templateRoot) {
  const originalMats = [];
  const matIndexMap = new Map();

  templateRoot.traverse((child) => {
    if (!child.isMesh || !child.material) return;
    child.castShadow = true;
    child.receiveShadow = true;
    if (child.geometry) {
      child.geometry.computeVertexNormals();
    }
    const list = Array.isArray(child.material) ? child.material : [child.material];
    const indices = list.map((mat) => {
      if (!mat) return -1;
      // Принудительный сброс PBR-параметров, чтобы без envMap модель не рендерилась чёрным силуэтом
      if ('metalness' in mat) mat.metalness = 0.05;
      if ('roughness' in mat) mat.roughness = 0.75;
      if (mat.color) mat.color.setHex(0xffffff);
      if (mat.map) {
        if ('SRGBColorSpace' in THREE) mat.map.colorSpace = THREE.SRGBColorSpace;
        else mat.map.encoding = THREE.sRGBEncoding;
        mat.map.needsUpdate = true;
      }
      mat.side = THREE.DoubleSide;
      mat.needsUpdate = true;

      if (!matIndexMap.has(mat)) {
        matIndexMap.set(mat, originalMats.length);
        originalMats.push(mat);
      }
      return matIndexMap.get(mat);
    });
    child.userData._glbMatIndices = indices;
    child.userData._glbMatIsArray = Array.isArray(child.material);
  });

  const breedTints = {
    [PIG_TYPES.CLASSIC]: null, // Оригинальные материалы (цвет 0xffffff, metalness 0.05, roughness 0.75)
    [PIG_TYPES.CURLY]:   { color: 0xf7e6d6 },
    [PIG_TYPES.APPLE]:   { color: 0xe6453c, roughness: 0.55 },
    [PIG_TYPES.SPOTTED]: { color: 0xf2f4fa },
    [PIG_TYPES.BOAR]:    { color: 0x9c7b5c },
    [PIG_TYPES.BLACK]:   { color: 0x52545e },
    [PIG_TYPES.GOLDEN]:  { color: 0xffd547, metalness: 0.25, roughness: 0.35, emissive: 0x5c3d00 },
  };

  const materialsByBreed = new Map();
  for (const [breedKey, spec] of Object.entries(breedTints)) {
    if (!spec) {
      materialsByBreed.set(breedKey, originalMats);
      continue;
    }
    const clonedSet = originalMats.map((orig) => {
      const m = orig.clone();
      if (m.color && spec.color !== undefined) m.color.setHex(spec.color);
      if (spec.metalness !== undefined && 'metalness' in m) m.metalness = spec.metalness;
      if (spec.roughness !== undefined && 'roughness' in m) m.roughness = spec.roughness;
      if (spec.emissive !== undefined && m.emissive) m.emissive.setHex(spec.emissive);
      return m;
    });
    materialsByBreed.set(breedKey, clonedSet);
  }

  return materialsByBreed;
}

function applyCachedGlbMaterials(cloneRoot, matSet) {
  if (!matSet || matSet.length === 0) return;
  cloneRoot.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.castShadow = true;
    obj.receiveShadow = true;
    const indices = obj.userData && obj.userData._glbMatIndices;
    if (!indices) return;
    if (obj.userData._glbMatIsArray) {
      obj.material = indices.map((idx) => (idx >= 0 ? matSet[idx] : obj.material));
    } else if (indices[0] >= 0) {
      obj.material = matSet[indices[0]];
    }
  });
}

/**
 * Загружает ./models/hryak.glb один раз, центрирует по X/Z, ставит копытцами на y = 0,
 * масштабирует до длины ~1.5м, направляет пятачком вперёд (+Z) и кэширует материалы.
 */
export function preloadHryakModel() {
  if (hryakTemplateCache) return Promise.resolve(hryakTemplateCache);
  if (hryakLoadPromise) return hryakLoadPromise;

  hryakLoadPromise = new Promise((resolve) => {
    hryakLoader.load(
      HRYAK_MODEL_URL,
      (gltf) => {
        try {
          const rawModel = gltf.scene || (gltf.scenes && gltf.scenes[0]);
          if (!rawModel) {
            resolve(null);
            return;
          }

          // Обёртка для выравнивания ориентации, масштаба и опоры (y = 0)
          const template = new THREE.Group();
          template.name = 'hryak_glb_template';
          template.add(rawModel);

          rawModel.updateMatrixWorld(true);
          const rawBox = new THREE.Box3().setFromObject(rawModel);
          const rawSize = new THREE.Vector3();
          rawBox.getSize(rawSize);

          // Если модель экспортирована боком (длина вдоль X заметно больше Z), разворачиваем на 90° к +Z
          if (rawSize.x > rawSize.z * 1.15) {
            rawModel.rotation.y += Math.PI / 2;
          }
          if (HRYAK_FORWARD_YAW !== 0) {
            rawModel.rotation.y += HRYAK_FORWARD_YAW;
          }

          template.updateMatrixWorld(true);
          const alignedBox = new THREE.Box3().setFromObject(template);
          const alignedSize = new THREE.Vector3();
          alignedBox.getSize(alignedSize);

          // Масштабируем так, чтобы длина вдоль Z составляла ~1.5 метра
          const currentLength = Math.max(0.001, alignedSize.z);
          const scaleFactor = HRYAK_TARGET_LENGTH / currentLength;
          rawModel.scale.multiplyScalar(scaleFactor);

          // Пересчитываем Box3 после масштабирования: центрируем по X/Z и ставим копытцами на y = 0
          template.updateMatrixWorld(true);
          const scaledBox = new THREE.Box3().setFromObject(template);
          const center = new THREE.Vector3();
          const finalSize = new THREE.Vector3();
          scaledBox.getCenter(center);
          scaledBox.getSize(finalSize);

          rawModel.position.x -= center.x;
          rawModel.position.z -= center.z;
          rawModel.position.y -= scaledBox.min.y;
          template.updateMatrixWorld(true);

          const materialsByBreed = buildCachedGlbBreedMaterials(template);

          let triangles = 0;
          template.traverse((obj) => {
            if (obj.isMesh && obj.geometry) {
              const g = obj.geometry;
              triangles += g.index ? g.index.count / 3 : g.attributes.position.count / 3;
            }
          });

          // Якорь передней точки пятачка (+Z) для липкого языка
          const snoutPos = new THREE.Vector3(0, finalSize.y * 0.56, finalSize.z * 0.50);

          hryakTemplateCache = {
            template,
            size: finalSize,
            snoutPos,
            triangles: Math.round(triangles),
            materialsByBreed,
          };
          resolve(hryakTemplateCache);
        } catch (err) {
          console.warn('Не удалось обработать ./models/hryak.glb, используется процедурный хряк:', err);
          resolve(null);
        }
      },
      undefined,
      (err) => {
        console.warn('Не удалось загрузить ./models/hryak.glb, используется процедурный fallback:', err);
        resolve(null);
      }
    );
  });

  return hryakLoadPromise;
}

// ============================================================================
// ПРОЦЕДУРНЫЙ ХРЯК (FALLBACK НА СЛУЧАЙ ОШИБКИ ЗАГРУЗКИ .GLB + АКСЕССУАРЫ)
// ============================================================================
function createRng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createSmoothTexture(drawFn, repeat = true) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, 256, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  setSRGB(tex);
  tex.wrapS = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  tex.wrapT = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

// Мягкая круглая контактная тень на земле под каждым хряком
function getContactShadowTexture() {
  if (resourceCache.contactShadowTex) return resourceCache.contactShadowTex;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
  g.addColorStop(0.0, 'rgba(22, 16, 12, 0.56)');
  g.addColorStop(0.55, 'rgba(22, 16, 12, 0.28)');
  g.addColorStop(1.0, 'rgba(22, 16, 12, 0.0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  resourceCache.contactShadowTex = tex;
  return tex;
}

function paintSoftSkin(ctx, base, light, shadow, seed) {
  const rng = createRng(seed);
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, light);
  grad.addColorStop(0.55, base);
  grad.addColorStop(1, shadow);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 140; i++) {
    const x = rng() * 256;
    const y = rng() * 256;
    const r = 4 + rng() * 14;
    ctx.fillStyle = rng() > 0.5 ? light : shadow;
    ctx.globalAlpha = 0.08 + rng() * 0.08;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;
}

function createEyeTexture(lidColor) {
  return createSmoothTexture((ctx) => {
    ctx.fillStyle = '#faf7f2';
    ctx.fillRect(0, 0, 256, 256);

    const sh = ctx.createLinearGradient(0, 92, 0, 140);
    sh.addColorStop(0, 'rgba(30,18,14,0.32)');
    sh.addColorStop(1, 'rgba(30,18,14,0)');
    ctx.fillStyle = sh;
    ctx.fillRect(0, 92, 256, 48);

    ctx.fillStyle = '#4e3121';
    ctx.beginPath();
    ctx.arc(128, 138, 56, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#120b09';
    ctx.beginPath();
    ctx.arc(128, 138, 36, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(110, 118, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(146, 154, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = lidColor;
    ctx.fillRect(0, 0, 256, 98);
    ctx.fillStyle = '#231511';
    ctx.fillRect(0, 94, 256, 9);
  }, false);
}

function getBodyGeometry(isApple) {
  if (isApple && resourceCache.bodyGeoApple) return resourceCache.bodyGeoApple;
  if (!isApple && resourceCache.bodyGeoStandard) return resourceCache.bodyGeoStandard;

  const pts = isApple
    ? [
        new THREE.Vector2(0.01, 0.16),
        new THREE.Vector2(0.30, 0.18),
        new THREE.Vector2(0.55, 0.30),
        new THREE.Vector2(0.65, 0.52),
        new THREE.Vector2(0.66, 0.78),
        new THREE.Vector2(0.57, 1.02),
        new THREE.Vector2(0.38, 1.18),
        new THREE.Vector2(0.16, 1.24),
        new THREE.Vector2(0.01, 1.21),
      ]
    : [
        new THREE.Vector2(0.01, 0.18),
        new THREE.Vector2(0.34, 0.21),
        new THREE.Vector2(0.60, 0.36),
        new THREE.Vector2(0.67, 0.56),
        new THREE.Vector2(0.61, 0.78),
        new THREE.Vector2(0.49, 0.98),
        new THREE.Vector2(0.38, 1.16),
        new THREE.Vector2(0.28, 1.29),
        new THREE.Vector2(0.12, 1.35),
        new THREE.Vector2(0.01, 1.36),
      ];

  const geo = new THREE.LatheGeometry(pts, 18);
  geo.computeVertexNormals();

  if (isApple) resourceCache.bodyGeoApple = geo;
  else resourceCache.bodyGeoStandard = geo;
  return geo;
}

function getCurlyTailGeometry() {
  if (resourceCache.tailGeo) return resourceCache.tailGeo;
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.0, 0.0, 0.0),
    new THREE.Vector3(0.0, 0.05, -0.10),
    new THREE.Vector3(0.06, 0.14, -0.16),
    new THREE.Vector3(0.02, 0.21, -0.11),
    new THREE.Vector3(-0.05, 0.16, -0.15),
    new THREE.Vector3(-0.03, 0.11, -0.22),
  ]);
  const geo = new THREE.TubeGeometry(curve, 16, 0.032, 7, false);
  resourceCache.tailGeo = geo;
  return geo;
}

function getEarGeometry() {
  if (resourceCache.earGeo) return resourceCache.earGeo;
  const geo = new THREE.SphereGeometry(0.15, 10, 8);
  geo.scale(0.42, 1.15, 0.85);
  geo.translate(0, -0.05, 0.04);
  resourceCache.earGeo = geo;
  return geo;
}

function getBreedMaterials(type) {
  const key = type === 'meme' ? PIG_TYPES.CLASSIC : type;
  if (resourceCache.breedMaterials.has(key)) {
    return resourceCache.breedMaterials.get(key);
  }

  const palettes = {
    [PIG_TYPES.CLASSIC]: {
      skin: ['#e8be9e', '#f5d4b8', '#cf9c7c'],
      snout: ['#f29aa0', '#ffc0c5', '#d67880'],
      fold: '#cfa080',
      hair: '#221d1c',
      hoof: '#38231a',
      nostril: '#4c2420',
      seed: 101,
    },
    [PIG_TYPES.CURLY]: {
      skin: ['#e0b491', '#f0caa9', '#c49270'],
      snout: ['#ef949b', '#ffbbc0', '#d4747d'],
      fold: '#c79674',
      hair: '#3a261b',
      hoof: '#362119',
      nostril: '#4f2422',
      seed: 202,
    },
    [PIG_TYPES.APPLE]: {
      skin: ['#d62d26', '#ed4940', '#a61a15'],
      snout: ['#f49799', '#ffc0c2', '#d67477'],
      fold: '#b5201a',
      hair: '#6e4527',
      hoof: '#471513',
      nostril: '#331212',
      seed: 303,
    },
    [PIG_TYPES.SPOTTED]: {
      skin: ['#f2f2f5', '#ffffff', '#dcdce3'],
      snout: ['#f29ea2', '#ffc2c5', '#d67c80'],
      fold: '#d6d6df',
      hair: '#1e1e23',
      hoof: '#382c2a',
      nostril: '#3b1e20',
      seed: 404,
    },
    [PIG_TYPES.BOAR]: {
      skin: ['#6e563f', '#876b50', '#523e2c'],
      snout: ['#bf817d', '#d99e9a', '#9c625e'],
      fold: '#574330',
      hair: '#241b15',
      hoof: '#261b15',
      nostril: '#422321',
      seed: 505,
    },
    [PIG_TYPES.BLACK]: {
      skin: ['#3d3e45', '#52535c', '#292a30'],
      snout: ['#484952', '#5f616b', '#303138'],
      fold: '#303138',
      hair: '#141418',
      hoof: '#141418',
      nostril: '#15151a',
      seed: 606,
    },
    [PIG_TYPES.GOLDEN]: {
      skin: ['#ffd03b', '#fff08a', '#d99314'],
      snout: ['#ffe066', '#fff6ad', '#e09b19'],
      fold: '#e09d19',
      hair: '#261c18',
      hoof: '#6b420b',
      nostril: '#593306',
      seed: 777,
    },
  };

  const p = palettes[key] || palettes[PIG_TYPES.CLASSIC];

  const bodyTex = createSmoothTexture((ctx) => {
    paintSoftSkin(ctx, p.skin[0], p.skin[1], p.skin[2], p.seed);
    const rng = createRng(p.seed + 55);

    if (key === PIG_TYPES.SPOTTED) {
      for (let i = 0; i < 18; i++) {
        const sx = rng() * 256;
        const sy = rng() * 256;
        const rx = 14 + rng() * 26;
        const ry = 10 + rng() * 22;
        ctx.fillStyle = rng() > 0.4 ? '#44444a' : '#323238';
        ctx.beginPath();
        ctx.ellipse(sx, sy, rx, ry, rng() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (key === PIG_TYPES.BOAR) {
      ctx.strokeStyle = 'rgba(32, 22, 14, 0.35)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 160; i++) {
        const x = rng() * 256;
        const y = rng() * 256;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (rng() - 0.5) * 4, y + 8 + rng() * 8);
        ctx.stroke();
      }
    }
  });

  const snoutTex = createSmoothTexture((ctx) => {
    paintSoftSkin(ctx, p.snout[0], p.snout[1], p.snout[2], p.seed + 13);
    if (key === PIG_TYPES.SPOTTED) {
      const rng = createRng(p.seed + 91);
      for (let i = 0; i < 30; i++) {
        ctx.fillStyle = rng() > 0.4 ? '#403e44' : '#2c2a30';
        ctx.beginPath();
        ctx.arc(rng() * 256, rng() * 256, 4 + rng() * 9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });

  const isGold = key === PIG_TYPES.GOLDEN;
  const makeStd = (opts) => new THREE.MeshStandardMaterial({
    roughness: isGold ? 0.24 : 0.78,
    metalness: isGold ? 0.72 : 0.03,
    ...opts,
  });

  const mats = {
    body: makeStd({ map: bodyTex, roughness: key === PIG_TYPES.APPLE ? 0.42 : (isGold ? 0.22 : 0.78) }),
    snout: makeStd({ map: snoutTex, roughness: isGold ? 0.25 : 0.58 }),
    fold: makeStd({ color: p.fold, roughness: isGold ? 0.28 : 0.82 }),
    earInner: makeStd({ color: p.snout[0], roughness: isGold ? 0.26 : 0.75 }),
    hair: new THREE.MeshStandardMaterial({ color: p.hair, roughness: 0.90, metalness: 0.04 }),
    hoof: makeStd({ color: p.hoof, roughness: 0.50 }),
    nostril: new THREE.MeshStandardMaterial({ color: p.nostril, roughness: 0.95 }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x4db33b, roughness: 0.62 }),
    crown: new THREE.MeshStandardMaterial({ color: 0xfff078, roughness: 0.2, metalness: 0.85, emissive: 0x4d3600 }),
    eye: new THREE.MeshStandardMaterial({
      map: createEyeTexture(p.skin[2]),
      roughness: 0.25,
      metalness: 0.02,
    }),
  };

  resourceCache.breedMaterials.set(key, mats);
  return mats;
}

function buildCrownAccessory(crownMat) {
  const g = new THREE.Group();
  const cBase = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.10, 8), crownMat);
  cBase.position.y = 0.05;
  g.add(cBase);
  const spike = new THREE.ConeGeometry(0.04, 0.10, 5);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const sp = new THREE.Mesh(spike, crownMat);
    sp.position.set(Math.cos(a) * 0.13, 0.13, Math.sin(a) * 0.13);
    g.add(sp);
  }
  return g;
}

function buildAppleTopAccessory(hairMat, leafMat) {
  const g = new THREE.Group();
  const stemCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.02, 0),
    new THREE.Vector3(0.03, 0.14, 0),
    new THREE.Vector3(0.10, 0.27, 0.02),
  ]);
  const stemMesh = new THREE.Mesh(new THREE.TubeGeometry(stemCurve, 8, 0.036, 7, false), hairMat);
  stemMesh.castShadow = true;
  g.add(stemMesh);

  const leafGeo = new THREE.SphereGeometry(0.17, 10, 8);
  leafGeo.scale(1.45, 0.22, 0.78);
  const leafMesh = new THREE.Mesh(leafGeo, leafMat);
  leafMesh.position.set(0.25, 0.22, 0.02);
  leafMesh.rotation.set(0.22, -0.15, 0.25);
  leafMesh.castShadow = true;
  g.add(leafMesh);
  return g;
}

function buildProceduralPigFallback(key, mats) {
  const isApple = key === PIG_TYPES.APPLE;
  const isGolden = key === PIG_TYPES.GOLDEN;
  const group = new THREE.Group();
  const bodyPivot = new THREE.Group();
  group.add(bodyPivot);

  const bodyMesh = new THREE.Mesh(getBodyGeometry(isApple), mats.body);
  bodyMesh.scale.set(0.96, 0.96, 1.38);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  bodyPivot.add(bodyMesh);

  if (!isApple) {
    const foldSpecs = [
      { r: 0.43, tube: 0.060, y: 0.56, z: 0.28, sx: 0.98 },
      { r: 0.52, tube: 0.065, y: 0.44, z: 0.25, sx: 1.00 },
      { r: 0.57, tube: 0.062, y: 0.31, z: 0.20, sx: 0.98 },
    ];
    for (const f of foldSpecs) {
      const fGeo = new THREE.TorusGeometry(f.r, f.tube, 8, 16, Math.PI * 0.92);
      const fMesh = new THREE.Mesh(fGeo, mats.fold);
      fMesh.rotation.x = Math.PI / 2 + 0.12;
      fMesh.rotation.z = Math.PI * 0.04;
      fMesh.position.set(0, f.y, f.z);
      fMesh.scale.set(f.sx, 1.12, 1.0);
      fMesh.castShadow = true;
      fMesh.receiveShadow = true;
      bodyPivot.add(fMesh);
    }
  }

  const snoutPivot = new THREE.Group();
  snoutPivot.position.set(0, isApple ? 0.70 : 0.78, isApple ? 0.62 : 0.50);
  bodyPivot.add(snoutPivot);

  const bridgeGeo = new THREE.CylinderGeometry(0.30, 0.35, 0.50, 14);
  bridgeGeo.rotateX(Math.PI / 2);
  const bridgeMesh = new THREE.Mesh(bridgeGeo, mats.body);
  bridgeMesh.scale.set(1.06, 0.84, 1.0);
  bridgeMesh.position.set(0, -0.02, 0.20);
  bridgeMesh.castShadow = true;
  bridgeMesh.receiveShadow = true;
  snoutPivot.add(bridgeMesh);

  const padGeo = new THREE.SphereGeometry(0.36, 16, 12);
  padGeo.scale(1.10, 0.86, 0.46);
  const padMesh = new THREE.Mesh(padGeo, mats.snout);
  padMesh.position.set(0, -0.03, 0.45);
  padMesh.castShadow = true;
  padMesh.receiveShadow = true;
  snoutPivot.add(padMesh);

  const nostrilGeo = new THREE.SphereGeometry(0.086, 10, 8);
  nostrilGeo.scale(0.86, 1.18, 0.42);
  for (const side of [-1, 1]) {
    const nMesh = new THREE.Mesh(nostrilGeo, mats.nostril);
    nMesh.position.set(side * 0.142, -0.025, 0.60);
    nMesh.rotation.z = side * 0.18;
    nMesh.rotation.y = side * 0.18;
    snoutPivot.add(nMesh);
  }

  const eyeY = isApple ? 0.96 : 1.08;
  const eyeZ = isApple ? 0.68 : 0.52;
  const eyeX = isApple ? 0.180 : 0.160;
  const eyeGeo = new THREE.SphereGeometry(0.070, 12, 10);
  for (const side of [-1, 1]) {
    const eyeMesh = new THREE.Mesh(eyeGeo, mats.eye);
    eyeMesh.position.set(side * eyeX, eyeY, eyeZ);
    eyeMesh.rotation.y = -Math.PI / 2;
    bodyPivot.add(eyeMesh);
  }

  const earPivots = [];
  const earY = isApple ? 1.00 : 1.12;
  const earX = isApple ? 0.42 : 0.35;
  const earZ = isApple ? 0.18 : 0.12;
  for (const side of [-1, 1]) {
    const ep = new THREE.Group();
    ep.position.set(side * earX, earY, earZ);
    const baseRotZ = side * -0.58;
    const baseRotX = 0.25;
    ep.rotation.set(baseRotX, side * 0.28, baseRotZ);
    const earOuter = new THREE.Mesh(getEarGeometry(), mats.body);
    earOuter.castShadow = true;
    const earInner = new THREE.Mesh(getEarGeometry(), mats.earInner);
    earInner.scale.set(0.65, 0.72, 0.65);
    earInner.position.set(side * -0.025, -0.01, 0.03);
    ep.add(earOuter, earInner);
    bodyPivot.add(ep);
    earPivots.push({ pivot: ep, side, baseRotZ, baseRotX });
  }

  const hairPivot = new THREE.Group();
  hairPivot.position.set(0, isApple ? 1.16 : 1.20, 0.08);
  bodyPivot.add(hairPivot);

  if (isApple) {
    hairPivot.add(buildAppleTopAccessory(mats.hair, mats.leaf));
  } else if (key === PIG_TYPES.CLASSIC || isGolden) {
    const capGeo = new THREE.SphereGeometry(0.325, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.44);
    capGeo.scale(1.0, 0.78, 1.18);
    const capMesh = new THREE.Mesh(capGeo, mats.hair);
    capMesh.position.set(0, -0.06, -0.01);
    capMesh.castShadow = true;
    hairPivot.add(capMesh);
    if (isGolden) {
      const crown = buildCrownAccessory(mats.crown);
      crown.position.set(0, 0.13, 0.02);
      hairPivot.add(crown);
    }
  } else if (key === PIG_TYPES.CURLY) {
    const puffGeo = new THREE.IcosahedronGeometry(0.16, 1);
    const puffs = [
      [0.0, 0.16, 0.0, 1.3],
      [-0.20, 0.11, 0.12, 1.05], [0.20, 0.11, 0.12, 1.05],
      [-0.22, 0.10, -0.14, 1.05], [0.22, 0.10, -0.14, 1.05],
      [0.0, 0.13, 0.22, 1.0], [0.0, 0.11, -0.24, 1.05],
      [-0.31, -0.02, 0.04, 0.85], [0.31, -0.02, 0.04, 0.85],
      [-0.14, 0.22, -0.04, 0.95], [0.14, 0.22, -0.04, 0.95],
    ];
    for (const [px, py, pz, ps] of puffs) {
      const pm = new THREE.Mesh(puffGeo, mats.hair);
      pm.position.set(px, py, pz);
      pm.scale.setScalar(ps);
      pm.castShadow = true;
      hairPivot.add(pm);
    }
  } else {
    const capGeo = new THREE.SphereGeometry(0.32, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.42);
    capGeo.scale(1.0, 0.76, 1.16);
    const capMesh = new THREE.Mesh(capGeo, mats.hair);
    capMesh.position.set(0, -0.06, -0.01);
    hairPivot.add(capMesh);

    const spikeGeo = new THREE.ConeGeometry(0.065, 0.16, 6);
    const spikes = [
      [0, 0.16, 0.08, 0.18, 0], [-0.12, 0.14, 0.02, 0.1, 0.28], [0.12, 0.14, 0.02, 0.1, -0.28],
      [-0.08, 0.15, -0.10, -0.18, 0.2], [0.08, 0.15, -0.10, -0.18, -0.2], [0, 0.17, -0.02, 0, 0],
    ];
    for (const [sx, sy, sz, rx, rz] of spikes) {
      const sp = new THREE.Mesh(spikeGeo, mats.hair);
      sp.position.set(sx, sy, sz);
      sp.rotation.set(rx, 0, rz);
      hairPivot.add(sp);
    }
  }

  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0.54, -0.88);
  const tailMesh = new THREE.Mesh(getCurlyTailGeometry(), isApple ? mats.body : mats.snout);
  tailMesh.castShadow = true;
  tailPivot.add(tailMesh);
  bodyPivot.add(tailPivot);

  const legs = [];
  const legH = 0.25;
  const legGeo = new THREE.CylinderGeometry(0.062, 0.036, legH * 0.72, 8);
  const hoofGeo = new THREE.CylinderGeometry(0.038, 0.052, legH * 0.34, 8);
  const legSpecs = [
    { x: -0.27, z:  0.41, phase: 0 },
    { x:  0.27, z:  0.41, phase: Math.PI },
    { x: -0.30, z: -0.44, phase: Math.PI },
    { x:  0.30, z: -0.44, phase: 0 },
  ];
  for (const lp of legSpecs) {
    const pivot = new THREE.Group();
    pivot.position.set(lp.x, legH, lp.z);
    pivot.userData.phase = lp.phase;
    const upper = new THREE.Mesh(legGeo, mats.body);
    upper.position.y = -legH * 0.34; upper.castShadow = true;
    const hoof = new THREE.Mesh(hoofGeo, mats.hoof);
    hoof.position.y = -legH * 0.83; hoof.castShadow = true;
    pivot.add(upper, hoof);
    group.add(pivot);
    legs.push(pivot);
  }

  return { group, bodyPivot, snoutPivot, earPivots, hairPivot, tailPivot, legs, isApple };
}

/**
 * Создаёт 3D-хряка: подключает кэшированную модель ./models/hryak.glb (.clone())
 * с живой процедурной анимацией (переваливание, подпрыгивание, squash & stretch, выпад, ragdoll)
 * и держит процедурного хряка как мягкий fallback на случай ошибки загрузки.
 */
export function createPigModel(type = PIG_TYPES.MEME, options = {}) {
  const key = type === 'meme' ? PIG_TYPES.CLASSIC : type;
  const { scale = 1, phase = Math.random() * Math.PI * 2 } = options;
  const mats = getBreedMaterials(key);

  const root = new THREE.Group();
  root.name = `pig_${key}`;

  // Общий анимируемый контейнер (крутится, переваливается, сжимается/растягивается)
  const animPivot = new THREE.Group();
  root.add(animPivot);

  // Якорь передней точки пятачка для липкого языка
  const snoutTip = new THREE.Object3D();
  snoutTip.position.set(0, 0.74, 1.16);
  animPivot.add(snoutTip);

  // Сразу строим процедурного хряка как fallback, а при загрузке ./models/hryak.glb плавно меняем на клон .glb
  const fallback = buildProceduralPigFallback(key, mats);
  animPivot.add(fallback.group);

  const glbSlot = new THREE.Group();
  animPivot.add(glbSlot);

  let usingGlb = false;
  let disposed = false;
  let shadowBaseScaleX = 1.0;
  let shadowBaseScaleZ = 1.0;

  function attachGlbClone(cache) {
    if (!cache || disposed || usingGlb) return;
    const clone = cache.template.clone(true);
    const matSet = cache.materialsByBreed.get(key) || cache.materialsByBreed.get(PIG_TYPES.CLASSIC);
    applyCachedGlbMaterials(clone, matSet);

    // Аксессуары для секретного Золотого и Яблочного хряка поверх .glb
    if (key === PIG_TYPES.GOLDEN) {
      const crown = buildCrownAccessory(mats.crown);
      crown.position.set(0, cache.size.y * 0.96, cache.size.z * 0.14);
      clone.add(crown);
    } else if (key === PIG_TYPES.APPLE) {
      const appleTop = buildAppleTopAccessory(mats.hair, mats.leaf);
      appleTop.position.set(0, cache.size.y * 0.95, 0);
      clone.add(appleTop);
    }

    glbSlot.add(clone);
    fallback.group.visible = false;
    snoutTip.position.copy(cache.snoutPos);
    shadowBaseScaleX = Math.max(1.0, (cache.size.x * 1.15) / 1.55);
    shadowBaseScaleZ = Math.max(1.0, (cache.size.z * 1.08) / 2.05);
    usingGlb = true;
    root.userData.usingGlb = true;
    root.userData.triangles = cache.triangles;
  }

  if (hryakTemplateCache) {
    attachGlbClone(hryakTemplateCache);
  } else {
    preloadHryakModel().then((cache) => {
      if (cache) attachGlbClone(cache);
    });
  }

  // Мягкая круглая контактная тень под копытцами
  const shadowMat = new THREE.MeshBasicMaterial({
    map: getContactShadowTexture(),
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  const contactShadow = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 2.05), shadowMat);
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.set(0, 0.03, 0);
  contactShadow.renderOrder = 2;
  root.add(contactShadow);

  root.scale.setScalar(scale);

  let triangles = 0;
  root.traverse((obj) => {
    if (obj.isMesh && obj.geometry) {
      const g = obj.geometry;
      triangles += g.index ? g.index.count / 3 : g.attributes.position.count / 3;
    }
  });

  // Пружинные переменные для Squash & Stretch (сжатие-растяжение при приземлении) и выпада
  let time = phase;
  let squash = 0;
  let squashVel = 0;
  let kickLunge = 0;

  function triggerLand(strength = 1.0) {
    const clamped = Math.max(0.25, Math.min(1.5, strength));
    squash = Math.min(0.45, squash + 0.28 * clamped);
    squashVel = -1.6 * clamped;
  }

  function update(dt, state = 'idle') {
    const safeDt = Math.min(dt, 0.1);
    time += safeDt;

    // Пружинная физика squash & stretch (затухающее упругое колебание)
    const springK = 140;
    const damping = 12;
    squashVel += (-springK * squash - damping * squashVel) * safeDt;
    squash += squashVel * safeDt;
    if (Math.abs(squash) < 0.002 && Math.abs(squashVel) < 0.01) {
      squash = 0;
      squashVel = 0;
    }

    // Плавный откат выпада при «Боднуть»
    if (state === 'kick') {
      kickLunge += (1.0 - kickLunge) * Math.min(1, safeDt * 24);
    } else {
      kickLunge += (0.0 - kickLunge) * Math.min(1, safeDt * 14);
    }

    const sqX = 1 + squash * 0.72;
    const sqY = Math.max(0.62, 1 - squash * 0.95);
    const sqZ = 1 + squash * 0.55;

    // 1) Анимация поверх ./models/hryak.glb (и общего контейнера animPivot)
    if (usingGlb) {
      if (state === 'ragdoll') {
        const t = time * 18;
        animPivot.position.set(0, 0, 0);
        animPivot.rotation.set(Math.sin(t * 0.7) * 0.28, Math.cos(t * 0.5) * 0.22, Math.sin(t) * 0.34);
        animPivot.scale.set(
          sqX * (1 + Math.sin(t) * 0.06),
          sqY * (1 - Math.sin(t) * 0.06),
          sqZ * (1 + Math.cos(t) * 0.06)
        );
        return;
      }

      if (state === 'kick' || kickLunge > 0.05) {
        animPivot.position.set(0, kickLunge * 0.10, kickLunge * 0.36);
        animPivot.rotation.set(-0.22 * kickLunge, 0, 0);
        animPivot.scale.set(
          sqX * (1 - kickLunge * 0.10),
          sqY * (1 - kickLunge * 0.08),
          sqZ * (1 + kickLunge * 0.22)
        );
        return;
      }

      if (state === 'run' || state === 'walk') {
        const isRun = state === 'run';
        const freq = isRun ? 16.5 : 11.0;
        const t = time * freq;
        const bounce = Math.abs(Math.sin(t));
        const roll = Math.sin(t) * (isRun ? 0.17 : 0.09);
        const pitch = (isRun ? 0.07 : 0.03) + Math.cos(t * 2) * (isRun ? 0.055 : 0.025);

        animPivot.position.set(0, bounce * (isRun ? 0.17 : 0.07), 0);
        animPivot.rotation.set(pitch, Math.sin(t) * (isRun ? 0.06 : 0.03), roll);
        const stretch = (bounce - 0.45) * (isRun ? 0.09 : 0.04);
        animPivot.scale.set(sqX * (1 - stretch * 0.6), sqY * (1 + stretch), sqZ * (1 - stretch * 0.4));
        return;
      }

      if (state === 'sniff') {
        const t = time * 12;
        animPivot.position.set(0, Math.sin(time * 3.5) * 0.02, 0);
        animPivot.rotation.set(0.14 + Math.sin(t) * 0.05, Math.cos(t * 0.6) * 0.08, Math.sin(time * 2.2) * 0.04);
        animPivot.scale.set(sqX, sqY, sqZ * (1 + Math.sin(t) * 0.03));
        return;
      }

      // Idle — живое дыхание и лёгкое покачивание
      const breath = Math.sin(time * 2.6);
      animPivot.position.set(0, Math.max(0, breath * 0.015), 0);
      animPivot.rotation.set(0, 0, Math.sin(time * 1.3) * 0.025);
      animPivot.scale.set(sqX * (1 + breath * 0.022), sqY * (1 - breath * 0.018), sqZ * (1 + breath * 0.02));
      return;
    }

    // 2) Fallback: анимация процедурного хряка (если .glb не загрузился)
    animPivot.position.set(0, 0, kickLunge * 0.25);
    animPivot.rotation.set(0, 0, 0);
    animPivot.scale.set(sqX, sqY, sqZ);

    const { bodyPivot, snoutPivot, earPivots, hairPivot, tailPivot, legs, isApple } = fallback;

    if (state === 'ragdoll') {
      const t = time * 24;
      for (const leg of legs) {
        leg.rotation.x = Math.sin(t + leg.userData.phase) * 0.95;
        leg.rotation.z = Math.cos(t * 0.7 + leg.userData.phase) * 0.45;
      }
      bodyPivot.position.y = 0;
      bodyPivot.rotation.set(0, 0, 0);
      bodyPivot.scale.set(1, 1, 1);
      tailPivot.rotation.z = Math.sin(t * 1.4) * 0.85;
      tailPivot.rotation.y = Math.cos(t) * 0.55;
      for (const e of earPivots) {
        e.pivot.rotation.z = e.baseRotZ + e.side * Math.sin(t * 0.9) * 0.55;
      }
      if (isApple) hairPivot.rotation.z = Math.sin(t * 0.8) * 0.3;
      return;
    }

    for (const leg of legs) leg.rotation.z *= 0.8;

    if (state === 'run' || state === 'walk') {
      const speed = state === 'run' ? 17.5 : 13;
      const t = time * speed;
      const amp = state === 'run' ? 0.72 : 0.48;

      for (const leg of legs) leg.rotation.x = Math.sin(t + leg.userData.phase) * amp;
      bodyPivot.position.y = Math.abs(Math.sin(t)) * (state === 'run' ? 0.085 : 0.045);
      bodyPivot.rotation.z = Math.sin(t) * (state === 'run' ? 0.085 : 0.045);
      bodyPivot.rotation.x = 0.05 + Math.sin(t * 2) * 0.03;
      bodyPivot.scale.set(1 + Math.sin(t * 2) * 0.02, 1 - Math.sin(t * 2) * 0.02, 1);

      snoutPivot.rotation.x = Math.sin(t * 1.4) * 0.07;
      snoutPivot.rotation.y = Math.cos(t * 0.8) * 0.05;
      snoutPivot.scale.set(1, 1, 1);

      tailPivot.rotation.y = Math.sin(t * 1.6) * 0.45;
      tailPivot.rotation.z = Math.cos(t * 1.6) * 0.25;

      for (const e of earPivots) {
        e.pivot.rotation.z = e.baseRotZ + e.side * Math.sin(t) * 0.28;
        e.pivot.rotation.x = e.baseRotX + Math.cos(t * 2) * 0.14;
      }
      if (isApple) hairPivot.rotation.z = Math.sin(t) * 0.18;
      return;
    }

    if (state === 'kick') {
      bodyPivot.rotation.x = -0.22;
      bodyPivot.position.y = 0.10;
      snoutPivot.scale.set(1.10, 1.08, 1.24);
      for (const leg of legs) leg.rotation.x = -0.75;
      for (const e of earPivots) e.pivot.rotation.z = e.baseRotZ + e.side * 0.35;
      tailPivot.rotation.z = 0.45;
      return;
    }

    if (state === 'sniff') {
      const t = time * 14;
      for (const leg of legs) leg.rotation.x *= 0.85;
      bodyPivot.position.y = Math.sin(time * 3) * 0.015;
      bodyPivot.rotation.z = Math.sin(time * 1.8) * 0.025;
      bodyPivot.rotation.x = 0.10 + Math.sin(t * 0.5) * 0.025;
      snoutPivot.rotation.x = Math.sin(t) * 0.14;
      snoutPivot.rotation.y = Math.cos(t * 0.65) * 0.11;
      snoutPivot.scale.set(1 + Math.sin(t) * 0.04, 1, 1 + Math.cos(t) * 0.06);
      tailPivot.rotation.y = Math.sin(time * 10) * 0.38;
      return;
    }

    const breath = Math.sin(time * 2.5);
    for (const leg of legs) leg.rotation.x *= 0.85;
    bodyPivot.position.y = breath * 0.014;
    bodyPivot.rotation.z = Math.sin(time * 1.2) * 0.022;
    bodyPivot.rotation.x = 0;
    bodyPivot.scale.set(1 + breath * 0.018, 1 - breath * 0.012, 1 + breath * 0.016);

    const pulse = Math.max(0, Math.sin(time * 1.15) - 0.65) * 3.0;
    snoutPivot.rotation.x = Math.sin(time * 15) * 0.10 * pulse;
    snoutPivot.rotation.y = Math.sin(time * 7) * 0.05 * pulse;
    snoutPivot.scale.set(1, 1, 1 + Math.abs(Math.sin(time * 15)) * 0.05 * pulse);

    tailPivot.rotation.y = Math.sin(time * 6.5) * (0.12 + 0.32 * pulse);
    tailPivot.rotation.z = Math.cos(time * 3.2) * 0.08;

    for (const e of earPivots) {
      e.pivot.rotation.z = e.baseRotZ + e.side * Math.sin(time * 2.5) * 0.06 + e.side * pulse * 0.12;
      e.pivot.rotation.x = e.baseRotX;
    }
    if (isApple) hairPivot.rotation.z = Math.sin(time * 2.2) * 0.06;
  }

  function updateShadow(groundY = 0.03) {
    if (!root.visible) {
      contactShadow.visible = false;
      return;
    }
    contactShadow.visible = true;
    if (root.parent && contactShadow.parent !== root.parent) {
      root.parent.add(contactShadow);
    }
    const height = Math.max(0, root.position.y - groundY);
    const shrink = Math.max(0.42, 1 - height * 0.055) * scale;
    contactShadow.position.set(root.position.x, groundY + 0.03, root.position.z);
    contactShadow.rotation.set(-Math.PI / 2, root.rotation.y, 0);
    contactShadow.scale.set(shrink * shadowBaseScaleX, shrink * shadowBaseScaleZ, 1);
    shadowMat.opacity = Math.max(0.18, 0.80 - height * 0.055);
  }

  function disposeShadow() {
    disposed = true;
    if (contactShadow.parent) contactShadow.parent.remove(contactShadow);
  }

  root.userData = {
    type: key,
    usingGlb,
    triangles: Math.round(triangles),
    snoutTip,
    contactShadow,
    triggerLand,
    update,
    updateShadow,
    disposeShadow,
  };

  return root;
}
