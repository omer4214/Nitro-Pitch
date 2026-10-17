import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  ARENA_BOUNDS,
  ArenaState,
  CarModelType,
  CarState,
  CarSurfaceState,
  ControlBindings,
  ControlInput,
  DEFAULT_GENERAL_SETTINGS,
  DEFAULT_GRAPHICS_SETTINGS,
  DodgeFlipType,
  GarageFocusTarget,
  GeneralSettingsState,
  GraphicsSettingsState,
  ReplayEventMarker,
  ReplayFrame,
  applyReplayFrameToArena,
  captureReplayFrame,
  stepArenaPhysics
} from './rules';
import { soundEngine } from './sound';

// Pre-allocated module-scope math helpers (Zero GC in requestAnimationFrame)
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _camDesired = new THREE.Vector3();
const _camLookTarget = new THREE.Vector3();
const _dummyMatrix = new THREE.Matrix4();
const _dummyPosition = new THREE.Vector3();
const _dummyQuat = new THREE.Quaternion();
const _dummyEuler = new THREE.Euler();
const _dummyScale = new THREE.Vector3();
const _dummyColor = new THREE.Color();

export interface HudSnapshot {
  blueScore: number;
  orangeScore: number;
  timeRemaining: number;
  isOvertime?: boolean;
  overtimeElapsed?: number;
  boost: number;
  speedKmh: number;
  altitude: number;
  supersonic: boolean;
  ballCam: boolean;
  dodgeType: DodgeFlipType;
  surfaceState: CarSurfaceState;
  goalBanner: { team: 'blue' | 'orange'; scorer: string; isGoldenGoal?: boolean } | null;
  demolitionBanner: { attacker: string; victim: string } | null;
  playerGoals: number;
  playerSaves: number;
  playerShots: number;
  playerDemolitions: number;
  replayFrameCount: number;
  replayCurrentFrame: number;
}

export interface MobileControlState {
  throttle: number;
  steer: number;
  boostHeld: boolean;
  jumpHeld: boolean;
  jumpJustPressed: boolean;
  driftHeld: boolean;
  flyUpHeld: boolean;
}

export interface ReplayPlaybackControl {
  playing: boolean;
  frameIndex: number;
  speed: number;
  cameraMode: 'player' | 'ball' | 'stadium';
}

interface ArenaCanvasProps {
  gameState: 'title' | 'playing' | 'paused' | 'gameover' | 'replay';
  arenaStateRef: React.MutableRefObject<ArenaState>;
  mobileInputRef: React.MutableRefObject<MobileControlState>;
  controlBindings: ControlBindings;
  replayFramesRef: React.MutableRefObject<ReplayFrame[]>;
  replayEventsRef: React.MutableRefObject<ReplayEventMarker[]>;
  replayControlRef: React.MutableRefObject<ReplayPlaybackControl>;
  ballCam: boolean;
  onToggleBallCam: () => void;
  onHudUpdate: (hud: HudSnapshot) => void;
  onMatchFinished: (finalState: ArenaState) => void;
  onPauseRequested: () => void;
  garageFocusTarget?: GarageFocusTarget;
  graphicsSettings?: GraphicsSettingsState;
  generalSettings?: GeneralSettingsState;
  playerCosmetics: {
    carModel?: CarModelType;
    bodyColor: string;
    finish: string;
    boostColor: string;
    wheelStyle: string;
  };
}

interface CarMeshRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  hullMesh: THREE.Mesh;
  trimMesh: THREE.Mesh;
  thrusterFlame: THREE.Mesh;
  telegraphBeacon: THREE.Mesh;
  wheels: THREE.Object3D[];
  rimMeshes: THREE.Mesh[];
  contactShadow: THREE.Mesh;
  builtModel: CarModelType;
}

interface PooledParticle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  r: number;
  g: number;
  b: number;
}

function getFinishMaterialParams(
  finish: string,
  isHeadless = false
): {
  metalness: number;
  roughness: number;
  clearcoat: number;
  clearcoatRoughness: number;
} {
  const capMetal = (m: number) => (isHeadless ? Math.min(0.28, m) : m);
  switch (finish) {
    case 'titanium':
      return {
        metalness: capMetal(0.88),
        roughness: 0.2,
        clearcoat: 0.65,
        clearcoatRoughness: 0.14
      };
    case 'carbon':
      return {
        metalness: capMetal(0.32),
        roughness: 0.62,
        clearcoat: 0.35,
        clearcoatRoughness: 0.38
      };
    case 'chrome':
      return {
        metalness: capMetal(0.98),
        roughness: 0.06,
        clearcoat: 1.0,
        clearcoatRoughness: 0.04
      };
    case 'anodized':
    default:
      return {
        metalness: capMetal(0.78),
        roughness: 0.18,
        clearcoat: 0.96,
        clearcoatRoughness: 0.08
      };
  }
}

function createPitchTextures(
  maxAnisotropy: number,
  isHeadless = false
): {
  albedoMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const size = isHeadless ? 256 : 1024;
  const scale = size / 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Rich Rocket League stadium mowed turf stripes + subtle hexagonal tech grid
  const stripeCount = 22;
  for (let i = 0; i < stripeCount; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#0b3d2e' : '#11523f';
    ctx.fillRect(
      0,
      (i * canvas.height) / stripeCount,
      canvas.width,
      canvas.height / stripeCount
    );
  }

  // Subtle longitudinal mow lines
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.03)';
    ctx.fillRect((i * size) / 12, 0, size / 12, size);
  }

  const vig = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.12,
    size / 2,
    size / 2,
    size * 0.68
  );
  vig.addColorStop(0, 'rgba(56, 189, 248, 0.07)');
  vig.addColorStop(0.6, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(2, 6, 23, 0.45)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, size, size);

  const pad = 42 * scale;
  const cornerR = 120 * scale;
  ctx.strokeStyle = 'rgba(241, 245, 249, 0.92)';
  ctx.lineWidth = Math.max(2, 8 * scale);
  ctx.beginPath();
  ctx.roundRect(pad, pad, size - pad * 2, size - pad * 2, cornerR);
  ctx.stroke();

  // Center line & circle
  ctx.beginPath();
  ctx.moveTo(pad, size / 2);
  ctx.lineTo(size - pad, size / 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 128 * scale, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
  ctx.lineWidth = Math.max(1.5, 5 * scale);
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 36 * scale, 0, Math.PI * 2);
  ctx.stroke();

  // Blue (-Z) & Orange (+Z) penalty boxes
  ctx.lineWidth = Math.max(2, 7 * scale);
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.88)';
  ctx.strokeRect(size * 0.22, pad, size * 0.56, 155 * scale);

  ctx.strokeStyle = 'rgba(251, 146, 60, 0.88)';
  ctx.strokeRect(size * 0.22, size - pad - 155 * scale, size * 0.56, 155 * scale);

  const albedoMap = new THREE.CanvasTexture(canvas);
  albedoMap.colorSpace = THREE.SRGBColorSpace;
  albedoMap.anisotropy = maxAnisotropy;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 128;
  bumpCanvas.height = 128;
  const bCtx = bumpCanvas.getContext('2d')!;
  bCtx.fillStyle = '#787878';
  bCtx.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 2) {
    for (let x = 0; x < 128; x += 2) {
      const v = 105 + ((x * 37 + y * 19) % 45);
      bCtx.fillStyle = `rgb(${v},${v},${v})`;
      bCtx.fillRect(x, y, 2, 2);
    }
  }
  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(18, 26);

  return { albedoMap, bumpMap };
}

function createHexWallTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 256);

  ctx.strokeStyle = 'rgba(148, 163, 184, 0.46)';
  ctx.lineWidth = 2.5;
  const stepX = 32;
  const stepY = 28;
  for (let row = 0; row <= 10; row++) {
    for (let col = 0; col <= 9; col++) {
      const cx = col * stepX + (row % 2 === 0 ? 0 : stepX / 2);
      const cy = row * stepY;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const ang = (k * Math.PI) / 3 + Math.PI / 6;
        const px = cx + Math.cos(ang) * 15;
        const py = cy + Math.sin(ang) * 15;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(24, 5);
  return tex;
}

function createCarbonWeaveTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#334155';
  for (let y = 0; y < 64; y += 8) {
    for (let x = 0; x < 64; x += 8) {
      if ((x + y) % 16 === 0) {
        ctx.fillRect(x, y, 6, 4);
      } else {
        ctx.fillRect(x, y, 4, 6);
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  return tex;
}

function createRadialShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.78)');
  grad.addColorStop(0.6, 'rgba(0, 0, 0, 0.34)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Samples dense perimeter points along both the straight stadium walls AND the 4 rounded corners
 * so the solid curved floor-to-wall ramp block matches `evaluateRoundedArenaWall` 1-to-1!
 */
function sampleRoundedPerimeterPoints(
  halfW: number,
  halfL: number,
  cornerR: number
): Array<{ x: number; z: number; nx: number; nz: number }> {
  const pts: Array<{ x: number; z: number; nx: number; nz: number }> = [];
  const innerW = halfW - cornerR;
  const innerL = halfL - cornerR;

  const pushSegment = (
    x1: number,
    z1: number,
    x2: number,
    z2: number,
    nx: number,
    nz: number,
    steps: number
  ) => {
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      pts.push({
        x: x1 + (x2 - x1) * t,
        z: z1 + (z2 - z1) * t,
        nx,
        nz
      });
    }
  };

  const pushArc = (
    cx: number,
    cz: number,
    startAngle: number,
    endAngle: number,
    steps: number
  ) => {
    for (let i = 0; i < steps; i++) {
      const a = startAngle + ((endAngle - startAngle) * i) / steps;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      pts.push({
        x: cx + ca * cornerR,
        z: cz + sa * cornerR,
        nx: -ca,
        nz: -sa
      });
    }
  };

  // Right wall (+X) from -innerL to +innerL
  pushSegment(halfW, -innerL, halfW, innerL, -1, 0, 16);
  // Corner 1 (+X, +Z)
  pushArc(innerW, innerL, 0, Math.PI / 2, 12);
  // Orange back wall (+Z) from +innerW to -innerW (dense steps around goal mouth!)
  pushSegment(innerW, halfL, -innerW, halfL, 0, -1, 24);
  // Corner 2 (-X, +Z)
  pushArc(-innerW, innerL, Math.PI / 2, Math.PI, 12);
  // Left wall (-X) from +innerL to -innerL
  pushSegment(-halfW, innerL, -halfW, -innerL, 1, 0, 16);
  // Corner 3 (-X, -Z)
  pushArc(-innerW, -innerL, Math.PI, (Math.PI * 3) / 2, 12);
  // Blue back wall (-Z) from -innerW to +innerW (dense steps around goal mouth!)
  pushSegment(-innerW, -halfL, innerW, -halfL, 0, 1, 24);
  // Corner 4 (+X, -Z)
  pushArc(innerW, -innerL, (Math.PI * 3) / 2, Math.PI * 2, 12);

  pts.push({ ...pts[0] });
  return pts;
}

/**
 * Builds the Rocket League rounded-rectangle stadium enclosure with a SOLID, physically-matched
 * quarter-circle curved ramp block (`R_ramp = 5.5m`) along all walls and corners!
 */
function createRoundedStadiumEnclosure(
  hexTex: THREE.CanvasTexture,
  carbonTex: THREE.CanvasTexture
): THREE.Group {
  const group = new THREE.Group();
  const perim = sampleRoundedPerimeterPoints(
    ARENA_BOUNDS.halfWidth,
    ARENA_BOUNDS.halfLength,
    ARENA_BOUNDS.cornerRadius
  );

  const rampR = ARENA_BOUNDS.wallCurveRadius; // 5.5m exact quarter-circle ramp
  const arcAngles = [0, 0.25, 0.5, 0.75, 1.0].map((t) => t * (Math.PI / 2));

  // Profile from floor (y=0, inset=5.5m) up the solid curved ramp (y=5.5m, inset=0) up to ceiling (46m)
  const profileY = [
    ...arcAngles.map((a) => rampR * (1 - Math.cos(a))),
    40.0,
    43.5,
    ARENA_BOUNDS.ceiling
  ];
  const profileInset = [
    ...arcAngles.map((a) => rampR * (1 - Math.sin(a))),
    0.0,
    1.5,
    3.8
  ];

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  let accLen = 0;
  const ringCount = perim.length;
  const profCount = profileY.length;

  for (let i = 0; i < ringCount; i++) {
    const p = perim[i];
    if (i > 0) {
      accLen += Math.hypot(p.x - perim[i - 1].x, p.z - perim[i - 1].z);
    }
    for (let j = 0; j < profCount; j++) {
      const inset = profileInset[j];
      const inGoalOpening =
        Math.abs(p.z) > ARENA_BOUNDS.halfLength - 1.2 &&
        Math.abs(p.x) < ARENA_BOUNDS.goalHalfWidth &&
        profileY[j] < ARENA_BOUNDS.goalHeight;
      const finalInset = inGoalOpening ? -ARENA_BOUNDS.goalDepth : inset;

      positions.push(
        p.x + p.nx * finalInset,
        profileY[j],
        p.z + p.nz * finalInset
      );
      uvs.push(accLen / 320, profileY[j] / ARENA_BOUNDS.ceiling);
    }
  }

  for (let i = 0; i < ringCount - 1; i++) {
    for (let j = 0; j < profCount - 1; j++) {
      const a = i * profCount + j;
      const b = (i + 1) * profCount + j;
      const c = (i + 1) * profCount + (j + 1);
      const d = i * profCount + (j + 1);
      indices.push(a, b, d, b, c, d);
    }
  }

  const wallGeo = new THREE.BufferGeometry();
  wallGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  wallGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  wallGeo.setIndex(indices);
  wallGeo.computeVertexNormals();

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    map: hexTex,
    transparent: true,
    opacity: 0.36,
    roughness: 0.22,
    metalness: 0.55,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  group.add(new THREE.Mesh(wallGeo, wallMat));

  // Solid Metallic Curved Floor-to-Wall Ramp Block (matches `rampHeightY` in rules.ts 1-to-1!)
  const rampPositions: number[] = [];
  const rampUvs: number[] = [];
  const rampIndices: number[] = [];
  const rampSteps = 5; // 5 arc steps from y=0.02 (inset 5.5m) to y=5.5m (inset 0m)

  let rampAcc = 0;
  for (let i = 0; i < ringCount; i++) {
    const p = perim[i];
    if (i > 0) {
      rampAcc += Math.hypot(p.x - perim[i - 1].x, p.z - perim[i - 1].z);
    }
    const inGoal =
      Math.abs(p.z) > ARENA_BOUNDS.halfLength - 1.2 &&
      Math.abs(p.x) < ARENA_BOUNDS.goalHalfWidth;
    for (let j = 0; j < rampSteps; j++) {
      const ang = (j / (rampSteps - 1)) * (Math.PI / 2);
      const ry = Math.max(0.03, rampR * (1 - Math.cos(ang)));
      const rInset = inGoal ? -ARENA_BOUNDS.goalDepth : rampR * (1 - Math.sin(ang));
      rampPositions.push(p.x + p.nx * rInset, ry, p.z + p.nz * rInset);
      rampUvs.push(rampAcc / 40, j / (rampSteps - 1));
    }
  }

  for (let i = 0; i < ringCount - 1; i++) {
    const pA = perim[i];
    const pB = perim[i + 1];
    const inGoalSeg =
      Math.abs(pA.z) > ARENA_BOUNDS.halfLength - 1.2 &&
      Math.abs(pA.x) < ARENA_BOUNDS.goalHalfWidth - 0.5 &&
      Math.abs(pB.x) < ARENA_BOUNDS.goalHalfWidth - 0.5;
    if (inGoalSeg) continue; // Keep goal mouth floor flat!

    for (let j = 0; j < rampSteps - 1; j++) {
      const a = i * rampSteps + j;
      const b = (i + 1) * rampSteps + j;
      const c = (i + 1) * rampSteps + (j + 1);
      const d = i * rampSteps + (j + 1);
      rampIndices.push(a, b, d, b, c, d);
    }
  }

  const rampGeo = new THREE.BufferGeometry();
  rampGeo.setAttribute('position', new THREE.Float32BufferAttribute(rampPositions, 3));
  rampGeo.setAttribute('uv', new THREE.Float32BufferAttribute(rampUvs, 2));
  rampGeo.setIndex(rampIndices);
  rampGeo.computeVertexNormals();

  const rampMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    bumpMap: carbonTex,
    bumpScale: 0.04,
    metalness: 0.72,
    roughness: 0.32,
    side: THREE.DoubleSide
  });
  const rampMesh = new THREE.Mesh(rampGeo, rampMat);
  rampMesh.receiveShadow = true;
  group.add(rampMesh);

  return group;
}

/**
 * Builds a high-detail 12-part Rocket Car mesh supporting 3 distinct chassis silhouettes:
 * - `octane`: Sculpted twin-turbo aero buggy with raised rear GT wing
 * - `dominus`: Wide low-slung V8 muscle GT with hood supercharger & twin chrome pipes
 * - `fennec`: Boxy wide-fender rally hatchback with roof air scoop
 */
