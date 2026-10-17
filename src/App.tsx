import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArenaCanvas,
  HudSnapshot,
  MobileControlState,
  ReplayPlaybackControl
} from './game/ArenaCanvas';
import {
  ArenaState,
  BotDifficulty,
  CarModelType,
  ControlBindings,
  CrossPlatformNetwork,
  DEFAULT_CONTROL_BINDINGS,
  DEFAULT_GENERAL_SETTINGS,
  DEFAULT_GRAPHICS_SETTINGS,
  DEFAULT_MOBILE_CONTROLS_CONFIG,
  GameMode,
  GarageFocusTarget,
  GeneralSettingsState,
  GraphicsSettingsState,
  MARKET_CATALOG,
  MissionDef,
  MobileControlsConfig,
  PlayerRegion,
  PlaylistCategory,
  REGIONS_CATALOG,
  ReplayEventMarker,
  ReplayFrame,
  buildBlueprintItem,
  calculateMmrDelta,
  calculateSeasonLevel,
  captureReplayFrame,
  claimSeasonTierReward,
  createInitialArenaState,
  executeRocketTradeIn,
  formatKeyBindingLabel,
  getRankTierFromMmr,
  openDropCrate,
  purchaseMarketItem,
  stepArenaPhysics
} from './game/rules';
import {
  AudioSettingsState,
  DEFAULT_AUDIO_SETTINGS,
  soundEngine
} from './game/sound';
import { PlayingHud } from './components/PlayingHud';
import {
  BottomHubDock,
  HubTab,
  MOBILE_BUTTON_TARGETS
} from './components/BottomHubDock';
import { ReplayTheaterHud } from './components/ReplayTheaterHud';
import {
  MarketOrderData,
  MatchRecordData,
  PlayerProfileData,
  createMarketOrderInFirestore,
  ensurePlayerProfile,
  fetchActiveMarketOrders,
  getSavedNormalSession,
  googleSignIn,
  initAuth,
  logout,
  normalAccountRegisterOrLogin,
  recordMatchProgressionToFirestore,
  resetPlayerProfileToZeroInFirestore,
  subscribeToPlayerMatches,
  syncGarageLoadoutToFirestore,
  testFirestoreConnection
} from './services/firebaseService';
import {
  GmailSummaryMessage,
  fetchRecentClubEmails,
  sendGmailMessage
} from './services/gmailService';

const ZERO_START_PROFILE: PlayerProfileData = {
  uid: 'local_pilot',
  displayName: 'SüpersonikPilot',
  region: 'EU',
  accountOnboarded: false,
  mmr: 0,
  rankTier: 'Bronz I',
  credits: 0,
  seasonXp: 0,
  seasonLevel: 1,
  wins: 0,
  matchesPlayed: 0,
  goalsScored: 0,
  savesMade: 0,
  shotsTaken: 0,
  demolitionsCount: 0,
  cratesCount: 1,
  equippedCarModel: 'octane',
  equippedBodyColor: '#06B6D4',
  equippedFinish: 'anodized',
  equippedBoostColor: '#F59E0B',
  equippedWheelStyle: 'aero_apex',
  ownedItemIds: [
    'car_octane_pro',
    'body_octane_cyan',
    'finish_anodized',
    'boost_solar_flare',
    'wheel_aero_apex'
  ],
  ownedBlueprintIds: ['bp_car_dominus_gt', 'bp_wheel_turbine_gold'],
  claimedSeasonTiers: [],
  claimedMissionIds: []
};

const CONTROLS_STORAGE_KEY = 'nitro_pitch_controls_v3';
const MOBILE_CONFIG_STORAGE_KEY = 'nitro_pitch_mobile_cfg_v3';
const GRAPHICS_STORAGE_KEY = 'nitro_pitch_graphics_v3';
const GENERAL_STORAGE_KEY = 'nitro_pitch_general_v3';
const AUDIO_STORAGE_KEY = 'nitro_pitch_audio_v3';
const PROFILE_STORAGE_KEY = 'nitro_pitch_local_profile_v3';

function loadSavedControlBindings(): ControlBindings {
  if (typeof window === 'undefined') return { ...DEFAULT_CONTROL_BINDINGS };
  try {
    const raw = window.localStorage.getItem(CONTROLS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CONTROL_BINDINGS };
    return { ...DEFAULT_CONTROL_BINDINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONTROL_BINDINGS };
  }
}

function loadSavedMobileConfig(): MobileControlsConfig {
  if (typeof window === 'undefined') return { ...DEFAULT_MOBILE_CONTROLS_CONFIG };
  try {
    const raw = window.localStorage.getItem(MOBILE_CONFIG_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_MOBILE_CONTROLS_CONFIG };
    const parsed = JSON.parse(raw) as Partial<MobileControlsConfig>;
    return {
      steerMode: parsed.steerMode || 'joystick',
      joystick: { ...DEFAULT_MOBILE_CONTROLS_CONFIG.joystick, ...parsed.joystick },
      boost: { ...DEFAULT_MOBILE_CONTROLS_CONFIG.boost, ...parsed.boost },
      jump: { ...DEFAULT_MOBILE_CONTROLS_CONFIG.jump, ...parsed.jump },
      flyUp: { ...DEFAULT_MOBILE_CONTROLS_CONFIG.flyUp, ...parsed.flyUp },
      drift: { ...DEFAULT_MOBILE_CONTROLS_CONFIG.drift, ...parsed.drift }
    };
  } catch {
    return { ...DEFAULT_MOBILE_CONTROLS_CONFIG };
  }
}

function loadSavedGraphicsSettings(): GraphicsSettingsState {
  if (typeof window === 'undefined') return { ...DEFAULT_GRAPHICS_SETTINGS };
  try {
    const raw = window.localStorage.getItem(GRAPHICS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_GRAPHICS_SETTINGS };
    return { ...DEFAULT_GRAPHICS_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_GRAPHICS_SETTINGS };
  }
}

function loadSavedGeneralSettings(): GeneralSettingsState {
  if (typeof window === 'undefined') return { ...DEFAULT_GENERAL_SETTINGS };
  try {
    const raw = window.localStorage.getItem(GENERAL_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_GENERAL_SETTINGS };
    return { ...DEFAULT_GENERAL_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_GENERAL_SETTINGS };
  }
}

function loadSavedAudioSettings(): AudioSettingsState {
  if (typeof window === 'undefined') return { ...DEFAULT_AUDIO_SETTINGS };
  try {
    const raw = window.localStorage.getItem(AUDIO_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_AUDIO_SETTINGS };
    return { ...DEFAULT_AUDIO_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_AUDIO_SETTINGS };
  }
}

function loadSavedLocalProfile(): PlayerProfileData {
  if (typeof window === 'undefined') return { ...ZERO_START_PROFILE };
  try {
    const savedSession = getSavedNormalSession();
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<PlayerProfileData>) : {};
    return {
      ...ZERO_START_PROFILE,
      ...parsed,
      uid: savedSession?.uid || parsed.uid || ZERO_START_PROFILE.uid,
      displayName:
        savedSession?.displayName || parsed.displayName || ZERO_START_PROFILE.displayName,
      region: savedSession?.region || parsed.region || ZERO_START_PROFILE.region,
      ownedItemIds: parsed.ownedItemIds?.length
        ? parsed.ownedItemIds
        : ZERO_START_PROFILE.ownedItemIds,
      ownedBlueprintIds: parsed.ownedBlueprintIds ?? ZERO_START_PROFILE.ownedBlueprintIds
    };
  } catch {
    return { ...ZERO_START_PROFILE };
  }
}

function generateInitialHighlightReplay(profile: PlayerProfileData): {
  frames: ReplayFrame[];
  events: ReplayEventMarker[];
} {
  const simArena = createInitialArenaState('1v1', {
    displayName: profile.displayName,
    carModel: profile.equippedCarModel || 'octane',
    bodyColor: profile.equippedBodyColor,
    finish: profile.equippedFinish,
    boostColor: profile.equippedBoostColor,
    wheelStyle: profile.equippedWheelStyle,
    platform: 'PC_STEAM_EPIC'
  });

  const frames: ReplayFrame[] = [];
  const events: ReplayEventMarker[] = [];

  for (let i = 0; i < 160; i++) {
    const t = i * 0.05;
    const isAerialPhase = i > 45 && i < 95;
    const isFlipPhase = i === 32 || i === 115;

    stepArenaPhysics(
      simArena,
      {
        throttle: 1,
        steer: Math.sin(t * 1.4) * 0.35,
        boostHeld: true,
        jumpJustPressed: i === 25 || isFlipPhase,
        jumpHeld: isAerialPhase,
        flyUpHeld: isAerialPhase,
        driftHeld: i > 100 && i < 112
      },
      0.05
    );

    frames.push(captureReplayFrame(simArena, t));

    if (i === 32) {
      events.push({
        frameIndex: i,
        timestamp: t,
        type: 'goal',
        label: `${profile.displayName} (İleri Takla & Atak)`
      });
    } else if (i === 75) {
      events.push({
        frameIndex: i,
        timestamp: t,
        type: 'save',
        label: `${profile.displayName} Tavan Uçuşu (${Math.round(simArena.cars[0].position.y)}m)`
      });
    }
  }

  return { frames, events };
}

