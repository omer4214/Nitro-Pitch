import React, { useRef, useState } from 'react';
import { HudSnapshot, MobileControlState } from '../game/ArenaCanvas';
import {
  MobileButtonOffset,
  MobileControlsConfig
} from '../game/rules';

interface PlayingHudProps {
  hud: HudSnapshot;
  showTouchControls: boolean;
  mobileConfig: MobileControlsConfig;
  mobileInputRef: React.MutableRefObject<MobileControlState>;
  onToggleBallCam: () => void;
  onPause: () => void;
}

function getDodgeLabel(dodgeType: HudSnapshot['dodgeType']): string | null {
  switch (dodgeType) {
    case 'front':
      return 'İLERİ TAKLA';
    case 'back':
      return 'GERİ TAKLA';
    case 'left':
      return 'SOLA TAKLA';
    case 'right':
      return 'SAĞA TAKLA';
    case 'diagonal':
      return 'ÇAPRAZ TAKLA';
    default:
      return null;
  }
}

function getSurfaceLabel(surface: HudSnapshot['surfaceState']): string {
  switch (surface) {
    case 'wall':
      return 'DUVAR SÜRÜŞÜ';
    case 'ceiling':
      return 'TAVAN TUTUNUŞU';
    case 'air':
      return 'HAVA UÇUŞU';
    default:
      return 'SAHA ZEMİNİ';
  }
}

const X_OFFSET_CLASSES: Record<number, string> = {
  [-3]: '-translate-x-12',
  [-2]: '-translate-x-8',
  [-1]: '-translate-x-4',
  [0]: 'translate-x-0',
  [1]: 'translate-x-4',
  [2]: 'translate-x-8',
  [3]: 'translate-x-12'
};

const Y_OFFSET_CLASSES: Record<number, string> = {
  [-3]: '-translate-y-12',
  [-2]: '-translate-y-8',
  [-1]: '-translate-y-4',
  [0]: 'translate-y-0',
  [1]: 'translate-y-4',
  [2]: 'translate-y-8',
  [3]: 'translate-y-12'
};

const SCALE_CLASSES: Record<string, string> = {
  small: 'scale-90',
  normal: 'scale-100',
  large: 'scale-110'
};

export function getMobilePlacementClasses(offset: MobileButtonOffset): string {
  const gx = Math.max(-3, Math.min(3, Math.round(offset.offsetX / 20)));
  const gy = Math.max(-3, Math.min(3, Math.round(offset.offsetY / 20)));
  const sz =
    offset.scale <= 0.92 ? 'small' : offset.scale >= 1.08 ? 'large' : 'normal';
  return `${X_OFFSET_CLASSES[gx] || 'translate-x-0'} ${
    Y_OFFSET_CLASSES[gy] || 'translate-y-0'
  } ${SCALE_CLASSES[sz]}`;
}

const KNOB_X_CLASSES: Record<number, string> = {
  [-2]: '-translate-x-6',
  [-1]: '-translate-x-3',
  [0]: 'translate-x-0',
  [1]: 'translate-x-3',
  [2]: 'translate-x-6'
};

const KNOB_Y_CLASSES: Record<number, string> = {
  [-2]: '-translate-y-6',
  [-1]: '-translate-y-3',
  [0]: 'translate-y-0',
  [1]: 'translate-y-3',
  [2]: 'translate-y-6'
};