function createRocketCarGroup(
  car: CarState,
  shadowTex: THREE.CanvasTexture,
  carbonTex: THREE.CanvasTexture
): CarMeshRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const modelType: CarModelType = car.carModel || 'octane';
  const finishParams = getFinishMaterialParams(car.finish);
  const hullMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(car.bodyColor),
    bumpMap: car.finish === 'carbon' ? carbonTex : null,
    bumpScale: 0.04,
    ...finishParams
  });

  // Part 1: Primary silhouette based on `carModel` (Octane / Dominus / Fennec)
  const hullShape = new THREE.Shape();
  if (modelType === 'dominus') {
    // Low-slung long muscle car silhouette
    hullShape.moveTo(-2.15, 0.26);
    hullShape.lineTo(2.18, 0.26);
    hullShape.lineTo(2.05, 0.78);
    hullShape.lineTo(0.55, 0.88);
    hullShape.lineTo(-0.15, 1.28);
    hullShape.lineTo(-1.35, 1.24);
    hullShape.lineTo(-2.12, 0.78);
    hullShape.closePath();
  } else if (modelType === 'fennec') {
    // Boxy rally hatchback silhouette
    hullShape.moveTo(-1.95, 0.28);
    hullShape.lineTo(1.98, 0.28);
    hullShape.lineTo(1.85, 0.92);
    hullShape.lineTo(0.85, 1.02);
    hullShape.lineTo(0.25, 1.48);
    hullShape.lineTo(-1.55, 1.45);
    hullShape.lineTo(-1.95, 0.85);
    hullShape.closePath();
  } else {
    // Octane Z-GT aerodynamic silhouette
    hullShape.moveTo(-1.92, 0.3);
    hullShape.lineTo(1.92, 0.3);
    hullShape.lineTo(1.62, 0.94);
    hullShape.lineTo(0.4, 1.42);
    hullShape.lineTo(-1.18, 1.35);
    hullShape.lineTo(-2.02, 0.8);
    hullShape.closePath();
  }

  const hullGeo = new THREE.ExtrudeGeometry(hullShape, {
    steps: 2,
    depth: modelType === 'dominus' ? 2.28 : 2.15,
    bevelEnabled: true,
    bevelThickness: 0.18,
    bevelSize: 0.16,
    bevelSegments: 4
  });
  hullGeo.center();
  hullGeo.rotateY(Math.PI / 2);
  const hullMesh = new THREE.Mesh(hullGeo, hullMat);
  hullMesh.position.set(0, 0.86, 0);
  hullMesh.castShadow = true;
  hullMesh.receiveShadow = true;
  bodyGroup.add(hullMesh);

  // Part 2: Tinted Polycarbonate Cockpit Canopy
  const canopyMat = new THREE.MeshPhysicalMaterial({
    color: 0x09101f,
    metalness: 0.18,
    roughness: 0.06,
    transmission: 0.72,
    thickness: 0.65,
    ior: 1.52,
    clearcoat: 1.0
  });
  const canopyGeo = new THREE.BoxGeometry(
    modelType === 'dominus' ? 1.72 : 1.64,
    modelType === 'fennec' ? 0.64 : 0.56,
    modelType === 'fennec' ? 2.05 : 1.78
  );
  const canopyMesh = new THREE.Mesh(canopyGeo, canopyMat);
  canopyMesh.position.set(0, modelType === 'dominus' ? 1.24 : 1.36, -0.12);
  bodyGroup.add(canopyMesh);

  // Part 3: Side Turbo Air Intake Pods + Model-Specific Hood/Roof Accent
  const carbonMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    bumpMap: carbonTex,
    bumpScale: 0.05,
    metalness: 0.42,
    roughness: 0.58
  });
  const podGeo = new THREE.BoxGeometry(0.4, 0.44, 1.65);
  const leftPod = new THREE.Mesh(podGeo, carbonMat);
  leftPod.position.set(-1.14, 0.68, -0.15);
  const rightPod = new THREE.Mesh(podGeo, carbonMat);
  rightPod.position.set(1.14, 0.68, -0.15);
  bodyGroup.add(leftPod, rightPod);

  if (modelType === 'dominus') {
    // Chrome V8 Supercharger Blower on the front hood
    const blowerMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.95,
      roughness: 0.12
    });
    const blower = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.32, 0.85), blowerMat);
    blower.position.set(0, 1.12, 0.95);
    bodyGroup.add(blower);
  } else if (modelType === 'fennec') {
    // Rally Roof Air Scoop
    const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.24, 0.72), carbonMat);
    scoop.position.set(0, 1.62, 0.15);
    bodyGroup.add(scoop);
  }

  // Part 4: Dual-Plane Rear GT Downforce Wing Spoiler
  const spoilerBlade = new THREE.Mesh(new THREE.BoxGeometry(2.44, 0.12, 0.64), carbonMat);
  spoilerBlade.position.set(0, modelType === 'dominus' ? 1.44 : 1.68, -1.82);
  spoilerBlade.rotation.x = 0.24;
  bodyGroup.add(spoilerBlade);

  const strutGeo = new THREE.BoxGeometry(0.12, 0.5, 0.34);
  const leftStrut = new THREE.Mesh(strutGeo, carbonMat);
  leftStrut.position.set(-0.74, 1.42, -1.74);
  const rightStrut = new THREE.Mesh(strutGeo, carbonMat);
  rightStrut.position.set(0.74, 1.42, -1.74);
  bodyGroup.add(leftStrut, rightStrut);

  // Part 5: Team Accent Front Aero Splitter & Side Skirts
  const trimMat = new THREE.MeshStandardMaterial({
    color: car.team === 'blue' ? 0x38bdf8 : 0xfb923c,
    metalness: 0.85,
    roughness: 0.2,
    emissive: car.team === 'blue' ? 0x0284c7 : 0xea580c,
    emissiveIntensity: 0.45
  });
  const trimMesh = new THREE.Mesh(new THREE.BoxGeometry(2.22, 0.22, 0.5), trimMat);
  trimMesh.position.set(0, 0.46, 2.04);
  bodyGroup.add(trimMesh);

  // Part 6: LatheGeometry Rear Rocket Thruster Bell + Plasma Afterburner Core
  const lathePoints = [
    new THREE.Vector2(0.22, 0),
    new THREE.Vector2(0.42, 0.26),
    new THREE.Vector2(0.5, 0.58),
    new THREE.Vector2(0.36, 0.68)
  ];
  const nozzleGeo = new THREE.LatheGeometry(lathePoints, 18);
  nozzleGeo.rotateX(Math.PI / 2);
  const nozzleMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.94,
    roughness: 0.18
  });
  const nozzleMesh = new THREE.Mesh(nozzleGeo, nozzleMat);
  nozzleMesh.position.set(0, 0.72, -2.28);
  bodyGroup.add(nozzleMesh);

  const flameMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(car.boostColor),
    transparent: true,
    opacity: 0.94
  });
  const flameGeo = new THREE.ConeGeometry(0.38, 1.85, 14);
  flameGeo.rotateX(-Math.PI / 2);
  const thrusterFlame = new THREE.Mesh(flameGeo, flameMat);
  thrusterFlame.position.set(0, 0.72, -2.98);
  thrusterFlame.visible = false;
  bodyGroup.add(thrusterFlame);

  // Part 7: Twin LED Headlights + Rear Brake Light Strip + Bot Telegraph Beacon
  const headlightMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
  const hlGeo = new THREE.BoxGeometry(0.4, 0.16, 0.1);
  const hlLeft = new THREE.Mesh(hlGeo, headlightMat);
  hlLeft.position.set(-0.7, 0.76, 2.12);
  const hlRight = new THREE.Mesh(hlGeo, headlightMat);
  hlRight.position.set(0.7, 0.76, 2.12);
  bodyGroup.add(hlLeft, hlRight);

  const telegraphMat = new THREE.MeshBasicMaterial({
    color: 0xef4444,
    transparent: true,
    opacity: 0.0
  });
  const telegraphBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 12), telegraphMat);
  telegraphBeacon.position.set(0, 1.85, 0);
  bodyGroup.add(telegraphBeacon);

  // Parts 8-11: Four Composite Wheel Assemblies (Grooved Rubber Tire + Metallic Spoked Rim + Brake Caliper)
  const tireGeo = new THREE.CylinderGeometry(0.58, 0.58, 0.48, 24);
  tireGeo.rotateZ(Math.PI / 2);
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    bumpMap: carbonTex,
    bumpScale: 0.06,
    metalness: 0.15,
    roughness: 0.82
  });

  const rimColor =
    car.wheelStyle === 'turbine_gold'
      ? 0xf59e0b
      : car.wheelStyle === 'cyber_blade'
      ? 0x38bdf8
      : 0xe2e8f0;
  const rimGeo = new THREE.CylinderGeometry(0.39, 0.39, 0.52, 16);
  rimGeo.rotateZ(Math.PI / 2);
  const rimMat = new THREE.MeshStandardMaterial({
    color: rimColor,
    metalness: 0.95,
    roughness: 0.14,
    emissive:
      car.wheelStyle === 'cyber_blade'
        ? 0x0284c7
        : car.wheelStyle === 'turbine_gold'
        ? 0xb45309
        : 0x000000,
    emissiveIntensity: car.wheelStyle === 'aero_apex' ? 0 : 0.48
  });

  const caliperMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    metalness: 0.6,
    roughness: 0.3
  });
  const caliperGeo = new THREE.BoxGeometry(0.52, 0.22, 0.18);

  const wheelOffsets: Array<[number, number, number]> = [
    [-1.22, 0.58, 1.34],
    [1.22, 0.58, 1.34],
    [-1.26, 0.6, -1.34],
    [1.26, 0.6, -1.34]
  ];
  const wheels: THREE.Object3D[] = [];
  const rimMeshes: THREE.Mesh[] = [];
  wheelOffsets.forEach(([wx, wy, wz]) => {
    const wGroup = new THREE.Group();
    wGroup.position.set(wx, wy, wz);
    const tire = new THREE.Mesh(tireGeo, tireMat);
    const rim = new THREE.Mesh(rimGeo, rimMat);
    const caliper = new THREE.Mesh(caliperGeo, caliperMat);
    caliper.position.set(0, 0.15, 0.12);
    wGroup.add(tire, rim, caliper);
    bodyGroup.add(wGroup);
    wheels.push(wGroup);
    rimMeshes.push(rim);
  });

  // Part 12: Soft Radial Contact Shadow Disc flush at y = 0.015
  const shadowGeo = new THREE.CircleGeometry(2.7, 24);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    opacity: 0.56,
    depthWrite: false
  });
  const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
  contactShadow.position.set(0, 0.015, 0);
  root.add(contactShadow);

  return {
    root,
    bodyGroup,
    hullMesh,
    trimMesh,
    thrusterFlame,
    telegraphBeacon,
    wheels,
    rimMeshes,
    contactShadow,
    builtModel: modelType
  };
}

