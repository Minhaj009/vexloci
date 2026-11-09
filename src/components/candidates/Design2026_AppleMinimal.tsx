import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Network, Router, Server, Printer, AlertTriangle, ShieldAlert, CheckCircle2, Zap, ArrowRight, Lock } from 'lucide-react';
import { cn } from '../../lib/utils';

export const Design2026_AppleMinimal: React.FC = () => {
  const frame = useCurrentFrame();

  const blocks = [
    {
      step: '01',
      title: 'Dhaka LAN',
      subtitle: 'Office Network',
      spec: '192.168.10.0/24',
      status: 'NORMAL',
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
    { label: 'No VLAN Isolation', type: 'VULNERABILITY' },
    { label: 'Unrestricted Pivot', type: 'MALWARE INJECTION' },
    { label: 'Hardcopy Suppressed', type: 'EVIDENCE WIPED' },
  ];

  // Mathematical Geometry: Shared 1920x1080 Canvas
  // Perfect alignment: All cards and connectors share the exact same coordinates!
  const cardW = 300;
  const cardH = 220;
  const cardY = 460; // Card top Y
  const portY = cardY + cardH / 2; // Exact Y center: 570px

  const gap = 160;
  const totalW = blocks.length * cardW + (blocks.length - 1) * gap; // 4*300 + 3*160 = 1200 + 480 = 1680px
  const startX = (1920 - totalW) / 2; // (1920 - 1680) / 2 = 120px

  const cardPositions = blocks.map((_, i) => ({
    x: startX + i * (cardW + gap),
    y: cardY,
    w: cardW,
    h: cardH,
  }));

  const badgeW = 144;
  const badgeH = 34;

  return (
    <div className="w-[1920px] h-[1080px] bg-[#F8FAFC] select-none relative overflow-hidden font-sans">
      {/* 2026 Ambient Radial Glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 48%, rgba(219, 234, 254, 0.45) 0%, rgba(248, 250, 252, 0) 65%)',
        }}
      />

      {/* Subtle Dot Matrix with Radial Vignette Fade */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#CBD5E1 1.2px, transparent 1.2px)',
          backgroundSize: '28px 28px',
          maskImage: 'radial-gradient(ellipse at 50% 50%, black 50%, transparent 85%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 50%, black 50%, transparent 85%)',
        }}
      />

      {/* Top Floating Glass Navigation Bar */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[1680px] flex items-center justify-between z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-md">
            <Zap className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono tracking-widest text-slate-500 font-bold uppercase">
                CRITICAL INFRASTRUCTURE RECONSTRUCTION
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              <span className="text-[10px] font-mono text-blue-600 font-bold uppercase">
                SWIFT ALLIANCE CORE
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-heading mt-0.5">
              Bangladesh Bank // Physical Lateral Attack Vector
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-full bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-xs flex items-center gap-2 text-xs font-mono text-slate-600 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
            <span>4 NODES IDENTIFIED</span>
          </div>
          <div className="px-4 py-2 rounded-full bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-mono font-bold flex items-center gap-2 shadow-xs">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>FATAL SEGREGATION BREACH</span>
          </div>
        </div>
      </div>

      {/* Unified Connectors Layer (Shared Coordinate Space: 1920x1080) */}
      <svg className="absolute inset-0 w-[1920px] h-[1080px] pointer-events-none z-10">
        <defs>
          <filter id="laserGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {flows.map((_, idx) => {
          const src = cardPositions[idx];
          const dst = cardPositions[idx + 1];
          const x1 = src.x + src.w; // Card 1 right edge
          const x2 = dst.x;         // Card 2 left edge
          const midX = (x1 + x2) / 2;

          // Split line around badge pill: leaves 8px margin so line NEVER touches or overlaps badge!
          const badgeHalfW = badgeW / 2 + 8;
          const leftLineEnd = midX - badgeHalfW;
          const rightLineStart = midX + badgeHalfW;

          const isCompromised = idx >= 0;
          const pulseColor = isCompromised ? '#DC2626' : '#2563EB';

          // Photon travel calculation
          const cycle = ((frame * 0.03 + idx * 0.33) % 1);
          const photonX = x1 + (x2 - x1) * cycle;

          return (
            <g key={idx}>
              {/* Segment 1: From Card 1 to Badge Left Edge */}
              <line
                x1={x1}
                y1={portY}
                x2={leftLineEnd}
                y2={portY}
                stroke="#CBD5E1"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <line
                x1={x1}
                y1={portY}
                x2={leftLineEnd}
                y2={portY}
                stroke={pulseColor}
                strokeWidth="2.5"
                strokeDasharray="6 8"
                strokeDashoffset={-frame * 2.5}
                strokeOpacity="0.9"
              />

              {/* Segment 2: From Badge Right Edge to Card 2 */}
              <line
                x1={rightLineStart}
                y1={portY}
                x2={x2}
                y2={portY}
                stroke="#CBD5E1"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <line
                x1={rightLineStart}
                y1={portY}
                x2={x2}
                y2={portY}
                stroke={pulseColor}
                strokeWidth="2.5"
                strokeDasharray="6 8"
                strokeDashoffset={-frame * 2.5}
                strokeOpacity="0.9"
              />

              {/* Traveling Photon Pulse (skips drawing inside badge) */}
              {(photonX < leftLineEnd || photonX > rightLineStart) && (
                <circle
                  cx={photonX}
                  cy={portY}
                  r="4"
                  fill={pulseColor}
                  filter="url(#laserGlow)"
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Floating Dynamic Island Connector Badges (Mathematically Centered at midX, portY) */}
      {flows.map((flow, idx) => {
        const src = cardPositions[idx];
        const dst = cardPositions[idx + 1];
        const midX = (src.x + src.w + dst.x) / 2;

        return (
          <div
            key={`badge-${idx}`}
            className="absolute z-20 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none"
            style={{ left: `${midX}px`, top: `${portY}px` }}
          >
            {/* The Pill Capsule */}
            <div
              className="rounded-full bg-white border border-slate-200/90 shadow-[0_6px_20px_-4px_rgba(15,23,42,0.1),0_0_0_1px_rgba(226,232,240,0.8)] flex items-center justify-center gap-2 px-3.5"
              style={{ width: `${badgeW}px`, height: `${badgeH}px` }}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
              <span className="text-[11px] font-mono font-bold text-slate-800 tracking-tight whitespace-nowrap truncate">
                {flow.label}
              </span>
            </div>
            {/* Sub-label chip */}
            <span className="text-[9.5px] font-mono text-slate-500 uppercase tracking-wider font-semibold mt-1.5">
              {flow.type}
            </span>
          </div>
        );
      })}

      {/* Elevated Bento Cards (300px x 220px) */}
      {blocks.map((block, idx) => {
        const pos = cardPositions[idx];
        const IconComponent = block.icon;

        return (
          <div
            key={block.step}
            className={cn(
              'absolute rounded-3xl p-6 bg-white/95 backdrop-blur-xl flex flex-col justify-between transition-all overflow-visible z-20',
              block.isCompromised
                ? 'border border-rose-200/80 shadow-[0_20px_40px_-15px_rgba(225,29,72,0.08),0_0_0_1px_rgba(244,63,94,0.15)]'
                : 'border border-slate-200/90 shadow-[0_20px_40px_-15px_rgba(15,23,42,0.06),0_0_0_1px_rgba(226,232,240,0.8)]'
            )}
            style={{
              left: `${pos.x}px`,
              top: `${pos.y}px`,
              width: `${pos.w}px`,
              height: `${pos.h}px`,
            }}
          >
            {/* Left Anchor Socket (Input Port) */}
            {idx > 0 && (
              <div
                className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-slate-400 shadow-sm z-30 flex items-center justify-center"
              >
                <div className={cn('w-1.5 h-1.5 rounded-full', block.isCompromised ? 'bg-rose-600' : 'bg-blue-600')} />
              </div>
            )}

            {/* Right Anchor Socket (Output Port) */}
            {idx < blocks.length - 1 && (
              <div
                className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-slate-400 shadow-sm z-30 flex items-center justify-center"
              >
                <div className={cn('w-1.5 h-1.5 rounded-full', block.isCompromised ? 'bg-rose-600' : 'bg-blue-600')} />
              </div>
            )}

            {/* Card Header Strip */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-slate-900 text-white font-mono text-xs font-bold flex items-center justify-center shadow-xs">
                  {block.step}
                </span>
                <span className="text-[10.5px] font-mono font-bold text-slate-500 uppercase tracking-widest">
                  NODE
                </span>
              </div>
              <span
                className={cn(
                  'text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider',
                  block.isCompromised
                    ? 'bg-rose-50 text-rose-700 border border-rose-200/80'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                )}
              >
                {block.status}
              </span>
            </div>

            {/* Card Body: Frosted Icon Squircle + Bold Clean Title */}
            <div className="flex items-center gap-3.5 my-2">
              <div
                className={cn(
                  'w-13 h-13 rounded-2xl flex items-center justify-center shadow-xs shrink-0',
                  block.isCompromised
                    ? 'bg-gradient-to-br from-rose-50 to-red-100/80 border border-rose-200/80 text-rose-600'
                    : 'bg-gradient-to-br from-blue-50 to-indigo-100/80 border border-blue-200/80 text-blue-600'
                )}
                style={{ width: '52px', height: '52px' }}
              >
                <IconComponent className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-900 tracking-tight leading-snug truncate">
                  {block.title}
                </h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed truncate mt-0.5">
                  {block.subtitle}
                </p>
              </div>
            </div>

            {/* Card Footer: Hardware Spec Chip + Integrity Badge */}
            <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono">
              <div className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-600 truncate max-w-[200px]">
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

      {/* Sleek Floating Bottom Glass Telemetry Ribbon */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-[1680px] px-8 py-3.5 rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-200/80 shadow-[0_10px_30px_-5px_rgba(15,23,42,0.04)] flex items-center justify-between text-xs font-mono text-slate-500 z-30">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-slate-800">FORENSIC EXHIBIT: FX-2016-02-L2</span>
          <span>•</span>
          <span>VLAN ISOLATION: MISSING (UNMANAGED HUB BRIDGED)</span>
          <span>•</span>
          <span>AIR GAP INTEGRITY: COMPROMISED</span>
        </div>
        <div className="flex items-center gap-2 text-slate-700 font-semibold">
          <span>SOURCE: MANDIANT INCIDENT RESPONSE REPORT</span>
        </div>
      </div>
    </div>
  );
};
