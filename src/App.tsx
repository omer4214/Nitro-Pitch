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
  ControlBindings,
  CrossPlatformNetwork,
  DEFAULT_CONTROL_BINDINGS,
  DEFAULT_MOBILE_CONTROLS_CONFIG,
  GameMode,
  MARKET_CATALOG,
  MobileControlsConfig,
  ReplayEventMarker,
  ReplayFrame,
  calculateMmrDelta,
  calculateSeasonLevel,
  captureReplayFrame,
  claimSeasonTierReward,
  createInitialArenaState,
  formatKeyBindingLabel,
  getRankTierFromMmr,
  purchaseMarketItem,
  stepArenaPhysics
} from './game/rules';
import { soundEngine } from './game/sound';
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
  googleSignIn,
  initAuth,
  logout,
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
  mmr: 0,
  rankTier: 'Bronz I',
  credits: 0,
  seasonXp: 0,
  seasonLevel: 1,
  wins: 0,
  matchesPlayed: 0,
  goalsScored: 0,
  equippedBodyColor: '#06B6D4',
  equippedFinish: 'anodized',
  equippedBoostColor: '#F59E0B',
  equippedWheelStyle: 'aero_apex',
  ownedItemIds: [
    'body_octane_cyan',
    'finish_anodized',
    'boost_solar_flare',
    'wheel_aero_apex'
  ],
  claimedSeasonTiers: []
};

const CONTROLS_STORAGE_KEY = 'nitro_pitch_controls_v2';
const MOBILE_CONFIG_STORAGE_KEY = 'nitro_pitch_mobile_cfg_v2';
const ZERO_INIT_STORAGE_KEY = 'nitro_pitch_zero_init_v2';

