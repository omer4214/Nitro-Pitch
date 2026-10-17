import React, { useEffect, useState } from 'react';
import {
  BotDifficulty,
  ControlBindings,
  CrossPlatformNetwork,
  DEFAULT_MOBILE_CONTROLS_CONFIG,
  GameMode,
  MARKET_CATALOG,
  MobileButtonOffset,
  MobileControlsConfig,
  SEASON_REWARDS,
  calculateSeasonLevel,
  formatKeyBindingLabel,
  getRankTierFromMmr
} from '../game/rules';
import {
  MarketOrderData,
  MatchRecordData,
  PlayerProfileData
} from '../services/firebaseService';
import { GmailSummaryMessage } from '../services/gmailService';

export type HubTab = 'lobby' | 'market' | 'season' | 'settings' | 'gmail';

interface BottomHubDockProps {
  activeTab: HubTab;
  setActiveTab: (tab: HubTab) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  selectedMode: GameMode;
  setSelectedMode: (mode: GameMode) => void;
  selectedPlatform: CrossPlatformNetwork;
  setSelectedPlatform: (plat: CrossPlatformNetwork) => void;
  botDifficulty: BotDifficulty;
  setBotDifficulty: (diff: BotDifficulty) => void;
  practiceBotEnabled: boolean;
  setPracticeBotEnabled: (enabled: boolean) => void;
  controlBindings: ControlBindings;
  onUpdateControlBindings: (next: ControlBindings) => void;
  onResetControlBindings: () => void;
  mobileConfig: MobileControlsConfig;
  onUpdateMobileConfig: (next: MobileControlsConfig) => void;
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

export const BottomHubDock: React.FC<BottomHubDockProps> = ({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
  selectedMode,
  setSelectedMode,
  selectedPlatform,
  setSelectedPlatform,
  botDifficulty,
  setBotDifficulty,
  practiceBotEnabled,
  setPracticeBotEnabled,
  controlBindings,
  onUpdateControlBindings,
  onResetControlBindings,
  mobileConfig,
  onUpdateMobileConfig,
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
  onCreateMarketListing,
  onClaimSeasonTier,
  onRefreshGmail,
  onRequestSendGmail
}) => {
  const [marketCategory, setMarketCategory] = useState<
    'all' | 'bodyColor' | 'finish' | 'boostColor' | 'wheelStyle'
  >('all');
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
    `Merhaba Pilot,\n\nNitro Pitch 3D Arena'da güncel derecem: ${profile.rankTier} (${profile.mmr} MMR).\nToplam Galibiyet: ${profile.wins} | Gol: ${profile.goalsScored}.\n2v2 Çapraz Platform dereceli maç için lobime katıl!`
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

  const filteredCatalog = MARKET_CATALOG.filter((item) =>
    marketCategory === 'all' ? true : item.category === marketCategory
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

  return (
    <div className="fixed inset-x-0 bottom-1.5 sm:bottom-4 z-30 flex justify-center pointer-events-none px-1.5 sm:px-4">
      <div className="w-full max-w-[960px] pointer-events-auto">
        {/* Top Tab Strip + Collapse Toggle (Compact on Mobile, High-Contrast Dark Frame) */}
        <div className="flex items-center justify-between gap-1 mb-1 sm:mb-1.5 bg-[#0b1324] border-2 border-slate-500/90 rounded-xl p-1 sm:p-1.5 shadow-2xl">
          <div className="flex items-center gap-1 overflow-x-auto">
            {(
              [
                { id: 'lobby', label: 'Lobi' },
                { id: 'market', label: 'Pazar & Garaj' },
                { id: 'season', label: `Sezon (Sv.${seasonInfo.level})` },
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

        {/* Main Dock Panel Body — Compact on Mobile (max-h-[34vh]), High-Contrast Clear Boundaries */}
        {!collapsed && (
          <div className="bg-[#0b1324] border-2 border-slate-500/90 rounded-2xl p-2 sm:p-3.5 shadow-2xl text-slate-100 max-h-[34vh] sm:max-h-[290px] overflow-y-auto">
            {/* TAB 1: ARENA LOBBY & BOT DIFFICULTY & RANKED */}
            {activeTab === 'lobby' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2 sm:gap-3 items-stretch">
                {/* Col 1: Mode Selection + Practice Bot & Difficulty (5 cols) */}
                <div className="md:col-span-5 bg-[#121e36] border-2 border-slate-600/90 rounded-xl p-2 sm:p-2.5 flex flex-col justify-between gap-1.5">
                  <div>
                    <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-cyan-300 border-b border-slate-600/80 pb-1 mb-1.5">
                      1. Oyun Modu & Bot Zorluğu
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {(
                        [
                          { id: '1v1', title: '1v1 Düello', desc: 'Dereceli' },
                          { id: '2v2', title: '2v2 Takım', desc: 'Çapraz Lig' },
                          { id: 'practice', title: 'Antrenman', desc: 'Serbest/Bot' }
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
                          <div className="text-[9px] text-slate-300">{m.desc}</div>
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

                {/* Col 2: Ranked MMR & Stats Card (4 cols) */}
                <div className="md:col-span-4 bg-[#121e36] border-2 border-slate-600/90 rounded-xl p-2 sm:p-2.5 flex flex-col justify-between gap-1.5">
                  <div>
                    <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-300 border-b border-slate-600/80 pb-1 mb-1.5">
                      2. Dereceli Lig & Kariyer
                    </div>
                    <div className="flex items-center justify-between bg-[#0b1324] border border-slate-600 rounded-lg px-2.5 py-1.5">
                      <div>
                        <div className="font-display font-bold text-xs sm:text-sm text-white">
                          {rankInfo.tierName}
                        </div>
                        <div className="text-[10px] text-cyan-300 font-mono-tabular">
                          {profile.mmr} MMR · {profile.wins}G / {profile.matchesPlayed}M
                        </div>
                      </div>
                      <div className="text-right font-mono-tabular">
                        <div className="text-xs font-bold text-amber-400">
                          {profile.credits} CR
                        </div>
                        <div className="text-[10px] text-slate-300">
                          Gol: {profile.goalsScored}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Platform Network Selector */}
                  <div className="flex items-center justify-between gap-1 bg-[#0b1324] border border-slate-600 rounded-lg p-1">
                    {(
                      [
                        { id: 'PC_STEAM_EPIC', label: 'PC Ağı' },
                        { id: 'MOBILE_TOUCH', label: 'Mobil Ağı' },
                        { id: 'CONSOLE_CROSS', label: 'Konsol' }
                      ] as const
                    ).map((plat) => (
                      <button
                        key={plat.id}
                        type="button"
                        onClick={() => setSelectedPlatform(plat.id)}
                        className={`flex-1 py-1 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
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

                {/* Col 3: Launch Actions & Replay Studio (3 cols) */}
                <div className="md:col-span-3 bg-[#121e36] border-2 border-slate-600/90 rounded-xl p-2 sm:p-2.5 flex flex-col justify-between gap-1.5">
                  <div className="hidden sm:block space-y-1">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 border-b border-slate-600/80 pb-1">
                      3. Hızlı Başlat
                    </div>
                    <p className="text-[10px] text-slate-200 leading-snug">
                      Yuvarlak köşeli stadyumda duvardan tavana çıkın; 1-2 sn tavanda tutunun!
                    </p>
                  </div>

                  <div className="flex sm:flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={onStartMatch}
                      className="flex-1 py-1.5 sm:py-2 rounded-xl bg-amber-500 hover:bg-amber-400 border-2 border-amber-200 text-slate-950 font-display font-bold text-xs tracking-wide shadow-lg cursor-pointer"
                    >
                      MAÇA BAŞLA ({selectedMode.toUpperCase()})
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

            {/* TAB 2: ITEM MARKETPLACE & GARAGE CUSTOMIZATION */}
            {activeTab === 'market' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <div className="md:col-span-8 bg-[#121e36] border-2 border-slate-600/90 rounded-xl p-2 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-600/80 pb-1">
                    <div className="flex items-center gap-1">
                      {(
                        [
                          { id: 'all', label: 'Tümü' },
                          { id: 'bodyColor', label: 'Gövde' },
                          { id: 'finish', label: 'Kaplama' },
                          { id: 'boostColor', label: 'Turbo İzi' },
                          { id: 'wheelStyle', label: 'Jant' }
                        ] as const
                      ).map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setMarketCategory(cat.id)}
                          className={`px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold border cursor-pointer ${
                            marketCategory === cat.id
                              ? 'bg-cyan-500 text-slate-950 border-cyan-300'
                              : 'bg-[#0b1324] text-slate-200 border-slate-600'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                    <div className="text-[11px] font-mono-tabular font-bold text-amber-300 bg-[#0b1324] border border-slate-600 px-2 py-0.5 rounded-lg">
                      Bakiye: {profile.credits} CR
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-[135px] overflow-y-auto pr-1">
                    {filteredCatalog.map((item) => {
                      const owned = profile.ownedItemIds.includes(item.id);
                      const equipped =
                        profile.equippedBodyColor === item.value ||
                        profile.equippedFinish === item.value ||
                        profile.equippedBoostColor === item.value ||
                        profile.equippedWheelStyle === item.value;

                      return (
                        <div
                          key={item.id}
                          className={`p-2 rounded-lg border-2 flex flex-col justify-between gap-1 ${
                            equipped
                              ? 'bg-[#193254] border-cyan-400'
                              : 'bg-[#0b1324] border-slate-600/90'
                          }`}
                        >
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
                            className={`w-full py-1 rounded text-[10px] font-bold border cursor-pointer ${
                              equipped
                                ? 'bg-cyan-500 text-slate-950 border-cyan-200'
                                : owned
                                ? 'bg-[#162440] text-white border-slate-500 hover:border-cyan-400'
                                : 'bg-amber-500 text-slate-950 border-amber-200 hover:bg-amber-400'
                            }`}
                          >
                            {equipped
                              ? 'KUŞANILDI'
                              : owned
                              ? 'KUŞAN'
                              : `${item.priceCredits} CR AL`}
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
            )}

            {/* TAB 3: SEASON PASS & REWARD TRACK */}
            {activeTab === 'season' && (
              <div className="bg-[#121e36] border-2 border-slate-600/90 rounded-xl p-2 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-600/80 pb-1">
                  <div className="text-xs font-display font-bold text-white">
                    SEZON 1: SÜPERSONİK YÜKSELİŞ · Kademe {seasonInfo.level} ({profile.seasonXp} XP)
                  </div>
                  <div className="w-36 bg-[#0b1324] border border-slate-600 rounded-lg p-1">
                    <svg className="w-full h-2 rounded overflow-hidden" viewBox="0 0 100 8" preserveAspectRatio="none">
                      <rect x="0" y="0" width="100" height="8" fill="#09101f" />
                      <rect
                        x="0"
                        y="0"
                        width={Math.max(4, seasonInfo.progressPercent)}
                        height="8"
                        fill="#06b6d4"
                      />
                    </svg>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-[135px] overflow-y-auto pr-1">
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
              </div>
            )}

            {/* TAB 4: CONTROLS & MOBILE BUTTON POSITION CUSTOMIZER & ZERO RESET */}
            {activeTab === 'settings' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-stretch">
                {/* PC Keyboard & Mouse Bindings (5 cols) */}
                <div className="md:col-span-5 bg-[#121e36] border-2 border-slate-600/90 rounded-xl p-2 space-y-1.5">
                  <div className="flex items-center justify-between border-b border-slate-600/80 pb-1">
                    <span className="text-[11px] font-bold text-cyan-300">
                      PC Tuş & Fare Atamaları
                    </span>
                    <button
                      type="button"
                      onClick={onResetControlBindings}
                      className="px-2 py-0.5 rounded bg-[#0b1324] border border-slate-500 text-[10px] font-bold text-slate-200 hover:border-cyan-400 cursor-pointer"
                    >
                      Varsayılan
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 max-h-[145px] overflow-y-auto pr-1">
                    {BINDING_FIELDS.map((field) => {
                      const isListening = listeningField === field.key;
                      return (
                        <div
                          key={field.key}
                          className="p-1.5 rounded-lg bg-[#0b1324] border border-slate-600 flex items-center justify-between gap-1"
                        >
                          <span className="text-[10px] text-slate-100 font-medium whitespace-nowrap">
                            {field.label}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setListeningField(isListening ? null : field.key)
                            }
                            className={`px-1.5 py-0.5 rounded text-[9px] font-mono-tabular font-bold border shrink-0 cursor-pointer ${
                              isListening
                                ? 'bg-amber-500 text-slate-950 border-white animate-pulse'
                                : 'bg-[#193254] text-cyan-200 border-cyan-500/60'
                            }`}
                          >
                            {isListening
                              ? 'Basın...'
                              : formatKeyBindingLabel(controlBindings[field.key])}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Mobile Joystick Mode + Button Position Adjuster (4 cols) */}
                <div className="md:col-span-4 bg-[#121e36] border-2 border-slate-600/90 rounded-xl p-2 flex flex-col justify-between gap-1.5">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between border-b border-slate-600/80 pb-1">
                      <span className="text-[11px] font-bold text-amber-300">
                        Mobil Joystick & Tuş Pozisyonu
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateMobileConfig(DEFAULT_MOBILE_CONTROLS_CONFIG)}
                        className="px-2 py-0.5 rounded bg-[#0b1324] border border-slate-500 text-[10px] text-slate-200 cursor-pointer"
                      >
                        Sıfırla
                      </button>
                    </div>

                    {/* Steering Mode: Joystick vs D-Pad Buttons */}
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

                    {/* Select which mobile button to move */}
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

                    {/* X / Y / Scale Nudge Controls */}
                    <div className="grid grid-cols-3 gap-1 bg-[#0b1324] border border-slate-600 rounded-lg p-1.5 text-center">
                      <div>
                        <div className="text-[9px] text-slate-300">Yatay (X)</div>
                        <div className="flex items-center justify-center gap-1 mt-0.5">
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
                        <div className="flex items-center justify-center gap-1 mt-0.5">
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
                        <div className="flex items-center justify-center gap-1 mt-0.5">
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

                {/* Zero-Start Reset & Replay Studio (3 cols) */}
                <div className="md:col-span-3 bg-[#121e36] border-2 border-slate-600/90 rounded-xl p-2 flex flex-col justify-between gap-1.5">
                  <div className="space-y-1">
                    <div className="text-[11px] font-bold text-rose-300 border-b border-slate-600/80 pb-1">
                      Hesap & Sıfırlama
                    </div>
                    <p className="text-[10px] text-slate-200 leading-snug">
                      İlerlemeyi sıfırladığınızda kredi, MMR ve sezon XP tamamen 0 olur.
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={onResetProfileToZero}
                      className="w-full py-1.5 px-2 rounded-lg bg-rose-950/90 hover:bg-rose-900 border-2 border-rose-500 text-rose-100 font-display font-bold text-[10px] cursor-pointer"
                    >
                      İLERLEMEYİ SIFIRLA (0)
                    </button>
                    <button
                      type="button"
                      onClick={onOpenReplay}
                      className="w-full py-1.5 px-2 rounded-lg bg-[#0b1324] hover:bg-[#192b4d] border border-cyan-400 text-cyan-200 font-display font-bold text-[10px] cursor-pointer"
                    >
                      3D MAÇ TEKRARI İZLE
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: GMAIL CLUB COMMUNICATIONS */}
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
