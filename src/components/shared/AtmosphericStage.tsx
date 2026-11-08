import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { SceneData, TimelineData } from '../../schemas/timeline.schema';

interface AtmosphericStageProps {
  scene?: SceneData;
  timeline?: TimelineData;
}

export const AtmosphericStage: React.FC<AtmosphericStageProps> = ({ scene, timeline }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const totalFrames = scene ? Math.max(1, Math.round(scene.durationSec * fps)) : 300;
  const driftScale = interpolate(frame, [0, totalFrames], [1.0, 1.04], {
    extrapolateRight: 'clamp',
  });

  const pulse = Math.sin(frame * 0.03);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none bg-[#080A0F] select-none z-0">
      {/* Procedural Atmospheric Radial Illumination / Center Cyan & Amber Bloom */}
      <div
        className="absolute inset-0 will-change-transform"
        style={{
          transform: `scale(${driftScale})`,
          background: `radial-gradient(ellipse 900px 600px at ${50 + pulse * 4}% 48%, rgba(0,245,212,0.08) 0%, rgba(14,20,35,0.5) 55%, #080A0F 90%)`,
        }}
      />

      {/* Technical Operations Room Accents: Faint horizontal guidelines at 8% opacity */}
      <div className="absolute inset-0 flex flex-col justify-between py-16 px-24 pointer-events-none">
        <div className="w-full border-b border-white/[0.06]" />
        <div className="w-full border-b border-white/[0.04]" />
        <div className="w-full border-b border-white/[0.06]" />
      </div>

      {/* Technical Registration Crosshairs */}
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
