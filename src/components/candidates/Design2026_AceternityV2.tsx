import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Network, Router, Server, Printer, ShieldAlert, CheckCircle2, Cpu, Activity, AlertOctagon } from 'lucide-react';
import { cn } from '../../lib/utils';

export const Design2026_AceternityV2: React.FC = () => {
  const frame = useCurrentFrame();

  const blocks = [
    {
      step: '01',
      title: 'Dhaka LAN',
      subtitle: 'Office Network',
      spec: '192.168.10.0/24',
      status: 'OPERATIONAL',
      icon: Network,
      isCompromised: false,
    },
    {
      step: '02',
      title: 'D-Link Switch',
      subtitle: '$10 Unmanaged Hub',
      spec: 'DES-1008D // L2',
      status: 'EXPOSED',
      icon: Router,
      isCompromised: true,
    },
    {
      step: '03',
      title: 'SWIFT Server',
      subtitle: 'Core Payment Terminal',
      spec: 'SAA ORACLE // 1521',
      status: 'PIVOT TARGET',
      icon: Server,
      isCompromised: true,
    },
    {
      step: '04',
      title: 'LaserJet 400',
      subtitle: 'Audit Report Printer',
      spec: 'RAW TCP // PORT 9100',
      status: 'SUPPRESSED',
      icon: Printer,
      isCompromised: true,
    },
  ];

  const flows = [
    { label: 'No VLAN Isolation', sub: 'Shared Broadcast Domain' },
    { label: 'Unrestricted Pivot', sub: 'Direct L2 Bridge' },
    { label: 'Hardcopy Suppressed', sub: 'Paper Trail Wiped' },
  ];

  // Mathematical Geometry (Unified 1920x1080 Viewport)
  const cardW = 310;
  const cardH = 240;
  const cardY = 440;
  const portY = cardY + cardH / 2; // Exact Y: 560px

  const gap = 150;
  const totalW = blocks.length * cardW + (blocks.length - 1) * gap; // 4*310 + 3*150 = 1240 + 450 = 1690px
  const startX = (1920 - totalW) / 2; // 115px

  const cardPositions = blocks.map((_, i) => ({
    x: startX + i * (cardW + gap),
    y: cardY,
    w: cardW,
    h: cardH,
  }));

  const badgeW = 156;
  const badgeH = 38;

  return (
    <div className="w-[1920px] h-[1080px] bg-[#F8FAFC] select-none relative overflow-hidden font-sans">
      {/* 2026 Aceternity Subtle Radial Beam Glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(224, 231, 255, 0.45) 0%, rgba(248, 250, 252, 0) 70%)',
        }}
      />

      {/* Aceternity Dot Matrix */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#94A3B8 1.2px, transparent 1.2px)',
          backgroundSize: '32px 32px',
          maskImage: 'radial-gradient(ellipse at 50% 50%, black 55%, transparent 90%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 50%, black 55%, transparent 90%)',
          opacity: 0.6,
        }}
      />

      {/* Cinematic Studio Header */}
      <div className="absolute top-14 left-1/2 -translate-x-1/2 w-[1690px] flex items-center justify-between z-30">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono tracking-widest text-blue-600 font-bold uppercase bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                FORENSIC TOPOLOGY // 2026 ACETERNITY BENTO V2
              </span>
              <span className="text-[10px] font-mono text-slate-400">•</span>
              <span className="text-[10px] font-mono text-slate-500 font-semibold">ZERO-TRUST AUDIT FAILURE</span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-heading mt-0.5">
              SWIFT Alliance Network // Physical Attack Vector
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="px-4 py-2 rounded-xl bg-white/90 backdrop-blur-md border border-slate-200 shadow-xs flex items-center gap-2 text-xs font-mono text-slate-700 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
            <span>4 CLUSTERS MONITORED</span>
          </div>
          <div className="px-4 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono font-bold flex items-center gap-2 shadow-xs">
            <AlertOctagon className="w-4 h-4 text-rose-600" />
            <span>CRITICAL VULNERABILITY EXPLOITED</span>
          </div>
        </div>
      </div>

      {/* SVG Active Connectors (Same 1920x1080 Coordinate System) */}
      <svg className="absolute inset-0 w-[1920px] h-[1080px] pointer-events-none z-10">
        <defs>
          <linearGradient id="streamPulseGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#DC2626" />
          </linearGradient>
        </defs>

        {flows.map((_, idx) => {
          const src = cardPositions[idx];
          const dst = cardPositions[idx + 1];
          const x1 = src.x + src.w;
          const x2 = dst.x;
          const midX = (x1 + x2) / 2;

          // Break line 10px before and after badge
          const badgeGap = badgeW / 2 + 10;
          const leftLineEnd = midX - badgeGap;
          const rightLineStart = midX + badgeGap;

          const streamColor = idx >= 0 ? '#DC2626' : '#2563EB';
          const cycle = ((frame * 0.03 + idx * 0.33) % 1);
          const photonX = x1 + (x2 - x1) * cycle;

          return (
            <g key={idx}>
              {/* Segment 1 */}
              <line
                x1={x1}
                y1={portY}
                x2={leftLineEnd}
                y2={portY}
                stroke="#CBD5E1"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <line
                x1={x1}
                y1={portY}
                x2={leftLineEnd}
                y2={portY}
                stroke={streamColor}
                strokeWidth="2.5"
                strokeDasharray="6 8"
                strokeDashoffset={-frame * 2.8}
                strokeOpacity="0.9"
              />

              {/* Segment 2 */}
              <line
                x1={rightLineStart}
                y1={portY}
                x2={x2}
                y2={portY}
                stroke="#CBD5E1"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <line
                x1={rightLineStart}
                y1={portY}
                x2={x2}
                y2={portY}
                stroke={streamColor}
                strokeWidth="2.5"
                strokeDasharray="6 8"
                strokeDashoffset={-frame * 2.8}
                strokeOpacity="0.9"
              />

              {/* Traveling Photon Light Particle */}
              {(photonX < leftLineEnd || photonX > rightLineStart) && (
                <circle
                  cx={photonX}
                  cy={portY}
                  r="4.5"
                  fill={streamColor}
                  style={{ filter: `drop-shadow(0 0 8px ${streamColor})` }}
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Floating Centered Dynamic Island Badges */}
      {flows.map((flow, idx) => {
        const src = cardPositions[idx];
        const dst = cardPositions[idx + 1];
        const midX = (src.x + src.w + dst.x) / 2;

        return (
          <div
            key={`badge-v2-${idx}`}
            className="absolute z-20 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none"
            style={{ left: `${midX}px`, top: `${portY}px` }}
          >
            <div
              className="rounded-full bg-white border border-slate-200/90 shadow-[0_8px_24px_-4px_rgba(15,23,42,0.1),0_0_0_1px_rgba(226,232,240,0.8)] flex items-center justify-center gap-2 px-4"
              style={{ width: `${badgeW}px`, height: `${badgeH}px` }}
            >
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
              <span className="text-xs font-mono font-bold text-slate-800 tracking-tight whitespace-nowrap truncate">
                {flow.label}
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-semibold mt-1.5">
              {flow.sub}
            </span>
          </div>
        );
      })}

      {/* Bento Cards (310px x 240px) */}
      {blocks.map((block, idx) => {
        const pos = cardPositions[idx];
        const IconComponent = block.icon;

        return (
          <div
            key={block.step}
            className={cn(
              'absolute rounded-3xl p-6 bg-white flex flex-col justify-between transition-all overflow-visible z-20',
              block.isCompromised
                ? 'border border-rose-200 shadow-[0_20px_45px_-12px_rgba(225,29,72,0.1),0_0_0_1px_rgba(244,63,94,0.18)]'
                : 'border border-slate-200/90 shadow-[0_20px_45px_-12px_rgba(15,23,42,0.06),0_0_0_1px_rgba(226,232,240,0.9)]'
            )}
            style={{
              left: `${pos.x}px`,
              top: `${pos.y}px`,
              width: `${pos.w}px`,
              height: `${pos.h}px`,
            }}
          >
            {/* Left Port Anchor */}
            {idx > 0 && (
              <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-slate-400 shadow-sm z-30 flex items-center justify-center">
                <div className={cn('w-1.5 h-1.5 rounded-full', block.isCompromised ? 'bg-rose-600' : 'bg-blue-600')} />
              </div>
            )}

            {/* Right Port Anchor */}
            {idx < blocks.length - 1 && (
              <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-slate-400 shadow-sm z-30 flex items-center justify-center">
                <div className={cn('w-1.5 h-1.5 rounded-full', block.isCompromised ? 'bg-rose-600' : 'bg-blue-600')} />
              </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-slate-900 text-white font-mono text-xs font-bold flex items-center justify-center shadow-xs">
                  {block.step}
                </span>
                <span className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-widest">
                  CLUSTER
                </span>
              </div>
              <span
                className={cn(
                  'text-[10px] font-mono font-bold px-2.5 py-1 rounded-full uppercase tracking-wider',
                  block.isCompromised
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                )}
              >
                {block.status}
              </span>
            </div>

            {/* Center: Large Squircle Icon + Title */}
            <div className="flex items-center gap-4 my-2">
              <div
                className={cn(
                  'w-14 h-14 rounded-2xl flex items-center justify-center shadow-xs shrink-0',
                  block.isCompromised
                    ? 'bg-gradient-to-br from-rose-50 to-red-100 border border-rose-200 text-rose-600'
                    : 'bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-200 text-blue-600'
                )}
              >
                <IconComponent className="w-7 h-7" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-slate-900 tracking-tight leading-snug truncate">
                  {block.title}
                </h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed truncate mt-0.5">
                  {block.subtitle}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
              <div className="px-3 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 truncate max-w-[210px] text-[11px]">
                {block.spec}
              </div>
              {block.isCompromised ? (
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
            </div>
          </div>
        );
      })}

      {/* Modern Bottom Ribbon */}
      <div className="absolute bottom-14 left-1/2 -translate-x-1/2 w-[1690px] px-8 py-4 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200 shadow-sm flex items-center justify-between text-xs font-mono text-slate-500 z-30">
        <div className="flex items-center gap-4 font-semibold text-slate-800">
          <span>ROOT CAUSE: SECOND-HAND SWITCH INSTALLED ON CORE SWIFT BUS WITHOUT ISOLATION</span>
        </div>
        <div className="flex items-center gap-2 text-slate-600">
          <span>EXHIBIT SOURCE: CID BANGLADESH FORENSIC ARCHIVE</span>
        </div>
      </div>
    </div>
  );
};
