import React, { useEffect, useState } from 'react';
import {
  BLUEPRINT_CATALOG,
  BotDifficulty,
  ControlBindings,
  CrossPlatformNetwork,
  DEFAULT_MOBILE_CONTROLS_CONFIG,
  GameMode,
  GarageFocusTarget,
  GeneralSettingsState,
  GraphicsSettingsState,
  MARKET_CATALOG,
  MISSION_CATALOG,
  MarketItem,
  MissionDef,
  MobileButtonOffset,
  MobileControlsConfig,
  PlayerRegion,
  PlaylistCategory,
  REGIONS_CATALOG,
  SEASON_REWARDS,
  calculateSeasonLevel,
  formatKeyBindingLabel,
  getRankTierFromMmr
} from '../game/rules';
import { AudioSettingsState } from '../game/sound';
import {
  MarketOrderData,
  MatchRecordData,
  PlayerProfileData
} from '../services/firebaseService';
import { GmailSummaryMessage } from '../services/gmailService';

export type HubTab = 'lobby' | 'garage' | 'market' | 'missions' | 'settings' | 'gmail';

interface BottomHubDockProps {
  activeTab: HubTab;
  setActiveTab: (tab: HubTab) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  selectedMode: GameMode;
  setSelectedMode: (mode: GameMode) => void;
  playlistCategory: PlaylistCategory;
  setPlaylistCategory: (cat: PlaylistCategory) => void;
  selectedPlatform: CrossPlatformNetwork;
  setSelectedPlatform: (plat: CrossPlatformNetwork) => void;
  botDifficulty: BotDifficulty;
  setBotDifficulty: (diff: BotDifficulty) => void;
  practiceBotEnabled: boolean;
  setPracticeBotEnabled: (enabled: boolean) => void;
  garageFocusTarget: GarageFocusTarget;
  onChangeGarageFocus: (target: GarageFocusTarget) => void;
  controlBindings: ControlBindings;
  onUpdateControlBindings: (next: ControlBindings) => void;
  onResetControlBindings: () => void;
  mobileConfig: MobileControlsConfig;
  onUpdateMobileConfig: (next: MobileControlsConfig) => void;
  graphicsSettings: GraphicsSettingsState;
  onUpdateGraphicsSettings: (next: GraphicsSettingsState) => void;
  generalSettings: GeneralSettingsState;
  onUpdateGeneralSettings: (next: GeneralSettingsState) => void;
  audioSettings: AudioSettingsState;
  onUpdateAudioSettings: (next: AudioSettingsState) => void;
  onOpenLogoPickerModal: () => void;
  onOpenAccountModal: () => void;
  onResetProfileToZero: () => void;
  onOpenReplay: () => void;
  hasReplayFrames: boolean;
  profile: PlayerProfileData;
  matchHistory: MatchRecordData[];
  marketOrders: MarketOrderData[];
  userEmail: string | null;
  isAuthenticated: boolean;
  needsGmailAuth: boolean;
  gmailMessages: GmailSummaryMessage[];
  gmailLoading: boolean;
  statusMessage: string | null;
  onStartMatch: () => void;
  onGoogleLogin: () => void;
  onLogout: () => void;
  onPurchaseOrEquip: (itemId: string) => void;
  onBuildBlueprint: (blueprintId: string) => void;
  onExecuteTradeIn: (selectedIds: string[], tradeMode: 'items' | 'blueprints') => void;
  onClaimMissionReward: (mission: MissionDef) => void;
  onOpenCrate: () => void;
  onCreateMarketListing: (itemId: string, price: number) => void;
  onClaimSeasonTier: (tier: number) => void;
  onRefreshGmail: () => void;
  onRequestSendGmail: (to: string, subject: string, body: string) => void;
}

export const BINDING_FIELDS: Array<{ key: keyof ControlBindings; label: string }> = [
  { key: 'forward', label: 'İleri Gaz' },
  { key: 'backward', label: 'Geri & Takla' },
  { key: 'left', label: 'Sola Dön' },
  { key: 'right', label: 'Sağa Dön' },
  { key: 'jump', label: 'Zıpla & Takla' },
  { key: 'boost', label: 'Turbo & Patlat' },
  { key: 'drift', label: 'Drift / Kayma' },
  { key: 'flyUp', label: 'Tavan Uçuşu' }
];

export const MOBILE_BUTTON_TARGETS: Array<{
  key: 'flyUp' | 'boost' | 'jump' | 'drift' | 'joystick';
  label: string;
}> = [
  { key: 'flyUp', label: 'Uçuş (Tavan) Tuşu' },
  { key: 'boost', label: 'Turbo / Patlatma Tuşu' },
  { key: 'jump', label: 'Zıplama & Takla Tuşu' },
  { key: 'drift', label: 'Drift / Kayma Tuşu' },
  { key: 'joystick', label: 'Sol Joystick / Yön Alanı' }
];

/**
 * Renders a visual preview SVG for any MarketItem or BlueprintItem so players see how
 * cars, body colors, surface finishes, wheels, and nitro flames look right in the Market!
 */
