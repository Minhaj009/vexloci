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
  const driftScale = interpolate(frame, [0, totalFrames], [1.0, 1.02], {
    extrapolateRight: 'clamp',
  });

  const dustParticles = useMemo(() => {
    return Array.from({ length: 14 }).map((_, i) => ({
      seedX: (i * 107 + 31) % 100,
      seedY: (i * 73 + 19) % 100,
      size: 1.5 + (i % 2),
      speed: 0.10 + (i % 3) * 0.05,
      opacity: 0.12 + (i % 4) * 0.03,
    }));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none bg-[#F8FAFC] select-none z-0">
      <div
        className="absolute inset-0 will-change-transform"
        style={{
          transform: `scale(${driftScale})`,
          background: 'radial-gradient(ellipse 1400px 900px at 50% 35%, #FFFFFF 0%, #F1F5F9 100%)',
        }}
      />

      <div
        className="absolute inset-0 pointer-events-none opacity-45"
        style={{
          backgroundImage: 'radial-gradient(circle, #CBD5E1 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {dustParticles.map((p, i) => {
          const posX =
            ((p.seedX * 19.2 + Math.sin(frame * 0.02 + i) * 15 + frame * p.speed * 0.6) % 1920 + 1920) % 1920;
          const posY =
            ((p.seedY * 10.8 + Math.cos(frame * 0.015 + i) * 10 - frame * p.speed * 0.8) % 1080 + 1080) % 1080;

          return (
            <div
              key={i}
              className="absolute rounded-full bg-slate-400 pointer-events-none"
              style={{
                left: `${posX}px`,
                top: `${posY}px`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                opacity: p.opacity,
              }}
            />
          );
        })}
      </div>

      <div className="absolute top-12 left-12 text-[#94A3B8]/35 font-mono text-xs select-none">
        +
      </div>
      <div className="absolute top-12 right-12 text-[#94A3B8]/35 font-mono text-xs select-none">
        +
      </div>
      <div className="absolute bottom-12 left-12 text-[#94A3B8]/35 font-mono text-xs select-none">
        +
      </div>
      <div className="absolute bottom-12 right-12 text-[#94A3B8]/35 font-mono text-xs select-none">
        +
      </div>
    </div>
  );
};
