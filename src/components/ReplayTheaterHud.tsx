import React from 'react';
import { ReplayEventMarker } from '../game/rules';

interface ReplayTheaterHudProps {
  currentFrame: number;
  totalFrames: number;
  playing: boolean;
  speed: number;
  cameraMode: 'player' | 'ball' | 'stadium';
  blueScore: number;
  orangeScore: number;
  events: ReplayEventMarker[];
  canResumeMatch: boolean;
  onTogglePlay: () => void;
  onSeekFrame: (frameIdx: number) => void;
  onChangeSpeed: (speed: number) => void;
  onChangeCamera: (mode: 'player' | 'ball' | 'stadium') => void;
  onResumeMatch: () => void;
  onExitToLobby: () => void;
}

export const ReplayTheaterHud: React.FC<ReplayTheaterHudProps> = ({
  currentFrame,
  totalFrames,
  playing,
  speed,
  cameraMode,
  blueScore,
  orangeScore,
  events,
  canResumeMatch,
  onTogglePlay,
  onSeekFrame,
  onChangeSpeed,
  onChangeCamera,
  onResumeMatch,
  onExitToLobby
}) => {
  const safeTotal = Math.max(1, totalFrames);
  const currentSec = (currentFrame / 15).toFixed(1);
  const totalSec = (safeTotal / 15).toFixed(1);

  return (
    <div className="fixed inset-0 pointer-events-none z-30 flex flex-col justify-between p-4 sm:p-6">
      {/* Top Bar: Replay Mode Header + Score at Frame + Exit Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="bg-[#09101f]/95 border border-cyan-500/60 rounded-xl px-4 py-2 flex items-center gap-3 shadow-2xl">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
          <div>
            <div className="font-display font-bold text-sm text-white tracking-wide">
              3D MAÇ TEKRARI İZLEME (REPLAY STÜDYOSU)
            </div>
            <div className="text-[11px] text-cyan-300 font-mono-tabular">
              Kare: {currentFrame + 1} / {safeTotal} ({currentSec}s / {totalSec}s) · Skor: Mavi {blueScore} - {orangeScore} Turuncu
            </div>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          {canResumeMatch && (
            <button
              type="button"
              onClick={onResumeMatch}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-xs whitespace-nowrap shadow-lg"
            >
              MAÇA DEVAM ET
            </button>
          )}
          <button
            type="button"
            onClick={onExitToLobby}
            className="px-4 py-2 rounded-xl bg-[#09101f]/95 border border-slate-700 hover:border-cyan-400 text-slate-200 font-display font-semibold text-xs whitespace-nowrap shadow-lg"
          >
            ANA LOBİYE DÖN
          </button>
        </div>
      </div>

      {/* Bottom Replay Scrubber & Camera/Speed Controls */}
      <div className="pointer-events-auto w-full max-w-[920px] self-center bg-[#09101f]/95 border border-slate-700/80 rounded-2xl p-4 shadow-2xl space-y-3">
        {/* Event Markers Row */}
        {events.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-[11px] font-semibold text-slate-400 shrink-0">
              Önemli Anlar:
            </span>
            {events.map((ev, idx) => (
              <button
                key={`${ev.frameIndex}_${idx}`}
                type="button"
                onClick={() => onSeekFrame(Math.max(0, ev.frameIndex - 15))}
                className="px-2.5 py-1 rounded-lg bg-[#0d1629] hover:bg-slate-800 border border-slate-700 text-[11px] text-amber-300 font-medium whitespace-nowrap shrink-0"
              >
                {ev.label} ({(ev.frameIndex / 15).toFixed(1)}s)
              </button>
            ))}
          </div>
        )}

        {/* Timeline Scrubber */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label={playing ? 'Tekrarı Duraklat' : 'Tekrarı Oynat'}
            onClick={onTogglePlay}
            className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-display font-bold text-xs whitespace-nowrap shrink-0"
          >
            {playing ? 'DURAKLAT' : 'OYNAT'}
          </button>

          <input
            type="range"
            aria-label="Maç Tekrarı Zaman Çizelgesi"
            min={0}
            max={Math.max(0, safeTotal - 1)}
            value={Math.min(currentFrame, Math.max(0, safeTotal - 1))}
            onChange={(e) => onSeekFrame(Number(e.target.value))}
            className="flex-1 accent-cyan-400 cursor-pointer"
          />

          <span className="text-xs font-mono-tabular text-slate-300 shrink-0">
            {currentSec}s / {totalSec}s
          </span>
        </div>

        {/* Camera Angle & Playback Speed Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">Kamera Açısı:</span>
            {(
              [
                { id: 'player', label: 'Oyuncu Kamerası' },
                { id: 'ball', label: 'Top Odaklı' },
                { id: 'stadium', label: 'Stadyum Geniş Açı' }
              ] as const
            ).map((cam) => (
              <button
                key={cam.id}
                type="button"
                onClick={() => onChangeCamera(cam.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  cameraMode === cam.id
                    ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-300'
                    : 'bg-[#050912] text-slate-400 hover:text-white'
                }`}
              >
                {cam.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">Oynatma Hızı:</span>
            {[0.5, 1, 2].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => onChangeSpeed(spd)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono-tabular font-semibold transition-colors ${
                  speed === spd
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-[#050912] text-slate-400 hover:text-white'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