function createArenaBallGroup(
  shadowTex: THREE.CanvasTexture,
  carbonTex: THREE.CanvasTexture
): {
  ballRoot: THREE.Group;
  coreMesh: THREE.Mesh;
  equatorRing: THREE.Mesh;
  groundIndicator: THREE.Group;
} {
  const ballRoot = new THREE.Group();

  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    bumpMap: carbonTex,
    bumpScale: 0.035,
    metalness: 0.72,
    roughness: 0.2
  });
  const coreMesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(ARENA_BOUNDS.ballRadius * 0.96, 3),
    coreMat
  );
  coreMesh.castShadow = true;
  coreMesh.receiveShadow = true;
  ballRoot.add(coreMesh);

  const cageMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.5,
    roughness: 0.6,
    wireframe: true
  });
  const cageMesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(ARENA_BOUNDS.ballRadius * 1.006, 1),
    cageMat
  );
  ballRoot.add(cageMesh);

  const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  const equatorRing = new THREE.Mesh(
    new THREE.TorusGeometry(ARENA_BOUNDS.ballRadius * 0.99, 0.085, 12, 36),
    ringMat
  );
  ballRoot.add(equatorRing);

  const capGeo = new THREE.CylinderGeometry(0.58, 0.58, ARENA_BOUNDS.ballRadius * 2.02, 18);
  const capMesh = new THREE.Mesh(capGeo, ringMat);
  ballRoot.add(capMesh);

  const groundIndicator = new THREE.Group();
  const shadowDiscGeo = new THREE.CircleGeometry(3.5, 24);
  shadowDiscGeo.rotateX(-Math.PI / 2);
  const shadowDiscMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    opacity: 0.58,
    depthWrite: false
  });
  const shadowDisc = new THREE.Mesh(shadowDiscGeo, shadowDiscMat);
  shadowDisc.position.y = 0.018;

  const targetRingGeo = new THREE.RingGeometry(2.15, 2.5, 32);
  targetRingGeo.rotateX(-Math.PI / 2);
  const targetRingMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const targetRing = new THREE.Mesh(targetRingGeo, targetRingMat);
  targetRing.position.y = 0.025;

  groundIndicator.add(shadowDisc, targetRing);

  return { ballRoot, coreMesh, equatorRing, groundIndicator };
}

