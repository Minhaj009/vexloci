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
      <div className="inline-flex items-center gap-2.5 backdrop-blur-md bg-[#080A0F]/90 border border-white/10 px-6 py-2.5 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.8)] max-w-2xl">
        <div className="flex items-center gap-2.5 text-xl font-heading tracking-tight">
          {visibleWords.map((item, idx) => {
            const globalIdx = startIdx + idx;
            const isActive = globalIdx === activeIndex;
            const isPast = globalIdx < activeIndex;

            return (
              <span
                key={`${item.word}-${globalIdx}`}
                className={`transition-all duration-100 inline-block ${
                  isActive
                    ? 'text-[#00F5D4] font-bold drop-shadow-[0_0_10px_rgba(0,245,212,0.8)] scale-105'
                    : isPast
                    ? 'text-white/85 font-medium'
                    : 'text-slate-400/35 font-normal'
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
