import React, { useMemo } from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { SceneData, TimelineData } from '../../schemas/timeline.schema';

interface AtmosphericStageProps {
  scene?: SceneData;
  timeline?: TimelineData;
}

export const AtmosphericStage: React.FC<AtmosphericStageProps> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const totalFrames = scene ? Math.max(1, Math.round(scene.durationSec * (fps || 30))) : 300;
  const driftScale = interpolate(frame, [0, totalFrames], [1.0, 1.04], {
    extrapolateRight: 'clamp',
  });

  const cyanX = 45 + Math.sin(frame * 0.02) * 8;
  const cyanY = 48 + Math.cos(frame * 0.025) * 6;
  const amberX = 65 + Math.cos(frame * 0.018) * 7;
  const amberY = 52 + Math.sin(frame * 0.022) * 5;

  const dustParticles = useMemo(() => {
    return Array.from({ length: 18 }).map((_, i) => ({
      seedX: (i * 107 + 31) % 100,
      seedY: (i * 73 + 19) % 100,
      size: 1 + (i % 3),
      speed: 0.15 + (i % 4) * 0.08,
      opacity: 0.12 + (i % 5) * 0.04,
    }));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none bg-gradient-to-b from-[#131B2E] via-[#0E1524] to-[#0A0E18] select-none z-0">
      <div
        className="absolute inset-0 will-change-transform"
        style={{
          transform: `scale(${driftScale})`,
          background: `radial-gradient(circle 950px at ${cyanX}% ${cyanY}%, rgba(0, 245, 212, 0.25) 0%, transparent 75%),
                       radial-gradient(circle 850px at ${amberX}% ${amberY}%, rgba(245, 158, 11, 0.18) 0%, transparent 70%),
                       radial-gradient(ellipse 1300px 850px at 50% 50%, rgba(22, 34, 58, 0.85) 0%, #0A0F1A 90%)`,
        }}
      />

      <div
        className="absolute inset-0 pointer-events-none opacity-45"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(50, 75, 120, 0.55) 1px, transparent 1px), linear-gradient(to bottom, rgba(50, 75, 120, 0.55) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
      />

      <div className="absolute inset-0 flex flex-col justify-between py-16 px-24 pointer-events-none">
        <div className="w-full border-b border-white/[0.06]" />
        <div className="w-full border-b border-white/[0.04]" />
        <div className="w-full border-b border-white/[0.06]" />
      </div>

      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {dustParticles.map((p, i) => {
          const posX =
            ((p.seedX * 19.2 + Math.sin(frame * 0.02 + i) * 20 + frame * p.speed * 0.8) % 1920 + 1920) % 1920;
          const posY =
            ((p.seedY * 10.8 + Math.cos(frame * 0.015 + i) * 15 - frame * p.speed) % 1080 + 1080) % 1080;

          return (
            <div
              key={i}
              className="absolute rounded-full bg-slate-200 pointer-events-none"
              style={{
                left: `${posX}px`,
                top: `${posY}px`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                opacity: p.opacity,
                boxShadow: '0 0 4px rgba(0, 245, 212, 0.5)',
              }}
            />
          );
        })}
      </div>

      <div className="absolute top-12 left-12 text-[#94A3B8]/25 font-mono text-xs select-none">
        +
      </div>
      <div className="absolute top-12 right-12 text-[#94A3B8]/25 font-mono text-xs select-none">
        +
      </div>
      <div className="absolute bottom-12 left-12 text-[#94A3B8]/25 font-mono text-xs select-none">
        +
      </div>
      <div className="absolute bottom-12 right-12 text-[#94A3B8]/25 font-mono text-xs select-none">
        +
      </div>
    </div>
  );
};
