import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Network, Router, Server, Printer, ShieldAlert, CheckCircle2, Workflow, ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export const OptionC_StudioGlass: React.FC = () => {
  const frame = useCurrentFrame();

  const blocks = [
    {
      id: 'NODE 01',
      title: 'Dhaka Local Network',
      subtitle: '10th Floor Office Subnet',
      specs: '100 Mbps FastEthernet',
      status: 'UNPROTECTED',
      icon: Network,
      color: '#3B82F6',
      alert: false,
    },
    {
      id: 'NODE 02',
      title: 'D-Link DES-1008D',
      subtitle: '$10 Second-Hand Switch',
      specs: 'Zero VLAN / Zero ACLs',
      status: 'CRITICAL BRIDGE',
      icon: Router,
      color: '#F59E0B',
      alert: true,
    },
    {
      id: 'NODE 03',
      title: 'SWIFT Alliance Server',
      subtitle: 'Sovereign Core Terminal',
      specs: 'Oracle DLL liboradb.dll',
      status: 'EXFILTRATED',
      icon: Server,
      color: '#EF4444',
      alert: true,
    },
    {
      id: 'NODE 04',
      title: 'HP LaserJet 400',
      subtitle: 'Hardcopy Audit Printer',
      specs: 'Spooler Memory Intercept',
      status: 'TAMPERED',
      icon: Printer,
      color: '#8B5CF6',
      alert: true,
    },
  ];

  const connections = [
    { label: 'Unsegregated Cable', note: 'Shared Broadcast Domain' },
    { label: 'Direct Socket Injection', note: 'Unchecked Port 1521' },
    { label: 'Audit Output Intercept', note: 'Paper Confirmation Suppressed' },
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
      {/* Background Soft Blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main Glassmorphic Container */}
      <div
        className="relative bg-white/95 backdrop-blur-2xl rounded-3xl border border-slate-200 shadow-[0_30px_70px_rgba(15,23,42,0.06)] overflow-hidden flex flex-col justify-between"
        style={{ width: `${containerW}px`, height: `${containerH}px` }}
      >
        {/* Header Bar */}
        <div className="px-10 py-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
              <Workflow className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold tracking-widest text-slate-500 uppercase">
                EXHIBIT // OPTION C: 21ST.DEV GLASSMORPHIC STUDIO
              </span>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
                Bangladesh Bank // Forensic Pipeline Deployment
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-4 py-1.5 rounded-full bg-slate-100 text-slate-700 font-mono text-xs font-semibold border border-slate-200">
              AUDIT STAGE: COMPLETE
            </span>
            <span className="px-4 py-1.5 rounded-full bg-rose-50 text-rose-700 font-mono text-xs font-bold border border-rose-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>VULNERABILITY LEVEL: FATAL</span>
            </span>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="relative flex-1 mx-8 my-4 rounded-2xl bg-[#FCFDFE] border border-slate-200/80 overflow-hidden">
          {/* Subtle Studio Dot Grid */}
          <div
            className="absolute inset-0 pointer-events-none opacity-60"
            style={{
              backgroundImage: 'radial-gradient(#94A3B8 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />

          {/* Connectors SVG */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox={`0 0 ${canvasW} ${canvasH}`}>
            {connections.map((conn, idx) => {
              const src = cardPositions[idx];
              const dst = cardPositions[idx + 1];
              const x1 = src.x + src.w;
              const y1 = src.y + src.h / 2;
              const x2 = dst.x;

              const photonX = x1 + (x2 - x1) * (((frame * 0.025 + idx * 0.3) % 1));

              return (
                <g key={idx}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y1}
                    stroke="#CBD5E1"
                    strokeWidth="3"
                  />
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y1}
                    stroke="#EF4444"
                    strokeWidth="2.5"
                    strokeDasharray="6 8"
                    strokeDashoffset={-frame * 2}
                  />
                  <circle
                    cx={photonX}
                    cy={y1}
                    r="4.5"
                    fill="#EF4444"
                    style={{ filter: 'drop-shadow(0 0 6px rgba(239,68,68,0.7))' }}
                  />
                </g>
              );
            })}
          </svg>

          {/* HTML Overlay Badges */}
          {connections.map((conn, idx) => {
            const src = cardPositions[idx];
            const dst = cardPositions[idx + 1];
            const x1 = src.x + src.w;
            const x2 = dst.x;
            const midX = (x1 + x2) / 2;
            const midY = src.y + src.h / 2;

            return (
              <div
                key={idx}
                className="absolute z-20 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none"
                style={{ left: `${midX}px`, top: `${midY}px` }}
              >
                <div className="px-4 py-1.5 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-md flex items-center gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-rose-500" />
                  <span className="text-xs font-mono font-bold text-slate-800">
                    {conn.label}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-500 mt-1">
                  {conn.note}
                </span>
              </div>
            );
          })}

          {/* Glass Cards */}
          {blocks.map((block, idx) => {
            const pos = cardPositions[idx];
            const IconComponent = block.icon;

            return (
              <div
                key={block.id}
                className="absolute rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200/90 shadow-[0_15px_35px_rgba(15,23,42,0.05)] overflow-hidden flex flex-col justify-between"
                style={{
                  left: `${pos.x}px`,
                  top: `${pos.y}px`,
                  width: `${pos.w}px`,
                  height: `${pos.h}px`,
                }}
              >
                {/* Top Accent Color Bar */}
                <div
                  className="h-1.5 w-full"
                  style={{ backgroundColor: block.color }}
                />

                {/* Ports */}
                {idx > 0 && (
                  <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-slate-700 shadow-sm flex items-center justify-center z-30">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                  </div>
                )}
                {idx < blocks.length - 1 && (
                  <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-slate-700 shadow-sm flex items-center justify-center z-30">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                  </div>
                )}

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-slate-500">
                      {block.id}
                    </span>
                    <span
                      className={cn(
                        'text-[10px] font-mono font-bold px-2 py-0.5 rounded-full',
                        block.alert ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                      )}
                    >
                      {block.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3.5 my-2">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs text-white"
                      style={{ backgroundColor: block.color }}
                    >
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 tracking-tight leading-snug">
                        {block.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {block.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-mono text-slate-600">
                    <span>{block.specs}</span>
                    {block.alert ? (
                      <ShieldAlert className="w-4 h-4 text-rose-500" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-blue-500" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-10 py-4 bg-slate-50/70 border-t border-slate-200 flex items-center justify-between text-xs font-mono text-slate-500">
          <span>SOURCE: MANDIANT REPORT // EXHIBIT 02</span>
          <span>DISPOSITION: UNENCRYPTED INTERNAL BUS COMPROMISE</span>
        </div>
      </div>
    </div>
  );
};
