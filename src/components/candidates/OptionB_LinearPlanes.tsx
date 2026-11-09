import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Network, Router, Server, Printer, ShieldX, CheckCircle, Terminal, HardDrive, ArrowRight, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';

export const OptionB_LinearPlanes: React.FC = () => {
  const frame = useCurrentFrame();

  const nodes = [
    {
      step: '01',
      title: 'Dhaka LAN',
      role: 'General Office Network',
      host: 'host-bb-lan.internal',
      ip: '192.168.10.45',
      security: 'CLEAR',
      icon: Network,
      compromised: false,
    },
    {
      step: '02',
      title: 'D-Link Switch',
      role: '$10 Unmanaged Hub',
      host: 'dlink-des1008d.hub',
      ip: 'UNMANAGED L2',
      security: 'CRITICAL',
      icon: Router,
      compromised: true,
    },
    {
      step: '03',
      title: 'SWIFT Server',
      role: 'Core Payment Terminal',
      host: 'swift-alliance.core',
      ip: '10.0.4.12:1521',
      security: 'TARGET',
      icon: Server,
      compromised: true,
    },
    {
      step: '04',
      title: 'Audit Printer',
      role: 'HP LaserJet 400',
      host: 'laserjet-fl10.audit',
      ip: '10.0.4.99:9100',
      security: 'TAMPERED',
      icon: Printer,
      compromised: true,
    },
  ];

  const edges = [
    { label: 'NO_VLAN_SEGREGATION', type: 'BRIDGED' },
    { label: 'UNRESTRICTED_L2_PIVOT', type: 'EXPLOITED' },
    { label: 'PHYSICAL_PRINT_CONFIRM', type: 'INTERCEPTED' },
  ];

  const containerW = 1800;
  const containerH = 940;
  const canvasW = 1720;
  const canvasH = 680;

  const cardW = 300;
  const cardH = 240;
  const gap = 150;
  const totalW = nodes.length * cardW + (nodes.length - 1) * gap;
  const startX = (canvasW - totalW) / 2;
  const cardY = (canvasH - cardH) / 2;

  const nodePositions = nodes.map((_, i) => ({
    x: startX + i * (cardW + gap),
    y: cardY,
    w: cardW,
    h: cardH,
  }));

  return (
    <div className="w-[1920px] h-[1080px] bg-[#F1F5F9] flex items-center justify-center select-none relative overflow-hidden font-mono">
      {/* Container with sharp engineering lines */}
      <div
        className="relative bg-white rounded-2xl border border-slate-300 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.1)] overflow-hidden flex flex-col justify-between"
        style={{ width: `${containerW}px`, height: `${containerH}px` }}
      >
        {/* Engineering Command Header */}
        <div className="bg-slate-900 text-white px-8 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] tracking-widest text-blue-400 uppercase font-semibold">
                PIPELINE // OPTION B: LINEAR / PLANES HIGH-DENSITY
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white font-sans">
                BANGLADESH BANK // SWIFT RECONSTRUCTION RUNTIME
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">PIPELINE RUN:</span>
              <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">#EXEC-2016-02</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">NODES:</span>
              <span className="text-emerald-400 font-bold">4 / 4 ONLINE</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">DEFENSE STATUS:</span>
              <span className="text-red-400 font-bold bg-red-950/80 border border-red-800 px-2.5 py-0.5 rounded">ZERO FIREWALL DETECTED</span>
            </div>
          </div>
        </div>

        {/* Central Pipeline Canvas with Engineering Grid */}
        <div className="relative flex-1 mx-6 my-4 bg-slate-50/60 rounded-xl border border-slate-200 overflow-hidden">
          {/* Technical grid */}
          <div
            className="absolute inset-0 pointer-events-none opacity-40"
            style={{
              backgroundImage: 'linear-gradient(to right, #CBD5E1 1px, transparent 1px), linear-gradient(to bottom, #CBD5E1 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />

          {/* SVG Pipelines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox={`0 0 ${canvasW} ${canvasH}`}>
            {edges.map((edge, idx) => {
              const src = nodePositions[idx];
              const dst = nodePositions[idx + 1];
              const x1 = src.x + src.w;
              const y1 = src.y + src.h / 2;
              const x2 = dst.x;

              const pulsePos = ((frame * 2.5 + idx * 40) % (x2 - x1)) + x1;

              return (
                <g key={idx}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y1}
                    stroke="#94A3B8"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                  />
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y1}
                    stroke="#DC2626"
                    strokeWidth="2"
                    strokeDasharray="10 20"
                    strokeDashoffset={-frame * 3}
                  />
                  {/* Chevron marker */}
                  <polygon
                    points={`${pulsePos},${y1 - 4} ${pulsePos + 6},${y1} ${pulsePos},${y1 + 4}`}
                    fill="#DC2626"
                  />
                </g>
              );
            })}
          </svg>

          {/* Centered Connector Labels */}
          {edges.map((edge, idx) => {
            const src = nodePositions[idx];
            const dst = nodePositions[idx + 1];
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
                <div className="px-3 py-1 bg-slate-900 text-white rounded text-[10px] font-mono font-bold tracking-wider shadow-sm flex items-center gap-1.5 border border-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  <span>{edge.label}</span>
                </div>
                <span className="text-[9px] font-mono text-slate-500 bg-white/90 px-1.5 py-0.5 rounded border border-slate-200 mt-1">
                  TYPE: {edge.type}
                </span>
              </div>
            );
          })}

          {/* Cards */}
          {nodes.map((node, idx) => {
            const pos = nodePositions[idx];
            const IconComp = node.icon;

            return (
              <div
                key={node.step}
                className="absolute rounded-xl bg-white border border-slate-300 shadow-sm overflow-hidden flex flex-col justify-between"
                style={{
                  left: `${pos.x}px`,
                  top: `${pos.y}px`,
                  width: `${pos.w}px`,
                  height: `${pos.h}px`,
                }}
              >
                {/* Physical Socket Ports */}
                {idx > 0 && (
                  <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-slate-900 rounded-full border-2 border-white shadow-sm flex items-center justify-center z-30">
                    <div className="w-1 h-1 bg-white rounded-full" />
                  </div>
                )}
                {idx < nodes.length - 1 && (
                  <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-slate-900 rounded-full border-2 border-white shadow-sm flex items-center justify-center z-30">
                    <div className="w-1 h-1 bg-white rounded-full" />
                  </div>
                )}

                {/* Dark Header Band */}
                <div className={cn(
                  'px-4 py-2.5 flex items-center justify-between text-xs font-mono font-bold text-white',
                  node.compromised ? 'bg-slate-900 border-b border-red-500' : 'bg-slate-900'
                )}>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-400">NODE_{node.step}</span>
                    <span>//</span>
                    <span className="truncate max-w-[130px] font-sans">{node.title}</span>
                  </div>
                  <span className={cn(
                    'text-[9px] px-1.5 py-0.5 rounded uppercase font-mono',
                    node.compromised ? 'bg-red-900/80 text-red-200 border border-red-700' : 'bg-emerald-900/80 text-emerald-200 border border-emerald-700'
                  )}>
                    {node.security}
                  </span>
                </div>

                {/* Card Body */}
                <div className="p-4 flex-1 flex flex-col justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'p-2.5 rounded-lg border',
                      node.compromised ? 'bg-red-50 border-red-200 text-red-600' : 'bg-slate-100 border-slate-200 text-slate-700'
                    )}>
                      <IconComp className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 font-sans">{node.role}</div>
                      <div className="text-[11px] text-slate-500 truncate">{node.host}</div>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-100 text-[11px]">
                    <div className="flex justify-between text-slate-500">
                      <span>IP ADDR:</span>
                      <span className="font-bold text-slate-800">{node.ip}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>PROTOCOL:</span>
                      <span className="text-slate-800 font-semibold">IEEE 802.3 // TCP</span>
                    </div>
                  </div>
                </div>

                {/* Status Bar */}
                <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
                  <span>AUDIT TRACE</span>
                  <span className={node.compromised ? 'text-red-600 font-bold' : 'text-emerald-600 font-bold'}>
                    {node.compromised ? 'COMPROMISED' : 'VERIFIED OK'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Bar */}
        <div className="px-8 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs font-mono text-slate-500">
          <div>TOPOLOGY: LINEAR CASCADE // LACK OF SEGREGATION</div>
          <div>EVIDENCE ID: EXHIBIT-02-NETWORK</div>
        </div>
      </div>
    </div>
  );
};
