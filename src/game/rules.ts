export type GameMode = '1v1' | '2v2' | '3v3' | 'practice';
export type PlaylistCategory = 'competitive' | 'casual';
export type PlayerRegion = 'EU' | 'TR' | 'ASIA' | 'NA' | 'SAM';
export type CarModelType = 'octane' | 'dominus' | 'fennec';
export type GarageFocusTarget = 'overview' | 'body' | 'finish' | 'wheels' | 'boost';
export type BotArchetype = 'striker' | 'sweeper' | 'flanker';
export type BotDifficulty = 'rookie' | 'pro' | 'allstar' | 'unfair';
export type CrossPlatformNetwork = 'PC_STEAM_EPIC' | 'MOBILE_TOUCH' | 'CONSOLE_CROSS';
export type DodgeFlipType = 'none' | 'front' | 'back' | 'left' | 'right' | 'diagonal';
export type CarSurfaceState = 'floor' | 'wall' | 'ceiling' | 'air';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface RegionInfo {
  id: PlayerRegion;
  name: string;
  pingRange: string;
  serverCluster: string;
  tournamentTitle: string;
  tournamentPrize: string;
}

export const REGIONS_CATALOG: RegionInfo[] = [
  {
    id: 'EU',
    name: 'Avrupa (EU Central)',
    pingRange: '24-38 ms',
    serverCluster: 'Frankfurt / Amsterdam',
    tournamentTitle: 'Avrupa Şampiyonlar Kupası (3v3)',
    tournamentPrize: '1.500 CR + Efsanevi Kutu'
  },
  {
    id: 'TR',
    name: 'Türkiye & MENA (TR)',
    pingRange: '9-18 ms',
    serverCluster: 'İstanbul Merkez',
    tournamentTitle: 'Türkiye Süpersonik Arena Kupası',
    tournamentPrize: '1.200 CR + Altın Türbin Blueprint'
  },
  {
    id: 'ASIA',
    name: 'Asya-Pasifik (ASIA)',
    pingRange: '68-95 ms',
    serverCluster: 'Tokyo / Singapur',
    tournamentTitle: 'Asya Siber Ligi Turnuvası',
    tournamentPrize: '1.500 CR + Neon Bıçak Jant'
  },
  {
    id: 'NA',
    name: 'Kuzey Amerika (NA)',
    pingRange: '85-110 ms',
    serverCluster: 'New York / Chicago',
    tournamentTitle: 'NA Grand Prix Serisi',
    tournamentPrize: '1.400 CR + 2x Gizemli Kutu'
  },
  {
    id: 'SAM',
    name: 'Güney Amerika (SAM)',
    pingRange: '115-140 ms',
    serverCluster: 'São Paulo',
    tournamentTitle: 'Copa Nitro Güney Amerika',
    tournamentPrize: '1.200 CR + Zümrüt Gövde'
  }
];

export interface GraphicsSettingsState {
  resolutionScale: '0.75' | '1.0' | '1.35' | '2.0';
  preset: 'performance' | 'balanced' | 'quality' | 'ultra';
  shadows: boolean;
  reflections: boolean;
  antiAliasing: boolean;
  particles: 'low' | 'medium' | 'high';
}

export const DEFAULT_GRAPHICS_SETTINGS: GraphicsSettingsState = {
  resolutionScale: '1.0',
  preset: 'ultra',
  shadows: true,
  reflections: true,
  antiAliasing: true,
  particles: 'high'
};

export interface GeneralSettingsState {
  cameraFov: number; // 60 to 105
  cameraDistance: number; // 9 to 18
  cameraShake: boolean;
  selectedLogo: 1 | 2 | 3;
  region: PlayerRegion;
}

export const DEFAULT_GENERAL_SETTINGS: GeneralSettingsState = {
  cameraFov: 68,
  cameraDistance: 12,
  cameraShake: true,
  selectedLogo: 1,
  region: 'EU'
};

export interface ControlBindings {
  forward: string;
  backward: string;
  left: string;
  right: string;
  jump: string;
  boost: string;
  drift: string;
  flyUp: string;
}

export const DEFAULT_CONTROL_BINDINGS: ControlBindings = {
  forward: 'KeyW',
  backward: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  jump: 'MouseRight',
  boost: 'MouseLeft',
  drift: 'ShiftLeft',
  flyUp: 'Space'
};

export interface MobileButtonOffset {
  offsetX: number; // -120 to +120 px
  offsetY: number; // -120 to +120 px
  scale: number; // 0.75 to 1.35
}

export interface MobileControlsConfig {
  steerMode: 'joystick' | 'buttons';
  joystick: MobileButtonOffset;
  boost: MobileButtonOffset;
  jump: MobileButtonOffset;
  flyUp: MobileButtonOffset;
  drift: MobileButtonOffset;
}

export const DEFAULT_MOBILE_CONTROLS_CONFIG: MobileControlsConfig = {
  steerMode: 'joystick',
  joystick: { offsetX: 0, offsetY: 0, scale: 1.0 },
  boost: { offsetX: 0, offsetY: 0, scale: 1.0 },
  jump: { offsetX: 0, offsetY: 0, scale: 1.0 },
  flyUp: { offsetX: 0, offsetY: 0, scale: 1.0 },
  drift: { offsetX: 0, offsetY: 0, scale: 1.0 }
};

export function formatKeyBindingLabel(code: string): string {
  switch (code) {
    case 'MouseLeft':
      return 'Sol Tık (Fare)';
    case 'MouseRight':
      return 'Sağ Tık (Fare)';
    case 'MouseMiddle':
      return 'Orta Tık (Fare)';
    case 'ShiftLeft':
    case 'ShiftRight':
      return 'Shift';
    case 'Space':
      return 'Space (Boşluk)';
    case 'ControlLeft':
    case 'ControlRight':
      return 'Ctrl';
    case 'AltLeft':
    case 'AltRight':
      return 'Alt';
    case 'ArrowUp':
      return 'Yukarı Ok';
    case 'ArrowDown':
      return 'Aşağı Ok';
    case 'ArrowLeft':
      return 'Sol Ok';
    case 'ArrowRight':
      return 'Sağ Ok';
    default:
      if (code.startsWith('Key')) return code.slice(3);
      if (code.startsWith('Digit')) return code.slice(5);
      return code;
  }
}

export interface CarState {
  id: string;
  name: string;
  team: 'blue' | 'orange';
  isBot: boolean;
  archetype: BotArchetype;
  platform: CrossPlatformNetwork;
  position: Vec3;
  velocity: Vec3;
  yaw: number;
  pitch: number;
  roll: number;
  boost: number;
  isGrounded: boolean;
  surfaceState: CarSurfaceState;
  wallStallTimer: number;
  ceilingClingTimer: number;
  wallNormal: { x: number; z: number };
  hasDoubleJump: boolean;
  coyoteTimer: number;
  jumpBufferTimer: number;
  dodgeTimer: number;
  dodgeType: DodgeFlipType;
  dodgePitchAxis: number;
  dodgeRollAxis: number;
  dodgeDir: { x: number; z: number };
  supersonic: boolean;
  demolishedTimer: number;
  demolitions: number;
  telegraphTimer: number;
  goals: number;
  saves: number;
  shots: number;
  carModel?: CarModelType;
  bodyColor: string;
  finish: string;
  boostColor: string;
  wheelStyle: string;
  squashX: number;
  squashY: number;
}

export interface BallState {
  position: Vec3;
  velocity: Vec3;
  angularVelocity: Vec3;
  radius: number;
  lastTouchedBy: string | null;
  lastTouchTeam: 'blue' | 'orange' | null;
  hitFlashTimer: number;
}

export interface BoostPad {
  id: string;
  x: number;
  z: number;
  isFull: boolean; // true = 100 boost (20s cooldown), false = 15 boost (10s cooldown)
  active: boolean;
  cooldown: number;
}

export const FULL_BOOST_COOLDOWN = 20;
export const SMALL_BOOST_COOLDOWN = 10;

export interface ControlInput {
  throttle: number; // -1 to 1
  steer: number; // -1 to 1
  jumpHeld: boolean;
  jumpJustPressed: boolean;
  boostHeld: boolean;
  driftHeld: boolean;
  flyUpHeld?: boolean;
}

export interface ArenaPhysicsEvents {
  goalScored: 'blue' | 'orange' | null;
  goldenGoalWinner: 'blue' | 'orange' | null;
  overtimeStarted: boolean;
  heavyHit: boolean;
  lightHit: boolean;
  hitImpactSpeed: number;
  boostPickedUp: boolean;
  jumped: boolean;
  dodged: boolean;
  dodgeType: DodgeFlipType;
  saveMade: boolean;
  carDemolished: { attacker: string; victim: string; position: Vec3 } | null;
}

export interface ReplayCarSnapshot {
  id: string;
  name: string;
  team: 'blue' | 'orange';
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  roll: number;
  boost: number;
  supersonic: boolean;
  demolishedTimer: number;
  dodgeType: DodgeFlipType;
  bodyColor: string;
  finish: string;
  boostColor: string;
  wheelStyle: string;
}

export interface ReplayFrame {
  timestamp: number;
  matchTimeRemaining: number;
  blueScore: number;
  orangeScore: number;
  ball: {
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
  };
  cars: ReplayCarSnapshot[];
  eventLabel?: string;
}

export interface ReplayEventMarker {
  frameIndex: number;
  timestamp: number;
  type: 'goal' | 'demolition' | 'save';
  label: string;
}

export interface ArenaState {
  mode: GameMode;
  playlistCategory?: PlaylistCategory;
  region?: PlayerRegion;
  botDifficulty: BotDifficulty;
  practiceBotEnabled: boolean;
  timeRemaining: number;
  isOvertime?: boolean;
  overtimeElapsed?: number;
  matchEnded?: boolean;
  blueScore: number;
  orangeScore: number;
  hitstopTimer: number;
  goalResetTimer: number;
  lastScorerName: string | null;
  lastScoringTeam: 'blue' | 'orange' | null;
  lastDemolitionBanner: { attacker: string; victim: string; timer: number } | null;
  cars: CarState[];
  ball: BallState;
  boostPads: BoostPad[];
}

// Rocket League Enlarged Rectangular Stadium with Rounded Corners & Solid Curved Wall Ramps
export const ARENA_BOUNDS = {
  halfWidth: 58,
  halfLength: 88,
  ceiling: 46,
  cornerRadius: 16,
  wallCurveRadius: 5.5,
  goalHalfWidth: 13.5,
  goalHeight: 9.2,
  goalDepth: 9,
  carRadius: 1.9,
  ballRadius: 2.35
};

/**
 * Evaluates the rounded-rectangle Rocket League stadium boundary in the XZ plane.
 * Also computes the solid 3D curved floor-to-wall ramp height `rampHeightY` and slope angle `rampAngle`
 * so cars and the ball physically ride UP the curved corner/wall block instead of passing through it.
 */
