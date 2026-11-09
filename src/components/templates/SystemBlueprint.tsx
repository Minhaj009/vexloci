import React, { useMemo } from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import {
  Network,
  Router,
  Server,
  Printer,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Activity,
  HardDrive,
} from 'lucide-react';
import { SceneData, SystemBlueprintPropsSchema } from '../../schemas/timeline.schema';
import { cn } from '../../lib/utils';

interface SystemBlueprintProps {
  scene: SceneData;
}

export const SystemBlueprint: React.FC<SystemBlueprintProps> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const props = SystemBlueprintPropsSchema.parse(scene.props);

  const faultEvent = useMemo(
    () => scene.microEvents.find((e) => e.action === 'PULSE_FAULT'),
    [scene.microEvents]
  );

  const isFault = Boolean(faultEvent && frame >= Math.round(faultEvent.triggerOffsetSec * fps));

  const blocksCount = props.blocks.length;
  const totalFrames = Math.max(1, Math.round(scene.durationSec * fps));

  const containerW = 1800;
  const containerH = 940;
  const canvasW = 1736;
  const canvasH = 750;

  const cardW = 265;
  const cardH = 220;
  const cardY = (canvasH - cardH) / 2;
  const portY = cardY + cardH / 2;

  const badgeW = 156;
  const badgeH = 32;

  const gap = blocksCount > 1 ? Math.min(210, Math.max(60, (canvasW - 60 - blocksCount * cardW) / (blocksCount - 1))) : 0;
  const totalW = blocksCount * cardW + (blocksCount - 1) * gap;
  const startX = (canvasW - totalW) / 2;

  const cardPositions = useMemo(() => {
    return props.blocks.map((b, i) => ({
      id: b.id,
      x: startX + i * (cardW + gap),
      y: cardY,
      w: cardW,
      h: cardH,
    }));
  }, [props.blocks, blocksCount, cardW, cardH, gap, startX, cardY]);

  const blockMap = useMemo(() => {
    const map: Record<string, { x: number; y: number; w: number; h: number; index: number }> = {};
    cardPositions.forEach((pos, idx) => {
      map[pos.id] = { ...pos, index: idx };
    });
    return map;
  }, [cardPositions]);

  const getNodeIcon = (title: string, subtitle: string) => {
    const lower = `${title} ${subtitle}`.toLowerCase();
    if (lower.includes('printer')) return Printer;
    if (lower.includes('switch') || lower.includes('hub') || lower.includes('router')) return Router;
    if (lower.includes('server') || lower.includes('terminal') || lower.includes('swift')) return Server;
    if (lower.includes('disk') || lower.includes('storage')) return HardDrive;
    return Network;
  };



  const cameraZoom = interpolate(frame, [0, totalFrames], [1.0, 1.018], {
    extrapolateRight: 'clamp',
  });

  return (
    <div className="w-[1920px] h-[1080px] bg-[#F8FAFC] flex items-center justify-center select-none relative overflow-hidden font-sans">
      <div className="absolute w-[900px] h-[600px] bg-blue-100/40 rounded-full blur-[140px] pointer-events-none -top-20 left-1/2 -translate-x-1/2" />

      <div
        className="relative bg-white rounded-3xl border border-slate-200/90 shadow-[0_25px_70px_-15px_rgba(15,23,42,0.07),0_0_0_1px_rgba(226,232,240,0.8)] overflow-hidden flex flex-col justify-between"
        style={{
          width: `${containerW}px`,
          height: `${containerH}px`,
          transform: `scale(${cameraZoom})`,
          transformOrigin: '50% 50%',
        }}
      >
        <div className="backdrop-blur-xl bg-white/85 border-b border-slate-200 px-10 py-5 flex items-center justify-between z-20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono tracking-widest text-blue-600 font-bold uppercase bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200/80">
                  ARCHITECTURAL BLUEPRINT // PIPELINE DEPLOYMENT
                </span>
                <span className="text-[11px] font-mono text-slate-400">|</span>
                <span className="text-[11px] font-mono text-slate-500 font-medium">MOTIJHEEL 10TH FLOOR OPERATIONS</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1 font-heading">
                {props.systemTitle || 'Bangladesh Bank // SWIFT Alliance Network Architecture'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" />
              <span className="font-semibold">TOPOLOGY AUDIT ACTIVE</span>
            </div>
            {isFault ? (
              <div className="px-3.5 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-mono font-bold flex items-center gap-2 animate-pulse">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span>FATAL SEGREGATION BREACH</span>
              </div>
            ) : (
              <div className="px-3.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-mono font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>TOPOLOGY VERIFIED</span>
              </div>
            )}
          </div>
        </div>

        <div className="relative flex-1 mx-8 my-4 rounded-2xl bg-[#FAFCFF] border border-slate-200/70 overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(#CBD5E1 1.2px, transparent 1.2px)',
              backgroundSize: '28px 28px',
              maskImage: 'radial-gradient(ellipse at center, black 60%, transparent 95%)',
              WebkitMaskImage: 'radial-gradient(ellipse at center, black 60%, transparent 95%)',
            }}
          />

          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox={`0 0 ${canvasW} ${canvasH}`}>
            <defs>
              <filter id="laserGlowBlueprint" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {props.flows.map((flow, idx) => {
              const src = blockMap[flow.from];
              const dst = blockMap[flow.to];
              if (!src || !dst) return null;

              const x1 = src.x + src.w;
              const x2 = dst.x;
              const midX = (x1 + x2) / 2;

              const badgeHalfW = badgeW / 2 + 8;
              const leftLineEnd = midX - badgeHalfW;
              const rightLineStart = midX + badgeHalfW;

              const isFlowFault = Boolean(
                isFault && (props.blocks.find((b) => b.id === flow.from)?.isFaultPoint || idx >= 1)
              );
              const pulseColor = isFlowFault ? '#DC2626' : '#2563EB';

              const photonT = ((frame * 0.03 + idx * 0.33) % 1);
              const photonX = x1 + (x2 - x1) * photonT;

              return (
                <g key={idx}>
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
                    strokeDasharray="8 10"
                    strokeDashoffset={-frame * 2.5}
                    strokeOpacity="0.85"
                  />

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
                    strokeDasharray="8 10"
                    strokeDashoffset={-frame * 2.5}
                    strokeOpacity="0.85"
                  />

                  {(photonX < leftLineEnd || photonX > rightLineStart) && (
                    <circle
                      cx={photonX}
                      cy={portY}
                      r="4"
                      fill={pulseColor}
                      filter="url(#laserGlowBlueprint)"
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {props.flows.map((flow, idx) => {
            const src = blockMap[flow.from];
            const dst = blockMap[flow.to];
            if (!src || !dst) return null;

            const midX = (src.x + src.w + dst.x) / 2;
            const isFlowFault = Boolean(
              isFault && (props.blocks.find((b) => b.id === flow.from)?.isFaultPoint || idx >= 1)
            );

            return (
              <div
                key={`badge-${idx}`}
                className="absolute z-20 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none"
                style={{ left: `${midX}px`, top: `${portY}px` }}
              >
                <div
                  className="rounded-full bg-white border border-slate-200/90 shadow-[0_6px_20px_-4px_rgba(15,23,42,0.1),0_0_0_1px_rgba(226,232,240,0.8)] flex items-center justify-center gap-2 px-3.5"
                  style={{ width: `${badgeW}px`, height: `${badgeH}px` }}
                >
                  <span
                    className={cn(
                      'w-2 h-2 rounded-full shrink-0',
                      isFlowFault ? 'bg-red-500 animate-pulse' : 'bg-blue-600'
                    )}
                  />
                  <span className="text-[10px] font-mono font-bold text-slate-800 tracking-tight whitespace-nowrap truncate">
                    {flow.label}
                  </span>
                </div>
                <span className="text-[9.5px] font-mono text-slate-500 uppercase tracking-wider font-semibold mt-1">
                  {isFlowFault ? 'UNPROTECTED BRIDGE' : 'DATA FLOW'}
                </span>
              </div>
            );
          })}

          {props.blocks.map((block, idx) => {
            const pos = blockMap[block.id];
            if (!pos) return null;

            const blockDelay = Math.round((idx / Math.max(1, blocksCount)) * (totalFrames * 0.3));
            const blockSpring = spring({
              frame: Math.max(0, frame - blockDelay),
              fps,
              config: { damping: 14, mass: 0.9, stiffness: 100 },
            });

            const isFaultBlock = Boolean(block.isFaultPoint) && isFault;
            const IconComponent = getNodeIcon(block.title, block.subtitle);

            return (
              <div
                key={block.id}
                className={cn(
                  'absolute rounded-2xl p-5 flex flex-col justify-between transition-all bg-white overflow-visible z-20',
                  isFaultBlock
                    ? 'border border-red-200 shadow-[0_12px_32px_-8px_rgba(220,38,38,0.12),0_0_0_1px_rgba(239,68,68,0.2)]'
                    : 'border border-slate-200/90 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.06),0_0_0_1px_rgba(226,232,240,0.8)]'
                )}
                style={{
                  left: `${pos.x}px`,
                  top: `${pos.y}px`,
                  width: `${pos.w}px`,
                  height: `${pos.h}px`,
                  opacity: blockSpring,
                  transform: `scale(${interpolate(blockSpring, [0, 1], [0.94, 1.0])})`,
                }}
              >
                {idx > 0 && (
                  <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)] z-30 flex items-center justify-center">
                    <div className={cn('w-1.5 h-1.5 rounded-full', isFaultBlock ? 'bg-red-600' : 'bg-blue-600')} />
                  </div>
                )}
                {idx < blocksCount - 1 && (
                  <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)] z-30 flex items-center justify-center">
                    <div className={cn('w-1.5 h-1.5 rounded-full', isFaultBlock ? 'bg-red-600' : 'bg-blue-600')} />
                  </div>
                )}

                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-slate-900 text-white font-mono text-xs font-bold flex items-center justify-center shadow-xs">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">
                      NODE
                    </span>
                  </div>
                  <span
                    className={cn(
                      'text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider',
                      isFaultBlock
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    )}
                  >
                    {isFaultBlock ? 'CRITICAL EXPOSURE' : 'OPERATIONAL'}
                  </span>
                </div>

                <div className="flex items-center gap-3.5 my-1">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center shadow-xs shrink-0',
                      isFaultBlock
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

                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10.5px] font-mono">
                  <div className="px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200/80 text-slate-600 truncate max-w-[210px]">
                    {block.id.toUpperCase()} // SYS_BUS
                  </div>
                  {isFaultBlock ? (
                    <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-10 py-4 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between text-xs font-mono text-slate-500">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-slate-700">FORENSIC EXHIBIT: FX-2016-02</span>
            <span>•</span>
            <span>ISOLATION PROTOCOL: {isFault ? 'FAILED (HUB-BRIDGED)' : 'ENFORCED'}</span>
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