export const ItemVisualPreview: React.FC<{
  category: MarketItem['category'];
  value: string;
  rarity: MarketItem['rarity'];
}> = ({ category, value, rarity }) => {
  const borderAccent =
    rarity === 'BlackMarket'
      ? '#f43f5e'
      : rarity === 'Exotic'
      ? '#f59e0b'
      : rarity === 'Import'
      ? '#ec4899'
      : rarity === 'Rare'
      ? '#38bdf8'
      : '#64748b';

  return (
    <svg
      viewBox="0 0 96 48"
      className="w-full h-11 rounded-md bg-[#070e1c] border border-slate-700/90 shrink-0"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`grad_${category}_${value}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
      </defs>
      <rect width="96" height="48" fill={`url(#grad_${category}_${value})`} />
      <line x1="0" y1="45" x2="96" y2="45" stroke={borderAccent} strokeWidth="3" />

      {category === 'carModel' && (
        <g>
          {value === 'dominus' ? (
            <>
              {/* Flat wide muscle car silhouette */}
              <polygon
                points="14,32 26,21 62,20 82,27 84,34 14,34"
                fill="#06b6d4"
                stroke="#e2e8f0"
                strokeWidth="1.5"
              />
              <polygon points="30,22 56,21 64,27 26,27" fill="#09101f" />
            </>
          ) : value === 'fennec' ? (
            <>
              {/* Boxy rally hatchback silhouette */}
              <polygon
                points="18,34 20,17 56,17 78,26 80,34"
                fill="#f59e0b"
                stroke="#e2e8f0"
                strokeWidth="1.5"
              />
              <polygon points="25,19 52,19 64,26 24,26" fill="#09101f" />
            </>
          ) : (
            <>
              {/* Octane Z-GT aerodynamic buggy silhouette */}
              <polygon
                points="16,34 22,22 48,16 78,27 80,34"
                fill="#38bdf8"
                stroke="#e2e8f0"
                strokeWidth="1.5"
              />
              <polygon points="32,19 52,19 64,26 28,26" fill="#09101f" />
              <polygon points="14,17 22,17 20,24 14,22" fill="#f59e0b" />
            </>
          )}
          <circle cx="28" cy="34" r="6.5" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
          <circle cx="68" cy="34" r="6.5" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
        </g>
      )}

      {category === 'bodyColor' && (
        <g>
          <polygon
            points="16,34 24,20 54,18 78,27 80,34"
            fill={value}
            stroke="#ffffff"
            strokeWidth="1.5"
          />
          <polygon points="30,20 52,20 62,26 28,26" fill="#09101f" />
          <circle cx="28" cy="34" r="6" fill="#0f172a" stroke="#cbd5e1" strokeWidth="2" />
          <circle cx="66" cy="34" r="6" fill="#0f172a" stroke="#cbd5e1" strokeWidth="2" />
        </g>
      )}

      {category === 'finish' && (
        <g>
          <rect
            x="16"
            y="9"
            width="64"
            height="28"
            rx="6"
            fill={
              value === 'chrome'
                ? '#e2e8f0'
                : value === 'titanium'
                ? '#94a3b8'
                : value === 'carbon'
                ? '#1e293b'
                : '#06b6d4'
            }
            stroke="#f8fafc"
            strokeWidth="1.5"
          />
          <line x1="24" y1="35" x2="48" y2="11" stroke="rgba(255,255,255,0.65)" strokeWidth="4" />
          <line x1="44" y1="35" x2="68" y2="11" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
        </g>
      )}

      {category === 'wheelStyle' && (
        <g>
          <circle cx="48" cy="23" r="15" fill="#09101f" stroke="#94a3b8" strokeWidth="3" />
          <circle
            cx="48"
            cy="23"
            r="10"
            fill="none"
            stroke={
              value === 'turbine_gold'
                ? '#f59e0b'
                : value === 'cyber_blade'
                ? '#06b6d4'
                : '#e2e8f0'
            }
            strokeWidth="2.5"
            strokeDasharray={value === 'cyber_blade' ? '6 3' : 'none'}
          />
          <line
            x1="38"
            y1="23"
            x2="58"
            y2="23"
            stroke={value === 'turbine_gold' ? '#f59e0b' : '#38bdf8'}
            strokeWidth="2.5"
          />
          <line
            x1="48"
            y1="13"
            x2="48"
            y2="33"
            stroke={value === 'turbine_gold' ? '#f59e0b' : '#38bdf8'}
            strokeWidth="2.5"
          />
          <circle cx="48" cy="23" r="3.5" fill="#f43f5e" />
        </g>
      )}

      {category === 'boostColor' && (
        <g>
          <rect x="12" y="18" width="16" height="10" rx="2" fill="#334155" stroke="#94a3b8" />
          <polygon points="28,16 84,10 72,23 86,27 68,31 82,37 28,30" fill={value} opacity="0.9" />
          <polygon points="28,20 66,18 58,23 68,26 28,26" fill="#ffffff" opacity="0.85" />
        </g>
      )}
    </svg>
  );
};

export const BottomHubDock: React.FC<BottomHubDockProps> = ({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
  selectedMode,
  setSelectedMode,
  playlistCategory,
  setPlaylistCategory,
  selectedPlatform,
  setSelectedPlatform,
  botDifficulty,
  setBotDifficulty,
  practiceBotEnabled,
  setPracticeBotEnabled,
  garageFocusTarget,
  onChangeGarageFocus,
  controlBindings,
  onUpdateControlBindings,
  onResetControlBindings,
  mobileConfig,
  onUpdateMobileConfig,
  graphicsSettings,
  onUpdateGraphicsSettings,
  generalSettings,
  onUpdateGeneralSettings,
  audioSettings,
  onUpdateAudioSettings,
  onOpenLogoPickerModal,
  onOpenAccountModal,
  onResetProfileToZero,
  onOpenReplay,
  hasReplayFrames,
  profile,
  marketOrders,
  userEmail,
  isAuthenticated,
  needsGmailAuth,
  gmailMessages,
  gmailLoading,
  statusMessage,
  onStartMatch,
  onGoogleLogin,
  onLogout,
  onPurchaseOrEquip,
  onBuildBlueprint,
  onExecuteTradeIn,
  onClaimMissionReward,
  onOpenCrate,
  onCreateMarketListing,
  onClaimSeasonTier,
  onRefreshGmail,
  onRequestSendGmail
}) => {
  // Garage & Market sub-states
  const [garageSlotFilter, setGarageSlotFilter] = useState<
    'carModel' | 'bodyColor' | 'finish' | 'wheelStyle' | 'boostColor'
  >('carModel');
  const [marketSubTab, setMarketSubTab] = useState<'catalog' | 'trade_blueprints'>('catalog');
  const [marketCategory, setMarketCategory] = useState<
    'all' | 'carModel' | 'bodyColor' | 'finish' | 'boostColor' | 'wheelStyle'
  >('all');
  const [tradeMode, setTradeMode] = useState<'items' | 'blueprints'>('items');
  const [selectedTradeIds, setSelectedTradeIds] = useState<string[]>([]);

  // Missions & Season sub-state
  const [missionSubTab, setMissionSubTab] = useState<
    'competitive' | 'training' | 'season' | 'pass'
  >('competitive');

  // Rocket League 4-Category Settings sub-state
  const [settingsCategory, setSettingsCategory] = useState<
    'controls' | 'general' | 'graphics' | 'audio'
  >('controls');

  const [listingItemId, setListingItemId] = useState<string>('body_octane_cyan');
  const [listingPrice, setListingPrice] = useState<string>('300');
  const [listeningField, setListeningField] = useState<keyof ControlBindings | null>(null);
  const [selectedMobileBtn, setSelectedMobileBtn] = useState<
    'flyUp' | 'boost' | 'jump' | 'drift' | 'joystick'
  >('flyUp');

  const [emailTo, setEmailTo] = useState<string>(userEmail || '03celikomer@gmail.com');
  const [emailSubject, setEmailSubject] = useState<string>(
    'Nitro Pitch Dereceli Maç Raporu & Lobi Daveti'
  );
  const [emailBody, setEmailBody] = useState<string>(
    `Merhaba Pilot,\n\nNitro Pitch 3D Arena'da güncel derecem: ${profile.rankTier} (${profile.mmr} MMR).\nBölge: ${generalSettings.region} | Toplam Galibiyet: ${profile.wins} | Gol: ${profile.goalsScored}.\n3v3 veya 2v2 Çapraz Platform dereceli maç için lobime katıl!`
  );

  // Capture key press or mouse button when rebinding a PC control
  useEffect(() => {
    if (!listeningField) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === 'Escape') {
        setListeningField(null);
        return;
      }
      onUpdateControlBindings({
        ...controlBindings,
        [listeningField]: e.code
      });
      setListeningField(null);
    };

    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const code =
        e.button === 0
          ? 'MouseLeft'
          : e.button === 2
          ? 'MouseRight'
          : e.button === 1
          ? 'MouseMiddle'
          : null;
      if (code) {
        onUpdateControlBindings({
          ...controlBindings,
          [listeningField]: code
        });
        setListeningField(null);
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('mousedown', handleMouseDown, true);
    window.addEventListener('contextmenu', handleContextMenu, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('mousedown', handleMouseDown, true);
      window.removeEventListener('contextmenu', handleContextMenu, true);
    };
  }, [listeningField, controlBindings, onUpdateControlBindings]);

  const rankInfo = getRankTierFromMmr(profile.mmr);
  const seasonInfo = calculateSeasonLevel(profile.seasonXp);
  const activeRegionInfo =
    REGIONS_CATALOG.find((r) => r.id === (profile.region || generalSettings.region)) ||
    REGIONS_CATALOG[0];

  const filteredMarketCatalog = MARKET_CATALOG.filter((item) =>
    marketCategory === 'all' ? true : item.category === marketCategory
  );

  const garageItems = MARKET_CATALOG.filter(
    (item) => item.category === garageSlotFilter && profile.ownedItemIds.includes(item.id)
  );

  const currentMobileOffset: MobileButtonOffset = mobileConfig[selectedMobileBtn];

  const updateSelectedMobileOffset = (patch: Partial<MobileButtonOffset>) => {
    onUpdateMobileConfig({
      ...mobileConfig,
      [selectedMobileBtn]: {
        ...currentMobileOffset,
        ...patch
      }
    });
  };

  const toggleTradeSelection = (id: string) => {
    setSelectedTradeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const getMissionProgressValue = (metric: MissionDef['metric']): number => {
    switch (metric) {
      case 'matches':
        return profile.matchesPlayed;
      case 'goals':
        return profile.goalsScored;
      case 'wins':
        return profile.wins;
      case 'saves':
        return profile.savesMade || 0;
      case 'demolitions':
        return profile.demolitionsCount || 0;
      case 'practice_shots':
      default:
        return profile.shotsTaken || 0;
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-1.5 sm:bottom-4 z-30 flex justify-center pointer-events-none px-1.5 sm:px-4">
      <div className="w-full max-w-[1000px] pointer-events-auto">
        {/* Top Tab Strip + Collapse Toggle (EXE & APK removed from in-game menu per user request) */}
        <div className="flex items-center justify-between gap-1 mb-1 sm:mb-1.5 bg-[#0b1324] border-2 border-slate-500/90 rounded-xl p-1 sm:p-1.5 shadow-2xl">
          <div className="flex items-center gap-1 overflow-x-auto">
            {(
              [
                { id: 'lobby', label: 'Lobi & Turnuva' },
                { id: 'garage', label: 'Garaj (3D Odak)' },
                { id: 'market', label: 'Pazar & Takas' },
                {
                  id: 'missions',
                  label: `Görevler & Kutu (${profile.cratesCount || 0})`
                },
                { id: 'settings', label: 'Ayarlar' },
                { id: 'gmail', label: 'Kulüp' }
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  if (collapsed) setCollapsed(false);
                  if (tab.id === 'garage' && garageFocusTarget === 'overview') {
                    onChangeGarageFocus('body');
                  } else if (tab.id !== 'garage') {
                    onChangeGarageFocus('overview');
                  }
                }}
                className={`px-2 py-1 sm:px-3.5 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-display font-bold tracking-wide transition-colors whitespace-nowrap cursor-pointer border ${
                  activeTab === tab.id && !collapsed
                    ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow'
                    : 'bg-[#13203a] text-slate-200 border-slate-600/80 hover:border-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg bg-[#162440] border border-slate-500 hover:border-cyan-400 text-[10px] sm:text-[11px] font-bold text-slate-100 whitespace-nowrap flex items-center gap-1 cursor-pointer shrink-0"
          >
            <span>{collapsed ? 'Aç' : 'Gizle'}</span>
          </button>
        </div>

        {/* Status Toast Notice */}
        {statusMessage && (
          <div className="mb-1 px-2.5 py-1 rounded-xl bg-[#0c263b] border-2 border-cyan-400 text-cyan-100 text-[11px] font-bold flex items-center justify-between shadow-xl">
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Main Dock Panel Body */}
        {!collapsed && (
          <div className="bg-[#0b1324] border-2 border-slate-500/90 rounded-2xl p-2 sm:p-3.5 shadow-2xl text-slate-100 max-h-[36vh] sm:max-h-[305px] overflow-y-auto">
            {/* TAB 1: LOBBY — COMPETITIVE vs CASUAL, 1v1 / 2v2 / 3v3 / PRACTICE, REGIONAL TOURNAMENT */}
            {activeTab === 'lobby' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2 sm:gap-2.5 items-stretch">
                {/* Col 1: Playlist Category (Rekabetçi vs Normal) + 1v1 / 2v2 / 3v3 / Antrenman (5 cols) */}
                <div className="md:col-span-5 bg-[#121e36] border-2 border-slate-600/90 rounded-xl p-2 flex flex-col justify-between gap-1.5">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between border-b border-slate-600/80 pb-1">
                      <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-cyan-300">
                        1. Lig Türü & Oyun Modu
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setPlaylistCategory('competitive')}
                          className={`px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold border cursor-pointer ${
                            playlistCategory === 'competitive'
                              ? 'bg-amber-500 text-slate-950 border-amber-200'
                              : 'bg-[#0b1324] text-slate-300 border-slate-600'
                          }`}
                        >
                          REKABETÇİ
                        </button>
                        <button
                          type="button"
                          onClick={() => setPlaylistCategory('casual')}
                          className={`px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold border cursor-pointer ${
                            playlistCategory === 'casual'
                              ? 'bg-cyan-500 text-slate-950 border-cyan-200'
                              : 'bg-[#0b1324] text-slate-300 border-slate-600'
                          }`}
                        >
                          NORMAL
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-1">
                      {(
                        [
                          {
                            id: '1v1',
                            title: '1v1',
                            desc: playlistCategory === 'competitive' ? 'Dereceli' : 'Normal'
                          },
                          {
                            id: '2v2',
                            title: '2v2',
                            desc: playlistCategory === 'competitive' ? 'Dereceli' : 'Normal'
                          },
                          {
                            id: '3v3',
                            title: '3v3',
                            desc: playlistCategory === 'competitive' ? 'Standart' : 'Normal'
                          },
                          { id: 'practice', title: 'Antrenman', desc: 'Bot / Serbest' }
                        ] as const
                      ).map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setSelectedMode(m.id)}
                          className={`p-1.5 rounded-lg border-2 text-left transition-colors cursor-pointer ${
                            selectedMode === m.id
                              ? 'bg-[#193254] border-cyan-400 text-white'
                              : 'bg-[#0b1324] border-slate-600/80 text-slate-300 hover:border-slate-400'
                          }`}
                        >
                          <div className="font-display font-bold text-[11px] leading-tight">
                            {m.title}
                          </div>
                          <div className="text-[9px] text-slate-300 truncate">{m.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bot Difficulty & Practice Bot Toggle */}
                  <div className="bg-[#0b1324] border border-slate-600/90 rounded-lg p-1.5 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-bold text-slate-200">
                        Bot Zorluğu:
                      </span>
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
                            onClick={() => setBotDifficulty(d.id)}
                            className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold border cursor-pointer ${
                              botDifficulty === d.id
                                ? 'bg-amber-500 text-slate-950 border-amber-300'
                                : 'bg-[#15223b] text-slate-300 border-slate-600'
                            }`}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-700/80">
                      <span className="text-[10px] text-slate-300">
                        Antrenmanda Bot:
                      </span>
                      <button
                        type="button"
                        onClick={() => setPracticeBotEnabled(!practiceBotEnabled)}
                        className={`px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold border cursor-pointer ${
                          practiceBotEnabled
                            ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                            : 'bg-slate-800 border-slate-600 text-slate-300'
                        }`}
                      >
                        {practiceBotEnabled ? 'AKTİF (BOTLA OYNA)' : 'KAPALI (TEK BAŞINA)'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Col 2: Region Matchmaking & Regional Tournament Card (4 cols) */}
                <div className="md:col-span-4 bg-[#121e36] border-2 border-slate-600/90 rounded-xl p-2 flex flex-col justify-between gap-1.5">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between border-b border-slate-600/80 pb-1">
                      <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-300">
                        2. Bölge ({activeRegionInfo.id}) & Turnuva
                      </span>
                      <button
                        type="button"
                        onClick={onOpenAccountModal}
                        className="text-[9px] font-bold text-cyan-300 underline cursor-pointer"
                      >
                        Bölge/Hesap Değiştir
                      </button>
                    </div>

                    <div className="bg-[#0b1324] border border-slate-600 rounded-lg px-2 py-1.5 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-display font-bold text-xs text-white">
                          {activeRegionInfo.name}
                        </span>
                        <span className="text-[9px] font-mono-tabular text-emerald-300 font-bold">
                          {activeRegionInfo.pingRange}
                        </span>
                      </div>
                      <div className="text-[10px] text-amber-300 font-semibold truncate">
                        {activeRegionInfo.tournamentTitle}
                      </div>
                      <div className="text-[9px] text-slate-300 truncate">
                        Ödül: {activeRegionInfo.tournamentPrize}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-[#0b1324] border border-slate-600 rounded-lg px-2.5 py-1">
                    <div>
                      <div className="font-display font-bold text-xs text-white">
                        {rankInfo.tierName}
                      </div>
                      <div className="text-[9px] text-cyan-300 font-mono-tabular">
                        {profile.mmr} MMR · {profile.wins}G / {profile.matchesPlayed}M
                      </div>
                    </div>
                    <div className="text-right font-mono-tabular">
                      <div className="text-xs font-bold text-amber-400">
                        {profile.credits} CR
                      </div>
                      <div className="text-[9px] text-slate-300">
                        Gol: {profile.goalsScored}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Col 3: Launch Match & Replay Studio (3 cols) */}
                <div className="md:col-span-3 bg-[#121e36] border-2 border-slate-600/90 rounded-xl p-2 flex flex-col justify-between gap-1.5">
                  <div className="space-y-1">
                    <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-300 border-b border-slate-600/80 pb-1">
                      3. Arenaya Gir ({activeRegionInfo.id})
                    </div>
                    <div className="flex items-center justify-between gap-1 bg-[#0b1324] border border-slate-600 rounded-lg p-0.5">
                      {(
                        [
                          { id: 'PC_STEAM_EPIC', label: 'PC' },
                          { id: 'MOBILE_TOUCH', label: 'Mobil' },
                          { id: 'CONSOLE_CROSS', label: 'Konsol' }
                        ] as const
                      ).map((plat) => (
                        <button
                          key={plat.id}
                          type="button"
                          onClick={() => setSelectedPlatform(plat.id)}
                          className={`flex-1 py-0.5 rounded text-[9px] font-bold border transition-colors cursor-pointer ${
                            selectedPlatform === plat.id
                              ? 'bg-cyan-500 text-slate-950 border-cyan-300'
                              : 'bg-[#15223b] text-slate-300 border-slate-600'
                          }`}
                        >
                          {plat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex sm:flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={onStartMatch}
                      className="flex-1 py-1.5 sm:py-2 rounded-xl bg-amber-500 hover:bg-amber-400 border-2 border-amber-200 text-slate-950 font-display font-bold text-xs tracking-wide shadow-lg cursor-pointer"
                    >
                      {selectedMode === 'practice'
                        ? 'ANTRENMANA GİR'
                        : `${playlistCategory === 'competitive' ? 'REKABETÇİ' : 'NORMAL'} ${selectedMode.toUpperCase()} ARA`}
                    </button>
                    <button
                      type="button"
                      onClick={onOpenReplay}
                      className="flex-1 py-1.5 rounded-lg bg-[#0b1324] hover:bg-[#192b4d] border border-cyan-400 text-cyan-200 font-display font-bold text-[10px] sm:text-[11px] cursor-pointer"
                    >
                      {hasReplayFrames ? '3D TEKRARI İZLE' : 'ÖRNEK TEKRAR'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: SEPARATE 3D GARAGE (CAR & PART CAMERA ZOOM FOCUS) */}
            {activeTab === 'garage' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                {/* Col 1: 3D Camera Part-Zoom Selector & Equipped Car Info (4 cols) */}
                <div className="md:col-span-4 bg-[#121e36] border-2 border-slate-600/90 rounded-xl p-2 flex flex-col justify-between gap-2">
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-cyan-300 border-b border-slate-600/80 pb-1">
                      3D Kamera Parça Yakınlaştırma
                    </div>
                    <p className="text-[10px] text-slate-200 leading-snug">
                      Seçtiğiniz parçaya göre 3D garaj kamerası araca ve ilgili parçaya (jant, egzoz, kaput) odaklanır:
                    </p>
                    <div className="grid grid-cols-2 gap-1">
                      {(
                        [
                          {
                            slot: 'carModel',
                            focus: 'body',
                            label: '1. Araba Şasisi'
                          },
                          {
                            slot: 'bodyColor',
                            focus: 'body',
                            label: '2. Gövde Boyası'
                          },
                          {
                            slot: 'finish',
                            focus: 'finish',
                            label: '3. Kaplama Dokusu'
                          },
                          {
                            slot: 'wheelStyle',
                            focus: 'wheels',
                            label: '4. Jant & Tekerlek'
                          },
                          {
                            slot: 'boostColor',
                            focus: 'boost',
                            label: '5. Nitro Egzoz İzi'
                          }
                        ] as const
                      ).map((btn) => (
                        <button
                          key={btn.slot}
                          type="button"
                          onClick={() => {
                            setGarageSlotFilter(btn.slot);
                            onChangeGarageFocus(btn.focus);
                          }}
                          className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border text-left cursor-pointer ${
                            garageSlotFilter === btn.slot
                              ? 'bg-cyan-500 text-slate-950 border-cyan-200 shadow'
                              : 'bg-[#0b1324] text-slate-200 border-slate-600 hover:border-cyan-400'
                          }`}
                        >
                          {btn.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => onChangeGarageFocus('overview')}
                        className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border text-left cursor-pointer ${
                          garageFocusTarget === 'overview'
                            ? 'bg-amber-500 text-slate-950 border-amber-200'
                            : 'bg-[#0b1324] text-amber-300 border-slate-600'
                        }`}
                      >
                        Tam Saha Açısı
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#0b1324] border border-slate-600 rounded-lg px-2.5 py-1.5 flex items-center justify-between text-[10px]">
                    <span className="text-slate-300">Aktif Şasi:</span>
                    <span className="font-display font-bold text-cyan-300 uppercase">
                      {profile.equippedCarModel || 'octane'}
                    </span>
                  </div>
                </div>

                {/* Col 2: Owned Garage Items for the Selected Slot with 3D Visual Preview (8 cols) */}
                <div className="md:col-span-8 bg-[#121e36] border-2 border-slate-600/90 rounded-xl p-2 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-600/80 pb-1">
                    <span className="text-xs font-display font-bold text-white">
                      Garaj Envanteri ({garageItems.length} Sahip Olunan Parça)
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('market')}
                      className="text-[10px] font-bold text-amber-300 hover:underline cursor-pointer"
                    >
                      Yeni Parça Almak İçin Pazara Git →
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[155px] overflow-y-auto pr-1">
                    {garageItems.map((item) => {
                      const equipped =
                        (item.category === 'carModel' &&
                          (profile.equippedCarModel || 'octane') === item.value) ||
                        (item.category === 'bodyColor' &&
                          profile.equippedBodyColor === item.value) ||
                        (item.category === 'finish' &&
                          profile.equippedFinish === item.value) ||
                        (item.category === 'boostColor' &&
                          profile.equippedBoostColor === item.value) ||
                        (item.category === 'wheelStyle' &&
                          profile.equippedWheelStyle === item.value);

                      return (
                        <div
                          key={item.id}
                          className={`p-2 rounded-xl border-2 flex flex-col justify-between gap-1.5 ${
                            equipped
                              ? 'bg-[#193254] border-cyan-400'
                              : 'bg-[#0b1324] border-slate-600/90'
                          }`}
                        >
                          <ItemVisualPreview
                            category={item.category}
                            value={item.value}
                            rarity={item.rarity}
                          />
                          <div>
                            <div className="text-[9px] font-bold text-amber-300">
                              {item.rarity}
                            </div>
                            <div className="text-[11px] font-display font-bold text-white truncate">
                              {item.name}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => onPurchaseOrEquip(item.id)}
                            className={`w-full py-1 rounded-lg text-[10px] font-bold border cursor-pointer ${
                              equipped
                                ? 'bg-cyan-500 text-slate-950 border-cyan-200'
                                : 'bg-[#162440] text-white border-slate-500 hover:border-cyan-400'
                            }`}
                          >
                            {equipped ? 'ARAÇTA TAKILI' : 'ARACA KUŞAN'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: SEPARATE MARKETPLACE (WITH ITEM VISUAL PREVIEWS, BLUEPRINT CRAFTING & ROCKET LEAGUE TRADE-IN) */}
            {activeTab === 'market' && (
              <div className="space-y-2">
                {/* Sub-navigation between Market Catalog & Trade-In / Blueprints */}
                <div className="flex flex-wrap items-center justify-between gap-1.5 bg-[#121e36] border border-slate-600 rounded-xl px-2.5 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setMarketSubTab('catalog')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-display font-bold border cursor-pointer ${
                        marketSubTab === 'catalog'
                          ? 'bg-cyan-500 text-slate-950 border-cyan-200'
                          : 'bg-[#0b1324] text-slate-200 border-slate-600'
                      }`}
                    >
                      1. Pazar Vitrini (Görsel Önizlemeli)
                    </button>
                    <button
                      type="button"
                      onClick={() => setMarketSubTab('trade_blueprints')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-display font-bold border cursor-pointer ${
                        marketSubTab === 'trade_blueprints'
                          ? 'bg-amber-500 text-slate-950 border-amber-200'
                          : 'bg-[#0b1324] text-amber-300 border-slate-600'
                      }`}
                    >
                      2. Takas Sistemi & Blueprint Üretimi (
                      {(profile.ownedBlueprintIds || []).length})
                    </button>
                  </div>
                  <div className="text-[11px] font-mono-tabular font-bold text-amber-300 bg-[#0b1324] border border-slate-600 px-2.5 py-0.5 rounded-lg">
                    Bakiye: {profile.credits} CR
                  </div>
                </div>

                {marketSubTab === 'catalog' ? (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                    <div className="md:col-span-8 bg-[#121e36] border-2 border-slate-600/90 rounded-xl p-2 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1 border-b border-slate-600/80 pb-1">
                        {(
                          [
                            { id: 'all', label: 'Tümü' },
                            { id: 'carModel', label: 'Araba Şasisi' },
                            { id: 'bodyColor', label: 'Gövde Boyası' },
                            { id: 'finish', label: 'Kaplama' },
                            { id: 'wheelStyle', label: 'Jant' },
                            { id: 'boostColor', label: 'Nitro İzi' }
                          ] as const
                        ).map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setMarketCategory(cat.id)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                              marketCategory === cat.id
                                ? 'bg-cyan-500 text-slate-950 border-cyan-300'
                                : 'bg-[#0b1324] text-slate-200 border-slate-600'
                            }`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-[135px] overflow-y-auto pr-1">
                        {filteredMarketCatalog.map((item) => {
                          const owned = profile.ownedItemIds.includes(item.id);
                          return (
                            <div
                              key={item.id}
                              className="p-1.5 rounded-lg border-2 bg-[#0b1324] border-slate-600/90 flex flex-col justify-between gap-1"
                            >
                              <ItemVisualPreview
                                category={item.category}
                                value={item.value}
                                rarity={item.rarity}
                              />
                              <div>
                                <div className="text-[9px] font-bold text-amber-300">
                                  {item.rarity}
                                </div>
                                <div className="text-[10px] font-display font-bold text-white truncate">
                                  {item.name}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => onPurchaseOrEquip(item.id)}
                                className={`w-full py-1 rounded text-[10px] font-bold border cursor-pointer ${
                                  owned
                                    ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                                    : 'bg-amber-500 text-slate-950 border-amber-200 hover:bg-amber-400'
                                }`}
                              >
                                {owned ? 'GARAJDA MEVCUT' : `${item.priceCredits} CR SATIN AL`}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="md:col-span-4 bg-[#121e36] border-2 border-slate-600/90 rounded-xl p-2 flex flex-col justify-between gap-1.5">
                      <div className="space-y-1">
                        <div className="text-[11px] font-bold text-amber-300 border-b border-slate-600/80 pb-1">
                          Canlı Oyuncu Pazarı İlanları
                        </div>
                        <div className="space-y-1 max-h-[75px] overflow-y-auto pr-1">
                          {marketOrders.slice(0, 4).map((ord) => (
                            <div
                              key={ord.id}
                              className="flex items-center justify-between text-[10px] bg-[#0b1324] border border-slate-600 rounded px-2 py-1"
                            >
                              <div className="truncate pr-2">
                                <span className="text-white font-bold">{ord.itemName}</span>
                                <span className="text-slate-300"> · {ord.sellerName}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => onPurchaseOrEquip(ord.itemId)}
                                className="text-amber-300 hover:text-amber-200 font-mono-tabular font-bold shrink-0 cursor-pointer"
                              >
                                {ord.priceCredits} CR
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          onCreateMarketListing(listingItemId, Number(listingPrice) || 300);
                        }}
                        className="pt-1 border-t border-slate-600/80 flex items-center gap-1"
                      >
                        <select
                          aria-label="İlan Eşyası Seç"
                          value={listingItemId}
                          onChange={(e) => setListingItemId(e.target.value)}
                          className="bg-[#0b1324] border border-slate-500 rounded px-1.5 py-1 text-[10px] text-white flex-1 min-w-0"
                        >
                          {MARKET_CATALOG.filter((m) =>
                            profile.ownedItemIds.includes(m.id)
                          ).map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          aria-label="İlan Fiyatı"
                          min={50}
                          max={50000}
                          value={listingPrice}
                          onChange={(e) => setListingPrice(e.target.value)}
                          className="w-14 bg-[#0b1324] border border-slate-500 rounded px-1.5 py-1 text-[10px] text-white font-mono-tabular"
                        />
                        <button
                          type="submit"
                          className="px-2 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[10px] shrink-0 cursor-pointer"
                        >
                          İlan Ver
                        </button>
                      </form>
                    </div>
                  </div>
                ) : (
                  /* SUB-TAB 2: ROCKET LEAGUE AUTOMATIC RANDOM TRADE-IN + BLUEPRINT TO NORMAL ITEM CONVERSION */
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                    {/* Col 1: Blueprints Crafting (Blueprint -> Normal Item for Credits) (6 cols) */}
                    <div className="md:col-span-6 bg-[#121e36] border-2 border-slate-600/90 rounded-xl p-2 space-y-1.5">
                      <div className="flex items-center justify-between border-b border-slate-600/80 pb-1">
                        <span className="text-[11px] font-bold text-cyan-300">
                          Blueprint&apos;ten Normale Çevir (Üretim)
                        </span>
                        <span className="text-[10px] text-slate-300">
                          Sahip Olunan: {(profile.ownedBlueprintIds || []).length}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 max-h-[130px] overflow-y-auto pr-1">
                        {BLUEPRINT_CATALOG.map((bp) => {
                          const hasBp = (profile.ownedBlueprintIds || []).includes(
                            bp.blueprintId
                          );
                          const alreadyNormal = profile.ownedItemIds.includes(bp.targetItemId);
                          return (
                            <div
                              key={bp.blueprintId}
                              className={`p-1.5 rounded-lg border flex flex-col justify-between gap-1 ${
                                hasBp
                                  ? 'bg-[#0c223b] border-cyan-400'
                                  : 'bg-[#0b1324] border-slate-700 opacity-75'
                              }`}
                            >
                              <ItemVisualPreview
                                category={bp.category}
                                value={bp.value}
                                rarity={bp.rarity}
                              />
                              <div>
                                <div className="text-[9px] font-bold text-cyan-300">
                                  {hasBp ? 'ENVANTERDE ŞEMA' : 'KUTUDAN ÇIKAR'}
                                </div>
                                <div className="text-[10px] font-display font-bold text-white truncate">
                                  {bp.itemName}
                                </div>
                              </div>
                              <button
                                type="button"
                                disabled={!hasBp || alreadyNormal}
                                onClick={() => onBuildBlueprint(bp.blueprintId)}
                                className={`w-full py-1 rounded text-[9px] font-bold border ${
                                  alreadyNormal
                                    ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                                    : hasBp
                                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-200 cursor-pointer'
                                    : 'bg-slate-800 text-slate-400 border-slate-600 cursor-not-allowed'
                                }`}
                              >
                                {alreadyNormal
                                  ? 'NORMALE ÇEVRİLDİ'
                                  : `${bp.buildCostCredits} CR İLE NORMALE ÇEVİR`}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Col 2: Rocket League Automatic Random Trade-In (Takas Sistemi) (6 cols) */}
                    <div className="md:col-span-6 bg-[#121e36] border-2 border-slate-600/90 rounded-xl p-2 flex flex-col justify-between gap-1.5">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between border-b border-slate-600/80 pb-1">
                          <span className="text-[11px] font-bold text-amber-300">
                            Rocket League Otomatik Rastgele Takas
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setTradeMode('items');
                                setSelectedTradeIds([]);
                              }}
                              className={`px-2 py-0.5 rounded text-[9px] font-bold border cursor-pointer ${
                                tradeMode === 'items'
                                  ? 'bg-cyan-500 text-slate-950 border-cyan-200'
                                  : 'bg-[#0b1324] text-slate-300 border-slate-600'
                              }`}
                            >
                              Eşya Takası
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setTradeMode('blueprints');
                                setSelectedTradeIds([]);
                              }}
                              className={`px-2 py-0.5 rounded text-[9px] font-bold border cursor-pointer ${
                                tradeMode === 'blueprints'
                                  ? 'bg-cyan-500 text-slate-950 border-cyan-200'
                                  : 'bg-[#0b1324] text-slate-300 border-slate-600'
                              }`}
                            >
                              Blueprint Takası
                            </button>
                          </div>
                        </div>

                        <p className="text-[10px] text-slate-200 leading-snug">
                          En az <b>2 adet</b> {tradeMode === 'items' ? 'normal eşya (araba/jant/iz)' : 'blueprint'} seçin; sistem otomatik olarak rastgele yeni bir eşya versin:
                        </p>

                        <div className="grid grid-cols-2 gap-1 max-h-[76px] overflow-y-auto pr-1">
                          {tradeMode === 'items'
                            ? MARKET_CATALOG.filter((m) =>
                                profile.ownedItemIds.includes(m.id)
                              ).map((m) => {
                                const sel = selectedTradeIds.includes(m.id);
                                return (
                                  <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => toggleTradeSelection(m.id)}
                                    className={`px-2 py-1 rounded text-[10px] font-bold border text-left truncate cursor-pointer ${
                                      sel
                                        ? 'bg-amber-500 text-slate-950 border-white'
                                        : 'bg-[#0b1324] text-slate-200 border-slate-600'
                                    }`}
                                  >
                                    {sel ? '✓ ' : '+ '}
                                    {m.name}
                                  </button>
                                );
                              })
                            : BLUEPRINT_CATALOG.filter((b) =>
                                (profile.ownedBlueprintIds || []).includes(b.blueprintId)
                              ).map((b) => {
                                const sel = selectedTradeIds.includes(b.blueprintId);
                                return (
                                  <button
                                    key={b.blueprintId}
                                    type="button"
                                    onClick={() => toggleTradeSelection(b.blueprintId)}
                                    className={`px-2 py-1 rounded text-[10px] font-bold border text-left truncate cursor-pointer ${
                                      sel
                                        ? 'bg-amber-500 text-slate-950 border-white'
                                        : 'bg-[#0b1324] text-slate-200 border-slate-600'
                                    }`}
                                  >
                                    {sel ? '✓ ' : '+ '}
                                    {b.itemName}
                                  </button>
                                );
                              })}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onExecuteTradeIn(selectedTradeIds, tradeMode);
                          setSelectedTradeIds([]);
                        }}
                        className="w-full py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 border-2 border-amber-200 text-slate-950 font-display font-bold text-[11px] cursor-pointer shadow"
                      >
                        OTOMATİK TAKAS YAP ({selectedTradeIds.length}/2 SEÇİLDİ → RASTGELE EŞYA AL)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: MISSIONS (COMPETITIVE, TRAINING, SEASON) & DROP CRATE OPENER */}
            {activeTab === 'missions' && (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-1.5 bg-[#121e36] border border-slate-600 rounded-xl px-2.5 py-1.5">
                  <div className="flex items-center gap-1 overflow-x-auto">
                    {(
                      [
                        { id: 'competitive', label: 'Rekabetçi Görevleri' },
                        { id: 'training', label: 'Antrenman Görevleri' },
                        { id: 'season', label: 'Sezon Görevleri' },
                        { id: 'pass', label: `Sezon Bileti (Sv.${seasonInfo.level})` }
                      ] as const
                    ).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setMissionSubTab(t.id)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-display font-bold border whitespace-nowrap cursor-pointer ${
                          missionSubTab === t.id
                            ? 'bg-cyan-500 text-slate-950 border-cyan-200'
                            : 'bg-[#0b1324] text-slate-200 border-slate-600'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={onOpenCrate}
                    className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 border-2 border-amber-200 text-slate-950 font-display font-bold text-[10px] sm:text-xs cursor-pointer shadow"
                  >
                    KUTU AÇ ({profile.cratesCount || 0} ADET)
                  </button>
                </div>

                {missionSubTab !== 'pass' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 max-h-[150px] overflow-y-auto pr-1">
                    {MISSION_CATALOG.filter((m) => m.category === missionSubTab).map((msn) => {
                      const currentVal = getMissionProgressValue(msn.metric);
                      const completed = currentVal >= msn.targetValue;
                      const claimed = (profile.claimedMissionIds || []).includes(msn.id);

                      return (
                        <div
                          key={msn.id}
                          className={`p-2 rounded-xl border-2 flex flex-col justify-between gap-1.5 ${
                            claimed
                              ? 'bg-[#0b1324] border-emerald-500/70'
                              : completed
                              ? 'bg-[#193254] border-amber-400'
                              : 'bg-[#121e36] border-slate-600/90'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[9px] font-mono-tabular">
                              <span className="font-bold text-cyan-300 uppercase">
                                {msn.category === 'competitive'
                                  ? 'REKABETÇİ'
                                  : msn.category === 'training'
                                  ? 'ANTRENMAN'
                                  : 'SEZON'}
                              </span>
                              <span className="text-white font-bold">
                                {Math.min(currentVal, msn.targetValue)} / {msn.targetValue}
                              </span>
                            </div>
                            <div className="text-xs font-display font-bold text-white">
                              {msn.title}
                            </div>
                            <p className="text-[10px] text-slate-200 leading-snug">
                              {msn.description}
                            </p>
                            {/* Reward Preview Badge so user sees exact drops */}
                            <div className="bg-[#0b1324] border border-amber-500/60 rounded px-2 py-1 text-[9px] text-amber-300 font-bold">
                              ÖDÜL: {msn.rewardSummaryLabel}
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={!completed || claimed}
                            onClick={() => onClaimMissionReward(msn)}
                            className={`w-full py-1 rounded-lg text-[10px] font-bold border ${
                              claimed
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                                : completed
                                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-200 cursor-pointer'
                                : 'bg-slate-800 text-slate-400 border-slate-600 cursor-not-allowed'
                            }`}
                          >
                            {claimed
                              ? 'ÖDÜL ALINDI'
                              : completed
                              ? 'GÖREV ÖDÜLÜNÜ AL'
                              : 'DEVAM EDİYOR'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-[145px] overflow-y-auto pr-1">
                    {SEASON_REWARDS.map((tier) => {
                      const unlocked = profile.seasonXp >= tier.requiredXp;
                      const claimed = profile.claimedSeasonTiers.includes(tier.tier);
                      return (
                        <div
                          key={tier.tier}
                          className={`p-2 rounded-lg border-2 flex flex-col justify-between gap-1 ${
                            claimed
                              ? 'bg-[#0b1324] border-emerald-500/70'
                              : unlocked
                              ? 'bg-[#193254] border-amber-400'
                              : 'bg-[#0b1324] border-slate-600'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between text-[9px] font-mono-tabular text-slate-300">
                              <span className="font-bold text-cyan-300">KADEME {tier.tier}</span>
                              <span>{tier.requiredXp} XP</span>
                            </div>
                            <div className="text-[11px] font-display font-bold text-white mt-0.5">
                              {tier.title}
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={!unlocked || claimed}
                            onClick={() => onClaimSeasonTier(tier.tier)}
                            className={`w-full py-1 rounded text-[10px] font-bold border ${
                              claimed
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-600 cursor-default'
                                : unlocked
                                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-200 cursor-pointer'
                                : 'bg-slate-800 text-slate-400 border-slate-600 cursor-not-allowed'
                            }`}
                          >
                            {claimed ? 'ALINDI' : unlocked ? 'ÖDÜLÜ AL' : 'KİLİTLİ'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: ROCKET LEAGUE 4-CATEGORY SETTINGS (KONTROLLER | GENEL AYARLAR | GRAFİK & ÇÖZÜNÜRLÜK | SES) */}
            {activeTab === 'settings' && (
              <div className="space-y-2">
                {/* Category Strip */}
                <div className="flex items-center justify-between gap-1 bg-[#121e36] border border-slate-600 rounded-xl p-1">
                  {(
                    [
                      { id: 'controls', label: '1. Kontroller' },
                      { id: 'general', label: '2. Genel Ayarlar & Logo' },
                      { id: 'graphics', label: '3. Grafik & Çözünürlük' },
                      { id: 'audio', label: '4. Ses Ayarları' }
                    ] as const
                  ).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSettingsCategory(cat.id)}
                      className={`flex-1 py-1 rounded-lg text-[10px] sm:text-xs font-display font-bold border transition-colors cursor-pointer ${
                        settingsCategory === cat.id
                          ? 'bg-cyan-500 text-slate-950 border-cyan-200 shadow'
                          : 'bg-[#0b1324] text-slate-200 border-slate-600 hover:border-slate-400'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* CATEGORY 1: KONTROLLER (PC + Mobile Joystick/Button Positions) */}
                {settingsCategory === 'controls' && (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                    <div className="md:col-span-7 bg-[#121e36] border-2 border-slate-600/90 rounded-xl p-2 space-y-1.5">
                      <div className="flex items-center justify-between border-b border-slate-600/80 pb-1">
                        <span className="text-[11px] font-bold text-cyan-300">
                          PC Klavye & Fare Atamaları
                        </span>
                        <button
                          type="button"
                          onClick={onResetControlBindings}
                          className="px-2 py-0.5 rounded bg-[#0b1324] border border-slate-500 text-[10px] font-bold text-slate-200 hover:border-cyan-400 cursor-pointer"
                        >
                          Varsayılan (WASD + Sağ/Sol Tık)
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-[125px] overflow-y-auto pr-1">
                        {BINDING_FIELDS.map((field) => {
                          const isListening = listeningField === field.key;
                          return (
                            <div
                              key={field.key}
                              className="p-1.5 rounded-lg bg-[#0b1324] border border-slate-600 flex flex-col justify-between gap-1"
                            >
                              <span className="text-[9px] text-slate-200 font-semibold truncate">
                                {field.label}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setListeningField(isListening ? null : field.key)
                                }
                                className={`w-full py-0.5 rounded text-[9px] font-mono-tabular font-bold border cursor-pointer ${
                                  isListening
                                    ? 'bg-amber-500 text-slate-950 border-white animate-pulse'
                                    : 'bg-[#193254] text-cyan-200 border-cyan-500/60'
                                }`}
                              >
                                {isListening
                                  ? 'Tuşa Basın...'
                                  : formatKeyBindingLabel(controlBindings[field.key])}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="md:col-span-5 bg-[#121e36] border-2 border-slate-600/90 rounded-xl p-2 flex flex-col justify-between gap-1.5">
                      <div className="flex items-center justify-between border-b border-slate-600/80 pb-1">
                        <span className="text-[11px] font-bold text-amber-300">
                          Mobil Joystick & Tuş Yeri Ayarı
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateMobileConfig(DEFAULT_MOBILE_CONTROLS_CONFIG)}
                          className="px-2 py-0.5 rounded bg-[#0b1324] border border-slate-500 text-[10px] text-slate-200 cursor-pointer"
                        >
                          Sıfırla
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-1 bg-[#0b1324] border border-slate-600 rounded-lg p-1">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateMobileConfig({ ...mobileConfig, steerMode: 'joystick' })
                          }
                          className={`flex-1 py-1 rounded text-[10px] font-bold cursor-pointer ${
                            mobileConfig.steerMode === 'joystick'
                              ? 'bg-cyan-500 text-slate-950'
                              : 'text-slate-300'
                          }`}
                        >
                          Analog Joystick
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateMobileConfig({ ...mobileConfig, steerMode: 'buttons' })
                          }
                          className={`flex-1 py-1 rounded text-[10px] font-bold cursor-pointer ${
                            mobileConfig.steerMode === 'buttons'
                              ? 'bg-cyan-500 text-slate-950'
                              : 'text-slate-300'
                          }`}
                        >
                          Yön Tuşları
                        </button>
                      </div>

                      <select
                        aria-label="Taşınacak Mobil Tuşu Seç"
                        value={selectedMobileBtn}
                        onChange={(e) =>
                          setSelectedMobileBtn(
                            e.target.value as 'flyUp' | 'boost' | 'jump' | 'drift' | 'joystick'
                          )
                        }
                        className="w-full bg-[#0b1324] border border-slate-500 rounded-lg px-2 py-1 text-[10px] font-bold text-white"
                      >
                        {MOBILE_BUTTON_TARGETS.map((t) => (
                          <option key={t.key} value={t.key}>
                            Pozisyon Ayarla: {t.label}
                          </option>
                        ))}
                      </select>

                      <div className="grid grid-cols-3 gap-1 bg-[#0b1324] border border-slate-600 rounded-lg p-1 text-center">
                        <div>
                          <div className="text-[9px] text-slate-300">Yatay (X)</div>
                          <div className="flex justify-center gap-1 mt-0.5">
                            <button
                              type="button"
                              onClick={() =>
                                updateSelectedMobileOffset({
                                  offsetX: Math.max(-60, currentMobileOffset.offsetX - 20)
                                })
                              }
                              className="px-1.5 py-0.5 rounded bg-slate-700 text-white text-[10px] font-bold cursor-pointer"
                            >
                              ←
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                updateSelectedMobileOffset({
                                  offsetX: Math.min(60, currentMobileOffset.offsetX + 20)
                                })
                              }
                              className="px-1.5 py-0.5 rounded bg-slate-700 text-white text-[10px] font-bold cursor-pointer"
                            >
                              →
                            </button>
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] text-slate-300">Dikey (Y)</div>
                          <div className="flex justify-center gap-1 mt-0.5">
                            <button
                              type="button"
                              onClick={() =>
                                updateSelectedMobileOffset({
                                  offsetY: Math.max(-60, currentMobileOffset.offsetY - 20)
                                })
                              }
                              className="px-1.5 py-0.5 rounded bg-slate-700 text-white text-[10px] font-bold cursor-pointer"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                updateSelectedMobileOffset({
                                  offsetY: Math.min(60, currentMobileOffset.offsetY + 20)
                                })
                              }
                              className="px-1.5 py-0.5 rounded bg-slate-700 text-white text-[10px] font-bold cursor-pointer"
                            >
                              ↓
                            </button>
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] text-slate-300">Boyut</div>
                          <div className="flex justify-center gap-1 mt-0.5">
                            <button
                              type="button"
                              onClick={() =>
                                updateSelectedMobileOffset({
                                  scale: currentMobileOffset.scale <= 1 ? 0.85 : 1.0
                                })
                              }
                              className="px-1.5 py-0.5 rounded bg-slate-700 text-white text-[10px] font-bold cursor-pointer"
                            >
                              -
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                updateSelectedMobileOffset({
                                  scale: currentMobileOffset.scale >= 1 ? 1.15 : 1.0
                                })
                              }
                              className="px-1.5 py-0.5 rounded bg-slate-700 text-white text-[10px] font-bold cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* CATEGORY 2: GENEL AYARLAR (CAMERA FOV/DISTANCE, REGION, LOGO 1-2-3 PICKER, ZERO RESET) */}
                {settingsCategory === 'general' && (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                    <div className="md:col-span-5 bg-[#121e36] border-2 border-slate-600/90 rounded-xl p-2 space-y-2">
                      <div className="text-[11px] font-bold text-cyan-300 border-b border-slate-600/80 pb-1">
                        Rocket League Kamera & Bölge Ayarları
                      </div>

                      <div className="space-y-1 text-[10px]">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-200">Kamera Açısı (FOV):</span>
                          <div className="flex items-center gap-1">
                            {[62, 68, 75, 85].map((fov) => (
                              <button
                                key={fov}
                                type="button"
                                onClick={() =>
                                  onUpdateGeneralSettings({
                                    ...generalSettings,
                                    cameraFov: fov
                                  })
                                }
                                className={`px-1.5 py-0.5 rounded font-mono-tabular font-bold border cursor-pointer ${
                                  generalSettings.cameraFov === fov
                                    ? 'bg-cyan-500 text-slate-950 border-cyan-200'
                                    : 'bg-[#0b1324] text-slate-300 border-slate-600'
                                }`}
                              >
                                {fov}°
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-200">Kamera Mesafesi:</span>
                          <div className="flex items-center gap-1">
                            {[10, 12, 14, 16].map((dist) => (
                              <button
                                key={dist}
                                type="button"
                                onClick={() =>
                                  onUpdateGeneralSettings({
                                    ...generalSettings,
                                    cameraDistance: dist
                                  })
                                }
                                className={`px-1.5 py-0.5 rounded font-mono-tabular font-bold border cursor-pointer ${
                                  generalSettings.cameraDistance === dist
                                    ? 'bg-cyan-500 text-slate-950 border-cyan-200'
                                    : 'bg-[#0b1324] text-slate-300 border-slate-600'
                                }`}
                              >
                                {dist}m
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-200">Kamera Sarsıntısı:</span>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateGeneralSettings({
                                ...generalSettings,
                                cameraShake: !generalSettings.cameraShake
                              })
                            }
                            className={`px-2 py-0.5 rounded font-bold border cursor-pointer ${
                              generalSettings.cameraShake
                                ? 'bg-emerald-500 text-slate-950 border-emerald-200'
                                : 'bg-[#0b1324] text-slate-300 border-slate-600'
                            }`}
                          >
                            {generalSettings.cameraShake ? 'AÇIK' : 'KAPALI'}
                          </button>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-700">
                          <span className="text-slate-200">Eşleştirme Bölgesi:</span>
                          <select
                            aria-label="Eşleştirme Bölgesi Seç"
                            value={generalSettings.region}
                            onChange={(e) =>
                              onUpdateGeneralSettings({
                                ...generalSettings,
                                region: e.target.value as PlayerRegion
                              })
                            }
                            className="bg-[#0b1324] border border-slate-500 rounded px-2 py-0.5 text-[10px] text-white font-bold"
                          >
                            {REGIONS_CATALOG.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Logo Picker (1, 2, 3) Preview + Account Reset */}
                    <div className="md:col-span-7 bg-[#121e36] border-2 border-slate-600/90 rounded-xl p-2 flex flex-col justify-between gap-2">
                      <div className="flex items-center justify-between border-b border-slate-600/80 pb-1">
                        <span className="text-[11px] font-bold text-amber-300">
                          Oyun Logosu Seçimi (1 - 2 - 3 Numaralı Tasarımlar)
                        </span>
                        <button
                          type="button"
                          onClick={onOpenLogoPickerModal}
                          className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 text-[10px] font-bold cursor-pointer"
                        >
                          Büyük İncele & Seç
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {(
                          [
                            {
                              id: 1,
                              title: 'Logo 1: Krom Kalkan',
                              src: '/logos/logo-1.svg'
                            },
                            {
                              id: 2,
                              title: 'Logo 2: Altın Kanat',
                              src: '/logos/logo-2.svg'
                            },
                            {
                              id: 3,
                              title: 'Logo 3: Neon Altıgen',
                              src: '/logos/logo-3.svg'
                            }
                          ] as const
                        ).map((lg) => (
                          <button
                            key={lg.id}
                            type="button"
                            onClick={() =>
                              onUpdateGeneralSettings({
                                ...generalSettings,
                                selectedLogo: lg.id
                              })
                            }
                            className={`p-1.5 rounded-xl border-2 flex items-center gap-2 cursor-pointer ${
                              generalSettings.selectedLogo === lg.id
                                ? 'bg-[#193254] border-cyan-400'
                                : 'bg-[#0b1324] border-slate-600'
                            }`}
                          >
                            <img
                              src={lg.src}
                              alt={lg.title}
                              className="w-9 h-9 rounded-lg shrink-0"
                            />
                            <div className="text-left min-w-0">
                              <div className="text-[10px] font-display font-bold text-white truncate">
                                #{lg.id} Seçenek
                              </div>
                              <div className="text-[9px] text-cyan-300 truncate">
                                {generalSettings.selectedLogo === lg.id ? 'AKTİF' : 'Seç'}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-700/80 gap-2">
                        <span className="text-[10px] text-slate-300">
                          Hesap ve tüm ilerlemeyi sıfırlamak için:
                        </span>
                        <button
                          type="button"
                          onClick={onResetProfileToZero}
                          className="px-3 py-1 rounded-lg bg-rose-950/90 hover:bg-rose-900 border border-rose-500 text-rose-100 font-display font-bold text-[10px] cursor-pointer"
                        >
                          İLERLEMEYİ SIFIRLA (0)
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* CATEGORY 3: GRAFİK & ÇÖZÜNÜRLÜK */}
                {settingsCategory === 'graphics' && (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                    <div className="md:col-span-6 bg-[#121e36] border-2 border-slate-600/90 rounded-xl p-2 space-y-2">
                      <div className="text-[11px] font-bold text-cyan-300 border-b border-slate-600/80 pb-1">
                        Çözünürlük Ölçeği & Grafik Kalitesi
                      </div>

                      <div className="space-y-1.5 text-[10px]">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-200 font-semibold">
                            Render Çözünürlüğü:
                          </span>
                          <div className="flex items-center gap-1">
                            {(
                              [
                                { id: '0.75', label: '720p (0.75x)' },
                                { id: '1.0', label: '1080p (1.0x)' },
                                { id: '1.35', label: '1440p (1.35x)' },
                                { id: '2.0', label: '4K (2.0x)' }
                              ] as const
                            ).map((res) => (
                              <button
                                key={res.id}
                                type="button"
                                onClick={() =>
                                  onUpdateGraphicsSettings({
                                    ...graphicsSettings,
                                    resolutionScale: res.id
                                  })
                                }
                                className={`px-1.5 py-0.5 rounded font-bold border cursor-pointer ${
                                  graphicsSettings.resolutionScale === res.id
                                    ? 'bg-cyan-500 text-slate-950 border-cyan-200'
                                    : 'bg-[#0b1324] text-slate-300 border-slate-600'
                                }`}
                              >
                                {res.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-200 font-semibold">
                            Kalite Ön Ayarı:
                          </span>
                          <div className="flex items-center gap-1">
                            {(
                              [
                                { id: 'performance', label: 'Performans' },
                                { id: 'balanced', label: 'Dengeli' },
                                { id: 'quality', label: 'Kalite' },
                                { id: 'ultra', label: 'Ultra PBR' }
                              ] as const
                            ).map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() =>
                                  onUpdateGraphicsSettings({
                                    ...graphicsSettings,
                                    preset: p.id,
                                    shadows: p.id !== 'performance',
                                    reflections: p.id === 'quality' || p.id === 'ultra',
                                    particles:
                                      p.id === 'performance'
                                        ? 'low'
                                        : p.id === 'balanced'
                                        ? 'medium'
                                        : 'high'
                                  })
                                }
                                className={`px-1.5 py-0.5 rounded font-bold border cursor-pointer ${
                                  graphicsSettings.preset === p.id
                                    ? 'bg-amber-500 text-slate-950 border-amber-200'
                                    : 'bg-[#0b1324] text-slate-300 border-slate-600'
                                }`}
                              >
                                {p.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-6 bg-[#121e36] border-2 border-slate-600/90 rounded-xl p-2 space-y-1.5 text-[10px]">
                      <div className="text-[11px] font-bold text-amber-300 border-b border-slate-600/80 pb-1">
                        Gelişmiş Gölgelendirici & Parçacık Seçenekleri
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateGraphicsSettings({
                              ...graphicsSettings,
                              shadows: !graphicsSettings.shadows
                            })
                          }
                          className={`p-1.5 rounded-lg border font-bold cursor-pointer ${
                            graphicsSettings.shadows
                              ? 'bg-[#193254] border-cyan-400 text-white'
                              : 'bg-[#0b1324] border-slate-600 text-slate-400'
                          }`}
                        >
                          Dinamik Gölgeler: {graphicsSettings.shadows ? 'AÇIK' : 'KAPALI'}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            onUpdateGraphicsSettings({
                              ...graphicsSettings,
                              reflections: !graphicsSettings.reflections
                            })
                          }
                          className={`p-1.5 rounded-lg border font-bold cursor-pointer ${
                            graphicsSettings.reflections
                              ? 'bg-[#193254] border-cyan-400 text-white'
                              : 'bg-[#0b1324] border-slate-600 text-slate-400'
                          }`}
                        >
                          PBR Yansımalar: {graphicsSettings.reflections ? 'AÇIK' : 'KAPALI'}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            onUpdateGraphicsSettings({
                              ...graphicsSettings,
                              antiAliasing: !graphicsSettings.antiAliasing
                            })
                          }
                          className={`p-1.5 rounded-lg border font-bold cursor-pointer ${
                            graphicsSettings.antiAliasing
                              ? 'bg-[#193254] border-cyan-400 text-white'
                              : 'bg-[#0b1324] border-slate-600 text-slate-400'
                          }`}
                        >
                          Kenar Yumuşatma: {graphicsSettings.antiAliasing ? 'MSAA' : 'KAPALI'}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            onUpdateGraphicsSettings({
                              ...graphicsSettings,
                              particles:
                                graphicsSettings.particles === 'high'
                                  ? 'medium'
                                  : graphicsSettings.particles === 'medium'
                                  ? 'low'
                                  : 'high'
                            })
                          }
                          className="p-1.5 rounded-lg border bg-[#0b1324] border-slate-500 text-amber-300 font-bold cursor-pointer"
                        >
                          Parçacık: {graphicsSettings.particles.toUpperCase()}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* CATEGORY 4: SES AYARLARI */}
                {settingsCategory === 'audio' && (
                  <div className="bg-[#121e36] border-2 border-slate-600/90 rounded-xl p-2.5 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
                      <div className="bg-[#0b1324] border border-slate-600 rounded-lg p-2 space-y-1">
                        <div className="flex justify-between font-bold text-white">
                          <span>Ana Ses (Master)</span>
                          <span className="text-cyan-300">%{audioSettings.masterVolume}</span>
                        </div>
                        <input
                          type="range"
                          aria-label="Ana Ses Seviyesi"
                          min={0}
                          max={100}
                          value={audioSettings.masterVolume}
                          onChange={(e) =>
                            onUpdateAudioSettings({
                              ...audioSettings,
                              masterVolume: Number(e.target.value)
                            })
                          }
                          className="w-full accent-cyan-400 cursor-pointer"
                        />
                      </div>

                      <div className="bg-[#0b1324] border border-slate-600 rounded-lg p-2 space-y-1">
                        <div className="flex justify-between font-bold text-white">
                          <span>Motor & Çarpışma</span>
                          <span className="text-amber-300">%{audioSettings.sfxVolume}</span>
                        </div>
                        <input
                          type="range"
                          aria-label="Efekt Ses Seviyesi"
                          min={0}
                          max={100}
                          value={audioSettings.sfxVolume}
                          onChange={(e) =>
                            onUpdateAudioSettings({
                              ...audioSettings,
                              sfxVolume: Number(e.target.value)
                            })
                          }
                          className="w-full accent-amber-400 cursor-pointer"
                        />
                      </div>

                      <div className="bg-[#0b1324] border border-slate-600 rounded-lg p-2 space-y-1">
                        <div className="flex justify-between font-bold text-white">
                          <span>Arayüz & Gol Siren</span>
                          <span className="text-emerald-300">%{audioSettings.uiVolume}</span>
                        </div>
                        <input
                          type="range"
                          aria-label="Arayüz Ses Seviyesi"
                          min={0}
                          max={100}
                          value={audioSettings.uiVolume}
                          onChange={(e) =>
                            onUpdateAudioSettings({
                              ...audioSettings,
                              uiVolume: Number(e.target.value)
                            })
                          }
                          className="w-full accent-emerald-400 cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-4 flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateAudioSettings({
                            ...audioSettings,
                            muted: !audioSettings.muted
                          })
                        }
                        className={`w-full py-2 rounded-xl font-display font-bold text-xs border-2 cursor-pointer ${
                          audioSettings.muted
                            ? 'bg-rose-950 border-rose-400 text-rose-200'
                            : 'bg-emerald-500 text-slate-950 border-emerald-200'
                        }`}
                      >
                        {audioSettings.muted ? 'SES KAPALI (AÇMAK İÇİN TIKLA)' : 'TÜM SESLER AÇIK'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 6: GMAIL CLUB COMMUNICATIONS */}
            {activeTab === 'gmail' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div className="md:col-span-6 bg-[#121e36] border-2 border-slate-600/90 rounded-xl p-2 flex flex-col justify-between gap-1.5">
                  <div className="flex items-center justify-between border-b border-slate-600/80 pb-1">
                    <span className="text-xs font-display font-bold text-white">
                      Gelen Kutusu (Kulüp Bildirimleri)
                    </span>
                    <div className="flex items-center gap-1.5">
                      {isAuthenticated && !needsGmailAuth ? (
                        <button
                          type="button"
                          onClick={onRefreshGmail}
                          disabled={gmailLoading}
                          className="px-2 py-0.5 rounded bg-[#0b1324] border border-slate-500 text-[10px] text-cyan-300 cursor-pointer"
                        >
                          {gmailLoading ? 'Yükleniyor...' : 'Yenile'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={onGoogleLogin}
                          className="px-2 py-0.5 rounded bg-cyan-500 text-slate-950 font-bold text-[10px] cursor-pointer"
                        >
                          Gmail Bağla
                        </button>
                      )}
                      {isAuthenticated && (
                        <button
                          type="button"
                          onClick={onLogout}
                          className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 cursor-pointer"
                        >
                          Çıkış
                        </button>
                      )}
                    </div>
                  </div>

                  {!isAuthenticated || needsGmailAuth ? (
                    <div className="text-[11px] text-slate-200 bg-[#0b1324] border border-slate-600 rounded-lg p-2">
                      Kulüp turnuva davetlerini görüntülemek ve maç karnenizi e-posta olarak
                      paylaşmak için Google hesabınızla bağlanın.
                    </div>
                  ) : gmailMessages.length === 0 ? (
                    <div className="text-[11px] text-slate-300 bg-[#0b1324] border border-slate-600 rounded-lg p-2">
                      Gelen kutunuzda eşleşen ileti bulunamadı.
                    </div>
                  ) : (
                    <div className="space-y-1 max-h-[100px] overflow-y-auto pr-1">
                      {gmailMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className="p-1.5 rounded bg-[#0b1324] border border-slate-600 text-[10px]"
                        >
                          <div className="font-bold text-white truncate">{msg.subject}</div>
                          <div className="text-slate-300 truncate">{msg.from}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    onRequestSendGmail(emailTo, emailSubject, emailBody);
                  }}
                  className="md:col-span-6 bg-[#121e36] border-2 border-slate-600/90 rounded-xl p-2 flex flex-col justify-between gap-1.5"
                >
                  <div className="text-xs font-display font-bold text-amber-300 border-b border-slate-600/80 pb-1">
                    Maç Raporu & Lobi Daveti Gönder
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="email"
                      required
                      placeholder="Alıcı E-posta"
                      value={emailTo}
                      onChange={(e) => setEmailTo(e.target.value)}
                      className="bg-[#0b1324] border border-slate-500 rounded px-2 py-1 text-[11px] text-white"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Konu"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="bg-[#0b1324] border border-slate-500 rounded px-2 py-1 text-[11px] text-white"
                    />
                  </div>
                  <textarea
                    rows={2}
                    required
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    className="bg-[#0b1324] border border-slate-500 rounded px-2 py-1 text-[11px] text-white resize-none"
                  />
                  <div className="flex items-center justify-end">
                    <button
                      type="submit"
                      className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-[11px] cursor-pointer"
                    >
                      E-posta Gönder
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