export function evaluateRoundedArenaWall(
  x: number,
  z: number,
  margin: number,
  inGoalMouth: boolean
): {
  clampedX: number;
  clampedZ: number;
  nx: number;
  nz: number;
  penetration: number;
  distToWall: number;
  rampHeightY: number;
  rampSlopeAngle: number;
} {
  const maxW = ARENA_BOUNDS.halfWidth - margin;
  const maxL = ARENA_BOUNDS.halfLength - margin;
  const R = Math.max(2, ARENA_BOUNDS.cornerRadius - margin);
  const rampR = ARENA_BOUNDS.wallCurveRadius;

  if (inGoalMouth) {
    const goalMaxZ = ARENA_BOUNDS.halfLength + ARENA_BOUNDS.goalDepth - margin;
    let clampedX = x;
    let clampedZ = z;
    let nx = 0;
    let nz = 0;
    let pen = 0;

    if (Math.abs(z) > goalMaxZ) {
      pen = Math.abs(z) - goalMaxZ;
      clampedZ = Math.sign(z) * goalMaxZ;
      nz = -Math.sign(z);
    }
    const goalSideW = ARENA_BOUNDS.goalHalfWidth - margin * 0.5;
    if (Math.abs(z) > ARENA_BOUNDS.halfLength && Math.abs(x) > goalSideW) {
      clampedX = Math.sign(x) * goalSideW;
      nx = -Math.sign(x);
      pen = Math.max(pen, Math.abs(x) - goalSideW);
    }
    return {
      clampedX,
      clampedZ,
      nx,
      nz: nz || (z >= 0 ? -1 : 1),
      penetration: pen,
      distToWall: Math.max(0, goalMaxZ - Math.abs(z)),
      rampHeightY: 0,
      rampSlopeAngle: 0
    };
  }

  const innerW = maxW - R;
  const innerL = maxL - R;
  const absX = Math.abs(x);
  const absZ = Math.abs(z);

  let clampedX = x;
  let clampedZ = z;
  let nx = 0;
  let nz = 0;
  let penetration = 0;
  let distToWall = 0;

  // Check if inside one of the 4 rounded corner quadrants
  if (absX > innerW && absZ > innerL) {
    const dx = absX - innerW;
    const dz = absZ - innerL;
    const cornerDist = Math.hypot(dx, dz);
    const signX = x >= 0 ? 1 : -1;
    const signZ = z >= 0 ? 1 : -1;
    const ux = cornerDist > 0.0001 ? (dx / cornerDist) * signX : signX * 0.7071;
    const uz = cornerDist > 0.0001 ? (dz / cornerDist) * signZ : signZ * 0.7071;

    penetration = Math.max(0, cornerDist - R);
    distToWall = Math.max(0, R - cornerDist);
    clampedX = cornerDist > R ? signX * (innerW + (dx / cornerDist) * R) : x;
    clampedZ = cornerDist > R ? signZ * (innerL + (dz / cornerDist) * R) : z;
    nx = -ux;
    nz = -uz;
  } else {
    // Straight side or back walls
    const distSide = maxW - absX;
    const distBack = maxL - absZ;

    if (distSide < distBack) {
      const signX = x >= 0 ? 1 : -1;
      penetration = Math.max(0, absX - maxW);
      clampedX = absX > maxW ? signX * maxW : x;
      nx = -signX;
      nz = 0;
      distToWall = Math.max(0, distSide);
    } else {
      const signZ = z >= 0 ? 1 : -1;
      penetration = Math.max(0, absZ - maxL);
      clampedZ = absZ > maxL ? signZ * maxL : z;
      nx = 0;
      nz = -signZ;
      distToWall = Math.max(0, distBack);
    }
  }

  // Compute solid quarter-circle curved ramp height (y_ramp from 0m to 5.5m)
  let rampHeightY = 0;
  let rampSlopeAngle = 0;
  if (distToWall < rampR) {
    const u = Math.min(rampR, Math.max(0, rampR - distToWall));
    rampHeightY = rampR - Math.sqrt(Math.max(0, rampR * rampR - u * u));
    rampSlopeAngle = Math.asin(Math.min(1, u / rampR));
  }

  return {
    clampedX,
    clampedZ,
    nx,
    nz,
    penetration,
    distToWall,
    rampHeightY,
    rampSlopeAngle
  };
}

export interface MarketItem {
  id: string;
  name: string;
  category: 'bodyColor' | 'finish' | 'boostColor' | 'wheelStyle' | 'carModel';
  value: string;
  rarity: 'Common' | 'Rare' | 'Import' | 'Exotic' | 'BlackMarket';
  priceCredits: number;
  blueprintBuildCost: number;
  description: string;
}

export interface BlueprintItem {
  blueprintId: string;
  targetItemId: string;
  itemName: string;
  category: MarketItem['category'];
  value: string;
  rarity: MarketItem['rarity'];
  buildCostCredits: number;
  description: string;
}

export interface MissionDef {
  id: string;
  category: 'competitive' | 'training' | 'season';
  title: string;
  description: string;
  targetValue: number;
  metric: 'matches' | 'goals' | 'saves' | 'demolitions' | 'wins' | 'practice_shots';
  rewardCredits: number;
  rewardXp: number;
  rewardCrates: number;
  rewardBlueprintId?: string;
  rewardItemId?: string;
  rewardSummaryLabel: string;
}

export interface SeasonRewardTier {
  tier: number;
  requiredXp: number;
  title: string;
  rewardType: 'credits' | 'item';
  creditsAmount?: number;
  itemId?: string;
  rarity: 'Common' | 'Rare' | 'Import' | 'Exotic' | 'BlackMarket';
}

export const MARKET_CATALOG: MarketItem[] = [
  {
    id: 'car_octane_pro',
    name: 'Octane Z-GT Gövde',
    category: 'carModel',
    value: 'octane',
    rarity: 'Common',
    priceCredits: 0,
    blueprintBuildCost: 100,
    description: 'Dengeli hava kontrolü ve çevik dönüşlü e-spor standart şasisi.'
  },
  {
    id: 'car_dominus_gt',
    name: 'Dominus V8 Kaslı Şasi',
    category: 'carModel',
    value: 'dominus',
    rarity: 'Import',
    priceCredits: 550,
    blueprintBuildCost: 300,
    description: 'Uzun ve alçak burun yapısıyla sert şut ve hava smaçları için ideal.'
  },
  {
    id: 'car_fennec_rs',
    name: 'Fennec RS Ralli Şasi',
    category: 'carModel',
    value: 'fennec',
    rarity: 'Exotic',
    priceCredits: 850,
    blueprintBuildCost: 450,
    description: 'Köşeli geniş çamurluklu, 50/50 ikili mücadelelerde üstün ralli gövdesi.'
  },
  {
    id: 'body_octane_cyan',
    name: 'Siber Okyanus Gövde Boyası',
    category: 'bodyColor',
    value: '#06B6D4',
    rarity: 'Common',
    priceCredits: 0,
    blueprintBuildCost: 100,
    description: 'Standart yüksek kontrastlı siber turkuaz yarış gövdesi.'
  },
  {
    id: 'body_crimson_pulse',
    name: 'Kızıl Nabız Gövde Boyası',
    category: 'bodyColor',
    value: '#F43F5E',
    rarity: 'Rare',
    priceCredits: 250,
    blueprintBuildCost: 150,
    description: 'Agresif forvet oyuncuları için anodize kızıl alaşım.'
  },
  {
    id: 'body_emerald_viper',
    name: 'Zümrüt Fırtına Gövde Boyası',
    category: 'bodyColor',
    value: '#10B981',
    rarity: 'Import',
    priceCredits: 450,
    blueprintBuildCost: 250,
    description: 'Gece stadyum ışıklarında parlayan zümrüt yarış kaplaması.'
  },
  {
    id: 'body_royal_amethyst',
    name: 'Kraliyet Ametist Gövde Boyası',
    category: 'bodyColor',
    value: '#8B5CF6',
    rarity: 'Exotic',
    priceCredits: 800,
    blueprintBuildCost: 400,
    description: 'Şampiyonluk serisi derin mor sedefli gövde boyası.'
  },
  {
    id: 'body_solar_gold',
    name: 'Güneş Tacı Altın Gövde',
    category: 'bodyColor',
    value: '#F59E0B',
    rarity: 'BlackMarket',
    priceCredits: 1400,
    blueprintBuildCost: 650,
    description: '24 ayar saf altın yansımalı efsanevi karaborsa kaplaması.'
  },
  {
    id: 'finish_anodized',
    name: 'Anodize Vernik',
    category: 'finish',
    value: 'anodized',
    rarity: 'Common',
    priceCredits: 0,
    blueprintBuildCost: 100,
    description: 'Çift katmanlı parlak otomotiv verniği.'
  },
  {
    id: 'finish_titanium',
    name: 'Fırçalanmış Titanyum',
    category: 'finish',
    value: 'titanium',
    rarity: 'Rare',
    priceCredits: 300,
    blueprintBuildCost: 180,
    description: 'Yüksek metalik yansımalı havacılık sınıfı titanyum doku.'
  },
  {
    id: 'finish_carbon',
    name: 'Mat Karbon Fiber',
    category: 'finish',
    value: 'carbon',
    rarity: 'Import',
    priceCredits: 500,
    blueprintBuildCost: 280,
    description: 'Işığı emen taktiksel dokuma karbon yüzey.'
  },
  {
    id: 'finish_chrome',
    name: 'Ayna Krom Alaşım',
    category: 'finish',
    value: 'chrome',
    rarity: 'BlackMarket',
    priceCredits: 1200,
    blueprintBuildCost: 600,
    description: 'Stadyum spotlarını tam yansıtan hiper-krom kaplama.'
  },
  {
    id: 'boost_solar_flare',
    name: 'Güneş Patlaması Nitro',
    category: 'boostColor',
    value: '#F59E0B',
    rarity: 'Common',
    priceCredits: 0,
    blueprintBuildCost: 100,
    description: 'Klasik yüksek ısılı kehribar roket egzozu.'
  },
  {
    id: 'boost_hyper_cyan',
    name: 'Hiper Plazma Nitro',
    category: 'boostColor',
    value: '#06B6D4',
    rarity: 'Rare',
    priceCredits: 350,
    blueprintBuildCost: 200,
    description: 'Mavi iyonize plazma itici izi.'
  },
  {
    id: 'boost_crimson_ion',
    name: 'Kızıl Kuantum İzi',
    category: 'boostColor',
    value: '#EF4444',
    rarity: 'Exotic',
    priceCredits: 750,
    blueprintBuildCost: 380,
    description: 'Süpersonik hızda yoğunlaşan kızıl enerji çekirdeği.'
  },
  {
    id: 'boost_void_violet',
    name: 'Karanlık Madde Nitro',
    category: 'boostColor',
    value: '#A855F7',
    rarity: 'BlackMarket',
    priceCredits: 1300,
    blueprintBuildCost: 600,
    description: 'Uzay-zaman bükümlü mor plazma roket ateşi.'
  },
  {
    id: 'wheel_aero_apex',
    name: 'Aero-Apex Jant',
    category: 'wheelStyle',
    value: 'aero_apex',
    rarity: 'Common',
    priceCredits: 0,
    blueprintBuildCost: 100,
    description: 'Hafif alaşımlı 6 kollu standart yarış jantı.'
  },
  {
    id: 'wheel_turbine_gold',
    name: 'Altın Türbin Jant',
    category: 'wheelStyle',
    value: 'turbine_gold',
    rarity: 'Exotic',
    priceCredits: 700,
    blueprintBuildCost: 350,
    description: 'Yüksek hızda altın halka oluşturan aerodinamik türbin.'
  },
  {
    id: 'wheel_cyber_blade',
    name: 'Neon Bıçak Jant',
    category: 'wheelStyle',
    value: 'cyber_blade',
    rarity: 'BlackMarket',
    priceCredits: 1100,
    blueprintBuildCost: 550,
    description: 'Işıklı siber halkalara sahip özel tasarım jant seti.'
  }
];