export const ArenaCanvas: React.FC<ArenaCanvasProps> = ({
  gameState,
  arenaStateRef,
  mobileInputRef,
  controlBindings,
  replayFramesRef,
  replayEventsRef,
  replayControlRef,
  ballCam,
  onToggleBallCam,
  onHudUpdate,
  onMatchFinished,
  onPauseRequested,
  garageFocusTarget = 'overview',
  graphicsSettings = DEFAULT_GRAPHICS_SETTINGS,
  generalSettings = DEFAULT_GENERAL_SETTINGS,
  playerCosmetics
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const controlBindingsRef = useRef(controlBindings);
  controlBindingsRef.current = controlBindings;

  const ballCamRef = useRef(ballCam);
  ballCamRef.current = ballCam;

  const onToggleBallCamRef = useRef(onToggleBallCam);
  onToggleBallCamRef.current = onToggleBallCam;

  const onHudUpdateRef = useRef(onHudUpdate);
  onHudUpdateRef.current = onHudUpdate;

  const onMatchFinishedRef = useRef(onMatchFinished);
  onMatchFinishedRef.current = onMatchFinished;

  const onPauseRequestedRef = useRef(onPauseRequested);
  onPauseRequestedRef.current = onPauseRequested;

  const garageFocusRef = useRef<GarageFocusTarget>(garageFocusTarget);
  garageFocusRef.current = garageFocusTarget;

  const graphicsRef = useRef<GraphicsSettingsState>(graphicsSettings);
  graphicsRef.current = graphicsSettings;

  const generalRef = useRef<GeneralSettingsState>(generalSettings);
  generalRef.current = generalSettings;

  const cosmeticsRef = useRef(playerCosmetics);
  cosmeticsRef.current = playerCosmetics;

  // Apply dynamic resolution scale & shadow settings whenever `graphicsSettings` changes
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    const isHeadless =
      navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);
    const scaleNum = parseFloat(graphicsSettings.resolutionScale) || 1.0;
    renderer.setPixelRatio(
      isHeadless ? 1 : Math.min(window.devicePixelRatio * scaleNum, 2.25)
    );
    renderer.shadowMap.enabled = !isHeadless && graphicsSettings.shadows;
  }, [graphicsSettings]);

  useEffect(() => {
    const mountEl = canvasMountRef.current;
    if (!mountEl) return;

    const isHeadless =
      navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isHeadless && graphicsRef.current.antiAliasing,
      powerPreference: 'high-performance'
    });
    rendererRef.current = renderer;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    const initScale = parseFloat(graphicsRef.current.resolutionScale) || 1.0;
    renderer.setPixelRatio(
      isHeadless ? 1 : Math.min(window.devicePixelRatio * initScale, 2.25)
    );
    renderer.shadowMap.enabled = !isHeadless && graphicsRef.current.shadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const initialRect = mountEl.getBoundingClientRect();
    const initW = Math.max(320, initialRect.width || window.innerWidth);
    const initH = Math.max(240, initialRect.height || window.innerHeight);
    renderer.setSize(initW, initH);
    mountEl.innerHTML = '';
    mountEl.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const horizonColor = new THREE.Color(0x070d19);
    scene.background = horizonColor;
    scene.fog = new THREE.FogExp2(0x070d19, 0.0032);

    if (!isHeadless) {
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      pmremGenerator.dispose();
    }

    const camera = new THREE.PerspectiveCamera(
      generalRef.current.cameraFov,
      initW / initH,
      0.2,
      420
    );
    camera.position.set(-7.2, 5.4, -38.5);
    camera.lookAt(0, 1.8, -12);

    const hemiLight = new THREE.HemisphereLight(0x60a5fa, 0x0f172a, 1.02);
    hemiLight.position.set(0, 60, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff3e0, 2.3);
    keyLight.position.set(38, 64, -24);
    if (!isHeadless) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      const d = 68;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
      keyLight.shadow.camera.near = 5;
      keyLight.shadow.camera.far = 160;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.95);
    rimLight.position.set(-42, 35, 48);
    scene.add(rimLight);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const { albedoMap, bumpMap } = createPitchTextures(maxAniso, isHeadless);
    const hexWallTex = createHexWallTexture();
    const carbonTex = createCarbonWeaveTexture();
    const shadowTex = createRadialShadowTexture();

    const outerTerrainGeo = new THREE.PlaneGeometry(460, 460);
    outerTerrainGeo.rotateX(-Math.PI / 2);
    const outerTerrainMat = new THREE.MeshStandardMaterial({
      color: 0x060b14,
      roughness: 0.92,
      metalness: 0.1
    });
    const outerTerrain = new THREE.Mesh(outerTerrainGeo, outerTerrainMat);
    outerTerrain.position.y = -0.08;
    scene.add(outerTerrain);

    const pitchGeo = new THREE.PlaneGeometry(
      ARENA_BOUNDS.halfWidth * 2,
      ARENA_BOUNDS.halfLength * 2
    );
    pitchGeo.rotateX(-Math.PI / 2);
    const pitchMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: albedoMap,
      bumpMap,
      bumpScale: 0.08,
      roughness: 0.74,
      metalness: 0.1
    });
    const pitchMesh = new THREE.Mesh(pitchGeo, pitchMat);
    pitchMesh.receiveShadow = true;
    scene.add(pitchMesh);

    const roundedEnclosure = createRoundedStadiumEnclosure(hexWallTex, carbonTex);
    scene.add(roundedEnclosure);

    const createGoalAssembly = (zPos: number, colorHex: number) => {
      const gGroup = new THREE.Group();
      const frameMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        metalness: 0.85,
        roughness: 0.18,
        emissive: colorHex,
        emissiveIntensity: 0.5
      });
      const crossbar = new THREE.Mesh(
        new THREE.BoxGeometry(ARENA_BOUNDS.goalHalfWidth * 2 + 1.2, 0.9, 1.2),
        frameMat
      );
      crossbar.position.set(0, ARENA_BOUNDS.goalHeight, zPos);

      const postGeo = new THREE.BoxGeometry(1.0, ARENA_BOUNDS.goalHeight, 1.2);
      const leftPost = new THREE.Mesh(postGeo, frameMat);
      leftPost.position.set(-ARENA_BOUNDS.goalHalfWidth, ARENA_BOUNDS.goalHeight / 2, zPos);
      const rightPost = new THREE.Mesh(postGeo, frameMat);
      rightPost.position.set(ARENA_BOUNDS.goalHalfWidth, ARENA_BOUNDS.goalHeight / 2, zPos);

      const netDepthDir = Math.sign(zPos);
      const netMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const netBox = new THREE.Mesh(
        new THREE.BoxGeometry(
          ARENA_BOUNDS.goalHalfWidth * 2,
          ARENA_BOUNDS.goalHeight,
          ARENA_BOUNDS.goalDepth
        ),
        netMat
      );
      netBox.position.set(
        0,
        ARENA_BOUNDS.goalHeight / 2,
        zPos + netDepthDir * (ARENA_BOUNDS.goalDepth / 2)
      );

      gGroup.add(crossbar, leftPost, rightPost, netBox);
      return gGroup;
    };

    scene.add(
      createGoalAssembly(-ARENA_BOUNDS.halfLength, 0x06b6d4),
      createGoalAssembly(ARENA_BOUNDS.halfLength, 0xf97316)
    );

    const ceilingGrid = new THREE.GridHelper(
      ARENA_BOUNDS.halfLength * 2,
      18,
      0x06b6d4,
      0x1e293b
    );
    ceilingGrid.position.y = ARENA_BOUNDS.ceiling;
    const ceilingMat = ceilingGrid.material as THREE.Material;
    ceilingMat.transparent = true;
    ceilingMat.opacity = 0.28;
    scene.add(ceilingGrid);

    const towerCount = 28;
    const towerGeo = new THREE.BoxGeometry(2.8, 38, 4.2);
    const towerMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      emissive: 0x0f2544,
      emissiveIntensity: 0.65,
      metalness: 0.25,
      roughness: 0.45
    });
    const towerInstanced = new THREE.InstancedMesh(towerGeo, towerMat, towerCount);

    const beaconGeo = new THREE.BoxGeometry(3.8, 1.8, 1.8);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const beaconInstanced = new THREE.InstancedMesh(beaconGeo, beaconMat, towerCount);

    for (let i = 0; i < towerCount; i++) {
      const angle = (i / towerCount) * Math.PI * 2;
      const rx = Math.cos(angle) * (ARENA_BOUNDS.halfWidth + 24);
      const rz = Math.sin(angle) * (ARENA_BOUNDS.halfLength + 24);
      const scaleVar = 0.88 + ((i * 17) % 25) * 0.01;
      _dummyPosition.set(rx, 17 * scaleVar, rz);
      _dummyEuler.set(0, -angle, 0.14);
      _dummyQuat.setFromEuler(_dummyEuler);
      _dummyScale.set(scaleVar, scaleVar, scaleVar);
      _dummyMatrix.compose(_dummyPosition, _dummyQuat, _dummyScale);
      towerInstanced.setMatrixAt(i, _dummyMatrix);
      _dummyColor.setHex(i % 2 === 0 ? 0x1e3a5f : 0x334155);
      towerInstanced.setColorAt(i, _dummyColor);

      _dummyPosition.set(rx * 0.96, 34 * scaleVar, rz * 0.96);
      _dummyScale.set(1, 1, 1);
      _dummyMatrix.compose(_dummyPosition, _dummyQuat, _dummyScale);
      beaconInstanced.setMatrixAt(i, _dummyMatrix);
      _dummyColor.setHex(rz < 0 ? 0x38bdf8 : 0xf59e0b);
      beaconInstanced.setColorAt(i, _dummyColor);
    }
    towerInstanced.instanceMatrix.needsUpdate = true;
    if (towerInstanced.instanceColor) towerInstanced.instanceColor.needsUpdate = true;
    towerInstanced.computeBoundingSphere();

    beaconInstanced.instanceMatrix.needsUpdate = true;
    if (beaconInstanced.instanceColor) beaconInstanced.instanceColor.needsUpdate = true;
    beaconInstanced.computeBoundingSphere();
    scene.add(towerInstanced, beaconInstanced);

    const padCount = arenaStateRef.current.boostPads.length;
    const padOrbGeo = new THREE.OctahedronGeometry(0.95, 1);
    const padOrbMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.85,
      metalness: 0.4,
      roughness: 0.2
    });
    const boostInstanced = new THREE.InstancedMesh(padOrbGeo, padOrbMat, padCount);
    boostInstanced.frustumCulled = false;
    scene.add(boostInstanced);

    const PARTICLE_POOL_SIZE = 120;
    const particleGeo = new THREE.IcosahedronGeometry(0.28, 0);
    const particleMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const particleInstanced = new THREE.InstancedMesh(
      particleGeo,
      particleMat,
      PARTICLE_POOL_SIZE
    );
    particleInstanced.frustumCulled = false;
    const particles: PooledParticle[] = Array.from({ length: PARTICLE_POOL_SIZE }, () => ({
      active: false,
      x: 0,
      y: -100,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 0,
      maxLife: 0.5,
      size: 1,
      r: 1,
      g: 0.7,
      b: 0.2
    }));
    let particleCursor = 0;

    const spawnParticles = (
      x: number,
      y: number,
      z: number,
      count: number,
      speed: number,
      hexColor: string | number,
      size = 1.0
    ) => {
      const pMult =
        graphicsRef.current.particles === 'low'
          ? 0.35
          : graphicsRef.current.particles === 'medium'
          ? 0.7
          : 1.0;
      const finalCount = Math.max(1, Math.round(count * pMult));
      _dummyColor.set(hexColor);
      for (let i = 0; i < finalCount; i++) {
        const p = particles[particleCursor];
        particleCursor = (particleCursor + 1) % PARTICLE_POOL_SIZE;
        p.active = true;
        p.x = x;
        p.y = y;
        p.z = z;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const spd = speed * (0.4 + Math.random() * 0.8);
        p.vx = Math.sin(phi) * Math.cos(theta) * spd;
        p.vy = Math.abs(Math.cos(phi)) * spd + 2.5;
        p.vz = Math.sin(phi) * Math.sin(theta) * spd;
        p.life = 0;
        p.maxLife = 0.25 + Math.random() * 0.35;
        p.size = size * (0.7 + Math.random() * 0.6);
        p.r = _dummyColor.r;
        p.g = _dummyColor.g;
        p.b = _dummyColor.b;
      }
    };
    scene.add(particleInstanced);

    const { ballRoot, coreMesh, equatorRing, groundIndicator } =
      createArenaBallGroup(shadowTex, carbonTex);
    scene.add(ballRoot, groundIndicator);

    const carMeshes = new Map<string, CarMeshRig>();
    const syncCarMeshes = (cars: CarState[]) => {
      const activeIds = new Set(cars.map((c) => c.id));
      for (const [id, rig] of carMeshes.entries()) {
        if (!activeIds.has(id)) {
          scene.remove(rig.root);
          carMeshes.delete(id);
        }
      }
      for (const car of cars) {
        const existing = carMeshes.get(car.id);
        const desiredModel = car.carModel || 'octane';
        if (existing && existing.builtModel !== desiredModel) {
          scene.remove(existing.root);
          carMeshes.delete(car.id);
        }
        if (!carMeshes.has(car.id)) {
          const rig = createRocketCarGroup(car, shadowTex, carbonTex);
          scene.add(rig.root);
          carMeshes.set(car.id, rig);
        }
      }
    };
    syncCarMeshes(arenaStateRef.current.cars);

    const keysHeld = new Set<string>();
    const keysJustPressed = new Set<string>();
    let pointerNormX = 0;
    let pointerNormY = 0;

    const mapMouseButtonCode = (button: number): string | null => {
      if (button === 0) return 'MouseLeft';
      if (button === 1) return 'MouseMiddle';
      if (button === 2) return 'MouseRight';
      return null;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      soundEngine.unlock();
      const target = e.target as HTMLElement | null;
      const isInputFocused =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT');
      if (isInputFocused) return;

      if (!keysHeld.has(e.code)) {
        keysJustPressed.add(e.code);
      }
      keysHeld.add(e.code);

      if (e.code === 'KeyC' || e.code === 'KeyY') {
        onToggleBallCamRef.current();
      } else if (e.code === 'Escape' || e.code === 'KeyP') {
        if (gameStateRef.current === 'playing') {
          onPauseRequestedRef.current();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysHeld.delete(e.code);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (gameStateRef.current !== 'playing') return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.closest('button') ||
          target.closest('input') ||
          target.closest('select') ||
          target.closest('[role="dialog"]') ||
          target.closest('[data-touch-control="true"]'))
      ) {
        return;
      }

      soundEngine.unlock();
      const code = mapMouseButtonCode(e.button);
      if (code) {
        if (!keysHeld.has(code)) {
          keysJustPressed.add(code);
        }
        keysHeld.add(code);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      const code = mapMouseButtonCode(e.button);
      if (code) {
        keysHeld.delete(code);
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (gameStateRef.current === 'playing') {
        e.preventDefault();
      }
    };

    const clearInputs = () => {
      keysHeld.clear();
      keysJustPressed.clear();
    };

    const handlePointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        pointerNormX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointerNormY = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('blur', clearInputs);
    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height);
        }
      }
    });
    resizeObserver.observe(mountEl);

    const clock = new THREE.Clock();
    let rafId = 0;
    let headlessTimerId = 0;
    let lastHudEmit = 0;
    let lastReplayCapture = 0;
    let replayFloatIndex = 0;
    let cameraTrauma = 0;
    let matchFinishTriggered = false;

    const animate = (nowMs: number) => {
      if (isHeadless) {
        headlessTimerId = window.setTimeout(() => animate(performance.now()), 120);
      } else {
        rafId = requestAnimationFrame(animate);
      }

      const rawDt = clock.getDelta();
      const dt = Math.min(rawDt, 0.05);
      const elapsed = clock.getElapsedTime();

      const state = arenaStateRef.current;

      // Sync player 1 cosmetics live from Garage / Market
      const playerCar = state.cars[0];
      if (playerCar) {
        playerCar.carModel = cosmeticsRef.current.carModel || 'octane';
        playerCar.bodyColor = cosmeticsRef.current.bodyColor;
        playerCar.finish = cosmeticsRef.current.finish;
        playerCar.boostColor = cosmeticsRef.current.boostColor;
        playerCar.wheelStyle = cosmeticsRef.current.wheelStyle;
      }

      syncCarMeshes(state.cars);

      if (playerCar) {
        const pRig = carMeshes.get(playerCar.id);
        if (pRig) {
          const mat = pRig.hullMesh.material as THREE.MeshPhysicalMaterial;
          mat.color.set(playerCar.bodyColor);
          const fp = getFinishMaterialParams(playerCar.finish, isHeadless);
          mat.metalness = fp.metalness;
          mat.roughness = fp.roughness;
          mat.clearcoat = fp.clearcoat;
          mat.clearcoatRoughness = fp.clearcoatRoughness;
          (pRig.thrusterFlame.material as THREE.MeshBasicMaterial).color.set(
            playerCar.boostColor
          );
          const rimHex =
            playerCar.wheelStyle === 'turbine_gold'
              ? 0xf59e0b
              : playerCar.wheelStyle === 'cyber_blade'
              ? 0x38bdf8
              : 0xe2e8f0;
          for (const rm of pRig.rimMeshes) {
            const rMat = rm.material as THREE.MeshStandardMaterial;
            rMat.color.setHex(rimHex);
          }
        }
      }

      if (gameStateRef.current === 'playing') {
        if (!state.matchEnded) {
          matchFinishTriggered = false;
        }

        const binds = controlBindingsRef.current;
        const mob = mobileInputRef.current;

        let throttle = mob.throttle;
        if (keysHeld.has(binds.forward) || keysHeld.has('ArrowUp')) throttle = 1;
        else if (keysHeld.has(binds.backward) || keysHeld.has('ArrowDown')) throttle = -1;

        let steer = mob.steer;
        if (keysHeld.has(binds.left) || keysHeld.has('ArrowLeft')) steer = 1;
        else if (keysHeld.has(binds.right) || keysHeld.has('ArrowRight')) steer = -1;

        const jumpHeld = keysHeld.has(binds.jump) || mob.jumpHeld;
        const jumpJustPressed = keysJustPressed.has(binds.jump) || mob.jumpJustPressed;
        mob.jumpJustPressed = false;

        const boostHeld = keysHeld.has(binds.boost) || mob.boostHeld;
        const driftHeld =
          keysHeld.has(binds.drift) ||
          (binds.drift === 'ShiftLeft' && keysHeld.has('ShiftRight')) ||
          mob.driftHeld;
        const flyUpHeld = keysHeld.has(binds.flyUp) || mob.flyUpHeld;

        const input: ControlInput = {
          throttle,
          steer,
          jumpHeld,
          jumpJustPressed,
          boostHeld,
          driftHeld,
          flyUpHeld
        };

        const events = stepArenaPhysics(state, input, dt);
        keysJustPressed.clear();

        const hasMajorEvent = Boolean(
          events.goalScored || events.carDemolished || events.saveMade
        );
        if (hasMajorEvent || nowMs - lastReplayCapture >= 65) {
          lastReplayCapture = nowMs;
          let eventLabel: string | undefined;
          if (events.goalScored) {
            eventLabel = state.isOvertime
              ? `ALTIN GOL (${state.lastScorerName || 'Takım'})`
              : `GOL (${state.lastScorerName || 'Takım'})`;
          } else if (events.carDemolished) {
            eventLabel = `PATLATMA (${events.carDemolished.attacker} -> ${events.carDemolished.victim})`;
          } else if (events.saveMade) {
            eventLabel = 'KURTARIŞ';
          }

          const frame = captureReplayFrame(state, elapsed, eventLabel);
          const frames = replayFramesRef.current;
          if (frames.length < 3600) {
            const idx = frames.length;
            frames.push(frame);
            if (events.goalScored) {
              replayEventsRef.current.push({
                frameIndex: idx,
                timestamp: elapsed,
                type: 'goal',
                label: `GOL: ${state.lastScorerName || 'Oyuncu'}`
              });
            }
            if (events.carDemolished) {
              replayEventsRef.current.push({
                frameIndex: idx,
                timestamp: elapsed,
                type: 'demolition',
                label: `PATLATMA: ${events.carDemolished.victim}`
              });
            }
            if (events.saveMade) {
              replayEventsRef.current.push({
                frameIndex: idx,
                timestamp: elapsed,
                type: 'save',
                label: 'KURTARIŞ'
              });
            }
          }
        }

        if (events.jumped && playerCar) {
          soundEngine.playJump();
          spawnParticles(
            playerCar.position.x,
            playerCar.position.y + 0.3,
            playerCar.position.z,
            6,
            8,
            0xe2e8f0,
            0.8
          );
        }
        if (events.dodged && playerCar) {
          soundEngine.playDodge();
          cameraTrauma = Math.min(1, cameraTrauma + 0.25);
          spawnParticles(
            playerCar.position.x,
            playerCar.position.y + 0.6,
            playerCar.position.z,
            12,
            14,
            playerCar.boostColor,
            1.1
          );
        }
        if (events.boostPickedUp && playerCar) {
          soundEngine.playBoostPickup();
          spawnParticles(
            playerCar.position.x,
            0.8,
            playerCar.position.z,
            8,
            10,
            0xf59e0b,
            0.9
          );
        }
        if (events.carDemolished) {
          soundEngine.playDemolitionExplosion();
          cameraTrauma = 1.0;
          spawnParticles(
            events.carDemolished.position.x,
            events.carDemolished.position.y + 1.2,
            events.carDemolished.position.z,
            42,
            32,
            0xef4444,
            2.1
          );
          spawnParticles(
            events.carDemolished.position.x,
            events.carDemolished.position.y + 1.5,
            events.carDemolished.position.z,
            24,
            24,
            0xf59e0b,
            1.6
          );
        }
        if (events.heavyHit || events.lightHit) {
          soundEngine.playBallHit(events.heavyHit);
          cameraTrauma = Math.min(
            1,
            cameraTrauma + (events.heavyHit ? 0.55 : 0.2)
          );
          spawnParticles(
            state.ball.position.x,
            state.ball.position.y,
            state.ball.position.z,
            events.heavyHit ? 22 : 8,
            events.heavyHit ? 20 : 10,
            events.heavyHit ? 0xf59e0b : 0x38bdf8,
            events.heavyHit ? 1.4 : 0.9
          );
        }
        if (events.goalScored) {
          soundEngine.playGoalExplosion();
          cameraTrauma = 0.95;
          spawnParticles(
            state.ball.position.x,
            state.ball.position.y,
            state.ball.position.z,
            36,
            28,
            events.goalScored === 'blue' ? 0x06b6d4 : 0xf97316,
            1.8
          );
        }

        for (const c of state.cars) {
          if (c.demolishedTimer > 0) continue;
          const cSpeed = Math.hypot(c.velocity.x, c.velocity.y, c.velocity.z);
          if (cSpeed > 24 && c.boost > 0 && Math.random() < 0.45) {
            const backX = c.position.x - Math.sin(c.yaw) * 2.4;
            const backZ = c.position.z - Math.cos(c.yaw) * 2.4;
            spawnParticles(backX, c.position.y + 0.65, backZ, 1, 5, c.boostColor, 0.75);
          }
        }

        // Trigger match end ONLY when `state.matchEnded` is true (never on a tie!)
        if (state.mode !== 'practice' && state.matchEnded && !matchFinishTriggered) {
          matchFinishTriggered = true;
          onMatchFinishedRef.current(state);
        }
      } else if (gameStateRef.current === 'replay') {
        const frames = replayFramesRef.current;
        const rCtrl = replayControlRef.current;
        if (frames.length > 0) {
          if (rCtrl.playing) {
            replayFloatIndex =
              (rCtrl.frameIndex + dt * 15 * rCtrl.speed) % frames.length;
            rCtrl.frameIndex = Math.floor(replayFloatIndex);
          } else {
            replayFloatIndex = rCtrl.frameIndex;
          }
          const safeIdx = Math.max(0, Math.min(frames.length - 1, rCtrl.frameIndex));
          applyReplayFrameToArena(state, frames[safeIdx]);
        }
      } else if (gameStateRef.current === 'title' && playerCar) {
        // In Garage boost preview mode, fire nitro particles live behind the car!
        if (garageFocusRef.current === 'boost' && Math.random() < 0.7) {
          const backX = playerCar.position.x - Math.sin(playerCar.yaw) * 2.5;
          const backZ = playerCar.position.z - Math.cos(playerCar.yaw) * 2.5;
          spawnParticles(backX, playerCar.position.y + 0.72, backZ, 2, 7, playerCar.boostColor, 0.9);
        }
      }

      // Update 3D Car Rigs
      for (const car of state.cars) {
        const rig = carMeshes.get(car.id);
        if (!rig) continue;

        rig.root.visible = car.demolishedTimer <= 0;
        if (!rig.root.visible) continue;

        rig.root.position.set(car.position.x, 0, car.position.z);
        rig.root.rotation.y = car.yaw;

        rig.bodyGroup.position.y = car.position.y;
        rig.bodyGroup.rotation.x = car.pitch;
        rig.bodyGroup.rotation.z = car.roll;
        rig.bodyGroup.scale.set(car.squashX, car.squashY, car.squashX);

        rig.contactShadow.scale.setScalar(
          Math.max(0.25, 1 - car.position.y / 38)
        );

        const carSpeed = Math.hypot(car.velocity.x, car.velocity.y, car.velocity.z);
        const isGarageBoostPreview =
          gameStateRef.current === 'title' &&
          car.id === 'player_1' &&
          garageFocusRef.current === 'boost';
        rig.thrusterFlame.visible =
          isGarageBoostPreview || carSpeed > 20 || car.supersonic || car.position.y > 2.5;
        if (rig.thrusterFlame.visible) {
          rig.thrusterFlame.scale.set(
            1,
            1,
            0.95 + Math.sin(elapsed * 38) * 0.25 + (car.supersonic || isGarageBoostPreview ? 0.65 : 0)
          );
        }

        const beaconMat = rig.telegraphBeacon.material as THREE.MeshBasicMaterial;
        beaconMat.opacity = car.telegraphTimer > 0.05 ? 0.85 : 0;

        const spinSpeed =
          gameStateRef.current === 'title' && garageFocusRef.current === 'wheels'
            ? 4.5
            : carSpeed * 0.6;
        for (const w of rig.wheels) {
          w.rotation.x += spinSpeed * dt;
        }
      }

      // Update 3D Ball & Ground Indicator
      const b = state.ball;
      ballRoot.position.set(b.position.x, b.position.y, b.position.z);
      ballRoot.rotation.x += b.angularVelocity.x * dt;
      ballRoot.rotation.z += b.angularVelocity.z * dt;

      const coreMat = coreMesh.material as THREE.MeshStandardMaterial;
      if (b.hitFlashTimer > 0) {
        coreMat.emissive.setHex(0xffffff);
        coreMat.emissiveIntensity = 0.9;
      } else {
        coreMat.emissive.setHex(0x000000);
        coreMat.emissiveIntensity = 0;
      }

      const ringMat = equatorRing.material as THREE.MeshBasicMaterial;
      ringMat.color.setHex(b.position.z >= 0 ? 0xf97316 : 0x38bdf8);

      groundIndicator.position.set(b.position.x, 0, b.position.z);
      const heightRatio = Math.max(0.3, 1 - (b.position.y - b.radius) / 42);
      groundIndicator.scale.setScalar(heightRatio);

      for (let i = 0; i < state.boostPads.length; i++) {
        const pad = state.boostPads[i];
        const scale = pad.active ? (pad.isFull ? 1.25 : 0.65) : 0.001;
        _dummyPosition.set(
          pad.x,
          pad.isFull ? 1.15 + Math.sin(elapsed * 3.2 + i) * 0.22 : 0.45,
          pad.z
        );
        _dummyEuler.set(0, elapsed * 2.2 + i, 0);
        _dummyQuat.setFromEuler(_dummyEuler);
        _dummyScale.setScalar(scale);
        _dummyMatrix.compose(_dummyPosition, _dummyQuat, _dummyScale);
        boostInstanced.setMatrixAt(i, _dummyMatrix);
      }
      boostInstanced.instanceMatrix.needsUpdate = true;

      for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
        const p = particles[i];
        if (!p.active) {
          _dummyScale.setScalar(0.0001);
          _dummyPosition.set(0, -100, 0);
          _dummyMatrix.compose(_dummyPosition, _dummyQuat, _dummyScale);
          particleInstanced.setMatrixAt(i, _dummyMatrix);
          continue;
        }
        p.life += dt;
        if (p.life >= p.maxLife) {
          p.active = false;
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        p.vy -= 18 * dt;
        const lifeRatio = 1 - p.life / p.maxLife;
        _dummyPosition.set(p.x, Math.max(0.1, p.y), p.z);
        _dummyScale.setScalar(p.size * lifeRatio);
        _dummyMatrix.compose(_dummyPosition, _dummyQuat, _dummyScale);
        particleInstanced.setMatrixAt(i, _dummyMatrix);
        _dummyColor.setRGB(p.r, p.g, p.b);
        particleInstanced.setColorAt(i, _dummyColor);
      }
      particleInstanced.instanceMatrix.needsUpdate = true;
      if (particleInstanced.instanceColor) {
        particleInstanced.instanceColor.needsUpdate = true;
      }

      // Camera Choreography (including Garage Part-Zoom Focus!)
      if (gameStateRef.current === 'title') {
        const carX = playerCar ? playerCar.position.x : 0;
        const carY = playerCar ? playerCar.position.y : 0;
        const carZ = playerCar ? playerCar.position.z : -50;
        const focus = garageFocusRef.current;

        if (focus === 'wheels') {
          // Zoom directly onto the front/side wheel rim & caliper
          _camDesired.set(
            carX - 3.0 + Math.sin(elapsed * 0.6) * 0.25,
            carY + 0.95,
            carZ + 1.0 + Math.cos(elapsed * 0.6) * 0.35
          );
          _camLookTarget.set(carX - 1.1, carY + 0.6, carZ + 0.2);
        } else if (focus === 'boost') {
          // Swing behind the rear rocket exhaust nozzle to showcase the live nitro flame
          _camDesired.set(
            carX + 1.65 + Math.sin(elapsed * 0.5) * 0.4,
            carY + 1.35,
            carZ - 4.4
          );
          _camLookTarget.set(carX, carY + 0.72, carZ - 2.2);
        } else if (focus === 'finish') {
          // Zoom onto hood/roof clearcoat reflection
          _camDesired.set(
            carX - 3.6 + Math.sin(elapsed * 0.4) * 0.6,
            carY + 2.45,
            carZ + 2.8
          );
          _camLookTarget.set(carX, carY + 1.05, carZ + 0.1);
        } else if (focus === 'body') {
          // Showroom 3/4 orbit around the car chassis
          const ang = elapsed * 0.35;
          _camDesired.set(
            carX - Math.cos(ang) * 5.2,
            carY + 2.05,
            carZ + Math.sin(ang) * 5.2
          );
          _camLookTarget.set(carX, carY + 0.95, carZ);
        } else {
          // Lobby Overview
          const sway = Math.sin(elapsed * 0.45) * 4.2 + pointerNormX * 3.5;
          _camDesired.set(
            carX - 6.8 + sway,
            5.3 + pointerNormY * -1.1,
            carZ - 10.5 + Math.cos(elapsed * 0.45) * 1.8
          );
          _camLookTarget.set(carX * 0.5, 1.8, carZ + 22);
        }
        const camDamp = 1 - Math.exp(-6.5 * dt);
        camera.position.lerp(_camDesired, camDamp);
        camera.lookAt(_camLookTarget);
      } else if (gameStateRef.current === 'replay' && playerCar) {
        const rCam = replayControlRef.current.cameraMode;
        const camDamp = 1 - Math.exp(-8.0 * dt);
        if (rCam === 'stadium') {
          _camDesired.set(
            Math.sin(elapsed * 0.22) * 44,
            24,
            b.position.z * 0.45 - 38
          );
          _camLookTarget.set(b.position.x * 0.7, b.position.y * 0.5 + 2, b.position.z * 0.7);
        } else if (rCam === 'ball') {
          _camDesired.set(b.position.x + 16, b.position.y + 8, b.position.z - 18);
          _camLookTarget.set(b.position.x, b.position.y, b.position.z);
        } else {
          const fwdX = Math.sin(playerCar.yaw);
          const fwdZ = Math.cos(playerCar.yaw);
          _camDesired.set(
            playerCar.position.x - fwdX * 12,
            playerCar.position.y + 4.8,
            playerCar.position.z - fwdZ * 12
          );
          _camLookTarget.set(b.position.x, b.position.y + 1.5, b.position.z);
        }
        camera.position.lerp(_camDesired, camDamp);
        camera.lookAt(_camLookTarget);
      } else if (playerCar) {
        const camDist = generalRef.current.cameraDistance || 12;
        const camDamp = 1 - Math.exp(-9.5 * dt);
        if (ballCamRef.current) {
          _vec3A.set(
            b.position.x - playerCar.position.x,
            0,
            b.position.z - playerCar.position.z
          );
          if (_vec3A.lengthSq() < 0.01) {
            _vec3A.set(Math.sin(playerCar.yaw), 0, Math.cos(playerCar.yaw));
          } else {
            _vec3A.normalize();
          }
          _camDesired.set(
            playerCar.position.x - _vec3A.x * camDist,
            playerCar.position.y + 4.6,
            playerCar.position.z - _vec3A.z * camDist
          );
          _camLookTarget.set(
            b.position.x * 0.65 + playerCar.position.x * 0.35,
            b.position.y * 0.55 + playerCar.position.y * 0.35 + 1.5,
            b.position.z * 0.65 + playerCar.position.z * 0.35
          );
        } else {
          const fwdX = Math.sin(playerCar.yaw);
          const fwdZ = Math.cos(playerCar.yaw);
          _camDesired.set(
            playerCar.position.x - fwdX * camDist,
            playerCar.position.y + 4.6,
            playerCar.position.z - fwdZ * camDist
          );
          _camLookTarget.set(
            playerCar.position.x + fwdX * 14,
            playerCar.position.y + 2.0,
            playerCar.position.z + fwdZ * 14
          );
        }

        _camDesired.x = THREE.MathUtils.clamp(
          _camDesired.x,
          -ARENA_BOUNDS.halfWidth + 2.2,
          ARENA_BOUNDS.halfWidth - 2.2
        );
        _camDesired.z = THREE.MathUtils.clamp(
          _camDesired.z,
          -ARENA_BOUNDS.halfLength + 2.2,
          ARENA_BOUNDS.halfLength - 2.2
        );
        _camDesired.y = THREE.MathUtils.clamp(
          _camDesired.y,
          2.2,
          ARENA_BOUNDS.ceiling - 1.5
        );

        camera.position.lerp(_camDesired, camDamp);

        if (cameraTrauma > 0 && generalRef.current.cameraShake) {
          const shake = cameraTrauma * cameraTrauma * 0.65;
          camera.position.x += (Math.random() * 2 - 1) * shake;
          camera.position.y += (Math.random() * 2 - 1) * shake;
          cameraTrauma = Math.max(0, cameraTrauma - dt * 2.4);
        } else {
          cameraTrauma = 0;
        }

        const baseFov = generalRef.current.cameraFov || 68;
        const targetFov = playerCar.supersonic ? baseFov + 10 : baseFov;
        camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, camDamp);
        camera.updateProjectionMatrix();

        _vec3B.lerp(_camLookTarget, camDamp);
        camera.lookAt(_vec3B);
      }

      renderer.render(scene, camera);

      if (nowMs - lastHudEmit > 100 && playerCar) {
        lastHudEmit = nowMs;
        const speedRaw = Math.hypot(
          playerCar.velocity.x,
          playerCar.velocity.y,
          playerCar.velocity.z
        );
        onHudUpdateRef.current({
          blueScore: state.blueScore,
          orangeScore: state.orangeScore,
          timeRemaining: state.timeRemaining,
          isOvertime: Boolean(state.isOvertime),
          overtimeElapsed: state.overtimeElapsed || 0,
          boost: Math.round(playerCar.boost),
          speedKmh: Math.round(speedRaw * 3.2),
          altitude: Math.round(playerCar.position.y),
          supersonic: playerCar.supersonic,
          ballCam: ballCamRef.current,
          dodgeType: playerCar.dodgeType,
          surfaceState: playerCar.surfaceState,
          goalBanner:
            state.goalResetTimer > 0 && state.lastScoringTeam
              ? {
                  team: state.lastScoringTeam,
                  scorer: state.lastScorerName || 'Oyuncu',
                  isGoldenGoal: Boolean(state.isOvertime)
                }
              : null,
          demolitionBanner: state.lastDemolitionBanner
            ? {
                attacker: state.lastDemolitionBanner.attacker,
                victim: state.lastDemolitionBanner.victim
              }
            : null,
          playerGoals: playerCar.goals,
          playerSaves: playerCar.saves,
          playerShots: playerCar.shots,
          playerDemolitions: playerCar.demolitions,
          replayFrameCount: replayFramesRef.current.length,
          replayCurrentFrame: replayControlRef.current.frameIndex
        });
      }
    };

    animate(performance.now());

    return () => {
      cancelAnimationFrame(rafId);
      window.clearTimeout(headlessTimerId);
      resizeObserver.disconnect();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('blur', clearInputs);
      window.removeEventListener('pointermove', handlePointerMove);
      renderer.dispose();
    };
  }, [arenaStateRef, mobileInputRef, replayFramesRef, replayEventsRef, replayControlRef]);

  return (
    <div
      ref={canvasMountRef}
      data-testid="arena-webgl-canvas"
      className="fixed inset-0 w-full h-full overflow-hidden bg-[#070d19]"
    />
  );
};