function loadSavedControlBindings(): ControlBindings {
  if (typeof window === 'undefined') return { ...DEFAULT_CONTROL_BINDINGS };
  try {
    const raw = window.localStorage.getItem(CONTROLS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CONTROL_BINDINGS };
    const parsed = JSON.parse(raw) as Partial<ControlBindings>;
    return {
      ...DEFAULT_CONTROL_BINDINGS,
      ...parsed
    };
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

function generateInitialHighlightReplay(profile: PlayerProfileData): {
  frames: ReplayFrame[];
  events: ReplayEventMarker[];
} {
  const simArena = createInitialArenaState('1v1', {
    displayName: profile.displayName,
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

  const [selectedMode, setSelectedMode] = useState<GameMode>('1v1');
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>('pro');
  const [practiceBotEnabled, setPracticeBotEnabled] = useState<boolean>(true);
  const [selectedPlatform, setSelectedPlatform] = useState<CrossPlatformNetwork>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'MOBILE_TOUCH';
    }
    return 'PC_STEAM_EPIC';
  });

  const [profile, setProfile] = useState<PlayerProfileData>(ZERO_START_PROFILE);
  const [controlBindings, setControlBindings] = useState<ControlBindings>(
    loadSavedControlBindings
  );
  const [mobileConfig, setMobileConfig] = useState<MobileControlsConfig>(
    loadSavedMobileConfig
  );
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

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [needsGmailAuth, setNeedsGmailAuth] = useState(true);
  const [gmailMessages, setGmailMessages] = useState<GmailSummaryMessage[]>([]);
  const [gmailLoading, setGmailLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [ballCam, setBallCam] = useState(true);
  const [muted, setMuted] = useState(false);
  const [showTouchControls, setShowTouchControls] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  const [endSnapshot, setEndSnapshot] = useState<EndOfMatchSnapshot | null>(null);
  const [pendingEmail, setPendingEmail] = useState<PendingEmailConfirmation | null>(null);

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
    createInitialArenaState('1v1', {
      displayName: ZERO_START_PROFILE.displayName,
      bodyColor: ZERO_START_PROFILE.equippedBodyColor,
      finish: ZERO_START_PROFILE.equippedFinish,
      boostColor: ZERO_START_PROFILE.equippedBoostColor,
      wheelStyle: ZERO_START_PROFILE.equippedWheelStyle,
      platform: 'PC_STEAM_EPIC',
      botDifficulty: 'pro',
      practiceBotEnabled: true
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

  // Mirror gameState to document.body.dataset.state per Game Shell contract
  useEffect(() => {
    document.body.dataset.state = gameState;
  }, [gameState]);

  // Auto-enable touch controls when viewport is mobile-sized or platform is MOBILE_TOUCH
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
    }, 4000);
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

  const handleResetProfileToZero = useCallback(async () => {
    const zeroed: PlayerProfileData = {
      ...ZERO_START_PROFILE,
      uid: profile.uid,
      displayName: profile.displayName
    };
    setProfile(zeroed);
    setMatchHistory([]);
    soundEngine.playUiConfirm();
    showNotice('Tüm ilerleme, kredi, MMR ve istatistikler sıfırlandı (Yeni Başlangıç)!');

    if (isAuthenticated && profile.uid !== 'local_pilot') {
      try {
        await resetPlayerProfileToZeroInFirestore(profile.uid);
      } catch (err) {
        console.error('Zero reset sync error:', err);
      }
    }
  }, [isAuthenticated, profile.displayName, profile.uid, showNotice]);

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
          let loadedProfile = await ensurePlayerProfile(user, ZERO_START_PROFILE);
          const alreadyZeroInited =
            typeof window !== 'undefined' &&
            window.localStorage.getItem(ZERO_INIT_STORAGE_KEY) === '1';
          if (!alreadyZeroInited) {
            if (typeof window !== 'undefined') {
              window.localStorage.setItem(ZERO_INIT_STORAGE_KEY, '1');
            }
            await resetPlayerProfileToZeroInFirestore(user.uid);
            loadedProfile = {
              ...ZERO_START_PROFILE,
              uid: user.uid,
              displayName: loadedProfile.displayName
            };
          }
          setProfile(loadedProfile);
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
        setIsAuthenticated(false);
        setNeedsGmailAuth(true);
      }
    );

    return () => {
      unsubscribeAuth();
      if (unsubscribeMatches) unsubscribeMatches();
    };
  }, []);

  const handleStartMatchWithMode = useCallback(
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

      arenaStateRef.current = createInitialArenaState(modeToUse, {
        displayName: profile.displayName,
        bodyColor: profile.equippedBodyColor,
        finish: profile.equippedFinish,
        boostColor: profile.equippedBoostColor,
        wheelStyle: profile.equippedWheelStyle,
        platform: selectedPlatform,
        botDifficulty: diffToUse,
        practiceBotEnabled: practiceBotToUse
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
    [botDifficulty, practiceBotEnabled, profile, selectedMode, selectedPlatform]
  );

  const handleStartMatch = useCallback(() => {
    handleStartMatchWithMode();
  }, [handleStartMatchWithMode]);

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

      if (gameState === 'title' && e.code === 'Enter') {
        e.preventDefault();
        handleStartMatch();
      } else if (gameState === 'title' && e.code === 'KeyH') {
        setDockCollapsed((prev) => !prev);
      } else if (e.code === 'KeyM') {
        setMuted((prev) => {
          const next = !prev;
          soundEngine.setMuted(next);
          return next;
        });
      } else if (gameState === 'playing' && e.code === 'KeyR') {
        handleStartMatch();
      } else if (gameState === 'playing' && e.code === 'KeyV') {
        handleOpenReplayTheater('playing');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [gameState, handleOpenReplayTheater, handleStartMatch]);

  const handleMatchFinished = useCallback(
    (finalArena: ArenaState) => {
      const pCar = finalArena.cars[0];
      const won = finalArena.blueScore >= finalArena.orangeScore;
      const mmrDelta = calculateMmrDelta(
        profile.mmr,
        profile.mmr + 15,
        finalArena.blueScore,
        finalArena.orangeScore === finalArena.blueScore
          ? finalArena.blueScore - 1
          : finalArena.orangeScore
      );
      const earnedCredits =
        (won ? 180 : 90) +
        (pCar ? pCar.goals * 40 + pCar.saves * 25 + pCar.demolitions * 20 : 0);
      const earnedXp =
        (won ? 450 : 250) + (pCar ? pCar.goals * 80 + pCar.demolitions * 35 : 0);

      const newMmr = Math.max(0, profile.mmr + mmrDelta);
      const newRankTier = getRankTierFromMmr(newMmr).tierName;
      const newXp = profile.seasonXp + earnedXp;
      const newSeasonLevel = calculateSeasonLevel(newXp).level;
      const newCredits = profile.credits + earnedCredits;
      const newWins = profile.wins + (won ? 1 : 0);
      const newMatches = profile.matchesPlayed + 1;
      const newGoals = profile.goalsScored + (pCar ? pCar.goals : 0);

      setEndSnapshot({
        outcome: won ? 'victory' : 'defeat',
        blueScore: finalArena.blueScore,
        orangeScore: finalArena.orangeScore,
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
        goalsScored: newGoals
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
      showNotice(`${item.name} satın alındı ve garaja eklendi!`);
    } else {
      showNotice(`${item.name} aracınıza kuşanıldı!`);
    }

    const updatedProfile: PlayerProfileData = {
      ...profile,
      credits: updatedCredits,
      ownedItemIds: updatedOwned,
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
        console.error('Season claim sync error:', err);
      }
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setIsAuthenticated(true);
        setUserEmail(result.user.email || null);
        setNeedsGmailAuth(false);
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
        playerCosmetics={{
          bodyColor: profile.equippedBodyColor,
          finish: profile.equippedFinish,
          boostColor: profile.equippedBoostColor,
          wheelStyle: profile.equippedWheelStyle
        }}
      />

      {/* 2. TITLE SCREEN STAGE (Ultra-Compact Mobile & High-Contrast Bounded Desktop Panels) */}
      {gameState === 'title' && (
        <div className="fixed inset-0 pointer-events-none z-20 flex flex-col justify-between p-2 sm:p-6">
          {/* Top Bar Area: Compact Unified Strip on Mobile, Split Cards on Desktop */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-6">
            {/* High-Contrast Bounded Title & Quick Launch Panel */}
            <div className="pointer-events-auto w-full sm:w-auto sm:max-w-lg bg-[#0b1324] border-2 border-slate-500 rounded-xl sm:rounded-2xl p-2 sm:p-4 shadow-2xl space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3">
                  <svg
                    viewBox="0 0 64 64"
                    className="w-8 h-8 sm:w-12 sm:h-12 shrink-0"
                    aria-label="Nitro Pitch Amblemi"
                  >
                    <polygon
                      points="32,4 58,16 52,48 32,60 12,48 6,16"
                      fill="#09101f"
                      stroke="#06b6d4"
                      strokeWidth="3"
                    />
                    <polygon
                      points="32,12 49,21 44,43 32,51 20,43 15,21"
                      fill="#0e1b33"
                      stroke="#f59e0b"
                      strokeWidth="1.5"
                    />
                    <circle cx="32" cy="31" r="10" fill="#f59e0b" />
                    <path
                      d="M24 31 L40 31 M32 23 L32 39"
                      stroke="#09101f"
                      strokeWidth="2.5"
                    />
                  </svg>

                  <div>
                    <h1 className="font-display font-bold text-base sm:text-3xl tracking-tight text-white leading-none">
                      NITRO PITCH
                    </h1>
                    <p className="text-[10px] sm:text-xs text-cyan-300 font-semibold mt-0.5">
                      3D Duvar & Tavan Sürüşlü Roket Futbolu
                    </p>
                  </div>
                </div>

                {/* Mobile inline Pilot / Google Auth Badge */}
                <div className="sm:hidden shrink-0">
                  {!isAuthenticated ? (
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      className="px-2.5 py-1.5 rounded-lg bg-[#162440] border border-slate-400 text-[10px] font-bold text-white cursor-pointer"
                    >
                      Google Giriş
                    </button>
                  ) : (
                    <div className="bg-[#121e36] border border-slate-500 rounded-lg px-2 py-1 text-right">
                      <div className="text-[10px] font-bold text-white">{profile.displayName}</div>
                      <div className="text-[9px] text-cyan-300 font-mono-tabular">
                        {profile.credits} CR
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  data-start="true"
                  onClick={handleStartMatch}
                  className="px-1.5 py-2 sm:px-5 sm:py-2.5 rounded-lg sm:rounded-xl bg-amber-500 hover:bg-amber-400 border-2 border-amber-200 text-slate-950 font-display font-bold text-[10px] sm:text-sm tracking-wide shadow-lg transition-transform active:scale-95 whitespace-nowrap cursor-pointer text-center"
                >
                  <span className="sm:hidden">BAŞLA ({selectedMode.toUpperCase()})</span>
                  <span className="hidden sm:inline">MAÇA BAŞLA ({selectedMode.toUpperCase()})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedMode('practice');
                    handleStartMatchWithMode('practice');
                  }}
                  className="px-1.5 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl bg-[#13203a] border-2 border-slate-500 hover:border-cyan-400 text-white font-display font-bold text-[10px] sm:text-xs tracking-wide transition-colors whitespace-nowrap cursor-pointer text-center"
                >
                  <span className="sm:hidden">ANTRENMAN</span>
                  <span className="hidden sm:inline">
                    ANTRENMAN ({practiceBotEnabled ? 'BOTLU' : 'SERBEST'})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenReplayTheater('title')}
                  className="px-1.5 py-2 sm:px-3.5 sm:py-2.5 rounded-lg sm:rounded-xl bg-[#0c263b] border-2 border-cyan-400 text-cyan-100 font-display font-bold text-[10px] sm:text-xs tracking-wide transition-colors whitespace-nowrap cursor-pointer text-center"
                >
                  <span className="sm:hidden">TEKRAR İZLE</span>
                  <span className="hidden sm:inline">MAÇ TEKRARI</span>
                </button>
              </div>

              {/* Bounded High-Contrast Control Summary Strip (Desktop Only) */}
              <div className="hidden sm:block bg-[#121e36] border border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-medium">
                PC: WASD Sürüş · {formatKeyBindingLabel(controlBindings.jump)} Zıpla/Takla ·{' '}
                {formatKeyBindingLabel(controlBindings.boost)} Turbo | Mobil: Analog Joystick + Özelleştirilebilir Tuşlar
              </div>
            </div>

            {/* Top-Right Google Sign-In / Pilot Status (Desktop Only) */}
            <div className="hidden sm:flex pointer-events-auto flex-col items-end gap-2 shrink-0">
              {!isAuthenticated ? (
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="gsi-material-button"
                >
                  <div className="gsi-material-button-state" />
                  <div className="gsi-material-button-content-wrapper">
                    <div className="gsi-material-button-icon">
                      <svg
                        version="1.1"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 48 48"
                        className="block"
                      >
                        <path
                          fill="#EA4335"
                          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                        />
                        <path
                          fill="#4285F4"
                          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                        />
                        <path
                          fill="#34A853"
                          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                        />
                        <path fill="none" d="M0 0h48v48H0z" />
                      </svg>
                    </div>
                    <span className="gsi-material-button-contents">Sign in with Google</span>
                  </div>
                </button>
              ) : (
                <div className="bg-[#0b1324] border-2 border-slate-500/90 rounded-xl px-3 py-2 text-right shadow-2xl">
                  <div className="text-xs font-bold text-white">{profile.displayName}</div>
                  <div className="text-[11px] text-cyan-300 font-mono-tabular">
                    {profile.rankTier} · {profile.credits} CR
                  </div>
                </div>
              )}
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
            selectedPlatform={selectedPlatform}
            setSelectedPlatform={setSelectedPlatform}
            botDifficulty={botDifficulty}
            setBotDifficulty={setBotDifficulty}
            practiceBotEnabled={practiceBotEnabled}
            setPracticeBotEnabled={setPracticeBotEnabled}
            controlBindings={controlBindings}
            onUpdateControlBindings={handleUpdateControlBindings}
            onResetControlBindings={handleResetControlBindings}
            mobileConfig={mobileConfig}
            onUpdateMobileConfig={handleUpdateMobileConfig}
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
            onStartMatch={handleStartMatch}
            onGoogleLogin={handleGoogleLogin}
            onLogout={handleLogout}
            onPurchaseOrEquip={handlePurchaseOrEquip}
            onCreateMarketListing={handleCreateMarketListing}
            onClaimSeasonTier={handleClaimSeasonTier}
            onRefreshGmail={handleRefreshGmail}
            onRequestSendGmail={(to, subject, bodyText) => {
              setPendingEmail({ to, subject, bodyText });
            }}
          />
        </div>
      )}

      {/* 3. PLAYING HUD (Clean: Menu button, Scoreboard, Camera button, Telemetry, Joystick/Action buttons) */}
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
              handleStartMatch();
            }
          }}
          onExitToLobby={() => {
            document.body.dataset.state = 'title';
            setGameState('title');
          }}
        />
      )}

      {/* 4. IN-MATCH MENU MODAL (Maça Devam Et, Ayarlar, Maçtan Ayrıl) */}
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
                  MAÇ MENÜSÜ
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
                onClick={() => {
                  setMuted((prev) => {
                    const next = !prev;
                    soundEngine.setMuted(next);
                    return next;
                  });
                }}
                className="px-3 py-1.5 rounded-lg bg-[#162440] border border-slate-500 text-xs font-bold text-slate-200 cursor-pointer"
              >
                {muted ? 'Ses: Kapalı' : 'Ses: Açık'}
              </button>
            </div>

            {/* Primary Menu Actions: Maça Devam Et, Ayarlar, Maçtan Ayrıl */}
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

              {/* Expandable In-Match Settings Panel */}
              {pauseSettingsOpen && (
                <div className="bg-[#121e36] border-2 border-slate-600 rounded-xl p-3 space-y-3 text-xs">
                  {/* Touch Controls Visibility + Joystick vs Buttons */}
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

                  {/* Mobile Button Position Adjuster inside Match Menu */}
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

                  {/* Bot Difficulty & Practice Bot Toggle */}
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

      {/* 5. GAMEOVER / VICTORY / DEFEAT MODAL */}
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
                  ? 'MAÇ SONUCU · ZAFER!'
                  : 'MAÇ SONUCU · MÜCADELE TAMAMLANDI'}
              </div>
              <h2
                id="gameover-modal-title"
                className="font-display font-bold text-3xl text-white mt-1"
              >
                {endSnapshot.blueScore} - {endSnapshot.orangeScore}
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
                onClick={handleStartMatch}
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
                GARAJ & PAZARA DÖN
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