interface EndOfMatchSnapshot {
  outcome: 'victory' | 'defeat';
  blueScore: number;
  orangeScore: number;
  isGoldenGoal: boolean;
  mmrDelta: number;
  newMmr: number;
  earnedCredits: number;
  earnedXp: number;
  playerGoals: number;
  playerSaves: number;
  playerDemolitions: number;
}

interface PendingEmailConfirmation {
  to: string;
  subject: string;
  bodyText: string;
}

export default function App() {
  const isAutostart =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  const [gameState, setGameState] = useState<
    'title' | 'playing' | 'paused' | 'gameover' | 'replay'
  >(isAutostart ? 'playing' : 'title');
  const [previousStateBeforeReplay, setPreviousStateBeforeReplay] = useState<
    'title' | 'playing' | 'gameover'
  >('title');
  const [pauseSettingsOpen, setPauseSettingsOpen] = useState(false);
  const [pauseMobileTarget, setPauseMobileTarget] = useState<
    'flyUp' | 'boost' | 'jump' | 'drift' | 'joystick'
  >('flyUp');

  const [activeTab, setActiveTab] = useState<HubTab>('lobby');
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [garageFocusTarget, setGarageFocusTarget] =
    useState<GarageFocusTarget>('overview');

  const [selectedMode, setSelectedMode] = useState<GameMode>('3v3');
  const [playlistCategory, setPlaylistCategory] =
    useState<PlaylistCategory>('competitive');
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>('pro');
  const [practiceBotEnabled, setPracticeBotEnabled] = useState<boolean>(true);
  const [selectedPlatform, setSelectedPlatform] = useState<CrossPlatformNetwork>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'MOBILE_TOUCH';
    }
    return 'PC_STEAM_EPIC';
  });

  const [profile, setProfile] = useState<PlayerProfileData>(loadSavedLocalProfile);
  const [controlBindings, setControlBindings] = useState<ControlBindings>(
    loadSavedControlBindings
  );
  const [mobileConfig, setMobileConfig] = useState<MobileControlsConfig>(
    loadSavedMobileConfig
  );
  const [graphicsSettings, setGraphicsSettings] = useState<GraphicsSettingsState>(
    loadSavedGraphicsSettings
  );
  const [generalSettings, setGeneralSettings] = useState<GeneralSettingsState>(
    loadSavedGeneralSettings
  );
  const [audioSettings, setAudioSettings] = useState<AudioSettingsState>(
    loadSavedAudioSettings
  );

  // Account & Region Onboarding Modal + Logo Picker Modal + Regional Matchmaking Modal
  const [accountModalOpen, setAccountModalOpen] = useState<boolean>(false);
  const [authTabMode, setAuthTabMode] = useState<'register' | 'login'>('register');
  const [authEmailInput, setAuthEmailInput] = useState<string>('');
  const [authPasswordInput, setAuthPasswordInput] = useState<string>('');
  const [authUsernameInput, setAuthUsernameInput] = useState<string>(
    profile.displayName || 'SüpersonikPilot'
  );
  const [authRegionInput, setAuthRegionInput] = useState<PlayerRegion>(
    profile.region || generalSettings.region || 'EU'
  );
  const [authErrorText, setAuthErrorText] = useState<string | null>(null);

  const [logoPickerModalOpen, setLogoPickerModalOpen] = useState<boolean>(false);

  // Regional Real-Player Matchmaking Queue state
  const [matchmakingQueueOpen, setMatchmakingQueueOpen] = useState<boolean>(false);
  const [matchmakingSearchSeconds, setMatchmakingSearchSeconds] = useState<number>(0);

  const [matchHistory, setMatchHistory] = useState<MatchRecordData[]>([]);
  const [marketOrders, setMarketOrders] = useState<MarketOrderData[]>([
    {
      id: 'seed_1',
      sellerId: 'bot_trader_1',
      sellerName: 'HyperApex_TR',
      itemId: 'wheel_turbine_gold',
      itemName: 'Altın Türbin Jant',
      rarity: 'Exotic',
      priceCredits: 700,
      status: 'active'
    },
    {
      id: 'seed_2',
      sellerId: 'bot_trader_2',
      sellerName: 'KromValkyrie',
      itemId: 'boost_crimson_ion',
      itemName: 'Kızıl Kuantum İzi',
      rarity: 'Exotic',
      priceCredits: 750,
      status: 'active'
    }
  ]);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() =>
    Boolean(getSavedNormalSession())
  );
  const [userEmail, setUserEmail] = useState<string | null>(
    () => getSavedNormalSession()?.email || null
  );
  const [needsGmailAuth, setNeedsGmailAuth] = useState(true);
  const [gmailMessages, setGmailMessages] = useState<GmailSummaryMessage[]>([]);
  const [gmailLoading, setGmailLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [ballCam, setBallCam] = useState(true);
  const [showTouchControls, setShowTouchControls] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  const [endSnapshot, setEndSnapshot] = useState<EndOfMatchSnapshot | null>(null);
  const [pendingEmail, setPendingEmail] = useState<PendingEmailConfirmation | null>(null);

  // Persist local profile updates
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
      } catch {
        // ignore
      }
    }
  }, [profile]);

  // Apply audio settings to SoundEngine
  useEffect(() => {
    soundEngine.applyAudioSettings(audioSettings);
  }, [audioSettings]);

  // Regional matchmaking search timer
  useEffect(() => {
    if (!matchmakingQueueOpen) {
      setMatchmakingSearchSeconds(0);
      return;
    }
    const timer = window.setInterval(() => {
      setMatchmakingSearchSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [matchmakingQueueOpen]);

  // 3D Match Replay state & buffers
  const initialReplayRef = useRef<{
    frames: ReplayFrame[];
    events: ReplayEventMarker[];
  } | null>(null);
  if (!initialReplayRef.current) {
    initialReplayRef.current = generateInitialHighlightReplay(ZERO_START_PROFILE);
  }

  const replayFramesRef = useRef<ReplayFrame[]>(initialReplayRef.current.frames);
  const replayEventsRef = useRef<ReplayEventMarker[]>(initialReplayRef.current.events);
  const replayControlRef = useRef<ReplayPlaybackControl>({
    playing: true,
    frameIndex: 0,
    speed: 1,
    cameraMode: 'player'
  });

  const [replayPlaying, setReplayPlaying] = useState(true);
  const [replaySpeed, setReplaySpeed] = useState(1);
  const [replayCameraMode, setReplayCameraMode] = useState<'player' | 'ball' | 'stadium'>(
    'player'
  );

  const arenaStateRef = useRef<ArenaState>(
    createInitialArenaState('3v3', {
      displayName: profile.displayName,
      carModel: profile.equippedCarModel || 'octane',
      bodyColor: profile.equippedBodyColor,
      finish: profile.equippedFinish,
      boostColor: profile.equippedBoostColor,
      wheelStyle: profile.equippedWheelStyle,
      platform: 'PC_STEAM_EPIC',
      botDifficulty: 'pro',
      practiceBotEnabled: true,
      playlistCategory: 'competitive',
      region: profile.region || 'EU'
    })
  );

  const mobileInputRef = useRef<MobileControlState>({
    throttle: 0,
    steer: 0,
    boostHeld: false,
    jumpHeld: false,
    jumpJustPressed: false,
    driftHeld: false,
    flyUpHeld: false
  });

  const [hud, setHud] = useState<HudSnapshot>({
    blueScore: 0,
    orangeScore: 0,
    timeRemaining: 180,
    isOvertime: false,
    overtimeElapsed: 0,
    boost: 0,
    speedKmh: 0,
    altitude: 1,
    supersonic: false,
    ballCam: true,
    dodgeType: 'none',
    surfaceState: 'floor',
    goalBanner: null,
    demolitionBanner: null,
    playerGoals: 0,
    playerSaves: 0,
    playerShots: 0,
    playerDemolitions: 0,
    replayFrameCount: initialReplayRef.current.frames.length,
    replayCurrentFrame: 0
  });

  useEffect(() => {
    document.body.dataset.state = gameState;
  }, [gameState]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth < 820) {
        setShowTouchControls(true);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (selectedPlatform === 'MOBILE_TOUCH') {
      setShowTouchControls(true);
    }
  }, [selectedPlatform]);

  const showNotice = useCallback((msg: string) => {
    setStatusMessage(msg);
    window.setTimeout(() => {
      setStatusMessage((prev) => (prev === msg ? null : prev));
    }, 4500);
  }, []);

  const handleUpdateControlBindings = useCallback(
    (nextBindings: ControlBindings) => {
      setControlBindings(nextBindings);
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(CONTROLS_STORAGE_KEY, JSON.stringify(nextBindings));
        } catch {
          // ignore
        }
      }
      soundEngine.playUiConfirm();
      showNotice('PC kontrol atamaları kaydedildi!');
    },
    [showNotice]
  );

  const handleResetControlBindings = useCallback(() => {
    const defaults = { ...DEFAULT_CONTROL_BINDINGS };
    setControlBindings(defaults);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(CONTROLS_STORAGE_KEY, JSON.stringify(defaults));
      } catch {
        // ignore
      }
    }
    soundEngine.playUiConfirm();
    showNotice('Varsayılan PC kontrolleri (WASD + Sağ/Sol Tık + Shift) yüklendi.');
  }, [showNotice]);

  const handleUpdateMobileConfig = useCallback(
    (nextCfg: MobileControlsConfig) => {
      setMobileConfig(nextCfg);
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(MOBILE_CONFIG_STORAGE_KEY, JSON.stringify(nextCfg));
        } catch {
          // ignore
        }
      }
      soundEngine.playUiConfirm();
      showNotice('Mobil sürüş & tuş pozisyonu ayarları kaydedildi!');
    },
    [showNotice]
  );

  const handleUpdateGraphicsSettings = useCallback(
    (nextGfx: GraphicsSettingsState) => {
      setGraphicsSettings(nextGfx);
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(GRAPHICS_STORAGE_KEY, JSON.stringify(nextGfx));
        } catch {
          // ignore
        }
      }
      soundEngine.playUiConfirm();
      showNotice(
        `Grafik ayarları güncellendi (${nextGfx.preset.toUpperCase()} · ${nextGfx.resolutionScale}x)!`
      );
    },
    [showNotice]
  );

  const handleUpdateGeneralSettings = useCallback(
    (nextGen: GeneralSettingsState) => {
      setGeneralSettings(nextGen);
      setProfile((prev) => ({ ...prev, region: nextGen.region }));
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(GENERAL_STORAGE_KEY, JSON.stringify(nextGen));
        } catch {
          // ignore
        }
      }
      soundEngine.playUiConfirm();
      showNotice(
        `Genel ayarlar kaydedildi (Logo #${nextGen.selectedLogo} · Bölge: ${nextGen.region})!`
      );
    },
    [showNotice]
  );

  const handleUpdateAudioSettings = useCallback((nextAud: AudioSettingsState) => {
    setAudioSettings(nextAud);
    soundEngine.applyAudioSettings(nextAud);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify(nextAud));
      } catch {
        // ignore
      }
    }
  }, []);

  const handleResetProfileToZero = useCallback(async () => {
    const zeroed: PlayerProfileData = {
      ...ZERO_START_PROFILE,
      uid: profile.uid,
      displayName: profile.displayName,
      region: profile.region || generalSettings.region,
      accountOnboarded: true
    };
    setProfile(zeroed);
    setMatchHistory([]);
    soundEngine.playUiConfirm();
    showNotice('Tüm ilerleme, kredi, MMR ve istatistikler sıfırlandı (0 Başlangıç)!');

    if (isAuthenticated && profile.uid !== 'local_pilot') {
      try {
        await resetPlayerProfileToZeroInFirestore(profile.uid, zeroed);
      } catch (err) {
        console.error('Zero reset sync error:', err);
      }
    }
  }, [generalSettings.region, isAuthenticated, profile.displayName, profile.region, profile.uid, showNotice]);

  // Validate Firestore connection and initialize Auth listener on mount
  useEffect(() => {
    testFirestoreConnection();
    let unsubscribeMatches: (() => void) | null = null;

    const unsubscribeAuth = initAuth(
      async (user, token) => {
        setIsAuthenticated(true);
        setUserEmail(user.email || null);
        setNeedsGmailAuth(!token);
        try {
          const loadedProfile = await ensurePlayerProfile(user, ZERO_START_PROFILE);
          setProfile((prev) => ({
            ...prev,
            ...loadedProfile,
            region: loadedProfile.region || prev.region || 'EU'
          }));
          if (unsubscribeMatches) unsubscribeMatches();
          unsubscribeMatches = subscribeToPlayerMatches(user.uid, (matches) => {
            setMatchHistory(matches);
          });
          const activeOrders = await fetchActiveMarketOrders();
          if (activeOrders.length > 0) {
            setMarketOrders(activeOrders);
          }
        } catch (err) {
          console.error('Profile sync error:', err);
        }
      },
      () => {
        const normalSaved = getSavedNormalSession();
        if (!normalSaved) {
          setIsAuthenticated(false);
        }
        setNeedsGmailAuth(true);
      }
    );

    return () => {
      unsubscribeAuth();
      if (unsubscribeMatches) unsubscribeMatches();
    };
  }, []);

  const launchArenaMatchNow = useCallback(
    (
      overrideMode?: GameMode,
      overrideBotDiff?: BotDifficulty,
      overridePracticeBot?: boolean
    ) => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      const modeToUse = overrideMode || selectedMode;
      const diffToUse = overrideBotDiff || botDifficulty;
      const practiceBotToUse =
        overridePracticeBot !== undefined ? overridePracticeBot : practiceBotEnabled;

      setMatchmakingQueueOpen(false);
      arenaStateRef.current = createInitialArenaState(modeToUse, {
        displayName: profile.displayName,
        carModel: profile.equippedCarModel || 'octane',
        bodyColor: profile.equippedBodyColor,
        finish: profile.equippedFinish,
        boostColor: profile.equippedBoostColor,
        wheelStyle: profile.equippedWheelStyle,
        platform: selectedPlatform,
        botDifficulty: diffToUse,
        practiceBotEnabled: practiceBotToUse,
        playlistCategory,
        region: profile.region || generalSettings.region
      });
      mobileInputRef.current = {
        throttle: 0,
        steer: 0,
        boostHeld: false,
        jumpHeld: false,
        jumpJustPressed: false,
        driftHeld: false,
        flyUpHeld: false
      };
      replayFramesRef.current = [];
      replayEventsRef.current = [];
      setEndSnapshot(null);
      setPauseSettingsOpen(false);
      document.body.dataset.state = 'playing';
      setGameState('playing');
      soundEngine.playUiConfirm();
    },
    [
      botDifficulty,
      generalSettings.region,
      playlistCategory,
      practiceBotEnabled,
      profile,
      selectedMode,
      selectedPlatform
    ]
  );

  // When user clicks "ARA / BAŞLA" in the BottomHubDock Lobby for 1v1/2v2/3v3, open regional matchmaking queue
  const handleRequestLobbyMatchmaking = useCallback(() => {
    if (selectedMode === 'practice') {
      launchArenaMatchNow('practice');
      return;
    }
    setMatchmakingQueueOpen(true);
    soundEngine.playUiConfirm();
  }, [launchArenaMatchNow, selectedMode]);

  const handleOpenReplayTheater = useCallback(
    (fromState: 'title' | 'playing' | 'gameover') => {
      if (replayFramesRef.current.length === 0) {
        const fallback = generateInitialHighlightReplay(profile);
        replayFramesRef.current = fallback.frames;
        replayEventsRef.current = fallback.events;
      }
      setPreviousStateBeforeReplay(fromState);
      setPauseSettingsOpen(false);
      replayControlRef.current.frameIndex = 0;
      replayControlRef.current.playing = true;
      replayControlRef.current.speed = 1;
      setReplayPlaying(true);
      setReplaySpeed(1);
      document.body.dataset.state = 'replay';
      setGameState('replay');
      soundEngine.playUiConfirm();
    },
    [profile]
  );

  // Global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInputFocused =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT');
      if (isInputFocused) return;

      if (gameState === 'title' && e.code === 'Enter' && !accountModalOpen && !logoPickerModalOpen) {
        e.preventDefault();
        launchArenaMatchNow();
      } else if (gameState === 'title' && e.code === 'KeyH') {
        setDockCollapsed((prev) => !prev);
      } else if (e.code === 'KeyM') {
        handleUpdateAudioSettings({
          ...audioSettings,
          muted: !audioSettings.muted
        });
      } else if (gameState === 'playing' && e.code === 'KeyR') {
        launchArenaMatchNow();
      } else if (gameState === 'playing' && e.code === 'KeyV') {
        handleOpenReplayTheater('playing');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    accountModalOpen,
    audioSettings,
    gameState,
    handleOpenReplayTheater,
    handleUpdateAudioSettings,
    launchArenaMatchNow,
    logoPickerModalOpen
  ]);

  const handleMatchFinished = useCallback(
    (finalArena: ArenaState) => {
      const pCar = finalArena.cars[0];
      // Strict victory check: blueScore MUST be strictly greater than orangeScore (ties go to Golden Goal Overtime)
      const won = finalArena.blueScore > finalArena.orangeScore;
      const isCompetitive = finalArena.playlistCategory !== 'casual';
      const mmrDelta = isCompetitive
        ? calculateMmrDelta(
            profile.mmr,
            profile.mmr + 15,
            finalArena.blueScore,
            finalArena.orangeScore
          )
        : 0;
      const earnedCredits =
        (won ? 200 : 95) +
        (pCar ? pCar.goals * 45 + pCar.saves * 30 + pCar.demolitions * 25 : 0);
      const earnedXp =
        (won ? 480 : 260) + (pCar ? pCar.goals * 85 + pCar.demolitions * 40 : 0);

      const newMmr = Math.max(0, profile.mmr + mmrDelta);
      const newRankTier = getRankTierFromMmr(newMmr).tierName;
      const newXp = profile.seasonXp + earnedXp;
      const newSeasonLevel = calculateSeasonLevel(newXp).level;
      const newCredits = profile.credits + earnedCredits;
      const newWins = profile.wins + (won ? 1 : 0);
      const newMatches = profile.matchesPlayed + 1;
      const newGoals = profile.goalsScored + (pCar ? pCar.goals : 0);
      const newSaves = (profile.savesMade || 0) + (pCar ? pCar.saves : 0);
      const newShots = (profile.shotsTaken || 0) + (pCar ? pCar.shots : 0);
      const newDemos = (profile.demolitionsCount || 0) + (pCar ? pCar.demolitions : 0);

      setEndSnapshot({
        outcome: won ? 'victory' : 'defeat',
        blueScore: finalArena.blueScore,
        orangeScore: finalArena.orangeScore,
        isGoldenGoal: Boolean(finalArena.isOvertime),
        mmrDelta,
        newMmr,
        earnedCredits,
        earnedXp,
        playerGoals: pCar ? pCar.goals : 0,
        playerSaves: pCar ? pCar.saves : 0,
        playerDemolitions: pCar ? pCar.demolitions : 0
      });

      const updatedProfile: PlayerProfileData = {
        ...profile,
        mmr: newMmr,
        rankTier: newRankTier,
        credits: newCredits,
        seasonXp: newXp,
        seasonLevel: newSeasonLevel,
        wins: newWins,
        matchesPlayed: newMatches,
        goalsScored: newGoals,
        savesMade: newSaves,
        shotsTaken: newShots,
        demolitionsCount: newDemos
      };
      setProfile(updatedProfile);

      const opponentCar = finalArena.cars.find((c) => c.team === 'orange');
      const newRecord: MatchRecordData = {
        id: `local_${Date.now()}`,
        ownerId: profile.uid,
        mode: finalArena.mode,
        playerScore: finalArena.blueScore,
        opponentScore: finalArena.orangeScore,
        opponentName: opponentCar ? opponentCar.name : 'Turuncu Takım',
        mmrDelta,
        outcome: won ? 'victory' : 'defeat',
        status: 'completed'
      };
      setMatchHistory((prev) => [newRecord, ...prev.slice(0, 9)]);

      if (isAuthenticated) {
        recordMatchProgressionToFirestore(
          profile.uid,
          {
            mmr: newMmr,
            rankTier: newRankTier,
            credits: newCredits,
            seasonXp: newXp,
            seasonLevel: newSeasonLevel,
            wins: newWins,
            matchesPlayed: newMatches,
            goalsScored: newGoals
          },
          {
            mode: finalArena.mode,
            playerScore: finalArena.blueScore,
            opponentScore: finalArena.orangeScore,
            opponentName: newRecord.opponentName,
            mmrDelta,
            outcome: won ? 'victory' : 'defeat'
          }
        ).catch((err) => console.error('Match progression save error:', err));
      }

      document.body.dataset.state = 'gameover';
      setGameState('gameover');
    },
    [isAuthenticated, profile]
  );

  const handlePurchaseOrEquip = async (itemId: string) => {
    const item = MARKET_CATALOG.find((m) => m.id === itemId);
    if (!item) return;

    let updatedCredits = profile.credits;
    let updatedOwned = [...profile.ownedItemIds];

    if (!updatedOwned.includes(itemId)) {
      const res = purchaseMarketItem(itemId, profile.credits, profile.ownedItemIds);
      if (!res.ok) {
        showNotice(res.error || 'Satın alma başarısız.');
        return;
      }
      updatedCredits = res.newCredits;
      updatedOwned = res.newOwnedItemIds;
      showNotice(`${item.name} satın alındı ve garajınıza eklendi!`);
    } else {
      showNotice(`${item.name} aracınıza kuşanıldı!`);
    }

    const updatedProfile: PlayerProfileData = {
      ...profile,
      credits: updatedCredits,
      ownedItemIds: updatedOwned,
      equippedCarModel:
        item.category === 'carModel'
          ? (item.value as CarModelType)
          : profile.equippedCarModel || 'octane',
      equippedBodyColor:
        item.category === 'bodyColor' ? item.value : profile.equippedBodyColor,
      equippedFinish: item.category === 'finish' ? item.value : profile.equippedFinish,
      equippedBoostColor:
        item.category === 'boostColor' ? item.value : profile.equippedBoostColor,
      equippedWheelStyle:
        item.category === 'wheelStyle' ? item.value : profile.equippedWheelStyle
    };

    setProfile(updatedProfile);
    soundEngine.playUiConfirm();

    if (isAuthenticated) {
      try {
        await syncGarageLoadoutToFirestore(updatedProfile.uid, {
          equippedBodyColor: updatedProfile.equippedBodyColor,
          equippedFinish: updatedProfile.equippedFinish,
          equippedBoostColor: updatedProfile.equippedBoostColor,
          equippedWheelStyle: updatedProfile.equippedWheelStyle,
          ownedItemIds: updatedProfile.ownedItemIds,
          credits: updatedProfile.credits,
          claimedSeasonTiers: updatedProfile.claimedSeasonTiers
        });
      } catch (err) {
        console.error('Garage sync error:', err);
      }
    }
  };

  const handleBuildBlueprint = (blueprintId: string) => {
    const res = buildBlueprintItem(
      blueprintId,
      profile.credits,
      profile.ownedItemIds,
      profile.ownedBlueprintIds || []
    );
    if (!res.ok) {
      showNotice(res.error || 'Blueprint üretilemedi.');
      return;
    }
    setProfile((prev) => ({
      ...prev,
      credits: res.newCredits,
      ownedItemIds: res.newOwnedItemIds,
      ownedBlueprintIds: res.newOwnedBlueprintIds
    }));
    soundEngine.playUiConfirm();
    showNotice(
      `Blueprint normale çevrildi: ${res.builtItem?.name || 'Yeni Eşya'} garajınıza eklendi!`
    );
  };

  const handleExecuteTradeIn = (
    selectedIds: string[],
    tradeMode: 'items' | 'blueprints'
  ) => {
    const res = executeRocketTradeIn(
      selectedIds,
      profile.ownedItemIds,
      profile.ownedBlueprintIds || [],
      tradeMode
    );
    if (!res.ok) {
      showNotice(res.error || 'Takas tamamlanamadı.');
      return;
    }
    setProfile((prev) => ({
      ...prev,
      ownedItemIds: res.newOwnedItemIds,
      ownedBlueprintIds: res.newOwnedBlueprintIds
    }));
    soundEngine.playUiConfirm();
    showNotice(
      `TAKAS BAŞARILI! Otomatik rastgele yeni eşya kazandınız: ${res.rewardedItem?.name} (${res.rewardedItem?.rarity})!`
    );
  };

  const handleClaimMissionReward = (mission: MissionDef) => {
    const claimed = profile.claimedMissionIds || [];
    if (claimed.includes(mission.id)) return;

    const nextItems = [...profile.ownedItemIds];
    if (mission.rewardItemId && !nextItems.includes(mission.rewardItemId)) {
      nextItems.push(mission.rewardItemId);
    }
    const nextBps = [...(profile.ownedBlueprintIds || [])];
    if (mission.rewardBlueprintId && !nextBps.includes(mission.rewardBlueprintId)) {
      nextBps.push(mission.rewardBlueprintId);
    }
    const nextXp = profile.seasonXp + mission.rewardXp;

    setProfile((prev) => ({
      ...prev,
      credits: prev.credits + mission.rewardCredits,
      seasonXp: nextXp,
      seasonLevel: calculateSeasonLevel(nextXp).level,
      cratesCount: (prev.cratesCount || 0) + mission.rewardCrates,
      ownedItemIds: nextItems,
      ownedBlueprintIds: nextBps,
      claimedMissionIds: [...claimed, mission.id]
    }));
    soundEngine.playUiConfirm();
    showNotice(`GÖREV TAMAMLANDI: ${mission.rewardSummaryLabel} hesabınıza eklendi!`);
  };

  const handleOpenCrate = () => {
    const res = openDropCrate(
      profile.cratesCount || 0,
      profile.ownedItemIds,
      profile.ownedBlueprintIds || [],
      profile.credits
    );
    if (!res.ok) {
      showNotice(res.error || 'Kutu açılamadı.');
      return;
    }
    setProfile((prev) => ({
      ...prev,
      cratesCount: res.newCrates,
      credits: res.newCredits,
      ownedItemIds: res.newOwnedItemIds,
      ownedBlueprintIds: res.newOwnedBlueprintIds
    }));
    soundEngine.playGoalExplosion();
    showNotice(res.dropLabel);
  };

  const handleCreateMarketListing = async (itemId: string, price: number) => {
    const item = MARKET_CATALOG.find((m) => m.id === itemId);
    if (!item) return;
    const safePrice = Math.max(50, Math.min(50000, Math.round(price)));

    const newOrder: MarketOrderData = {
      id: `ord_${Date.now()}`,
      sellerId: profile.uid,
      sellerName: profile.displayName,
      itemId: item.id,
      itemName: item.name,
      rarity: item.rarity,
      priceCredits: safePrice,
      status: 'active'
    };

    setMarketOrders((prev) => [newOrder, ...prev]);
    soundEngine.playUiConfirm();
    showNotice(`${item.name} (${safePrice} CR) oyuncu pazarına eklendi!`);

    if (isAuthenticated) {
      try {
        await createMarketOrderInFirestore({
          sellerId: profile.uid,
          sellerName: profile.displayName,
          itemId: item.id,
          itemName: item.name,
          rarity: item.rarity,
          priceCredits: safePrice
        });
      } catch (err) {
        console.error('Market order creation error:', err);
      }
    }
  };

  const handleClaimSeasonTier = async (tierNumber: number) => {
    const res = claimSeasonTierReward(
      tierNumber,
      profile.seasonXp,
      profile.credits,
      profile.ownedItemIds,
      profile.claimedSeasonTiers
    );
    if (!res.ok) {
      showNotice(res.error || 'Ödül alınamadı.');
      return;
    }

    const updatedProfile: PlayerProfileData = {
      ...profile,
      credits: res.newCredits,
      ownedItemIds: res.newOwnedItemIds,
      claimedSeasonTiers: res.newClaimedTiers
    };
    setProfile(updatedProfile);
    soundEngine.playUiConfirm();
    showNotice(`Kademe ${tierNumber} ödülü alındı: ${res.rewardTitle}!`);
  };

  const handleNormalAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthErrorText(null);
    if (!authUsernameInput.trim()) {
      setAuthErrorText('Lütfen geçerli bir kullanıcı adı girin.');
      return;
    }
    try {
      const session = await normalAccountRegisterOrLogin({
        mode: authTabMode,
        email: authEmailInput,
        password: authPasswordInput,
        username: authUsernameInput.trim(),
        region: authRegionInput
      });
      setIsAuthenticated(true);
      setUserEmail(session.email);
      setProfile((prev) => ({
        ...prev,
        uid: session.uid,
        displayName: session.displayName,
        region: session.region,
        accountOnboarded: true
      }));
      handleUpdateGeneralSettings({
        ...generalSettings,
        region: session.region
      });
      setAccountModalOpen(false);
      soundEngine.playUiConfirm();
      showNotice(
        `Hoş geldin ${session.displayName}! Bölge: ${session.region} olarak ayarlandı.`
      );
    } catch (err) {
      setAuthErrorText(
        err instanceof Error ? err.message : 'Giriş sırasında bir hata oluştu.'
      );
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setIsAuthenticated(true);
        setUserEmail(result.user.email || null);
        setNeedsGmailAuth(false);
        setProfile((prev) => ({
          ...prev,
          displayName: result.user.displayName || prev.displayName,
          region: authRegionInput || prev.region || 'EU',
          accountOnboarded: true
        }));
        setAccountModalOpen(false);
        showNotice(`Hoş geldin, ${result.user.displayName || 'Pilot'}!`);
        handleRefreshGmail();
      }
    } catch (err) {
      console.error('Google Sign-In failed:', err);
      showNotice('Google girişi tamamlanamadı.');
    }
  };

  const handleLogout = async () => {
    await logout();
    setIsAuthenticated(false);
    setNeedsGmailAuth(true);
    setGmailMessages([]);
    showNotice('Oturum kapatıldı.');
  };

  const handleRefreshGmail = async () => {
    setGmailLoading(true);
    try {
      const res = await fetchRecentClubEmails();
      if (res.needsAuth) {
        setNeedsGmailAuth(true);
      } else {
        setNeedsGmailAuth(false);
        setGmailMessages(res.messages);
      }
    } catch (err) {
      console.error('Gmail fetch error:', err);
      showNotice('Gmail iletileri alınırken hata oluştu.');
    } finally {
      setGmailLoading(false);
    }
  };

  const handleConfirmSendGmail = async () => {
    if (!pendingEmail) return;
    const toSend = pendingEmail;
    setPendingEmail(null);

    if (!isAuthenticated || needsGmailAuth) {
      showNotice('E-posta göndermek için önce Google ile giriş yapmalısınız.');
      setActiveTab('gmail');
      return;
    }

    const res = await sendGmailMessage(toSend);
    if (res.ok) {
      soundEngine.playUiConfirm();
      showNotice(`E-posta başarıyla gönderildi: ${toSend.to}`);
    } else {
      if (res.needsAuth) setNeedsGmailAuth(true);
      showNotice(res.error || 'E-posta gönderilemedi.');
    }
  };

  const currentReplayFrame =
    replayFramesRef.current[
      Math.min(
        hud.replayCurrentFrame,
        Math.max(0, replayFramesRef.current.length - 1)
      )
    ];

  const pauseCurrentMobileOffset = mobileConfig[pauseMobileTarget];
  const activeRegionInfo =
    REGIONS_CATALOG.find((r) => r.id === (profile.region || generalSettings.region)) ||
    REGIONS_CATALOG[0];

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#070d19] select-none">
      {/* 1. Full-Bleed 3D WebGL Stadium & Physics Viewport */}
      <ArenaCanvas
        gameState={gameState}
        arenaStateRef={arenaStateRef}
        mobileInputRef={mobileInputRef}
        controlBindings={controlBindings}
        replayFramesRef={replayFramesRef}
        replayEventsRef={replayEventsRef}
        replayControlRef={replayControlRef}
        ballCam={ballCam}
        onToggleBallCam={() => setBallCam((prev) => !prev)}
        onHudUpdate={setHud}
        onMatchFinished={handleMatchFinished}
        onPauseRequested={() => {
          setPauseSettingsOpen(false);
          document.body.dataset.state = 'paused';
          setGameState('paused');
        }}
        garageFocusTarget={garageFocusTarget}
        graphicsSettings={graphicsSettings}
        generalSettings={generalSettings}
        playerCosmetics={{
          carModel: profile.equippedCarModel || 'octane',
          bodyColor: profile.equippedBodyColor,
          finish: profile.equippedFinish,
          boostColor: profile.equippedBoostColor,
          wheelStyle: profile.equippedWheelStyle
        }}
      />

      {/* 2. TITLE SCREEN STAGE */}
      {gameState === 'title' && (
        <div className="fixed inset-0 pointer-events-none z-20 flex flex-col justify-between p-2 sm:p-5">
          {/* Top Bar Area */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
            {/* High-Contrast Bounded Title, Logo Selector Button & Quick Launch Panel */}
            <div className="pointer-events-auto w-full sm:w-auto sm:max-w-xl bg-[#0b1324] border-2 border-slate-500 rounded-xl sm:rounded-2xl p-2 sm:p-3.5 shadow-2xl space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setLogoPickerModalOpen(true)}
                    title="Logoyu Değiştir (1 - 2 - 3 Numaralı Tasarımlar)"
                    className="relative group shrink-0 rounded-xl border-2 border-cyan-400/80 hover:border-amber-400 overflow-hidden bg-[#09101f] cursor-pointer"
                  >
                    <img
                      src={`/logos/logo-${generalSettings.selectedLogo}.svg`}
                      alt={`Nitro Pitch Logo #${generalSettings.selectedLogo}`}
                      className="w-10 h-10 sm:w-13 sm:h-13 object-contain"
                    />
                    <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[8px] font-bold text-amber-300 text-center">
                      LOGO #{generalSettings.selectedLogo}
                    </span>
                  </button>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <h1 className="font-display font-bold text-base sm:text-2xl tracking-tight text-white leading-none">
                        NITRO PITCH
                      </h1>
                      <button
                        type="button"
                        onClick={() => setLogoPickerModalOpen(true)}
                        className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400 text-[9px] font-bold text-amber-300 hover:bg-amber-500 hover:text-slate-950 cursor-pointer"
                      >
                        Logoları Gör (1-2-3)
                      </button>
                    </div>
                    <p className="text-[10px] sm:text-xs text-cyan-300 font-semibold mt-0.5">
                      {activeRegionInfo.name} · 1v1 / 2v2 / 3v3 Rekabetçi & Normal
                    </p>
                  </div>
                </div>

                {/* Mobile inline Account Button */}
                <div className="sm:hidden shrink-0">
                  <button
                    type="button"
                    onClick={() => setAccountModalOpen(true)}
                    className="px-2 py-1 rounded-lg bg-[#162440] border border-cyan-400 text-[10px] font-bold text-white cursor-pointer"
                  >
                    {isAuthenticated ? `${profile.displayName} (${activeRegionInfo.id})` : 'Giriş / Kayıt'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  data-start="true"
                  onClick={() => launchArenaMatchNow()}
                  className="px-2 py-2 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl bg-amber-500 hover:bg-amber-400 border-2 border-amber-200 text-slate-950 font-display font-bold text-[10px] sm:text-xs tracking-wide shadow-lg transition-transform active:scale-95 whitespace-nowrap cursor-pointer text-center"
                >
                  HIZLI MAÇ ({selectedMode.toUpperCase()})
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedMode('practice');
                    launchArenaMatchNow('practice');
                  }}
                  className="px-2 py-2 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl bg-[#13203a] border-2 border-slate-500 hover:border-cyan-400 text-white font-display font-bold text-[10px] sm:text-xs tracking-wide transition-colors whitespace-nowrap cursor-pointer text-center"
                >
                  ANTRENMAN ({practiceBotEnabled ? 'BOTLU' : 'SERBEST'})
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenReplayTheater('title')}
                  className="px-2 py-2 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl bg-[#0c263b] border-2 border-cyan-400 text-cyan-100 font-display font-bold text-[10px] sm:text-xs tracking-wide transition-colors whitespace-nowrap cursor-pointer text-center"
                >
                  MAÇ TEKRARI
                </button>
              </div>
            </div>

            {/* Top-Right: Normal Login/Register + Google Sign-In + Pilot Region Status */}
            <div className="hidden sm:flex pointer-events-auto flex-col items-end gap-1.5 shrink-0">
              <div className="flex items-center gap-2 bg-[#0b1324] border-2 border-slate-500/90 rounded-xl p-2 shadow-2xl">
                <div className="text-right pr-2 border-r border-slate-600">
                  <div className="text-xs font-bold text-white">
                    {profile.displayName}{' '}
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-400 text-cyan-300 font-mono-tabular">
                      {activeRegionInfo.id}
                    </span>
                  </div>
                  <div className="text-[10px] text-amber-300 font-mono-tabular">
                    {profile.rankTier} · {profile.credits} CR · {profile.cratesCount || 0} Kutu
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAccountModalOpen(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-display font-bold text-xs cursor-pointer"
                >
                  {isAuthenticated ? 'Hesap & Bölge' : 'Normal Giriş / Kayıt'}
                </button>

                {!isAuthenticated && (
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="px-2.5 py-1.5 rounded-lg bg-[#162440] hover:bg-[#1f3258] border border-slate-400 text-white font-display font-bold text-xs cursor-pointer"
                  >
                    Google ile Giriş
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Unified Collapsible Bottom Control Dock */}
          <BottomHubDock
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            collapsed={dockCollapsed}
            setCollapsed={setDockCollapsed}
            selectedMode={selectedMode}
            setSelectedMode={setSelectedMode}
            playlistCategory={playlistCategory}
            setPlaylistCategory={setPlaylistCategory}
            selectedPlatform={selectedPlatform}
            setSelectedPlatform={setSelectedPlatform}
            botDifficulty={botDifficulty}
            setBotDifficulty={setBotDifficulty}
            practiceBotEnabled={practiceBotEnabled}
            setPracticeBotEnabled={setPracticeBotEnabled}
            garageFocusTarget={garageFocusTarget}
            onChangeGarageFocus={setGarageFocusTarget}
            controlBindings={controlBindings}
            onUpdateControlBindings={handleUpdateControlBindings}
            onResetControlBindings={handleResetControlBindings}
            mobileConfig={mobileConfig}
            onUpdateMobileConfig={handleUpdateMobileConfig}
            graphicsSettings={graphicsSettings}
            onUpdateGraphicsSettings={handleUpdateGraphicsSettings}
            generalSettings={generalSettings}
            onUpdateGeneralSettings={handleUpdateGeneralSettings}
            audioSettings={audioSettings}
            onUpdateAudioSettings={handleUpdateAudioSettings}
            onOpenLogoPickerModal={() => setLogoPickerModalOpen(true)}
            onOpenAccountModal={() => setAccountModalOpen(true)}
            onResetProfileToZero={handleResetProfileToZero}
            onOpenReplay={() => handleOpenReplayTheater('title')}
            hasReplayFrames={replayFramesRef.current.length > 0}
            profile={profile}
            matchHistory={matchHistory}
            marketOrders={marketOrders}
            userEmail={userEmail}
            isAuthenticated={isAuthenticated}
            needsGmailAuth={needsGmailAuth}
            gmailMessages={gmailMessages}
            gmailLoading={gmailLoading}
            statusMessage={statusMessage}
            onStartMatch={handleRequestLobbyMatchmaking}
            onGoogleLogin={handleGoogleLogin}
            onLogout={handleLogout}
            onPurchaseOrEquip={handlePurchaseOrEquip}
            onBuildBlueprint={handleBuildBlueprint}
            onExecuteTradeIn={handleExecuteTradeIn}
            onClaimMissionReward={handleClaimMissionReward}
            onOpenCrate={handleOpenCrate}
            onCreateMarketListing={handleCreateMarketListing}
            onClaimSeasonTier={handleClaimSeasonTier}
            onRefreshGmail={handleRefreshGmail}
            onRequestSendGmail={(to, subject, bodyText) => {
              setPendingEmail({ to, subject, bodyText });
            }}
          />
        </div>
      )}

      {/* 2B. LOGO PICKER GALLERY MODAL (1 - 2 - 3 NUMARALI LOGOLAR) */}
      {logoPickerModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="logo-picker-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4"
        >
          <div className="w-full max-w-2xl bg-[#0b1324] border-2 border-cyan-400 rounded-2xl p-4 sm:p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-600 pb-2.5">
              <div>
                <div className="text-[11px] font-bold tracking-widest text-amber-300">
                  LOGO TASARIM GALERİSİ (1 - 2 - 3)
                </div>
                <h2
                  id="logo-picker-title"
                  className="font-display font-bold text-lg sm:text-2xl text-white"
                >
                  Hangi Logoyu Beğendiniz? Numarasına Göre Seçin
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setLogoPickerModalOpen(false)}
                className="px-3 py-1 rounded-lg bg-slate-800 text-slate-200 text-xs font-bold cursor-pointer"
              >
                Kapat ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(
                [
                  {
                    id: 1,
                    title: '1. KROM KALKAN ARENA',
                    desc: 'Metalik e-spor kalkanı, süpersonik mavi-turuncu roket araba ve enerji topu.',
                    src: '/logos/logo-1.svg'
                  },
                  {
                    id: 2,
                    title: '2. ALTIN SİBER KANATLAR',
                    desc: 'Turnuva şampiyonluk kanatları, sekizgen stadyum rozeti ve çift turbo ateşi.',
                    src: '/logos/logo-2.svg'
                  },
                  {
                    id: 3,
                    title: '3. NEON ALTIGEN ÇEKİRDEK',
                    desc: 'Modern minimalist siber altıgen, dinamik hız çizgileri ve parlak çekirdek.',
                    src: '/logos/logo-3.svg'
                  }
                ] as const
              ).map((item) => {
                const isSelected = generalSettings.selectedLogo === item.id;
                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border-2 flex flex-col justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-[#193254] border-amber-400 shadow-xl'
                        : 'bg-[#121e36] border-slate-600'
                    }`}
                  >
                    <div className="space-y-2 text-center">
                      <div className="inline-block px-2.5 py-0.5 rounded-md bg-amber-500 text-slate-950 font-display font-bold text-xs">
                        LOGO #{item.id}
                      </div>
                      <img
                        src={item.src}
                        alt={item.title}
                        className="w-36 h-36 mx-auto rounded-xl border border-slate-600 bg-[#070d19] p-1"
                      />
                      <div className="font-display font-bold text-xs text-white">
                        {item.title}
                      </div>
                      <p className="text-[10px] text-slate-300 leading-snug">{item.desc}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        handleUpdateGeneralSettings({
                          ...generalSettings,
                          selectedLogo: item.id
                        });
                        setLogoPickerModalOpen(false);
                      }}
                      className={`w-full py-2 rounded-xl font-display font-bold text-xs cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                      }`}
                    >
                      {isSelected ? `✓ LOGO #${item.id} AKTİF` : `LOGO #${item.id} SEÇ`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 2C. NORMAL ACCOUNT REGISTRATION / LOGIN + USERNAME & REGION SELECTION MODAL */}
      {accountModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="account-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4"
        >
          <div className="w-full max-w-md bg-[#0b1324] border-2 border-cyan-400 rounded-2xl p-4 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-600 pb-2">
              <div>
                <div className="text-[10px] font-bold tracking-widest text-cyan-300">
                  PİLOT HESABI & BÖLGESEL LİG KAYDI
                </div>
                <h2
                  id="account-modal-title"
                  className="font-display font-bold text-lg sm:text-xl text-white"
                >
                  Normal Giriş / Kayıt & Bölge Seçimi
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setAccountModalOpen(false)}
                className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex gap-1.5 bg-[#121e36] p-1 rounded-xl border border-slate-600">
              <button
                type="button"
                onClick={() => setAuthTabMode('register')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-display font-bold cursor-pointer ${
                  authTabMode === 'register'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-300'
                }`}
              >
                Yeni Hesap Aç
              </button>
              <button
                type="button"
                onClick={() => setAuthTabMode('login')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-display font-bold cursor-pointer ${
                  authTabMode === 'login'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-300'
                }`}
              >
                Normal Giriş Yap
              </button>
            </div>

            <form onSubmit={handleNormalAccountSubmit} className="space-y-2.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-200 mb-1">
                  1. Kullanıcı Adı (Pilot Adı):
                </label>
                <input
                  type="text"
                  required
                  maxLength={28}
                  placeholder="Örn: SupersonicTR"
                  value={authUsernameInput}
                  onChange={(e) => setAuthUsernameInput(e.target.value)}
                  className="w-full bg-[#121e36] border border-slate-500 rounded-lg px-3 py-2 text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-amber-300 mb-1">
                  2. Eşleştirme & Turnuva Bölgesi Seçin:
                </label>
                <select
                  value={authRegionInput}
                  onChange={(e) => setAuthRegionInput(e.target.value as PlayerRegion)}
                  className="w-full bg-[#121e36] border border-amber-400/80 rounded-lg px-3 py-2 text-white font-bold"
                >
                  {REGIONS_CATALOG.map((reg) => (
                    <option key={reg.id} value={reg.id}>
                      {reg.name} ({reg.pingRange}) — {reg.tournamentTitle}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-200 mb-1">
                    E-posta Adresi:
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="pilot@nitropitch.com"
                    value={authEmailInput}
                    onChange={(e) => setAuthEmailInput(e.target.value)}
                    className="w-full bg-[#121e36] border border-slate-500 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-200 mb-1">
                    Şifre:
                  </label>
                  <input
                    type="password"
                    required
                    minLength={4}
                    placeholder="••••••"
                    value={authPasswordInput}
                    onChange={(e) => setAuthPasswordInput(e.target.value)}
                    className="w-full bg-[#121e36] border border-slate-500 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>
              </div>

              {authErrorText && (
                <div className="p-2 rounded-lg bg-rose-950 border border-rose-500 text-rose-200 text-[11px] font-bold">
                  {authErrorText}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 border-2 border-amber-200 text-slate-950 font-display font-bold text-xs cursor-pointer shadow"
              >
                {authTabMode === 'register'
                  ? 'HESABI OLUŞTUR VE BÖLGEYE BAĞLAN'
                  : 'NORMAL HESAP İLE GİRİŞ YAP'}
              </button>
            </form>

            <div className="pt-2 border-t border-slate-700 flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-300">Veya Google ile bağlan:</span>
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="px-3 py-1.5 rounded-lg bg-[#162440] hover:bg-[#1f3258] border border-slate-400 text-white font-display font-bold text-xs cursor-pointer"
              >
                Google ile Giriş Yap
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2D. REGIONAL REAL-PLAYER MATCHMAKING QUEUE MODAL */}
      {matchmakingQueueOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="mm-queue-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          <div className="w-full max-w-md bg-[#0b1324] border-2 border-cyan-400 rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-600 pb-2">
              <div>
                <div className="text-[10px] font-bold tracking-widest text-cyan-300 uppercase">
                  {activeRegionInfo.name} · {playlistCategory === 'competitive' ? 'REKABETÇİ LİG' : 'NORMAL EŞLEŞME'}
                </div>
                <h2
                  id="mm-queue-title"
                  className="font-display font-bold text-xl text-white"
                >
                  {selectedMode.toUpperCase()} Bölgesel Oyuncu Aranıyor...
                </h2>
              </div>
              <span className="px-2.5 py-1 rounded bg-cyan-950 border border-cyan-400 text-cyan-200 font-mono-tabular text-xs font-bold">
                {matchmakingSearchSeconds} sn
              </span>
            </div>

            <div className="bg-[#121e36] border border-slate-600 rounded-xl p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Eşleştirme Sunucusu:</span>
                <span className="font-bold text-white">{activeRegionInfo.serverCluster}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Gerekli Oyuncu:</span>
                <span className="font-mono-tabular font-bold text-amber-300">
                  1 / {selectedMode === '3v3' ? 6 : selectedMode === '2v2' ? 4 : 2} Gerçek Oyuncu
                </span>
              </div>

              {matchmakingSearchSeconds >= 3 ? (
                <div className="p-2.5 rounded-lg bg-amber-950/90 border border-amber-400 text-amber-100 text-[11px] leading-snug space-y-1">
                  <div className="font-bold text-amber-300">
                    Bölgenizde ({activeRegionInfo.id}) Şu Anda Başka Çevrimiçi Gerçek Oyuncu Yok
                  </div>
                  <p>
                    İsteğiniz doğrultusunda bölgede gerçek oyuncu olmadığında sahte/otomatik maç başlatılmaz. Gerçek oyuncu beklemeye devam edebilir veya dilerseniz bölgesel AI pilotlarla maça girebilirsiniz.
                  </p>
                </div>
              ) : (
                <div className="text-[11px] text-cyan-200 animate-pulse">
                  {activeRegionInfo.name} lobisindeki aktif oyuncular taranıyor...
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => launchArenaMatchNow()}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 border-2 border-amber-200 text-slate-950 font-display font-bold text-xs cursor-pointer"
              >
                BÖLGESEL AI PİLOTLARLA HEMEN BAŞLAT ({selectedMode.toUpperCase()})
              </button>
              <button
                type="button"
                onClick={() => setMatchmakingQueueOpen(false)}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-500 text-slate-200 font-display font-bold text-xs cursor-pointer"
              >
                ARAMAYI İPTAL ET (LOBİYE DÖN)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. PLAYING HUD */}
      {gameState === 'playing' && (
        <PlayingHud
          hud={hud}
          showTouchControls={showTouchControls}
          mobileConfig={mobileConfig}
          mobileInputRef={mobileInputRef}
          onToggleBallCam={() => setBallCam((prev) => !prev)}
          onPause={() => {
            setPauseSettingsOpen(false);
            document.body.dataset.state = 'paused';
            setGameState('paused');
          }}
        />
      )}

      {/* 3B. 3D MATCH REPLAY THEATER HUD */}
      {gameState === 'replay' && (
        <ReplayTheaterHud
          currentFrame={hud.replayCurrentFrame}
          totalFrames={replayFramesRef.current.length}
          playing={replayPlaying}
          speed={replaySpeed}
          cameraMode={replayCameraMode}
          blueScore={currentReplayFrame ? currentReplayFrame.blueScore : hud.blueScore}
          orangeScore={
            currentReplayFrame ? currentReplayFrame.orangeScore : hud.orangeScore
          }
          events={replayEventsRef.current}
          canResumeMatch={previousStateBeforeReplay === 'playing'}
          onSeekFrame={(frameIdx) => {
            replayControlRef.current.playing = false;
            replayControlRef.current.frameIndex = frameIdx;
            setReplayPlaying(false);
            setHud((prev) => ({ ...prev, replayCurrentFrame: frameIdx }));
          }}
          onTogglePlay={() => {
            const next = !replayPlaying;
            replayControlRef.current.playing = next;
            setReplayPlaying(next);
          }}
          onChangeSpeed={(spd) => {
            replayControlRef.current.speed = spd;
            setReplaySpeed(spd);
          }}
          onChangeCamera={(cam) => {
            replayControlRef.current.cameraMode = cam;
            setReplayCameraMode(cam);
          }}
          onResumeMatch={() => {
            if (previousStateBeforeReplay === 'playing') {
              document.body.dataset.state = 'playing';
              setGameState('playing');
            } else {
              launchArenaMatchNow();
            }
          }}
          onExitToLobby={() => {
            document.body.dataset.state = 'title';
            setGameState('title');
          }}
        />
      )}

      {/* 4. IN-MATCH MENU MODAL */}
      {gameState === 'paused' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pause-modal-title"
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-3 sm:p-4"
        >
          <div className="w-full max-w-lg bg-[#0b1324] border-2 border-slate-500/90 rounded-2xl p-4 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b-2 border-slate-600/80 pb-2.5">
              <div>
                <div className="text-[11px] font-bold tracking-widest text-cyan-300">
                  MAÇ MENÜSÜ ({selectedMode.toUpperCase()})
                </div>
                <h2
                  id="pause-modal-title"
                  className="font-display font-bold text-xl sm:text-2xl text-white"
                >
                  Skor: Mavi {hud.blueScore} - {hud.orangeScore} Turuncu
                </h2>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleUpdateAudioSettings({
                    ...audioSettings,
                    muted: !audioSettings.muted
                  })
                }
                className="px-3 py-1.5 rounded-lg bg-[#162440] border border-slate-500 text-xs font-bold text-slate-200 cursor-pointer"
              >
                {audioSettings.muted ? 'Ses: Kapalı' : 'Ses: Açık'}
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  document.body.dataset.state = 'playing';
                  setGameState('playing');
                }}
                className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 border-2 border-cyan-200 text-slate-950 font-display font-bold text-sm tracking-wide cursor-pointer"
              >
                MAÇA DEVAM ET
              </button>

              <button
                type="button"
                onClick={() => setPauseSettingsOpen((prev) => !prev)}
                className="w-full py-2.5 rounded-xl bg-[#162440] hover:bg-[#1e3156] border-2 border-slate-500 text-white font-display font-bold text-sm tracking-wide cursor-pointer"
              >
                {pauseSettingsOpen ? 'AYARLARI GİZLE ▲' : 'AYARLAR & TUŞ DİZİLİMİ ▼'}
              </button>

              {pauseSettingsOpen && (
                <div className="bg-[#121e36] border-2 border-slate-600 rounded-xl p-3 space-y-3 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-600/80 pb-2">
                    <span className="font-bold text-cyan-300">Mobil / Dokunmatik Kontroller:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowTouchControls((prev) => !prev)}
                        className={`px-2.5 py-1 rounded font-bold border cursor-pointer ${
                          showTouchControls
                            ? 'bg-emerald-500 text-slate-950 border-emerald-200'
                            : 'bg-[#0b1324] text-slate-300 border-slate-600'
                        }`}
                      >
                        {showTouchControls ? 'Ekranda Açık' : 'Gizli'}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateMobileConfig({
                            ...mobileConfig,
                            steerMode:
                              mobileConfig.steerMode === 'joystick' ? 'buttons' : 'joystick'
                          })
                        }
                        className="px-2.5 py-1 rounded bg-cyan-500 text-slate-950 font-bold cursor-pointer"
                      >
                        Mod: {mobileConfig.steerMode === 'joystick' ? 'Analog Joystick' : 'Yön Tuşları'}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 border-b border-slate-600/80 pb-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-300">
                        Uçuş & Diğer Tuşların Pozisyonunu Ayarla:
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateMobileConfig(DEFAULT_MOBILE_CONTROLS_CONFIG)}
                        className="text-[11px] text-slate-300 underline cursor-pointer"
                      >
                        Sıfırla
                      </button>
                    </div>
                    <select
                      value={pauseMobileTarget}
                      onChange={(e) =>
                        setPauseMobileTarget(
                          e.target.value as 'flyUp' | 'boost' | 'jump' | 'drift' | 'joystick'
                        )
                      }
                      className="w-full bg-[#0b1324] border border-slate-500 rounded-lg px-2.5 py-1.5 text-white font-bold"
                    >
                      {MOBILE_BUTTON_TARGETS.map((t) => (
                        <option key={t.key} value={t.key}>
                          {t.label}
                        </option>
                      ))}
                    </select>

                    <div className="grid grid-cols-3 gap-1.5 bg-[#0b1324] border border-slate-600 rounded-lg p-2 text-center">
                      <div>
                        <div className="text-[10px] text-slate-300">Sol / Sağ</div>
                        <div className="flex justify-center gap-1 mt-1">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateMobileConfig({
                                ...mobileConfig,
                                [pauseMobileTarget]: {
                                  ...pauseCurrentMobileOffset,
                                  offsetX: Math.max(-60, pauseCurrentMobileOffset.offsetX - 20)
                                }
                              })
                            }
                            className="px-2 py-0.5 rounded bg-slate-700 text-white font-bold cursor-pointer"
                          >
                            ←
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateMobileConfig({
                                ...mobileConfig,
                                [pauseMobileTarget]: {
                                  ...pauseCurrentMobileOffset,
                                  offsetX: Math.min(60, pauseCurrentMobileOffset.offsetX + 20)
                                }
                              })
                            }
                            className="px-2 py-0.5 rounded bg-slate-700 text-white font-bold cursor-pointer"
                          >
                            →
                          </button>
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] text-slate-300">Yukarı / Aşağı</div>
                        <div className="flex justify-center gap-1 mt-1">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateMobileConfig({
                                ...mobileConfig,
                                [pauseMobileTarget]: {
                                  ...pauseCurrentMobileOffset,
                                  offsetY: Math.max(-60, pauseCurrentMobileOffset.offsetY - 20)
                                }
                              })
                            }
                            className="px-2 py-0.5 rounded bg-slate-700 text-white font-bold cursor-pointer"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateMobileConfig({
                                ...mobileConfig,
                                [pauseMobileTarget]: {
                                  ...pauseCurrentMobileOffset,
                                  offsetY: Math.min(60, pauseCurrentMobileOffset.offsetY + 20)
                                }
                              })
                            }
                            className="px-2 py-0.5 rounded bg-slate-700 text-white font-bold cursor-pointer"
                          >
                            ↓
                          </button>
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] text-slate-300">Tuş Boyutu</div>
                        <div className="flex justify-center gap-1 mt-1">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateMobileConfig({
                                ...mobileConfig,
                                [pauseMobileTarget]: {
                                  ...pauseCurrentMobileOffset,
                                  scale: pauseCurrentMobileOffset.scale <= 1 ? 0.85 : 1.0
                                }
                              })
                            }
                            className="px-2 py-0.5 rounded bg-slate-700 text-white font-bold cursor-pointer"
                          >
                            -
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateMobileConfig({
                                ...mobileConfig,
                                [pauseMobileTarget]: {
                                  ...pauseCurrentMobileOffset,
                                  scale: pauseCurrentMobileOffset.scale >= 1 ? 1.15 : 1.0
                                }
                              })
                            }
                            className="px-2 py-0.5 rounded bg-slate-700 text-white font-bold cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-slate-200">Bot Zorluğu:</span>
                    <div className="flex items-center gap-1">
                      {(
                        [
                          { id: 'rookie', label: 'Çaylak' },
                          { id: 'pro', label: 'Pro' },
                          { id: 'allstar', label: 'All-Star' },
                          { id: 'unfair', label: 'Efsane' }
                        ] as const
                      ).map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => {
                            setBotDifficulty(d.id);
                            arenaStateRef.current.botDifficulty = d.id;
                          }}
                          className={`px-2 py-1 rounded text-[11px] font-bold border cursor-pointer ${
                            botDifficulty === d.id
                              ? 'bg-amber-500 text-slate-950 border-amber-200'
                              : 'bg-[#0b1324] text-slate-300 border-slate-600'
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => handleOpenReplayTheater('playing')}
                className="w-full py-2.5 rounded-xl bg-[#0c263b] hover:bg-[#123857] border-2 border-cyan-500/80 text-cyan-200 font-display font-bold text-sm cursor-pointer"
              >
                3D MAÇ TEKRARINI İZLE
              </button>

              <button
                type="button"
                onClick={() => {
                  setPauseSettingsOpen(false);
                  document.body.dataset.state = 'title';
                  setGameState('title');
                }}
                className="w-full py-2.5 rounded-xl bg-rose-950/90 hover:bg-rose-900 border-2 border-rose-500 text-rose-100 font-display font-bold text-sm cursor-pointer"
              >
                MAÇTAN AYRIL (ANA MENÜYE DÖN)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. GAMEOVER / VICTORY / DEFEAT MODAL (Never triggers on 2-2 tie; only after Golden Goal or strict lead!) */}
      {gameState === 'gameover' && endSnapshot && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="gameover-modal-title"
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4"
        >
          <div className="w-full max-w-md bg-[#0b1324] border-2 border-slate-500/90 rounded-2xl p-6 space-y-5 shadow-2xl">
            <div>
              <div
                className={`text-xs font-bold tracking-widest ${
                  endSnapshot.outcome === 'victory' ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {endSnapshot.outcome === 'victory'
                  ? endSnapshot.isGoldenGoal
                    ? 'UZATMA ALTIN GOL · ZAFER!'
                    : 'MAÇ SONUCU · ZAFER!'
                  : endSnapshot.isGoldenGoal
                  ? 'UZATMA ALTIN GOL · MAĞLUBİYET'
                  : 'MAÇ SONUCU · MAĞLUBİYET'}
              </div>
              <h2
                id="gameover-modal-title"
                className="font-display font-bold text-3xl text-white mt-1"
              >
                Mavi {endSnapshot.blueScore} - {endSnapshot.orangeScore} Turuncu
              </h2>
            </div>

            <div className="grid grid-cols-3 gap-2.5 bg-[#121e36] p-3.5 rounded-xl border-2 border-slate-600 font-mono-tabular text-center">
              <div>
                <div className="text-[11px] text-slate-300">MMR DEĞİŞİMİ</div>
                <div
                  className={`text-lg font-bold ${
                    endSnapshot.mmrDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {endSnapshot.mmrDelta >= 0
                    ? `+${endSnapshot.mmrDelta}`
                    : endSnapshot.mmrDelta}{' '}
                  ({endSnapshot.newMmr})
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-300">ÖDÜL KREDİ</div>
                <div className="text-lg font-bold text-amber-400">
                  +{endSnapshot.earnedCredits} CR
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-300">SEZON XP</div>
                <div className="text-lg font-bold text-cyan-400">
                  +{endSnapshot.earnedXp} XP
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => handleOpenReplayTheater('gameover')}
                className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-display font-bold text-sm cursor-pointer"
              >
                3D MAÇ TEKRARINI İZLE
              </button>
              <button
                type="button"
                data-start="true"
                onClick={() => launchArenaMatchNow()}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-sm cursor-pointer"
              >
                TEKRAR OYNA
              </button>
              <button
                type="button"
                onClick={() => {
                  document.body.dataset.state = 'title';
                  setGameState('title');
                }}
                className="w-full py-2.5 rounded-xl bg-[#162440] hover:bg-slate-700 border border-slate-500 text-slate-100 font-display font-semibold text-sm cursor-pointer"
              >
                LOBİ, GARAJ & PAZARA DÖN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MANDATORY USER CONFIRMATION MODAL FOR GMAIL SENDING */}
      {pendingEmail && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-email-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          <div className="w-full max-w-md bg-[#0b1324] border-2 border-slate-500/90 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div>
              <div className="text-xs font-bold tracking-widest text-amber-400">
                KULLANICI ONAYI GEREKLİ
              </div>
              <h2
                id="confirm-email-title"
                className="font-display font-bold text-xl text-white mt-1"
              >
                Gmail Üzerinden E-posta Gönderilsin mi?
              </h2>
            </div>

            <div className="bg-[#121e36] border border-slate-600 rounded-xl p-3 text-xs space-y-1.5 text-slate-200">
              <div>
                <span className="text-slate-400">Alıcı: </span>
                <span className="font-mono-tabular text-white">{pendingEmail.to}</span>
              </div>
              <div>
                <span className="text-slate-400">Konu: </span>
                <span className="text-white font-medium">{pendingEmail.subject}</span>
              </div>
              <div className="pt-1 border-t border-slate-700 text-slate-300 whitespace-pre-wrap max-h-28 overflow-y-auto">
                {pendingEmail.bodyText}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPendingEmail(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 cursor-pointer"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleConfirmSendGmail}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-xs font-display font-bold text-slate-950 cursor-pointer"
              >
                Onayla ve Gönder
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
