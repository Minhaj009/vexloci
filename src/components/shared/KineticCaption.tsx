import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { SceneData } from '../../schemas/timeline.schema';

interface KineticCaptionProps {
  scene: SceneData;
  className?: string;
}

export const KineticCaption: React.FC<KineticCaptionProps> = ({ scene, className }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentSec = frame / fps;

  if (!scene.words || scene.words.length === 0) {
    return null;
  }

  const normalizedWords = scene.words.map((w) => {
    const isTimelineOffset = scene.startTimeSec > 0 && w.startSec >= scene.startTimeSec;
    return {
      word: w.word,
      start: isTimelineOffset ? w.startSec - scene.startTimeSec : w.startSec,
      end: isTimelineOffset ? w.endSec - scene.startTimeSec : w.endSec,
    };
  });

  let activeIndex = normalizedWords.findIndex(
    (w) => currentSec >= w.start && currentSec <= w.end
  );

  if (activeIndex === -1) {
    for (let i = normalizedWords.length - 1; i >= 0; i--) {
      if (currentSec >= normalizedWords[i].end) {
        activeIndex = i;
        break;
      }
    }
  }

  if (activeIndex === -1 && normalizedWords.length > 0) {
    activeIndex = 0;
  }

  const WINDOW_SIZE = 4;
  let startIdx = Math.max(0, activeIndex - 1);
  let endIdx = startIdx + WINDOW_SIZE;
  if (endIdx > normalizedWords.length) {
    endIdx = normalizedWords.length;
    startIdx = Math.max(0, endIdx - WINDOW_SIZE);
  }

  const visibleWords = normalizedWords.slice(startIdx, endIdx);

  return (
    <div className={className || "absolute left-0 right-0 bottom-7 z-50 flex justify-center pointer-events-none select-none px-4"}>
      <div className="inline-flex items-center gap-3 backdrop-blur-md bg-white/95 border-2 border-slate-300 rounded-2xl shadow-[0_12px_36px_rgba(15,23,42,0.15)] px-8 py-3.5 max-w-2xl text-2xl font-black">
        <div className="flex items-center gap-3 text-2xl font-heading tracking-tight">
          {visibleWords.map((item, idx) => {
            const globalIdx = startIdx + idx;
            const isActive = globalIdx === activeIndex;
            const isPast = globalIdx < activeIndex;

            return (
              <span
                key={`${item.word}-${globalIdx}`}
                className={`transition-all duration-100 inline-block ${
                  isActive
                    ? 'text-[#2563EB] font-black scale-110 drop-shadow-sm'
                    : isPast
                    ? 'text-slate-800 font-bold'
                    : 'text-slate-400/60 font-medium'
                }`}
              >
                {item.word}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};