export const BLUEPRINT_CATALOG: BlueprintItem[] = MARKET_CATALOG.filter(
  (m) => m.priceCredits > 0
).map((m) => ({
  blueprintId: `bp_${m.id}`,
  targetItemId: m.id,
  itemName: `${m.name} [Blueprint]`,
  category: m.category,
  value: m.value,
  rarity: m.rarity,
  buildCostCredits: m.blueprintBuildCost,
  description: `Bu şemayı ${m.blueprintBuildCost} Kredi karşılığında kalıcı ${m.name} eşyasına dönüştürebilir veya Takas sisteminde kullanabilirsiniz.`
}));

export const MISSION_CATALOG: MissionDef[] = [
  // Competitive Missions (Rekabetçi Görevleri)
  {
    id: 'msn_comp_first_match',
    category: 'competitive',
    title: 'Rekabetçi Arenaya Adım',
    description: 'Rekabetçi (1v1, 2v2 veya 3v3) modda 1 maç tamamla.',
    targetValue: 1,
    metric: 'matches',
    rewardCredits: 250,
    rewardXp: 500,
    rewardCrates: 1,
    rewardBlueprintId: 'bp_car_dominus_gt',
    rewardSummaryLabel: '250 Kredi + 500 XP + 1 Kutu + Dominus V8 Blueprint'
  },
  {
    id: 'msn_comp_3_goals',
    category: 'competitive',
    title: 'Keskin Nişancı Forvet',
    description: 'Maçlarda toplam 3 gol kaydet.',
    targetValue: 3,
    metric: 'goals',
    rewardCredits: 400,
    rewardXp: 750,
    rewardCrates: 2,
    rewardItemId: 'wheel_turbine_gold',
    rewardSummaryLabel: '400 Kredi + 750 XP + 2 Kutu + Altın Türbin Jant'
  },
  {
    id: 'msn_comp_2_wins',
    category: 'competitive',
    title: 'Bölgesel Lig Zaferi',
    description: 'Bölgesel veya rekabetçi maçlarda 2 galibiyet kazan.',
    targetValue: 2,
    metric: 'wins',
    rewardCredits: 600,
    rewardXp: 1100,
    rewardCrates: 2,
    rewardItemId: 'car_fennec_rs',
    rewardSummaryLabel: '600 Kredi + 1100 XP + 2 Kutu + Fennec RS Araba Gövdesi'
  },
  // Training Missions (Antrenman Görevleri)
  {
    id: 'msn_train_shots',
    category: 'training',
    title: 'Duvar & Hava Smaç Antrenmanı',
    description: 'Antrenman veya maçlarda kaleye 2 isabetli şut çek.',
    targetValue: 2,
    metric: 'shots',
    rewardCredits: 200,
    rewardXp: 400,
    rewardCrates: 1,
    rewardBlueprintId: 'bp_wheel_cyber_blade',
    rewardSummaryLabel: '200 Kredi + 400 XP + 1 Kutu + Neon Bıçak Jant Blueprint'
  },
  {
    id: 'msn_train_demolition',
    category: 'training',
    title: 'Süpersonik İmha Uzmanı',
    description: 'Son hızda turboyla rakip aracı 1 kez patlat (Demolition).',
    targetValue: 1,
    metric: 'demolitions',
    rewardCredits: 300,
    rewardXp: 550,
    rewardCrates: 1,
    rewardItemId: 'boost_hyper_cyan',
    rewardSummaryLabel: '300 Kredi + 550 XP + 1 Kutu + Hiper Plazma Nitro'
  },
  // Season Missions (Sezon Görevleri)
  {
    id: 'msn_season_saves',
    category: 'season',
    title: 'Demir Kale Savunması',
    description: 'Kalene giden 2 şutu kurtar (Save).',
    targetValue: 2,
    metric: 'saves',
    rewardCredits: 450,
    rewardXp: 900,
    rewardCrates: 2,
    rewardItemId: 'body_emerald_viper',
    rewardSummaryLabel: '450 Kredi + 900 XP + 2 Kutu + Zümrüt Fırtına Gövde'
  },
  {
    id: 'msn_season_veteran',
    category: 'season',
    title: 'Sezon 1 Efsanesi',
    description: 'Toplam 5 maç tamamlayarak Sezon Kasasını aç.',
    targetValue: 5,
    metric: 'matches',
    rewardCredits: 1000,
    rewardXp: 1800,
    rewardCrates: 3,
    rewardItemId: 'finish_chrome',
    rewardSummaryLabel: '1000 Kredi + 1800 XP + 3 Kutu + Ayna Krom Kaplama'
  }
];

