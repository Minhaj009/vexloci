import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Play, Disc, ArrowUpRight } from 'lucide-react';
import { EndScreenOutroPropsSchema, SceneData } from '../../schemas/timeline.schema';

interface EndScreenOutroProps {
  scene: SceneData;
}

const CornerCrosshairs: React.FC<{ accentColor?: string }> = ({ accentColor = '#00F5D4' }) => (
  <>
    <div
      className="absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2"
      style={{ borderColor: accentColor }}
    />
    <div
      className="absolute top-2 right-2 w-3.5 h-3.5 border-t-2 border-r-2"
      style={{ borderColor: accentColor }}
    />
    <div
      className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b-2 border-l-2"
      style={{ borderColor: accentColor }}
    />
    <div
      className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b-2 border-r-2"
      style={{ borderColor: accentColor }}
    />
  </>
);

export const EndScreenOutro: React.FC<EndScreenOutroProps> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const props = EndScreenOutroPropsSchema.parse(scene.props ?? {});

  const headerSpring = spring({
    frame,
    fps,
    config: { damping: 14, mass: 0.9, stiffness: 100 },
  });
  const headerOpacity = interpolate(headerSpring, [0, 1], [0, 1]);
  const headerY = interpolate(headerSpring, [0, 1], [-20, 0]);

  const leftCardSpring = spring({
    frame: frame - 6,
    fps,
    config: { damping: 14, mass: 0.9, stiffness: 90 },
  });
  const leftCardOpacity = interpolate(leftCardSpring, [0, 1], [0, 1]);
  const leftCardY = interpolate(leftCardSpring, [0, 1], [25, 0]);

  const rightCardSpring = spring({
    frame: frame - 10,
    fps,
    config: { damping: 14, mass: 0.9, stiffness: 90 },
  });
  const rightCardOpacity = interpolate(rightCardSpring, [0, 1], [0, 1]);
  const rightCardY = interpolate(rightCardSpring, [0, 1], [25, 0]);

  const centerSpring = spring({
    frame: frame - 14,
    fps,
    config: { damping: 12, mass: 0.8, stiffness: 120 },
  });
  const centerScale = interpolate(centerSpring, [0, 1], [0.7, 1]);
  const centerOpacity = interpolate(centerSpring, [0, 1], [0, 1]);

  const reticlePulse = interpolate(
    Math.sin((frame / fps) * Math.PI * 2),
    [-1, 1],
    [0.96, 1.04]
  );
  const ringRotation = (frame * 0.8) % 360;

  return (
    <div className="relative w-full h-full bg-[#080A0F] overflow-hidden select-none hud-grid">
      <div className="absolute inset-0 hud-scanline pointer-events-none opacity-30" />

      <div
        className="absolute top-[80px] left-0 right-0 flex flex-col items-center justify-center text-center px-12"
        style={{
          opacity: headerOpacity,
          transform: `translateY(${headerY}px)`,
        }}
      >
        <span className="text-xs font-mono font-bold tracking-widest text-[#00F5D4] uppercase">
          CASE FILE SEALED // ARCHIVE COMPLETE
        </span>
        <h1 className="text-4xl font-heading font-extrabold text-[#F1F5F9] mt-2 tracking-tight">
          {props.title}
        </h1>
        <p className="text-sm font-mono tracking-wider text-[#94A3B8] mt-1.5">
          {props.subtitle}
        </p>
      </div>

      <div
        className="absolute bg-[#11151F] border border-[#1E2536] rounded-xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex flex-col justify-between p-6"
        style={{
          left: '120px',
          top: '360px',
          width: '620px',
          height: '350px',
          opacity: leftCardOpacity,
          transform: `translateY(${leftCardY}px)`,
        }}
      >
        <CornerCrosshairs accentColor="#00F5D4" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00F5D4]" />
            <span className="text-xs font-mono font-bold tracking-widest text-[#00F5D4] uppercase">
              {props.leftCardLabel}
            </span>
          </div>
          <ArrowUpRight className="w-5 h-5 text-[#94A3B8]" />
        </div>
        <div className="flex flex-col items-center justify-center my-auto">
          <div className="w-14 h-14 rounded-full bg-[#080A0F] border border-[#1E2536] flex items-center justify-center text-[#00F5D4]">
            <Play className="w-6 h-6 ml-0.5 fill-[#00F5D4]/20" />
          </div>
        </div>
        <div className="h-4" />
      </div>

      <div
        className="absolute bg-[#11151F] border border-[#1E2536] rounded-xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex flex-col justify-between p-6"
        style={{
          left: '1180px',
          top: '360px',
          width: '620px',
          height: '350px',
          opacity: rightCardOpacity,
          transform: `translateY(${rightCardY}px)`,
        }}
      >
        <CornerCrosshairs accentColor="#F59E0B" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
            <span className="text-xs font-mono font-bold tracking-widest text-[#F59E0B] uppercase">
              {props.rightCardLabel}
            </span>
          </div>
          <ArrowUpRight className="w-5 h-5 text-[#94A3B8]" />
        </div>
        <div className="flex flex-col items-center justify-center my-auto">
          <div className="w-14 h-14 rounded-full bg-[#080A0F] border border-[#1E2536] flex items-center justify-center text-[#F59E0B]">
            <Play className="w-6 h-6 ml-0.5 fill-[#F59E0B]/20" />
          </div>
        </div>
        <div className="h-4" />
      </div>

      <div
        className="absolute flex items-center justify-center"
        style={{
          left: '890px',
          top: '460px',
          width: '140px',
          height: '140px',
          opacity: centerOpacity,
          transform: `scale(${centerScale * reticlePulse})`,
        }}
      >
        <div
          className="absolute inset-0 rounded-full border border-dashed border-[#00F5D4]/40"
          style={{
            transform: `rotate(${ringRotation}deg)`,
          }}
        />
        <div className="w-full h-full rounded-full bg-[#11151F] border-2 border-[#00F5D4] flex items-center justify-center shadow-[0_0_35px_rgba(0,245,212,0.25)]">
          <Disc className="w-12 h-12 text-[#00F5D4]" />
        </div>
      </div>

      <div
        className="absolute left-0 right-0 flex justify-center text-center"
        style={{
          top: '625px',
          opacity: centerOpacity,
        }}
      >
        <span className="text-xs font-mono font-bold tracking-widest text-[#00F5D4] uppercase">
          {props.subscribeLabel}
        </span>
      </div>
    </div>
  );
};
