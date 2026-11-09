import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Play, ArrowUpRight } from 'lucide-react';
import { EndScreenOutroPropsSchema, SceneData } from '../../schemas/timeline.schema';

interface EndScreenOutroProps {
  scene: SceneData;
}

const CornerCrosshairs: React.FC<{ accentColor?: string }> = ({ accentColor = '#2563EB' }) => (
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
        <stop offset="0%" stopColor="#1E3A8A" />
        <stop offset="60%" stopColor="#2563EB" />
        <stop offset="100%" stopColor="#D97706" />
      </linearGradient>
      <linearGradient id="facetGradient" x1="50" y1="20" x2="50" y2="80" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.0" />
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
    [0.97, 1.03]
  );
  const ringRotation = (frame * 0.6) % 360;

  return (
    <div className="relative w-full h-full bg-[#F8FAFC] overflow-hidden select-none">
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: 'radial-gradient(circle, #CBD5E1 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div
        className="absolute top-[80px] left-0 right-0 flex flex-col items-center justify-center text-center px-12"
        style={{
          opacity: headerOpacity,
          transform: `translateY(${headerY}px)`,
        }}
      >
        <span className="text-xs font-mono font-bold tracking-widest text-[#2563EB] uppercase">
          CASE FILE SEALED // ARCHIVE COMPLETE
        </span>
        <h1 className="font-heading font-black tracking-[0.25em] text-slate-900 text-3xl mt-2 uppercase drop-shadow-xs">
          VEXLOCI
        </h1>
        <p className="text-xs font-mono tracking-[0.2em] text-slate-500 mt-1.5 uppercase">
          FINANCIAL FORENSICS // OFFICIAL DOSSIER ARCHIVE
        </p>
      </div>

      <div
        className="absolute bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.06)] flex flex-col justify-between p-6 text-slate-900"
        style={{
          left: '120px',
          top: '360px',
          width: '620px',
          height: '350px',
          opacity: leftCardOpacity,
          transform: `translateY(${leftCardY}px)`,
        }}
      >
        <CornerCrosshairs accentColor="#2563EB" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
            <span className="text-xs font-mono font-bold tracking-widest text-[#2563EB] uppercase">
              {props.leftCardLabel}
            </span>
          </div>
          <ArrowUpRight className="w-5 h-5 text-slate-400" />
        </div>
        <div className="flex flex-col items-center justify-center my-auto">
          <div className="w-14 h-14 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-[#2563EB]">
            <Play className="w-6 h-6 ml-0.5 fill-[#2563EB]/15" />
          </div>
        </div>
        <div className="h-4" />
      </div>

      <div
        className="absolute bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.06)] flex flex-col justify-between p-6 text-slate-900"
        style={{
          left: '1180px',
          top: '360px',
          width: '620px',
          height: '350px',
          opacity: rightCardOpacity,
          transform: `translateY(${rightCardY}px)`,
        }}
      >
        <CornerCrosshairs accentColor="#D97706" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" />
            <span className="text-xs font-mono font-bold tracking-widest text-[#D97706] uppercase">
              {props.rightCardLabel}
            </span>
          </div>
          <ArrowUpRight className="w-5 h-5 text-slate-400" />
        </div>
        <div className="flex flex-col items-center justify-center my-auto">
          <div className="w-14 h-14 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-[#D97706]">
            <Play className="w-6 h-6 ml-0.5 fill-[#D97706]/15" />
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
          className="absolute inset-0 rounded-2xl border border-dashed border-slate-300"
          style={{
            transform: `rotate(${ringRotation}deg)`,
          }}
        />
        <div className="w-28 h-28 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200 flex items-center justify-center shadow-[0_8px_24px_rgba(0,0,0,0.06)] relative">
          <CornerCrosshairs accentColor="#2563EB" />
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
        <span className="text-xs font-mono font-bold tracking-widest text-[#2563EB] uppercase bg-white px-4 py-1.5 rounded-md border border-slate-200 shadow-xs">
          {props.subscribeLabel}
        </span>
      </div>
    </div>
  );
};