export const PlayingHud: React.FC<PlayingHudProps> = ({
  hud,
  showTouchControls,
  mobileConfig,
  mobileInputRef,
  onToggleBallCam,
  onPause
}) => {
  const rawSeconds = hud.isOvertime ? hud.overtimeElapsed : hud.timeRemaining;
  const minutes = Math.floor(rawSeconds / 60);
  const seconds = Math.floor(rawSeconds % 60);
  const formattedTime = `${hud.isOvertime ? '+' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  const boostRadius = 26;
  const boostCircumference = 2 * Math.PI * boostRadius;
  const boostOffset =
    boostCircumference - (Math.min(100, Math.max(0, hud.boost)) / 100) * boostCircumference;

  const activeDodgeLabel = getDodgeLabel(hud.dodgeType);
  const surfaceLabel = getSurfaceLabel(hud.surfaceState);

  // Virtual Analog Joystick state
  const joystickBaseRef = useRef<HTMLDivElement | null>(null);
  const [knobGrid, setKnobGrid] = useState<{ gx: number; gy: number; active: boolean }>({
    gx: 0,
    gy: 0,
    active: false
  });

  const updateJoystickFromPointer = (clientX: number, clientY: number) => {
    const el = joystickBaseRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = Math.max(28, rect.width * 0.42);
    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(maxR, dist);
    const nx = dist > 0.01 ? (dx / dist) * (clampedDist / maxR) : 0;
    const ny = dist > 0.01 ? (dy / dist) * (clampedDist / maxR) : 0;

    // Forward is up (-ny), left steer is +1 (-nx)
    mobileInputRef.current.throttle = Math.abs(ny) < 0.12 ? 0 : -ny;
    mobileInputRef.current.steer = Math.abs(nx) < 0.12 ? 0 : -nx;

    setKnobGrid({
      gx: Math.max(-2, Math.min(2, Math.round(nx * 2))),
      gy: Math.max(-2, Math.min(2, Math.round(ny * 2))),
      active: true
    });
  };

  const resetJoystick = () => {
    mobileInputRef.current.throttle = 0;
    mobileInputRef.current.steer = 0;
    setKnobGrid({ gx: 0, gy: 0, active: false });
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-20 flex flex-col justify-between p-2.5 sm:p-5 select-none">
      {/* TOP BAR: ONLY Menu Button, High-Contrast Scoreboard, and Camera Button */}
      <div className="flex items-start justify-between gap-2 w-full">
        {/* Top-Left: MENU BUTTON */}
        <button
          type="button"
          data-touch-control="true"
          onClick={onPause}
          className="pointer-events-auto px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-[#0b1324] border-2 border-slate-500/90 hover:border-cyan-400 text-white font-display font-bold text-xs sm:text-sm tracking-wide shadow-xl flex items-center gap-2 transition-colors cursor-pointer"
        >
          <svg viewBox="0 0 20 20" className="w-4 h-4 fill-cyan-400 shrink-0" aria-hidden="true">
            <path d="M3 5h14v2H3V5zm0 4h14v2H3V9zm0 4h14v2H3v-2z" />
          </svg>
          <span>MENÜ</span>
        </button>

        {/* Top-Center: Clearly Bounded High-Contrast Stadium Scoreboard */}
        <div className="flex flex-col items-center">
          <div className="flex items-center bg-[#0b1324] border-2 border-slate-500/90 rounded-xl overflow-hidden shadow-2xl">
            {/* Blue Team Score */}
            <div className="px-3 py-1 sm:px-4 sm:py-1.5 bg-cyan-950/90 border-r-2 border-slate-600/80 flex items-center gap-2">
              <span className="text-[10px] sm:text-xs font-display font-bold tracking-wider text-cyan-300">
                MAVİ
              </span>
              <span className="text-lg sm:text-2xl font-display font-bold font-mono-tabular text-white">
                {hud.blueScore}
              </span>
            </div>

            {/* Match Clock / Overtime Golden Goal Clock */}
            <div className="px-3 py-1 sm:px-4 sm:py-1.5 bg-[#111c33] text-center min-w-[78px] sm:min-w-[96px]">
              {hud.isOvertime && (
                <div className="text-[9px] font-display font-bold text-amber-400 tracking-wider leading-none mb-0.5">
                  ALTIN GOL
                </div>
              )}
              <div
                className={`text-sm sm:text-lg font-display font-bold font-mono-tabular tracking-wider leading-tight ${
                  hud.isOvertime ? 'text-amber-300 animate-pulse' : 'text-white'
                }`}
              >
                {formattedTime}
              </div>
            </div>

            {/* Orange Team Score */}
            <div className="px-3 py-1 sm:px-4 sm:py-1.5 bg-amber-950/90 border-l-2 border-slate-600/80 flex items-center gap-2">
              <span className="text-lg sm:text-2xl font-display font-bold font-mono-tabular text-white">
                {hud.orangeScore}
              </span>
              <span className="text-[10px] sm:text-xs font-display font-bold tracking-wider text-amber-300">
                TURUNCU
              </span>
            </div>
          </div>

          {/* Overtime Golden Goal Status Pill */}
          {hud.isOvertime && !hud.goalBanner && (
            <div className="mt-1.5 px-3 py-0.5 rounded-lg bg-amber-950/95 border border-amber-400 text-amber-200 text-[10px] font-display font-bold tracking-wider shadow-xl">
              UZATMA DEVRESİ · GOLÜ ATAN TAKIM KAZANIR!
            </div>
          )}

          {/* Goal / Demolition Event Banner */}
          {hud.goalBanner && (
            <div className="mt-2 px-4 py-1.5 rounded-xl bg-[#0b1324] border-2 border-amber-400 shadow-2xl text-center">
              <div className="text-xs sm:text-sm font-display font-bold text-white tracking-wide">
                {hud.goalBanner.isGoldenGoal ? 'ALTIN GOL! ZAFER · ' : 'GOL! · '}
                {hud.goalBanner.scorer}
              </div>
            </div>
          )}

          {!hud.goalBanner && hud.demolitionBanner && (
            <div className="mt-2 px-3.5 py-1 rounded-xl bg-[#2a0a12] border-2 border-rose-500 shadow-2xl text-center">
              <div className="text-[11px] sm:text-xs font-display font-bold text-rose-200 tracking-wide">
                PATLATMA! {hud.demolitionBanner.attacker} → {hud.demolitionBanner.victim}
              </div>
            </div>
          )}
        </div>

        {/* Top-Right: CAMERA BUTTON ONLY */}
        <button
          type="button"
          data-touch-control="true"
          onClick={onToggleBallCam}
          className={`pointer-events-auto px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border-2 font-display font-bold text-xs sm:text-sm tracking-wide shadow-xl transition-colors cursor-pointer ${
            hud.ballCam
              ? 'bg-[#0c2438] border-cyan-400 text-cyan-200'
              : 'bg-[#0b1324] border-slate-500/90 text-slate-200 hover:border-slate-400'
          }`}
        >
          {hud.ballCam ? 'KAMERA: TOP' : 'KAMERA: SERBEST'}
        </button>
      </div>

      {/* BOTTOM AREA: Compact Telemetry + Touch Controls */}
      <div className="flex flex-col gap-2 w-full">
        {/* Compact High-Contrast Speed & Boost Gauge (Bottom-Right) */}
        <div className="flex items-end justify-end w-full">
          <div className="bg-[#0b1324] border-2 border-slate-500/90 rounded-2xl px-3 py-2 sm:px-4 sm:py-2.5 flex items-center gap-3 shadow-2xl">
            <div className="text-right font-mono-tabular">
              <div className="text-[10px] font-bold text-cyan-300 tracking-wider">
                {activeDodgeLabel || surfaceLabel} · {hud.altitude}m
              </div>
              <div className="text-base sm:text-xl font-display font-bold text-white">
                {hud.speedKmh} <span className="text-[10px] text-slate-300">KM/S</span>
              </div>
              <div className="text-[10px] text-slate-300">
                {hud.supersonic ? 'SÜPERSONİK HIZ' : `Gol: ${hud.playerGoals} · Patlatma: ${hud.playerDemolitions}`}
              </div>
            </div>

            {/* Radial SVG Boost Dial */}
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                <circle
                  cx="32"
                  cy="32"
                  r={boostRadius}
                  fill="#060b16"
                  stroke="#334155"
                  strokeWidth="5"
                />
                <circle
                  cx="32"
                  cy="32"
                  r={boostRadius}
                  fill="none"
                  stroke={hud.supersonic ? '#06b6d4' : '#f59e0b'}
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={boostCircumference}
                  strokeDashoffset={boostOffset}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center font-mono-tabular">
                <span className="text-xs sm:text-sm font-display font-bold text-white leading-none">
                  {hud.boost}
                </span>
                <span className="text-[8px] font-bold text-amber-300 mt-0.5">TURBO</span>
              </div>
            </div>
          </div>
        </div>

        {/* MOBILE / TOUCH DRIVING CONTROLS (Joystick or Buttons + Position-Customizable Action Cluster) */}
        {showTouchControls && (
          <div
            data-touch-control="true"
            className="pointer-events-auto flex items-end justify-between w-full pt-1 pb-1 px-1"
          >
            {/* LEFT SIDE: Virtual Analog Thumbstick (Default) OR D-Pad Buttons */}
            <div className={`transition-transform ${getMobilePlacementClasses(mobileConfig.joystick)}`}>
              {mobileConfig.steerMode === 'joystick' ? (
                <div
                  ref={joystickBaseRef}
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    updateJoystickFromPointer(e.clientX, e.clientY);
                  }}
                  onPointerMove={(e) => {
                    if (!knobGrid.active) return;
                    updateJoystickFromPointer(e.clientX, e.clientY);
                  }}
                  onPointerUp={resetJoystick}
                  onPointerCancel={resetJoystick}
                  className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-[#0b1324]/95 border-2 border-slate-500/90 shadow-2xl flex items-center justify-center touch-none cursor-pointer"
                >
                  {/* Crosshair guide rings */}
                  <div className="w-20 h-20 rounded-full border border-slate-700/80 flex items-center justify-center pointer-events-none">
                    <div className="text-[9px] font-bold text-slate-400 tracking-wider">
                      JOYSTICK
                    </div>
                  </div>
                  {/* Movable Thumbstick Knob */}
                  <div
                    className={`absolute w-11 h-11 rounded-full bg-cyan-500 border-2 border-white shadow-lg pointer-events-none transition-transform duration-75 ${
                      KNOB_X_CLASSES[knobGrid.gx] || 'translate-x-0'
                    } ${KNOB_Y_CLASSES[knobGrid.gy] || 'translate-y-0'}`}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1.5 w-32 bg-[#0b1324]/95 border-2 border-slate-500/90 p-2 rounded-2xl shadow-2xl">
                  <div />
                  <button
                    type="button"
                    aria-label="İleri Gaz"
                    onPointerDown={() => {
                      mobileInputRef.current.throttle = 1;
                    }}
                    onPointerUp={() => {
                      mobileInputRef.current.throttle = 0;
                    }}
                    onPointerLeave={() => {
                      mobileInputRef.current.throttle = 0;
                    }}
                    className="h-10 rounded-xl bg-[#16243d] border border-slate-500 active:bg-cyan-500 active:text-slate-950 flex items-center justify-center text-white font-bold text-xs"
                  >
                    İLERİ
                  </button>
                  <div />
                  <button
                    type="button"
                    aria-label="Sola Dön"
                    onPointerDown={() => {
                      mobileInputRef.current.steer = 1;
                    }}
                    onPointerUp={() => {
                      mobileInputRef.current.steer = 0;
                    }}
                    onPointerLeave={() => {
                      mobileInputRef.current.steer = 0;
                    }}
                    className="h-10 rounded-xl bg-[#16243d] border border-slate-500 active:bg-cyan-500 active:text-slate-950 flex items-center justify-center text-white font-bold text-xs"
                  >
                    SOL
                  </button>
                  <button
                    type="button"
                    aria-label="Geri"
                    onPointerDown={() => {
                      mobileInputRef.current.throttle = -1;
                    }}
                    onPointerUp={() => {
                      mobileInputRef.current.throttle = 0;
                    }}
                    onPointerLeave={() => {
                      mobileInputRef.current.throttle = 0;
                    }}
                    className="h-10 rounded-xl bg-[#16243d] border border-slate-500 active:bg-amber-500 active:text-slate-950 flex items-center justify-center text-white font-bold text-xs"
                  >
                    GERİ
                  </button>
                  <button
                    type="button"
                    aria-label="Sağa Dön"
                    onPointerDown={() => {
                      mobileInputRef.current.steer = -1;
                    }}
                    onPointerUp={() => {
                      mobileInputRef.current.steer = 0;
                    }}
                    onPointerLeave={() => {
                      mobileInputRef.current.steer = 0;
                    }}
                    className="h-10 rounded-xl bg-[#16243d] border border-slate-500 active:bg-cyan-500 active:text-slate-950 flex items-center justify-center text-white font-bold text-xs"
                  >
                    SAĞ
                  </button>
                </div>
              )}
            </div>

            {/* RIGHT SIDE: 4 Position-Customizable Action Buttons (Uçuş, Drift, Zıpla/Takla, Turbo) */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onPointerDown={() => {
                  mobileInputRef.current.flyUpHeld = true;
                }}
                onPointerUp={() => {
                  mobileInputRef.current.flyUpHeld = false;
                }}
                onPointerLeave={() => {
                  mobileInputRef.current.flyUpHeld = false;
                }}
                className={`w-16 h-12 sm:w-20 sm:h-14 rounded-xl bg-[#131c38] border-2 border-indigo-400 active:bg-indigo-500 text-indigo-100 font-display font-bold text-[11px] shadow-xl flex flex-col items-center justify-center transition-transform ${getMobilePlacementClasses(
                  mobileConfig.flyUp
                )}`}
              >
                <span>UÇUŞ</span>
                <span className="text-[9px] text-indigo-300">TAVAN</span>
              </button>

              <button
                type="button"
                onPointerDown={() => {
                  mobileInputRef.current.driftHeld = true;
                }}
                onPointerUp={() => {
                  mobileInputRef.current.driftHeld = false;
                }}
                onPointerLeave={() => {
                  mobileInputRef.current.driftHeld = false;
                }}
                className={`w-16 h-12 sm:w-20 sm:h-14 rounded-xl bg-[#111c30] border-2 border-slate-400 active:bg-slate-600 text-white font-display font-bold text-[11px] shadow-xl flex flex-col items-center justify-center transition-transform ${getMobilePlacementClasses(
                  mobileConfig.drift
                )}`}
              >
                <span>DRİFT</span>
                <span className="text-[9px] text-slate-300">KAYMA</span>
              </button>

              <button
                type="button"
                onPointerDown={() => {
                  mobileInputRef.current.jumpHeld = true;
                  mobileInputRef.current.jumpJustPressed = true;
                }}
                onPointerUp={() => {
                  mobileInputRef.current.jumpHeld = false;
                }}
                onPointerLeave={() => {
                  mobileInputRef.current.jumpHeld = false;
                }}
                className={`w-16 h-14 sm:w-20 sm:h-16 rounded-2xl bg-[#0c263b] border-2 border-cyan-400 active:bg-cyan-500 active:text-slate-950 text-cyan-100 font-display font-bold text-xs shadow-xl flex flex-col items-center justify-center transition-transform ${getMobilePlacementClasses(
                  mobileConfig.jump
                )}`}
              >
                <span>ZIPLA</span>
                <span className="text-[9px] text-cyan-300">TAKLA</span>
              </button>

              <button
                type="button"
                onPointerDown={() => {
                  mobileInputRef.current.boostHeld = true;
                }}
                onPointerUp={() => {
                  mobileInputRef.current.boostHeld = false;
                }}
                onPointerLeave={() => {
                  mobileInputRef.current.boostHeld = false;
                }}
                className={`w-16 h-14 sm:w-20 sm:h-16 rounded-2xl bg-amber-500 border-2 border-amber-200 active:bg-amber-400 text-slate-950 font-display font-bold text-xs shadow-xl flex flex-col items-center justify-center transition-transform ${getMobilePlacementClasses(
                  mobileConfig.boost
                )}`}
              >
                <span>TURBO</span>
                <span className="text-[9px] font-bold">PATLAT</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
