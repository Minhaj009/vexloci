import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Network, Router, Server, Printer, ShieldAlert, CheckCircle2, AlertOctagon, Activity, Cpu } from 'lucide-react';
import { cn } from '../../lib/utils';

export const OptionA_AceternityBento: React.FC = () => {
  const frame = useCurrentFrame();

  const blocks = [
    {
      id: '01',
      title: 'Dhaka LAN',
      subtitle: 'General Office Network',
      tag: 'SUBNET: 192.168.10.0/24',
      status: 'OPERATIONAL',
      icon: Network,
      isFault: false,
    },
    {
      id: '02',
      title: 'D-Link Hub',
      subtitle: '$10 Unmanaged Switch',
      tag: 'HARDWARE: DES-1008D // UNTAGGED',
      status: 'CRITICAL EXPOSURE',
      icon: Router,
      isFault: true,
    },
    {
      id: '03',
      title: 'SWIFT Alliance Server',
      subtitle: 'Core Payment Terminal',
      tag: 'INTERFACE: SAA-ORACLE // PORT 1521',
      status: 'PIVOT TARGET',
      icon: Server,
      isFault: true,
    },
    {
      id: '04',
      title: 'LaserJet 400',
      subtitle: '10th Floor Audit Printer',
      tag: 'PROTOCOL: RAW TCP/IP // PORT 9100',
      status: 'EVIDENCE WIPED',
      icon: Printer,
      isFault: true,
    },
  ];

  const flows = [
    { from: 0, to: 1, label: 'No VLAN Isolation', sublabel: 'Zero Network Boundary' },
    { from: 1, to: 2, label: 'Unrestricted Pivot', sublabel: 'Direct L2 Pass-Through' },
    { from: 2, to: 3, label: 'Hardcopy Audit Link', sublabel: 'Paper Confirmation Bus' },
  ];

  const containerW = 1800;
  const containerH = 940;
  const canvasW = 1720;
  const canvasH = 680;

  const cardW = 310;
  const cardH = 220;
  const gap = 150;
  const totalW = blocks.length * cardW + (blocks.length - 1) * gap;
  const startX = (canvasW - totalW) / 2;
  const cardY = (canvasH - cardH) / 2;

  const cardPositions = blocks.map((_, i) => ({
    x: startX + i * (cardW + gap),
    y: cardY,
    w: cardW,
    h: cardH,
  }));

  return (
    <div className="w-[1920px] h-[1080px] bg-[#F8FAFC] flex items-center justify-center select-none relative overflow-hidden font-sans">
      {/* Subtle background ambient glow */}
      <div className="absolute w-[900px] h-[600px] bg-blue-100/40 rounded-full blur-[140px] pointer-events-none -top-20 left-1/2 -translate-x-1/2" />

      {/* Main Expansive Container */}
      <div
        className="relative bg-white rounded-3xl border border-slate-200/90 shadow-[0_25px_70px_-15px_rgba(15,23,42,0.07),0_0_0_1px_rgba(226,232,240,0.8)] overflow-hidden flex flex-col justify-between"
        style={{ width: `${containerW}px`, height: `${containerH}px` }}
      >
        {/* Top Header Bar */}
        <div className="backdrop-blur-xl bg-white/85 border-b border-slate-200 px-10 py-5 flex items-center justify-between z-20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono tracking-widest text-blue-600 font-bold uppercase bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200/80">
                  ARCHITECTURAL BLUEPRINT // OPTION A: ACETERNITY BENTO
                </span>
                <span className="text-[11px] font-mono text-slate-400">|</span>
                <span className="text-[11px] font-mono text-slate-500 font-medium">MOTIJHEEL 10TH FLOOR OPERATIONS</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1 font-heading">
                Bangladesh Bank // SWIFT Alliance Network Architecture
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" />
              <span className="font-semibold">TOPOLOGY AUDIT ACTIVE</span>
            </div>
            <div className="px-3.5 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-mono font-bold flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-red-600" />
              <span>3 CRITICAL VULNERABILITIES</span>
            </div>
          </div>
        </div>

        {/* Central Canvas Area with Aceternity Radial-Masked Dot Grid */}
        <div className="relative flex-1 mx-8 my-4 rounded-2xl bg-[#FAFCFF] border border-slate-200/70 overflow-hidden">
          {/* Radial-masked dot matrix */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(#CBD5E1 1.2px, transparent 1.2px)',
              backgroundSize: '28px 28px',
              maskImage: 'radial-gradient(ellipse at center, black 60%, transparent 95%)',
              WebkitMaskImage: 'radial-gradient(ellipse at center, black 60%, transparent 95%)',
            }}
          />

          {/* Connectors & Active Tracing Stream SVG */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox={`0 0 ${canvasW} ${canvasH}`}>
            <defs>
              <linearGradient id="activeStreamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#2563EB" />
                <stop offset="100%" stopColor="#DC2626" />
              </linearGradient>
            </defs>

            {flows.map((flow, idx) => {
              const src = cardPositions[flow.from];
              const dst = cardPositions[flow.to];
              const x1 = src.x + src.w; // exact center of right port
              const y1 = src.y + src.h / 2;
              const x2 = dst.x; // exact center of left port
              const midX = (x1 + x2) / 2;

              const isAlert = idx >= 0;
              const streamColor = isAlert ? '#DC2626' : '#2563EB';

              const pulseOffset = (-frame * 2.5 + idx * 30) % 100;
              const photonT = ((frame * 0.03 + idx * 0.33) % 1);
              const photonX = x1 + (x2 - x1) * photonT;

              return (
                <g key={idx}>
                  {/* Base Rail */}
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y1}
                    stroke="#E2E8F0"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  {/* Active Laser Stream */}
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y1}
                    stroke={streamColor}
                    strokeWidth="2.5"
                    strokeDasharray="8 12"
                    strokeDashoffset={pulseOffset}
                    strokeOpacity="0.85"
                  />
                  {/* Traveling Photon Packet */}
                  <circle
                    cx={photonX}
                    cy={y1}
                    r="4"
                    fill={streamColor}
                    style={{ filter: `drop-shadow(0 0 6px ${streamColor})` }}
                  />
                </g>
              );
            })}
          </svg>

          {/* HTML Overlay: Connector Badges (Perfect Vertical & Horizontal Centering) */}
          {flows.map((flow, idx) => {
            const src = cardPositions[flow.from];
            const dst = cardPositions[flow.to];
            const x1 = src.x + src.w;
            const x2 = dst.x;
            const midX = (x1 + x2) / 2;
            const midY = src.y + src.h / 2;

            return (
              <div
                key={`badge-${idx}`}
                className="absolute z-20 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none"
                style={{ left: `${midX}px`, top: `${midY}px` }}
              >
                <div className="px-3.5 py-1.5 rounded-full bg-white border border-slate-200/90 shadow-[0_4px_16px_rgba(15,23,42,0.08)] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[11px] font-mono font-bold text-slate-800 tracking-tight whitespace-nowrap">
                    {flow.label}
                  </span>
                </div>
                <span className="text-[9.5px] font-mono text-slate-400 mt-1 uppercase tracking-wider">
                  {flow.sublabel}
                </span>
              </div>
            );
          })}

          {/* Bento Cards */}
          {blocks.map((block, idx) => {
            const pos = cardPositions[idx];
            const IconComponent = block.icon;

            return (
              <div
                key={block.id}
                className={cn(
                  'absolute rounded-2xl p-5 flex flex-col justify-between transition-all bg-white overflow-visible',
                  block.isFault
                    ? 'border border-red-200 shadow-[0_12px_32px_-8px_rgba(220,38,38,0.12),0_0_0_1px_rgba(239,68,68,0.2)]'
                    : 'border border-slate-200/90 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.06),0_0_0_1px_rgba(226,232,240,0.8)]'
                )}
                style={{
                  left: `${pos.x}px`,
                  top: `${pos.y}px`,
                  width: `${pos.w}px`,
                  height: `${pos.h}px`,
                }}
              >
                {/* Physical Anchor Sockets on Left & Right Edges */}
                {idx > 0 && (
                  <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)] z-30 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                  </div>
                )}
                {idx < blocks.length - 1 && (
                  <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)] z-30 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                  </div>
                )}

                {/* Card Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-slate-900 text-white font-mono text-xs font-bold flex items-center justify-center shadow-xs">
                      {block.id}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">
                      NODE
                    </span>
                  </div>
                  <span
                    className={cn(
                      'text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider',
                      block.isFault
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    )}
                  >
                    {block.status}
                  </span>
                </div>

                {/* Card Center: Squircle Icon + High-Contrast Title */}
                <div className="flex items-center gap-3.5 my-1">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center shadow-xs shrink-0',
                      block.isFault
                        ? 'bg-gradient-to-br from-red-50 to-rose-100/80 border border-red-200/80 text-red-600'
                        : 'bg-gradient-to-br from-blue-50 to-indigo-100/80 border border-blue-200/80 text-blue-600'
                    )}
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

                {/* Card Footer: Technical Monospace Tray */}
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10.5px] font-mono">
                  <div className="px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200/80 text-slate-600 truncate max-w-[210px]">
                    {block.tag}
                  </div>
                  {block.isFault ? (
                    <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Metadata & Telemetry Strip */}
        <div className="px-10 py-4 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between text-xs font-mono text-slate-500">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-slate-700">FORENSIC EXHIBIT: FX-2016-02</span>
            <span>•</span>
            <span>ISOLATION PROTOCOL: FAILED (HUB-BRIDGED)</span>
            <span>•</span>
            <span>LATENCY: 0.2ms</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700 font-semibold">
            <span>CHAIN OF CUSTODY: BANGLADESH POLICE CID // MANDIANT</span>
          </div>
        </div>
      </div>
    </div>
  );
};
