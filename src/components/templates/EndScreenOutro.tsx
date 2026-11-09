import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Play, ArrowUpRight } from 'lucide-react';
import { EndScreenOutroPropsSchema, SceneData } from '../../schemas/timeline.schema';

interface EndScreenOutroProps {
  scene: SceneData;
}

const CornerCrosshairs: React.FC<{ accentColor?: string }> = ({ accentColor = '#38BDF8' }) => (
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

const VexlociMonogram: React.FC<{ size?: number }> = ({ size = 64 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="monogramGradient" x1="15" y1="15" x2="85" y2="85" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#38BDF8" />
        <stop offset="60%" stopColor="#38BDF8" />
        <stop offset="100%" stopColor="#F59E0B" />
      </linearGradient>
      <linearGradient id="facetGradient" x1="50" y1="20" x2="50" y2="80" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#0B1220" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#0B1220" stopOpacity="0.0" />
      </linearGradient>
    </defs>
    <polygon
      points="50,86 16,22 34,22 50,56 66,22 84,22"
      fill="url(#monogramGradient)"
    />
    <polygon
      points="50,86 50,56 66,22 84,22"
      fill="url(#facetGradient)"
    />
  </svg>
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
  const headerOpacity = interpolate(headerSpring, [0, 1], [0.2, 1]);
  const headerY = interpolate(headerSpring, [0, 1], [-20, 0]);

  const leftCardSpring = spring({
    frame: frame - 4,
    fps,
    config: { damping: 14, mass: 0.9, stiffness: 110 },
  });
  const leftCardOpacity = interpolate(leftCardSpring, [0, 1], [0.2, 1]);
  const leftCardY = interpolate(leftCardSpring, [0, 1], [20, 0]);

  const rightCardSpring = spring({
    frame: frame - 6,
    fps,
    config: { damping: 14, mass: 0.9, stiffness: 110 },
  });
  const rightCardOpacity = interpolate(rightCardSpring, [0, 1], [0.2, 1]);
  const rightCardY = interpolate(rightCardSpring, [0, 1], [20, 0]);

  const centerSpring = spring({
    frame: frame - 8,
    fps,
    config: { damping: 12, mass: 0.8, stiffness: 130 },
  });
  const centerScale = interpolate(centerSpring, [0, 1], [0.75, 1]);
  const centerOpacity = interpolate(centerSpring, [0, 1], [0.2, 1]);

  const reticlePulse = interpolate(
    Math.sin((frame / fps) * Math.PI * 2),
    [-1, 1],
    [0.96, 1.04]
  );
  const ringRotation = (frame * 0.8) % 360;

  return (
    <div className="relative w-full h-full bg-[#0B1220] overflow-hidden select-none hud-grid">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle 900px at 50% 50%, rgba(56, 189, 248, 0.15) 0%, transparent 70%),
                       radial-gradient(circle 750px at 70% 40%, rgba(245, 158, 11, 0.12) 0%, transparent 65%)`,
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(30, 41, 59, 0.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(30, 41, 59, 0.6) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
      />
      <div className="absolute inset-0 hud-scanline pointer-events-none opacity-20" />

      <div
        className="absolute top-[80px] left-0 right-0 flex flex-col items-center justify-center text-center px-12"
        style={{
          opacity: headerOpacity,
          transform: `translateY(${headerY}px)`,
        }}
      >
        <span className="text-xs font-mono font-bold tracking-widest text-[#38BDF8] uppercase">
          CASE FILE SEALED // ARCHIVE COMPLETE
        </span>
        <h1 className="font-heading font-black tracking-[0.25em] text-white text-3xl mt-2 uppercase drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]">
          VEXLOCI
        </h1>
        <p className="text-xs font-mono tracking-[0.2em] text-[#94A3B8] mt-1.5 uppercase">
          FINANCIAL FORENSICS // OFFICIAL DOSSIER ARCHIVE
        </p>
      </div>

      <div
        className="absolute bg-[#0E1726] border border-[#1E293B] rounded-xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex flex-col justify-between p-6"
        style={{
          left: '120px',
          top: '360px',
          width: '620px',
          height: '350px',
          opacity: leftCardOpacity,
          transform: `translateY(${leftCardY}px)`,
        }}
      >
        <CornerCrosshairs accentColor="#38BDF8" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#38BDF8]" />
            <span className="text-xs font-mono font-bold tracking-widest text-[#38BDF8] uppercase">
              {props.leftCardLabel}
            </span>
          </div>
          <ArrowUpRight className="w-5 h-5 text-[#94A3B8]" />
        </div>
        <div className="flex flex-col items-center justify-center my-auto">
          <div className="w-14 h-14 rounded-full bg-[#0B1220] border border-[#1E293B] flex items-center justify-center text-[#38BDF8]">
            <Play className="w-6 h-6 ml-0.5 fill-[#38BDF8]/20" />
          </div>
        </div>
        <div className="h-4" />
      </div>

      <div
        className="absolute bg-[#0E1726] border border-[#1E293B] rounded-xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex flex-col justify-between p-6"
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
          <div className="w-14 h-14 rounded-full bg-[#0B1220] border border-[#1E293B] flex items-center justify-center text-[#F59E0B]">
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
          className="absolute inset-0 rounded-2xl border border-dashed border-[#38BDF8]/40"
          style={{
            transform: `rotate(${ringRotation}deg)`,
          }}
        />
        <div className="w-28 h-28 rounded-2xl bg-[#0B1220] border-2 border-[#38BDF8] flex items-center justify-center shadow-[0_0_35px_rgba(56,189,248,0.25)] relative">
          <CornerCrosshairs accentColor="#38BDF8" />
          <VexlociMonogram size={56} />
        </div>
      </div>

      <div
        className="absolute left-0 right-0 flex justify-center text-center"
        style={{
          top: '635px',
          opacity: centerOpacity,
        }}
      >
        <span className="text-xs font-mono font-bold tracking-widest text-[#38BDF8] uppercase bg-[#0B1220]/90 px-4 py-1.5 rounded-md border border-[#1E293B]">
          {props.subscribeLabel}
        </span>
      </div>
    </div>
  );
};