export const SEASON_REWARDS: SeasonRewardTier[] = [
  {
    tier: 1,
    requiredXp: 0,
    title: 'Sezon 1 Başlangıç Paketi (200 Kredi)',
    rewardType: 'credits',
    creditsAmount: 200,
    rarity: 'Common'
  },
  {
    tier: 2,
    requiredXp: 500,
    title: 'Kızıl Nabız Gövde Boyası',
    rewardType: 'item',
    itemId: 'body_crimson_pulse',
    rarity: 'Rare'
  },
  {
    tier: 3,
    requiredXp: 1100,
    title: 'Fırçalanmış Titanyum Vernik',
    rewardType: 'item',
    itemId: 'finish_titanium',
    rarity: 'Rare'
  },
  {
    tier: 4,
    requiredXp: 1800,
    title: 'Sezonluk Hazine Bonusu (400 Kredi)',
    rewardType: 'credits',
    creditsAmount: 400,
    rarity: 'Import'
  },
  {
    tier: 5,
    requiredXp: 2600,
    title: 'Altın Türbin Jant Seti',
    rewardType: 'item',
    itemId: 'wheel_turbine_gold',
    rarity: 'Exotic'
  },
  {
    tier: 6,
    requiredXp: 3600,
    title: 'Şampiyonluk Ödülü (800 Kredi)',
    rewardType: 'credits',
    creditsAmount: 800,
    rarity: 'BlackMarket'
  },
  {
    tier: 7,
    requiredXp: 4800,
    title: 'Ayna Krom Alaşım (Black Market)',
    rewardType: 'item',
    itemId: 'finish_chrome',
    rarity: 'BlackMarket'
  }
];

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function normalizeAngle(angle: number): number {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function getRankTierFromMmr(mmr: number): {
  tierName: string;
  division: string;
  accentHex: string;
  minMmr: number;
  nextMmr: number;
} {
  const safeMmr = Math.max(0, Math.round(mmr));
  if (safeMmr >= 1500) {
    return {
      tierName: 'Süpersonik Efsane',
      division: 'Kademe I',
      accentHex: '#F43F5E',
      minMmr: 1500,
      nextMmr: 2000
    };
  }
  if (safeMmr >= 1300) {
    return {
      tierName: 'Büyük Şampiyon',
      division: 'Kademe II',
      accentHex: '#EC4899',
      minMmr: 1300,
      nextMmr: 1500
    };
  }
  if (safeMmr >= 1120) {
    return {
      tierName: 'Şampiyon II',
      division: 'Kademe III',
      accentHex: '#A855F7',
      minMmr: 1120,
      nextMmr: 1300
    };
  }
  if (safeMmr >= 960) {
    return {
      tierName: 'Elmas III',
      division: 'Kademe II',
      accentHex: '#3B82F6',
      minMmr: 960,
      nextMmr: 1120
    };
  }
  if (safeMmr >= 820) {
    return {
      tierName: 'Platin II',
      division: 'Kademe I',
      accentHex: '#06B6D4',
      minMmr: 820,
      nextMmr: 960
    };
  }
  if (safeMmr >= 680) {
    return {
      tierName: 'Altın III',
      division: 'Kademe III',
      accentHex: '#F59E0B',
      minMmr: 680,
      nextMmr: 820
    };
  }
  if (safeMmr >= 540) {
    return {
      tierName: 'Gümüş II',
      division: 'Kademe II',
      accentHex: '#94A3B8',
      minMmr: 540,
      nextMmr: 680
    };
  }
  return {
    tierName: 'Bronz I',
    division: 'Kademe I',
    accentHex: '#D97706',
    minMmr: 0,
    nextMmr: 540
  };
}

export function calculateMmrDelta(
  playerMmr: number,
  opponentMmr: number,
  playerScore: number,
  opponentScore: number
): number {
  if (playerScore === opponentScore) return 0;
  const won = playerScore > opponentScore;
  const expectedScore = 1 / (1 + Math.pow(10, (opponentMmr - playerMmr) / 400));
  const actualScore = won ? 1 : 0;
  const kFactor = 32;
  const goalDiffBonus = Math.min(8, Math.abs(playerScore - opponentScore) * 2);
  const rawDelta = Math.round(kFactor * (actualScore - expectedScore));
  return won
    ? Math.max(8, rawDelta + goalDiffBonus)
    : Math.min(-6, rawDelta - Math.floor(goalDiffBonus / 2));
}

export function calculateSeasonLevel(seasonXp: number): {
  level: number;
  currentTierXp: number;
  nextTierXp: number;
  progressPercent: number;
} {
  const safeXp = Math.max(0, Math.round(seasonXp));
  let currentLevel = 1;
  let prevXp = 0;
  let nextXp = SEASON_REWARDS[1].requiredXp;

  for (let i = 0; i < SEASON_REWARDS.length; i++) {
    const tier = SEASON_REWARDS[i];
    if (safeXp >= tier.requiredXp) {
      currentLevel = tier.tier;
      prevXp = tier.requiredXp;
      nextXp = SEASON_REWARDS[i + 1] ? SEASON_REWARDS[i + 1].requiredXp : tier.requiredXp + 2000;
    }
  }

  const span = Math.max(1, nextXp - prevXp);
  const progressPercent = clamp(Math.round(((safeXp - prevXp) / span) * 100), 0, 100);
  return {
    level: currentLevel,
    currentTierXp: safeXp,
    nextTierXp: nextXp,
    progressPercent
  };
}

export function createInitialBoostPads(): BoostPad[] {
  const fullPads: Array<[number, number]> = [
    [-46, -66],
    [46, -66],
    [-50, 0],
    [50, 0],
    [-46, 66],
    [46, 66]
  ];
  const smallPads: Array<[number, number]> = [
    [-22, -56],
    [22, -56],
    [0, -42],
    [-28, -28],
    [28, -28],
    [-16, -14],
    [16, -14],
    [-24, 0],
    [24, 0],
    [-16, 14],
    [16, 14],
    [-28, 28],
    [28, 28],
    [0, 42],
    [-22, 56],
    [22, 56]
  ];

  const pads: BoostPad[] = [];
  fullPads.forEach(([x, z], idx) => {
    pads.push({ id: `full_${idx}`, x, z, isFull: true, active: true, cooldown: 0 });
  });
  smallPads.forEach(([x, z], idx) => {
    pads.push({ id: `small_${idx}`, x, z, isFull: false, active: true, cooldown: 0 });
  });
  return pads;
}

function makeCarState(params: {
  id: string;
  name: string;
  team: 'blue' | 'orange';
  isBot: boolean;
  archetype: BotArchetype;
  platform: CrossPlatformNetwork;
  x: number;
  z: number;
  yaw: number;
  carModel?: CarModelType;
  bodyColor: string;
  finish: string;
  boostColor: string;
  wheelStyle: string;
}): CarState {
  return {
    id: params.id,
    name: params.name,
    team: params.team,
    isBot: params.isBot,
    archetype: params.archetype,
    platform: params.platform,
    position: { x: params.x, y: 0, z: params.z },
    velocity: { x: 0, y: 0, z: 0 },
    yaw: params.yaw,
    pitch: 0,
    roll: 0,
    boost: 50,
    isGrounded: true,
    surfaceState: 'floor',
    wallStallTimer: 0,
    ceilingClingTimer: 0,
    wallNormal: { x: 0, z: 0 },
    hasDoubleJump: true,
    coyoteTimer: 0.12,
    jumpBufferTimer: 0,
    dodgeTimer: 0,
    dodgeType: 'none',
    dodgePitchAxis: 0,
    dodgeRollAxis: 0,
    dodgeDir: { x: 0, z: params.team === 'blue' ? 1 : -1 },
    supersonic: false,
    demolishedTimer: 0,
    demolitions: 0,
    telegraphTimer: 0,
    goals: 0,
    saves: 0,
    shots: 0,
    carModel: params.carModel || 'octane',
    bodyColor: params.bodyColor,
    finish: params.finish,
    boostColor: params.boostColor,
    wheelStyle: params.wheelStyle,
    squashX: 1,
    squashY: 1
  };
}

export function createInitialArenaState(
  mode: GameMode,
  playerLoadout: {
    displayName: string;
    carModel?: CarModelType;
    bodyColor: string;
    finish: string;
    boostColor: string;
    wheelStyle: string;
    platform: CrossPlatformNetwork;
    botDifficulty?: BotDifficulty;
    practiceBotEnabled?: boolean;
    playlistCategory?: PlaylistCategory;
    region?: PlayerRegion;
    matchedPlayers?: Array<{ name: string; team: 'blue' | 'orange'; isBot?: boolean }>;
  }
): ArenaState {
  const botDifficulty: BotDifficulty = playerLoadout.botDifficulty || 'pro';
  const practiceBotEnabled =
    playerLoadout.practiceBotEnabled !== undefined ? playerLoadout.practiceBotEnabled : true;
  const region = playerLoadout.region || 'EU';

  const cars: CarState[] = [
    makeCarState({
      id: 'player_1',
      name: playerLoadout.displayName || 'Oyuncu',
      team: 'blue',
      isBot: false,
      archetype: 'striker',
      platform: playerLoadout.platform,
      x: 0,
      z: -50,
      yaw: 0,
      carModel: playerLoadout.carModel || 'octane',
      bodyColor: playerLoadout.bodyColor,
      finish: playerLoadout.finish,
      boostColor: playerLoadout.boostColor,
      wheelStyle: playerLoadout.wheelStyle
    })
  ];

  const matchedBlue = (playerLoadout.matchedPlayers || []).filter((p) => p.team === 'blue');
  const matchedOrange = (playerLoadout.matchedPlayers || []).filter((p) => p.team === 'orange');

  if (mode === '2v2' || mode === '3v3') {
    cars.push(
      makeCarState({
        id: 'blue_2',
        name: matchedBlue[0]?.name || `[${region}] Aegis-Pilot`,
        team: 'blue',
        isBot: matchedBlue[0]?.isBot ?? true,
        archetype: 'sweeper',
        platform: 'CONSOLE_CROSS',
        x: -16,
        z: -64,
        yaw: 0,
        carModel: 'dominus',
        bodyColor: '#0284C7',
        finish: 'titanium',
        boostColor: '#38BDF8',
        wheelStyle: 'aero_apex'
      })
    );
  }

  if (mode === '3v3') {
    cars.push(
      makeCarState({
        id: 'blue_3',
        name: matchedBlue[1]?.name || `[${region}] Nova-Kanat`,
        team: 'blue',
        isBot: matchedBlue[1]?.isBot ?? true,
        archetype: 'flanker',
        platform: 'PC_STEAM_EPIC',
        x: 16,
        z: -64,
        yaw: 0,
        carModel: 'fennec',
        bodyColor: '#0EA5E9',
        finish: 'anodized',
        boostColor: '#06B6D4',
        wheelStyle: 'turbine_gold'
      })
    );
  }

  const shouldSpawnOrange = mode !== 'practice' || practiceBotEnabled;
  if (shouldSpawnOrange) {
    const diffLabel =
      botDifficulty === 'rookie'
        ? 'Çaylak'
        : botDifficulty === 'pro'
        ? 'Pro'
        : botDifficulty === 'allstar'
        ? 'All-Star'
        : 'Efsanevi';
    cars.push(
      makeCarState({
        id: 'orange_1',
        name:
          matchedOrange[0]?.name ||
          (mode === 'practice' ? `Antrenman Botu [${diffLabel}]` : `[${region}] Valkyrie-X`),
        team: 'orange',
        isBot: matchedOrange[0]?.isBot ?? true,
        archetype: 'striker',
        platform: 'PC_STEAM_EPIC',
        x: mode === '1v1' || mode === 'practice' ? 0 : 14,
        z: 50,
        yaw: Math.PI,
        carModel: 'octane',
        bodyColor: '#F97316',
        finish: 'anodized',
        boostColor: '#F59E0B',
        wheelStyle: 'turbine_gold'
      })
    );

    if (mode === '2v2' || mode === '3v3') {
      cars.push(
        makeCarState({
          id: 'orange_2',
          name: matchedOrange[1]?.name || `[${region}] Zephyr-M`,
          team: 'orange',
          isBot: matchedOrange[1]?.isBot ?? true,
          archetype: 'flanker',
          platform: 'MOBILE_TOUCH',
          x: -16,
          z: 64,
          yaw: Math.PI,
          carModel: 'dominus',
          bodyColor: '#EF4444',
          finish: 'carbon',
          boostColor: '#F43F5E',
          wheelStyle: 'cyber_blade'
        })
      );
    }

    if (mode === '3v3') {
      cars.push(
        makeCarState({
          id: 'orange_3',
          name: matchedOrange[2]?.name || `[${region}] Hyperion-TR`,
          team: 'orange',
          isBot: matchedOrange[2]?.isBot ?? true,
          archetype: 'sweeper',
          platform: 'CONSOLE_CROSS',
          x: 16,
          z: 68,
          yaw: Math.PI,
          carModel: 'fennec',
          bodyColor: '#EA580C',
          finish: 'titanium',
          boostColor: '#F59E0B',
          wheelStyle: 'aero_apex'
        })
      );
    }
  }

  return {
    mode,
    playlistCategory: playerLoadout.playlistCategory || 'competitive',
    region,
    botDifficulty,
    practiceBotEnabled,
    timeRemaining: 180,
    isOvertime: false,
    overtimeElapsed: 0,
    matchEnded: false,
    blueScore: 0,
    orangeScore: 0,
    hitstopTimer: 0,
    goalResetTimer: 0,
    lastScorerName: null,
    lastScoringTeam: null,
    lastDemolitionBanner: null,
    cars,
    ball: {
      position: { x: 0, y: ARENA_BOUNDS.ballRadius + 0.5, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      angularVelocity: { x: 0, y: 0, z: 0 },
      radius: ARENA_BOUNDS.ballRadius,
      lastTouchedBy: null,
      lastTouchTeam: null,
      hitFlashTimer: 0
    },
    boostPads: createInitialBoostPads()
  };
}

export function resetKickoffPositions(state: ArenaState): void {
  state.ball.position = { x: 0, y: ARENA_BOUNDS.ballRadius + 0.6, z: 0 };
  state.ball.velocity = { x: 0, y: 0, z: 0 };
  state.ball.angularVelocity = { x: 0, y: 0, z: 0 };
  state.ball.hitFlashTimer = 0;

  const blueSlots: Array<[number, number]> = [
    [0, -50],
    [-16, -64],
    [16, -64]
  ];
  const orangeSlots: Array<[number, number]> = [
    [0, 50],
    [-16, 64],
    [16, 64]
  ];

  let blueIdx = 0;
  let orangeIdx = 0;
  for (const car of state.cars) {
    car.velocity = { x: 0, y: 0, z: 0 };
    car.pitch = 0;
    car.roll = 0;
    car.isGrounded = true;
    car.surfaceState = 'floor';
    car.wallStallTimer = 0;
    car.ceilingClingTimer = 0;
    car.wallNormal = { x: 0, z: 0 };
    car.hasDoubleJump = true;
    car.dodgeTimer = 0;
    car.dodgeType = 'none';
    car.dodgePitchAxis = 0;
    car.dodgeRollAxis = 0;
    car.demolishedTimer = 0;
    car.boost = Math.max(car.boost, 50);
    car.supersonic = false;
    car.squashX = 1;
    car.squashY = 1;

    if (car.team === 'blue') {
      const slot = blueSlots[blueIdx % blueSlots.length];
      car.position = { x: slot[0], y: 0, z: slot[1] };
      car.yaw = 0;
      blueIdx++;
    } else {
      const slot = orangeSlots[orangeIdx % orangeSlots.length];
      car.position = { x: slot[0], y: 0, z: slot[1] };
      car.yaw = Math.PI;
      orangeIdx++;
    }
  }
}

export function captureReplayFrame(
  state: ArenaState,
  elapsed: number,
  eventLabel?: string
): ReplayFrame {
  return {
    timestamp: elapsed,
    matchTimeRemaining: state.timeRemaining,
    blueScore: state.blueScore,
    orangeScore: state.orangeScore,
    ball: {
      x: state.ball.position.x,
      y: state.ball.position.y,
      z: state.ball.position.z,
      vx: state.ball.velocity.x,
      vy: state.ball.velocity.y,
      vz: state.ball.velocity.z
    },
    cars: state.cars.map((c) => ({
      id: c.id,
      name: c.name,
      team: c.team,
      x: c.position.x,
      y: c.position.y,
      z: c.position.z,
      yaw: c.yaw,
      pitch: c.pitch,
      roll: c.roll,
      boost: c.boost,
      supersonic: c.supersonic,
      demolishedTimer: c.demolishedTimer,
      dodgeType: c.dodgeType,
      bodyColor: c.bodyColor,
      finish: c.finish,
      boostColor: c.boostColor,
      wheelStyle: c.wheelStyle
    })),
    eventLabel
  };
}

export function applyReplayFrameToArena(state: ArenaState, frame: ReplayFrame): void {
  state.timeRemaining = frame.matchTimeRemaining;
  state.blueScore = frame.blueScore;
  state.orangeScore = frame.orangeScore;
  state.ball.position.x = frame.ball.x;
  state.ball.position.y = frame.ball.y;
  state.ball.position.z = frame.ball.z;
  state.ball.velocity.x = frame.ball.vx;
  state.ball.velocity.y = frame.ball.vy;
  state.ball.velocity.z = frame.ball.vz;

  for (const snap of frame.cars) {
    const car = state.cars.find((c) => c.id === snap.id);
    if (car) {
      car.position.x = snap.x;
      car.position.y = snap.y;
      car.position.z = snap.z;
      car.yaw = snap.yaw;
      car.pitch = snap.pitch;
      car.roll = snap.roll;
      car.boost = snap.boost;
      car.supersonic = snap.supersonic;
      car.demolishedTimer = snap.demolishedTimer;
      car.dodgeType = snap.dodgeType;
    }
  }
}

export function computeBotInput(car: CarState, state: ArenaState, dt: number): ControlInput {
  if (car.demolishedTimer > 0) {
    return {
      throttle: 0,
      steer: 0,
      jumpHeld: false,
      jumpJustPressed: false,
      boostHeld: false,
      driftHeld: false,
      flyUpHeld: false
    };
  }

  const diff = state.botDifficulty || 'pro';
  const throttleScale =
    diff === 'rookie' ? 0.68 : diff === 'pro' ? 0.86 : diff === 'allstar' ? 1.0 : 1.08;
  const steerSharpness =
    diff === 'rookie' ? 1.4 : diff === 'pro' ? 2.1 : diff === 'allstar' ? 2.7 : 3.4;

  const targetGoalZ = car.team === 'blue' ? ARENA_BOUNDS.halfLength : -ARENA_BOUNDS.halfLength;
  const ownGoalZ = car.team === 'blue' ? -ARENA_BOUNDS.halfLength : ARENA_BOUNDS.halfLength;

  let aimX = state.ball.position.x;
  let aimZ = state.ball.position.z;

  const dxBall = state.ball.position.x - car.position.x;
  const dzBall = state.ball.position.z - car.position.z;
  const distToBall = Math.hypot(dxBall, dzBall);

  if (car.archetype === 'striker') {
    const goalToBallX = state.ball.position.x;
    const goalToBallZ = state.ball.position.z - targetGoalZ;
    const gLen = Math.max(1, Math.hypot(goalToBallX, goalToBallZ));
    const offsetDist = distToBall > 14 ? 6.5 : 1.0;
    aimX = state.ball.position.x + (goalToBallX / gLen) * offsetDist;
    aimZ = state.ball.position.z + (goalToBallZ / gLen) * offsetDist;

    if (distToBall < 15 && state.ball.position.y < 5.5) {
      car.telegraphTimer = Math.min(0.6, car.telegraphTimer + dt);
    } else {
      car.telegraphTimer = Math.max(0, car.telegraphTimer - dt * 2);
    }
  } else if (car.archetype === 'sweeper') {
    const ballInOwnHalf =
      (car.team === 'blue' && state.ball.position.z < -8) ||
      (car.team === 'orange' && state.ball.position.z > 8);

    if (ballInOwnHalf && distToBall < 28) {
      aimX = state.ball.position.x;
      aimZ = state.ball.position.z;
    } else {
      aimX = clamp(state.ball.position.x * 0.55, -18, 18);
      aimZ = ownGoalZ * 0.72;
    }
  } else {
    const flankSide = state.ball.position.x >= 0 ? 1 : -1;
    if (car.boost < 25) {
      let bestPad: BoostPad | null = null;
      let bestDist = Infinity;
      for (const pad of state.boostPads) {
        if (!pad.active) continue;
        const d = Math.hypot(pad.x - car.position.x, pad.z - car.position.z);
        if (d < bestDist) {
          bestDist = d;
          bestPad = pad;
        }
      }
      if (bestPad) {
        aimX = bestPad.x;
        aimZ = bestPad.z;
      }
    } else if (distToBall > 18) {
      aimX = clamp(state.ball.position.x + flankSide * 18, -46, 46);
      aimZ = state.ball.position.z;
    }
  }

  const desiredYaw = Math.atan2(aimX - car.position.x, aimZ - car.position.z);
  const angleDiff = normalizeAngle(desiredYaw - car.yaw);

  const steer = clamp(angleDiff * steerSharpness, -1, 1);
  const absAngle = Math.abs(angleDiff);
  const throttle =
    (absAngle > 2.2 && distToBall < 10 ? -0.8 : 1.0) * throttleScale;
  const boostHeld =
    diff !== 'rookie' &&
    absAngle < (diff === 'unfair' ? 0.55 : 0.35) &&
    distToBall > 8 &&
    car.boost > (diff === 'pro' ? 32 : 10);
  const driftHeld = diff !== 'rookie' && absAngle > 1.15 && absAngle < 2.2;

  const shouldStrikeJump =
    diff !== 'rookie' &&
    distToBall < 6.8 &&
    absAngle < 0.45 &&
    state.ball.position.y >= 1.5 &&
    state.ball.position.y <= (diff === 'unfair' ? 10 : 6.5) &&
    car.isGrounded &&
    (car.archetype !== 'striker' || car.telegraphTimer >= 0.15);

  return {
    throttle,
    steer,
    jumpHeld: shouldStrikeJump,
    jumpJustPressed: shouldStrikeJump,
    boostHeld,
    driftHeld,
    flyUpHeld: diff === 'unfair' && state.ball.position.y > 8 && distToBall < 18
  };
}

export function stepArenaPhysics(
  state: ArenaState,
  playerInput: ControlInput,
  rawDt: number
): ArenaPhysicsEvents {
  const dt = clamp(rawDt, 0.001, 0.05);
  const events: ArenaPhysicsEvents = {
    goalScored: null,
    goldenGoalWinner: null,
    overtimeStarted: false,
    heavyHit: false,
    lightHit: false,
    hitImpactSpeed: 0,
    boostPickedUp: false,
    jumped: false,
    dodged: false,
    dodgeType: 'none',
    saveMade: false,
    carDemolished: null
  };

  if (state.ball.hitFlashTimer > 0) {
    state.ball.hitFlashTimer = Math.max(0, state.ball.hitFlashTimer - dt);
  }

  if (state.lastDemolitionBanner) {
    state.lastDemolitionBanner.timer = Math.max(0, state.lastDemolitionBanner.timer - dt);
    if (state.lastDemolitionBanner.timer === 0) {
      state.lastDemolitionBanner = null;
    }
  }

  if (state.goalResetTimer > 0) {
    state.goalResetTimer = Math.max(0, state.goalResetTimer - dt);
    if (state.goalResetTimer === 0 && !state.matchEnded) {
      resetKickoffPositions(state);
    }
    return events;
  }

  if (state.hitstopTimer > 0) {
    state.hitstopTimer = Math.max(0, state.hitstopTimer - dt);
    return events;
  }

  // Match Clock & Golden Goal Overtime ("Berabere kalınca uzatma olsun, golü atan takım kazanıyor direk altın gol")
  if (state.mode !== 'practice' && !state.matchEnded) {
    if (state.isOvertime) {
      state.overtimeElapsed = (state.overtimeElapsed || 0) + dt;
    } else if (state.timeRemaining > 0) {
      state.timeRemaining = Math.max(0, state.timeRemaining - dt);
      if (state.timeRemaining === 0) {
        if (state.blueScore === state.orangeScore) {
          // Enter Infinite Golden Goal Overtime!
          state.isOvertime = true;
          state.overtimeElapsed = 0;
          events.overtimeStarted = true;
          resetKickoffPositions(state);
        } else {
          state.matchEnded = true;
        }
      }
    }
  }

  // Update boost pad cooldowns (Big = 20s, Small = 10s)
  for (const pad of state.boostPads) {
    if (!pad.active) {
      pad.cooldown = Math.max(0, pad.cooldown - dt);
      if (pad.cooldown === 0) {
        pad.active = true;
      }
    }
  }

  // Step each car
  for (const car of state.cars) {
    if (car.demolishedTimer > 0) {
      car.demolishedTimer = Math.max(0, car.demolishedTimer - dt);
      if (car.demolishedTimer === 0) {
        car.position = {
          x: car.team === 'blue' ? -24 : 24,
          y: 0,
          z: car.team === 'blue' ? -72 : 72
        };
        car.velocity = { x: 0, y: 0, z: 0 };
        car.yaw = car.team === 'blue' ? 0 : Math.PI;
        car.pitch = 0;
        car.roll = 0;
        car.isGrounded = true;
        car.surfaceState = 'floor';
        car.wallStallTimer = 0;
        car.ceilingClingTimer = 0;
        car.wallNormal = { x: 0, z: 0 };
        car.hasDoubleJump = true;
        car.boost = 33;
        car.supersonic = false;
      }
      continue;
    }

    const input = car.isBot ? computeBotInput(car, state, dt) : playerInput;

    const dampFactor = 1 - Math.exp(-12 * dt);
    car.squashX += (1 - car.squashX) * dampFactor;
    car.squashY += (1 - car.squashY) * dampFactor;

    if (input.jumpJustPressed) {
      car.jumpBufferTimer = 0.12;
    } else {
      car.jumpBufferTimer = Math.max(0, car.jumpBufferTimer - dt);
    }

    if (car.isGrounded) {
      car.coyoteTimer = 0.12;
      car.hasDoubleJump = true;
      if (car.dodgeTimer === 0) {
        car.dodgeType = 'none';
      }
    } else {
      car.coyoteTimer = Math.max(0, car.coyoteTimer - dt);
    }

    const forwardX = Math.sin(car.yaw);
    const forwardZ = Math.cos(car.yaw);
    const forwardSpeed = car.velocity.x * forwardX + car.velocity.z * forwardZ;

    // Steering
    const turnRate = (input.driftHeld ? 3.8 : 2.6) * (Math.abs(forwardSpeed) > 1.5 ? 1 : 0.5);
    const steerDir = forwardSpeed >= -0.5 ? 1 : -1;
    car.yaw += input.steer * turnRate * steerDir * dt;

    const newFwdX = Math.sin(car.yaw);
    const newFwdZ = Math.cos(car.yaw);
    const rightX = Math.cos(car.yaw);
    const rightZ = -Math.sin(car.yaw);

    // Acceleration
    const accel = (car.isGrounded ? 36 : 22) * input.throttle;
    car.velocity.x += newFwdX * accel * dt;
    car.velocity.z += newFwdZ * accel * dt;

    // Dedicated Aerial Flight Upward ("Yukarı Uçma - Tavana Kadar")
    if (input.flyUpHeld && car.boost > 0) {
      car.isGrounded = false;
      car.surfaceState = 'air';
      car.velocity.y += 46 * dt;
      car.pitch = clamp(car.pitch - 1.8 * dt, -0.75, 0.75);
      car.boost = Math.max(0, car.boost - 20 * dt);
    }

    // Turbo / Rocket Boost
    if (input.boostHeld && car.boost > 0) {
      const boostPower = 44;
      car.velocity.x += newFwdX * boostPower * dt;
      car.velocity.z += newFwdZ * boostPower * dt;

      if (!car.isGrounded || input.flyUpHeld || car.surfaceState === 'wall') {
        const aerialClimbFactor = input.throttle < -0.1 ? 44 : 34;
        car.velocity.y += aerialClimbFactor * dt;
      }
      car.boost = Math.max(0, car.boost - 24 * dt);
    }

    // Lateral grip
    const lateralSpeed = car.velocity.x * rightX + car.velocity.z * rightZ;
    const grip = car.isGrounded ? (input.driftHeld ? 1.85 : 8.8) : 0.85;
    car.velocity.x -= rightX * lateralSpeed * Math.min(1, grip * dt);
    car.velocity.z -= rightZ * lateralSpeed * Math.min(1, grip * dt);

    // Jump & Directional Dodge Flip
    if (car.jumpBufferTimer > 0 && car.coyoteTimer > 0) {
      if (car.surfaceState === 'wall') {
        car.velocity.x += car.wallNormal.x * 15;
        car.velocity.z += car.wallNormal.z * 15;
        car.velocity.y = Math.max(car.velocity.y + 9, 11);
      } else if (car.surfaceState === 'ceiling') {
        car.velocity.y = -13;
      } else {
        car.velocity.y = 16.5;
      }
      car.isGrounded = false;
      car.surfaceState = 'air';
      car.wallStallTimer = 0;
      car.ceilingClingTimer = 0;
      car.coyoteTimer = 0;
      car.jumpBufferTimer = 0;
      car.squashX = 0.84;
      car.squashY = 1.22;
      if (!car.isBot) events.jumped = true;
    } else if (input.jumpJustPressed && !car.isGrounded && car.hasDoubleJump) {
      car.hasDoubleJump = false;
      car.dodgeTimer = 0.42;

      const hasSteer = Math.abs(input.steer) > 0.2;
      const hasThrottle = Math.abs(input.throttle) > 0.2;

      if (hasSteer && !hasThrottle) {
        car.dodgePitchAxis = 0;
        car.dodgeRollAxis = input.steer > 0 ? 1 : -1;
        car.dodgeType = input.steer > 0 ? 'left' : 'right';
        const sideSign = input.steer > 0 ? -1 : 1;
        car.dodgeDir = { x: rightX * sideSign, z: rightZ * sideSign };
      } else if (!hasSteer && input.throttle < -0.2) {
        car.dodgePitchAxis = -1;
        car.dodgeRollAxis = 0;
        car.dodgeType = 'back';
        car.dodgeDir = { x: -newFwdX, z: -newFwdZ };
      } else if (hasSteer && hasThrottle) {
        car.dodgePitchAxis = input.throttle >= 0 ? 1 : -1;
        car.dodgeRollAxis = input.steer > 0 ? 1 : -1;
        car.dodgeType = 'diagonal';
        const fwdSign = input.throttle >= 0 ? 1 : -1;
        const sideSign = input.steer > 0 ? -1 : 1;
        car.dodgeDir = {
          x: newFwdX * fwdSign + rightX * sideSign * 0.75,
          z: newFwdZ * fwdSign + rightZ * sideSign * 0.75
        };
      } else {
        car.dodgePitchAxis = 1;
        car.dodgeRollAxis = 0;
        car.dodgeType = 'front';
        car.dodgeDir = { x: newFwdX, z: newFwdZ };
      }

      const dLen = Math.max(0.01, Math.hypot(car.dodgeDir.x, car.dodgeDir.z));
      car.velocity.x += (car.dodgeDir.x / dLen) * 16.5;
      car.velocity.z += (car.dodgeDir.z / dLen) * 16.5;
      car.velocity.y = Math.max(car.velocity.y, 5.5);
      car.squashX = 1.2;
      car.squashY = 0.8;
      if (!car.isBot) {
        events.dodged = true;
        events.dodgeType = car.dodgeType;
      }
    }

    // Gravity & Surface Adhesion (Fixed: short realistic cling times so cars never stay stuck on walls/ceiling!)
    if (car.surfaceState === 'ceiling') {
      car.ceilingClingTimer += dt;
      // Short 0.85s ceiling touch before gravity naturally pulls the car down
      if (car.ceilingClingTimer <= 0.85) {
        car.position.y = ARENA_BOUNDS.ceiling - 1.2;
        car.velocity.y = 0;
        car.isGrounded = true;
        car.hasDoubleJump = true;
      } else {
        car.surfaceState = 'air';
        car.isGrounded = false;
        car.velocity.y = Math.min(car.velocity.y, -7.5);
      }
    } else if (car.surfaceState === 'wall') {
      const intoWallDot = -(newFwdX * car.wallNormal.x + newFwdZ * car.wallNormal.z);
      const currentSpeed = Math.hypot(car.velocity.x, car.velocity.y, car.velocity.z);
      const activeWallDrive =
        (input.throttle > 0.2 || input.boostHeld) &&
        intoWallDot > -0.15 &&
        currentSpeed > 13;

      if (activeWallDrive) {
        car.wallStallTimer = Math.max(0, car.wallStallTimer - dt);
        const climbDrive =
          input.throttle * (intoWallDot > 0 ? 28 : 12) +
          (input.boostHeld && car.boost > 0 ? 26 : 0);
        car.velocity.y += climbDrive * dt;
        car.velocity.y -= 14 * dt;
      } else {
        car.wallStallTimer += dt;
        if (car.wallStallTimer < 0.65 && currentSpeed > 8) {
          car.velocity.y -= 12 * dt;
        } else {
          // Smoothly slide down the wall/ramp without staying stuck!
          car.velocity.y = clamp(car.velocity.y - 22 * dt, -18, 4);
          // Push slightly inward along wall normal if steering away or stalled
          if (intoWallDot < -0.25 || car.wallStallTimer > 1.1) {
            car.velocity.x += car.wallNormal.x * 8 * dt;
            car.velocity.z += car.wallNormal.z * 8 * dt;
            car.surfaceState = 'air';
            car.isGrounded = false;
          }
        }
      }
    } else if (!car.isGrounded) {
      car.velocity.y -= 24 * dt;
    }

    const drag = car.isGrounded ? 0.986 : 0.995;
    car.velocity.x *= Math.pow(drag, dt * 60);
    car.velocity.z *= Math.pow(drag, dt * 60);

    // Clamp max horizontal speed & Supersonic state
    const maxSpeed = input.boostHeld && car.boost > 0 ? 50 : 35;
    const horizSpeed = Math.hypot(car.velocity.x, car.velocity.z);
    if (horizSpeed > maxSpeed) {
      car.velocity.x = (car.velocity.x / horizSpeed) * maxSpeed;
      car.velocity.z = (car.velocity.z / horizSpeed) * maxSpeed;
    }
    const totalSpeed = Math.hypot(car.velocity.x, car.velocity.y, car.velocity.z);
    car.supersonic = horizSpeed >= 38.5 || (input.boostHeld && totalSpeed >= 37);

    // Integrate position
    car.position.x += car.velocity.x * dt;
    car.position.y += car.velocity.y * dt;
    car.position.z += car.velocity.z * dt;

    // Solid 3D Curved Corner/Wall Ramp Block + Vertical Wall Transition
    const inGoalX =
      Math.abs(car.position.x) < ARENA_BOUNDS.goalHalfWidth - 1.2 &&
      car.position.y < ARENA_BOUNDS.goalHeight;
    const wallEval = evaluateRoundedArenaWall(
      car.position.x,
      car.position.z,
      ARENA_BOUNDS.carRadius,
      inGoalX
    );

    // 1. Solid Curved Ramp Block (0 < distToWall < 5.5m): car physically rides OVER the curved corner/wall ramp!
    if (!inGoalX && wallEval.rampHeightY > 0.02 && car.position.y <= wallEval.rampHeightY + 0.35) {
      const speedIntoRamp = -(
        car.velocity.x * wallEval.nx + car.velocity.z * wallEval.nz
      );
      car.position.y = Math.max(car.position.y, wallEval.rampHeightY);
      car.wallNormal = { x: wallEval.nx, z: wallEval.nz };
      car.isGrounded = true;
      car.hasDoubleJump = true;

      if (speedIntoRamp > 0 && wallEval.rampSlopeAngle > 0.08) {
        // Redirect horizontal speed upward along the curved ramp tangent
        const liftVel = speedIntoRamp * Math.sin(wallEval.rampSlopeAngle) * 0.92;
        if (car.velocity.y < liftVel) {
          car.velocity.y = liftVel;
        }
      }
    }

    // 2. Vertical Wall Boundary (penetration > 0)
    if (!inGoalX && wallEval.penetration > 0) {
      car.position.x = wallEval.clampedX;
      car.position.z = wallEval.clampedZ;
      car.wallNormal = { x: wallEval.nx, z: wallEval.nz };

      const speedIntoWall = -(
        car.velocity.x * wallEval.nx + car.velocity.z * wallEval.nz
      );

      if (speedIntoWall > 4.0 || (car.surfaceState === 'wall' && input.throttle > 0.2)) {
        if (car.surfaceState !== 'wall' && speedIntoWall > 4.0) {
          car.velocity.y = Math.max(car.velocity.y, speedIntoWall * 0.88);
          car.position.y = Math.max(car.position.y, ARENA_BOUNDS.wallCurveRadius * 0.7);
          car.wallStallTimer = 0;
        }
        car.surfaceState = 'wall';
        car.isGrounded = true;
        car.hasDoubleJump = true;

        if (speedIntoWall > 0) {
          car.velocity.x += wallEval.nx * speedIntoWall;
          car.velocity.z += wallEval.nz * speedIntoWall;
        }
      } else {
        car.velocity.x += wallEval.nx * Math.max(speedIntoWall * 1.25, 2.0);
        car.velocity.z += wallEval.nz * Math.max(speedIntoWall * 1.25, 2.0);
        if (car.position.y <= wallEval.rampHeightY + 0.2) {
          car.surfaceState = 'floor';
        }
      }
    } else if (car.surfaceState === 'wall' && wallEval.distToWall > 0.55) {
      car.surfaceState = car.position.y > wallEval.rampHeightY + 0.35 ? 'air' : 'floor';
      car.isGrounded = car.position.y <= wallEval.rampHeightY + 0.35;
      car.wallStallTimer = 0;
    } else if (inGoalX && wallEval.penetration > 0) {
      car.position.x = wallEval.clampedX;
      car.position.z = wallEval.clampedZ;
    }

    // Ground & High Ceiling (46m) collision + Ceiling Cling Transition
    const minGroundY = !inGoalX ? wallEval.rampHeightY : 0;
    if (car.position.y <= minGroundY && car.velocity.y <= 0) {
      if (!car.isGrounded && car.velocity.y < -4) {
        car.squashX = 1.22;
        car.squashY = 0.78;
      }
      car.position.y = minGroundY;
      car.velocity.y = Math.max(0, car.velocity.y);
      car.isGrounded = true;
      if (car.surfaceState !== 'wall') {
        car.surfaceState = 'floor';
      }
      car.wallStallTimer = 0;
      car.ceilingClingTimer = 0;
    } else if (car.position.y >= ARENA_BOUNDS.ceiling - 1.2) {
      car.position.y = ARENA_BOUNDS.ceiling - 1.2;
      if (car.surfaceState !== 'ceiling') {
        car.surfaceState = 'ceiling';
        car.ceilingClingTimer = 0;
        car.velocity.y = 0;
        car.isGrounded = true;
        car.hasDoubleJump = true;
      }
    }

    // Full 360° Directional Dodge Spin OR Surface-Aligned Orientation (Floor / Curved Ramp / Wall 90° / Ceiling 180°)
    const fullTurnRate = (Math.PI * 2) / 0.42;
    if (car.dodgeTimer > 0) {
      car.dodgeTimer = Math.max(0, car.dodgeTimer - dt);
      car.pitch += car.dodgePitchAxis * fullTurnRate * dt;
      car.roll += car.dodgeRollAxis * fullTurnRate * dt;
      if (car.dodgeTimer === 0) {
        car.pitch = normalizeAngle(car.pitch);
        car.roll = normalizeAngle(car.roll);
        car.dodgeType = 'none';
      }
    } else if (car.surfaceState === 'ceiling') {
      const blend = 1 - Math.exp(-12 * dt);
      car.pitch += (0 - normalizeAngle(car.pitch)) * blend;
      const rollDiff = normalizeAngle(Math.PI - car.roll);
      car.roll = normalizeAngle(car.roll + rollDiff * blend);
    } else if (car.surfaceState === 'wall' || (!inGoalX && wallEval.rampSlopeAngle > 0.08 && car.isGrounded)) {
      const slopeAngle =
        car.surfaceState === 'wall' ? Math.PI * 0.46 : wallEval.rampSlopeAngle;
      const intoWallDot = -(newFwdX * wallEval.nx + newFwdZ * wallEval.nz);
      const sideWallDot = -(rightX * wallEval.nx + rightZ * wallEval.nz);
      const targetPitch = clamp(-intoWallDot * slopeAngle, -1.45, 1.45);
      const targetRoll = clamp(sideWallDot * slopeAngle, -1.45, 1.45);
      const blend = 1 - Math.exp(-14 * dt);
      car.pitch = normalizeAngle(car.pitch) + (targetPitch - normalizeAngle(car.pitch)) * blend;
      car.roll = normalizeAngle(car.roll) + (targetRoll - normalizeAngle(car.roll)) * blend;
    } else if (!car.isGrounded) {
      car.pitch = clamp(normalizeAngle(car.pitch) + input.throttle * 2.2 * dt, -0.95, 0.95);
      car.roll = clamp(normalizeAngle(car.roll) - input.steer * 2.6 * dt, -0.95, 0.95);
    } else {
      car.pitch = normalizeAngle(car.pitch) * (1 - Math.exp(-14 * dt));
      const targetRoll = -input.steer * clamp(Math.abs(forwardSpeed) / 35, 0, 1) * 0.16;
      car.roll =
        normalizeAngle(car.roll) +
        (targetRoll - normalizeAngle(car.roll)) * (1 - Math.exp(-14 * dt));
    }

    // Boost Pad Pickups (Big = 20s cooldown, Small = 10s cooldown)
    if (car.boost < 100 && car.position.y < 3.8) {
      for (const pad of state.boostPads) {
        if (!pad.active) continue;
        const distPad = Math.hypot(car.position.x - pad.x, car.position.z - pad.z);
        if (distPad < (pad.isFull ? 3.8 : 2.8)) {
          pad.active = false;
          pad.cooldown = pad.isFull ? FULL_BOOST_COOLDOWN : SMALL_BOOST_COOLDOWN;
          car.boost = Math.min(100, car.boost + (pad.isFull ? 100 : 15));
          if (!car.isBot) events.boostPickedUp = true;
        }
      }
    }
  }

  // Car-to-Car Collisions & Supersonic Turbo Demolition
  for (let i = 0; i < state.cars.length; i++) {
    for (let j = i + 1; j < state.cars.length; j++) {
      const a = state.cars[i];
      const b = state.cars[j];
      if (a.demolishedTimer > 0 || b.demolishedTimer > 0) continue;

      const dx = b.position.x - a.position.x;
      const dy = b.position.y - a.position.y;
      const dz = b.position.z - a.position.z;
      const dist = Math.hypot(dx, dy, dz);
      const minDist = ARENA_BOUNDS.carRadius * 2.15;

      if (dist > 0.001 && dist < minDist) {
        const speedA = Math.hypot(a.velocity.x, a.velocity.z);
        const speedB = Math.hypot(b.velocity.x, b.velocity.z);
        const aDemolishesB = a.supersonic && speedA >= speedB - 2;
        const bDemolishesA = b.supersonic && speedB > speedA + 2;

        if (aDemolishesB) {
          const blastPos = { ...b.position };
          b.demolishedTimer = 3.0;
          b.velocity = { x: 0, y: 0, z: 0 };
          a.demolitions += 1;
          state.hitstopTimer = 0.055;
          state.lastDemolitionBanner = { attacker: a.name, victim: b.name, timer: 2.4 };
          events.carDemolished = { attacker: a.name, victim: b.name, position: blastPos };
          events.heavyHit = true;
          continue;
        } else if (bDemolishesA) {
          const blastPos = { ...a.position };
          a.demolishedTimer = 3.0;
          a.velocity = { x: 0, y: 0, z: 0 };
          b.demolitions += 1;
          state.hitstopTimer = 0.055;
          state.lastDemolitionBanner = { attacker: b.name, victim: a.name, timer: 2.4 };
          events.carDemolished = { attacker: b.name, victim: a.name, position: blastPos };
          events.heavyHit = true;
          continue;
        }

        const nx = dx / dist;
        const nz = dz / dist;
        const overlap = (minDist - dist) * 0.5;
        a.position.x -= nx * overlap;
        a.position.z -= nz * overlap;
        b.position.x += nx * overlap;
        b.position.z += nz * overlap;

        const rvx = b.velocity.x - a.velocity.x;
        const rvz = b.velocity.z - a.velocity.z;
        const sepVel = rvx * nx + rvz * nz;
        if (sepVel < 0) {
          const impulse = -sepVel * 0.85;
          a.velocity.x -= nx * impulse;
          a.velocity.z -= nz * impulse;
          b.velocity.x += nx * impulse;
          b.velocity.z += nz * impulse;
        }
      }
    }
  }

  // Ball Physics
  const ball = state.ball;
  ball.velocity.y -= 20 * dt;
  const ballDrag = Math.pow(0.993, dt * 60);
  ball.velocity.x *= ballDrag;
  ball.velocity.z *= ballDrag;

  const ballSpeed = Math.hypot(ball.velocity.x, ball.velocity.y, ball.velocity.z);
  if (ballSpeed > 74) {
    const scale = 74 / ballSpeed;
    ball.velocity.x *= scale;
    ball.velocity.y *= scale;
    ball.velocity.z *= scale;
  }

  ball.position.x += ball.velocity.x * dt;
  ball.position.y += ball.velocity.y * dt;
  ball.position.z += ball.velocity.z * dt;

  // Goal Detection & Solid Curved Ramp + Rounded Stadium Wall Bounce for Ball
  const inGoalMouth =
    Math.abs(ball.position.x) < ARENA_BOUNDS.goalHalfWidth - ball.radius * 0.35 &&
    ball.position.y < ARENA_BOUNDS.goalHeight;

  if (inGoalMouth) {
    if (ball.position.z > ARENA_BOUNDS.halfLength + ball.radius * 0.65) {
      state.blueScore += 1;
      state.lastScoringTeam = 'blue';
      state.lastScorerName = ball.lastTouchedBy || 'Mavi Takım';
      state.goalResetTimer = 2.4;
      state.hitstopTimer = 0.065;
      events.goalScored = 'blue';
      const scorer = state.cars.find((c) => c.name === ball.lastTouchedBy && c.team === 'blue');
      if (scorer) scorer.goals += 1;

      if (state.isOvertime) {
        state.matchEnded = true;
        events.goldenGoalWinner = 'blue';
      }
      return events;
    } else if (ball.position.z < -(ARENA_BOUNDS.halfLength + ball.radius * 0.65)) {
      state.orangeScore += 1;
      state.lastScoringTeam = 'orange';
      state.lastScorerName = ball.lastTouchedBy || 'Turuncu Takım';
      state.goalResetTimer = 2.4;
      state.hitstopTimer = 0.065;
      events.goalScored = 'orange';
      const scorer = state.cars.find((c) => c.name === ball.lastTouchedBy && c.team === 'orange');
      if (scorer) scorer.goals += 1;

      if (state.isOvertime) {
        state.matchEnded = true;
        events.goldenGoalWinner = 'orange';
      }
      return events;
    }
  } else {
    const ballWall = evaluateRoundedArenaWall(
      ball.position.x,
      ball.position.z,
      ball.radius,
      false
    );

    // Ball rides up the solid curved corner/wall ramp block
    const minBallY = ball.radius + ballWall.rampHeightY;
    if (ball.position.y < minBallY) {
      ball.position.y = minBallY;
      const vIntoRamp = -(ball.velocity.x * ballWall.nx + ball.velocity.z * ballWall.nz);
      if (vIntoRamp > 2 && ballWall.rampSlopeAngle > 0.08) {
        ball.velocity.y = Math.max(ball.velocity.y, vIntoRamp * Math.sin(ballWall.rampSlopeAngle) * 0.9);
      } else if (ball.velocity.y < 0) {
        ball.velocity.y = -ball.velocity.y * 0.74;
        if (Math.abs(ball.velocity.y) < 1.5) ball.velocity.y = 0;
      }
    }

    if (ballWall.penetration > 0) {
      ball.position.x = ballWall.clampedX;
      ball.position.z = ballWall.clampedZ;
      const vDotN = ball.velocity.x * ballWall.nx + ball.velocity.z * ballWall.nz;
      if (vDotN < 0) {
        if (ball.position.y < 7.0 && -vDotN > 8) {
          ball.velocity.y += -vDotN * 0.42;
        }
        ball.velocity.x -= (1 + 0.78) * vDotN * ballWall.nx;
        ball.velocity.z -= (1 + 0.78) * vDotN * ballWall.nz;
      }
    }
  }

  // Ball Ground & Ceiling Bounce
  if (ball.position.y < ball.radius) {
    ball.position.y = ball.radius;
    if (ball.velocity.y < 0) {
      ball.velocity.y = -ball.velocity.y * 0.74;
      if (Math.abs(ball.velocity.y) < 1.5) ball.velocity.y = 0;
    }
    ball.angularVelocity.x = ball.velocity.z / ball.radius;
    ball.angularVelocity.z = -ball.velocity.x / ball.radius;
  } else if (ball.position.y > ARENA_BOUNDS.ceiling - ball.radius) {
    ball.position.y = ARENA_BOUNDS.ceiling - ball.radius;
    ball.velocity.y = -Math.abs(ball.velocity.y) * 0.74;
  }

  // Car-to-Ball Collisions
  for (const car of state.cars) {
    if (car.demolishedTimer > 0) continue;

    const carCenterY = car.position.y + 0.95;
    const dx = ball.position.x - car.position.x;
    const dy = ball.position.y - carCenterY;
    const dz = ball.position.z - car.position.z;
    const dist = Math.hypot(dx, dy, dz);
    const minDist = ARENA_BOUNDS.carRadius + ball.radius;

    if (dist > 0.001 && dist < minDist) {
      const nx = dx / dist;
      const ny = clamp(dy / dist + 0.18, -0.3, 0.85);
      const nz = dz / dist;
      const normLen = Math.max(0.001, Math.hypot(nx, ny, nz));
      const unx = nx / normLen;
      const uny = ny / normLen;
      const unz = nz / normLen;

      const overlap = minDist - dist;
      ball.position.x += unx * overlap;
      ball.position.y += uny * overlap;
      ball.position.z += unz * overlap;

      const relVx = ball.velocity.x - car.velocity.x;
      const relVy = ball.velocity.y - car.velocity.y;
      const relVz = ball.velocity.z - car.velocity.z;
      const impactSpeed = Math.hypot(relVx, relVy, relVz);

      const dodgeMultiplier = car.dodgeTimer > 0 ? 1.42 : car.supersonic ? 1.28 : 1.05;
      const carSpeed = Math.hypot(car.velocity.x, car.velocity.y, car.velocity.z);
      const launchPower = Math.max(19, carSpeed * 1.35 * dodgeMultiplier);

      const wasHeadingOwnGoal =
        (car.team === 'blue' && ball.position.z < -56 && ball.velocity.z < -8) ||
        (car.team === 'orange' && ball.position.z > 56 && ball.velocity.z > 8);

      ball.velocity.x = car.velocity.x * 0.55 + unx * launchPower;
      ball.velocity.y = Math.max(4.8, uny * launchPower * 0.84);
      ball.velocity.z = car.velocity.z * 0.55 + unz * launchPower;

      if (wasHeadingOwnGoal && ball.lastTouchTeam && ball.lastTouchTeam !== car.team) {
        car.saves += 1;
        if (!car.isBot) events.saveMade = true;
      }

      if (
        (car.team === 'blue' && ball.velocity.z > 15 && ball.position.z > 10) ||
        (car.team === 'orange' && ball.velocity.z < -15 && ball.position.z < -10)
      ) {
        car.shots += 1;
      }

      ball.lastTouchedBy = car.name;
      ball.lastTouchTeam = car.team;
      ball.hitFlashTimer = 0.06;

      events.hitImpactSpeed = Math.max(events.hitImpactSpeed, impactSpeed);
      if (impactSpeed > 26 || car.dodgeTimer > 0 || car.supersonic) {
        events.heavyHit = true;
        state.hitstopTimer = 0.042;
      } else {
        events.lightHit = true;
      }
    }
  }

  return events;
}

export function purchaseMarketItem(
  itemId: string,
  currentCredits: number,
  ownedItemIds: string[]
): {
  ok: boolean;
  error?: string;
  newCredits: number;
  newOwnedItemIds: string[];
  item?: MarketItem;
} {
  const item = MARKET_CATALOG.find((m) => m.id === itemId);
  if (!item) {
    return {
      ok: false,
      error: 'Eşya katalogda bulunamadı.',
      newCredits: currentCredits,
      newOwnedItemIds: ownedItemIds
    };
  }
  if (ownedItemIds.includes(itemId)) {
    return {
      ok: false,
      error: 'Bu eşya zaten garaj envanterinizde mevcut.',
      newCredits: currentCredits,
      newOwnedItemIds: ownedItemIds
    };
  }
  if (ownedItemIds.length >= 50) {
    return {
      ok: false,
      error: 'Envanter kapasitesi (50 eşya) doldu.',
      newCredits: currentCredits,
      newOwnedItemIds: ownedItemIds
    };
  }
  if (currentCredits < item.priceCredits) {
    return {
      ok: false,
      error: `Yetersiz Kredi. Gereken: ${item.priceCredits} CR, Mevcut: ${currentCredits} CR.`,
      newCredits: currentCredits,
      newOwnedItemIds: ownedItemIds
    };
  }
  return {
    ok: true,
    newCredits: currentCredits - item.priceCredits,
    newOwnedItemIds: [...ownedItemIds, itemId],
    item
  };
}

/**
 * Converts a Blueprint into a permanent usable Garage Item by paying its credit build cost.
 */
export function buildBlueprintItem(
  blueprintId: string,
  currentCredits: number,
  ownedItemIds: string[],
  ownedBlueprintIds: string[]
): {
  ok: boolean;
  error?: string;
  newCredits: number;
  newOwnedItemIds: string[];
  newOwnedBlueprintIds: string[];
  builtItem?: MarketItem;
} {
  const bp = BLUEPRINT_CATALOG.find((b) => b.blueprintId === blueprintId);
  if (!bp) {
    return {
      ok: false,
      error: 'Blueprint bulunamadı.',
      newCredits: currentCredits,
      newOwnedItemIds: ownedItemIds,
      newOwnedBlueprintIds: ownedBlueprintIds
    };
  }
  if (!ownedBlueprintIds.includes(blueprintId)) {
    return {
      ok: false,
      error: 'Bu Blueprint envanterinizde yok.',
      newCredits: currentCredits,
      newOwnedItemIds: ownedItemIds,
      newOwnedBlueprintIds: ownedBlueprintIds
    };
  }
  if (ownedItemIds.includes(bp.targetItemId)) {
    return {
      ok: false,
      error: 'Bu eşyanın normal hali zaten garajınızda var!',
      newCredits: currentCredits,
      newOwnedItemIds: ownedItemIds,
      newOwnedBlueprintIds: ownedBlueprintIds
    };
  }
  if (currentCredits < bp.buildCostCredits) {
    return {
      ok: false,
      error: `Blueprint üretimi için ${bp.buildCostCredits} CR gerekli (Mevcut: ${currentCredits} CR).`,
      newCredits: currentCredits,
      newOwnedItemIds: ownedItemIds,
      newOwnedBlueprintIds: ownedBlueprintIds
    };
  }
  const targetItem = MARKET_CATALOG.find((m) => m.id === bp.targetItemId);
  return {
    ok: true,
    newCredits: currentCredits - bp.buildCostCredits,
    newOwnedItemIds: [...ownedItemIds, bp.targetItemId],
    newOwnedBlueprintIds: ownedBlueprintIds.filter((id) => id !== blueprintId),
    builtItem: targetItem
  };
}

/**
 * Rocket League Trade-In (Takas) System:
 * Trades in selected normal items or blueprints and automatically rolls a random new item!
 */
export function executeRocketTradeIn(
  selectedTradeIds: string[],
  ownedItemIds: string[],
  ownedBlueprintIds: string[],
  tradeMode: 'items' | 'blueprints'
): {
  ok: boolean;
  error?: string;
  newOwnedItemIds: string[];
  newOwnedBlueprintIds: string[];
  rewardedItem?: MarketItem;
  rewardedBlueprint?: BlueprintItem;
} {
  if (selectedTradeIds.length < 2) {
    return {
      ok: false,
      error: 'Takas yapmak için en az 2 eşya veya blueprint seçmelisiniz.',
      newOwnedItemIds: ownedItemIds,
      newOwnedBlueprintIds: ownedBlueprintIds
    };
  }

  if (tradeMode === 'blueprints') {
    const remainingBp = ownedBlueprintIds.filter((id) => !selectedTradeIds.includes(id));
    const unownedItems = MARKET_CATALOG.filter((m) => !ownedItemIds.includes(m.id));
    const pool = unownedItems.length > 0 ? unownedItems : MARKET_CATALOG;
    const wonItem = pool[Math.floor(Math.random() * pool.length)];
    const updatedOwned = ownedItemIds.includes(wonItem.id)
      ? ownedItemIds
      : [...ownedItemIds, wonItem.id];
    return {
      ok: true,
      newOwnedItemIds: updatedOwned,
      newOwnedBlueprintIds: remainingBp,
      rewardedItem: wonItem
    };
  } else {
    // Trade in normal items (keep at least 1 default item per slot safe or allow re-rolling)
    const remainingItems = ownedItemIds.filter((id) => !selectedTradeIds.includes(id));
    const candidatePool = MARKET_CATALOG.filter(
      (m) => !selectedTradeIds.includes(m.id) && m.priceCredits > 0
    );
    const pool = candidatePool.length > 0 ? candidatePool : MARKET_CATALOG;
    const wonItem = pool[Math.floor(Math.random() * pool.length)];
    const finalItems = remainingItems.includes(wonItem.id)
      ? remainingItems
      : [...remainingItems, wonItem.id];
    return {
      ok: true,
      newOwnedItemIds: finalItems,
      newOwnedBlueprintIds: ownedBlueprintIds,
      rewardedItem: wonItem
    };
  }
}

/**
 * Opens a Drop Crate earned from missions and returns a random Blueprint or Garage Item + Bonus Credits.
 */
export function openDropCrate(
  currentCrates: number,
  ownedItemIds: string[],
  ownedBlueprintIds: string[],
  currentCredits: number
): {
  ok: boolean;
  error?: string;
  newCrates: number;
  newCredits: number;
  newOwnedItemIds: string[];
  newOwnedBlueprintIds: string[];
  dropLabel: string;
} {
  if (currentCrates <= 0) {
    return {
      ok: false,
      error: 'Açılacak Kutu (Drop) bulunmuyor. Görevleri tamamlayarak kutu kazanın!',
      newCrates: currentCrates,
      newCredits: currentCredits,
      newOwnedItemIds: ownedItemIds,
      newOwnedBlueprintIds: ownedBlueprintIds,
      dropLabel: ''
    };
  }

  const roll = Math.random();
  const bonusCredits = 75;
  if (roll < 0.55) {
    // Drop a Blueprint
    const unownedBps = BLUEPRINT_CATALOG.filter(
      (b) => !ownedBlueprintIds.includes(b.blueprintId)
    );
    const pool = unownedBps.length > 0 ? unownedBps : BLUEPRINT_CATALOG;
    const bp = pool[Math.floor(Math.random() * pool.length)];
    const nextBps = ownedBlueprintIds.includes(bp.blueprintId)
      ? ownedBlueprintIds
      : [...ownedBlueprintIds, bp.blueprintId];
    return {
      ok: true,
      newCrates: currentCrates - 1,
      newCredits: currentCredits + bonusCredits,
      newOwnedItemIds: ownedItemIds,
      newOwnedBlueprintIds: nextBps,
      dropLabel: `KUTUDAN ÇIKTI: ${bp.itemName} + ${bonusCredits} Kredi!`
    };
  } else {
    // Drop a direct Garage Item
    const unownedItems = MARKET_CATALOG.filter((m) => !ownedItemIds.includes(m.id));
    const pool = unownedItems.length > 0 ? unownedItems : MARKET_CATALOG;
    const item = pool[Math.floor(Math.random() * pool.length)];
    const nextItems = ownedItemIds.includes(item.id)
      ? ownedItemIds
      : [...ownedItemIds, item.id];
    return {
      ok: true,
      newCrates: currentCrates - 1,
      newCredits: currentCredits + bonusCredits,
      newOwnedItemIds: nextItems,
      newOwnedBlueprintIds: ownedBlueprintIds,
      dropLabel: `KUTUDAN ÇIKTI: ${item.name} (${item.rarity}) + ${bonusCredits} Kredi!`
    };
  }
}

export function claimSeasonTierReward(
  tierNumber: number,
  seasonXp: number,
  currentCredits: number,
  ownedItemIds: string[],
  claimedTiers: number[]
): {
  ok: boolean;
  error?: string;
  newCredits: number;
  newOwnedItemIds: string[];
  newClaimedTiers: number[];
  rewardTitle?: string;
} {
  const reward = SEASON_REWARDS.find((r) => r.tier === tierNumber);
  if (!reward) {
    return {
      ok: false,
      error: 'Geçersiz sezon kademesi.',
      newCredits: currentCredits,
      newOwnedItemIds: ownedItemIds,
      newClaimedTiers: claimedTiers
    };
  }
  if (claimedTiers.includes(tierNumber)) {
    return {
      ok: false,
      error: 'Bu sezon ödülü zaten alındı.',
      newCredits: currentCredits,
      newOwnedItemIds: ownedItemIds,
      newClaimedTiers: claimedTiers
    };
  }
  if (seasonXp < reward.requiredXp) {
    return {
      ok: false,
      error: `Bu kademe için ${reward.requiredXp} XP gerekiyor (Mevcut: ${seasonXp} XP).`,
      newCredits: currentCredits,
      newOwnedItemIds: ownedItemIds,
      newClaimedTiers: claimedTiers
    };
  }

  let updatedCredits = currentCredits;
  let updatedItems = [...ownedItemIds];
  if (reward.rewardType === 'credits' && reward.creditsAmount) {
    updatedCredits += reward.creditsAmount;
  } else if (reward.rewardType === 'item' && reward.itemId && !updatedItems.includes(reward.itemId)) {
    updatedItems.push(reward.itemId);
  }

  return {
    ok: true,
    newCredits: updatedCredits,
    newOwnedItemIds: updatedItems.slice(0, 50),
    newClaimedTiers: [...claimedTiers, tierNumber].slice(0, 30),
    rewardTitle: reward.title
  };
}
