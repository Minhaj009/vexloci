import React, { useMemo } from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { AlertOctagon, CheckCircle2, Cpu, Workflow } from 'lucide-react';
import { SceneData, SystemBlueprintPropsSchema } from '../../schemas/timeline.schema';
import { Card, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Alert } from '../ui/alert';
import { cn } from '../../lib/utils';

interface SystemBlueprintProps {
  scene: SceneData;
}

interface BlockCoord {
  x: number;
  y: number;
  width: number;
  height: number;
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

  let faultProgress = 0;
  if (faultEvent && frame >= Math.round(faultEvent.triggerOffsetSec * fps)) {
    const triggerFrame = Math.round(faultEvent.triggerOffsetSec * fps);
    faultProgress = spring({
      frame: frame - triggerFrame,
      fps,
      config: { damping: 12, mass: 0.8, stiffness: 120 },
    });
  }

  const diagramWidth = 1440;
  const diagramHeight = 440;
  const blocksCount = props.blocks.length;
  const totalFrames = Math.max(1, Math.round(scene.durationSec * fps));

  const gap = 115;
  const blockWidth = 260;
  const blockHeight = 150;

  const blockCoords = useMemo<Record<string, BlockCoord>>(() => {
    const map: Record<string, BlockCoord> = {};
    if (blocksCount === 0) return map;

    const totalW = blocksCount * blockWidth + (blocksCount - 1) * gap;
    const startX = (diagramWidth - totalW) / 2;
    const y = diagramHeight / 2 - blockHeight / 2;

    props.blocks.forEach((b, idx) => {
      map[b.id] = {
        x: startX + idx * (blockWidth + gap),
        y,
        width: blockWidth,
        height: blockHeight,
      };
    });

    return map;
  }, [props.blocks, blocksCount, diagramWidth, diagramHeight, blockWidth, blockHeight, gap]);

  return (
    <div className="relative w-full h-full flex items-center justify-center p-6 select-none">
      <Card className="relative w-[1540px] bg-[#0E1526]/95 border border-slate-700/80 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.85)] p-7 overflow-hidden mb-12">
        <CardHeader className="flex flex-row items-center justify-between pb-4 mb-4 border-b border-slate-800 p-0 space-y-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#090E1A] border border-slate-800 text-sky-400">
              <Workflow className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">
                ARCHITECTURAL BLUEPRINT // PIPELINE DEPLOYMENT
              </span>
              <CardTitle className="text-xl font-heading font-extrabold text-slate-100 tracking-tight mt-0.5">
                {props.systemTitle}
              </CardTitle>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <Badge
              variant={isFault ? 'destructive' : 'secondary'}
              className={cn(
                'px-3 py-1 font-mono text-xs font-semibold tracking-wide border',
                isFault
                  ? 'bg-rose-950/60 border-rose-500/80 text-rose-300 animate-pulse'
                  : 'bg-slate-900 border-slate-700 text-slate-300'
              )}
            >
              {isFault ? 'FAULT TRIGGERED // RE-ENTRANT LOOP' : 'STATUS: OPERATIONAL'}
            </Badge>
          </div>
        </CardHeader>

        {faultProgress > 0 && (
          <Alert
            variant="destructive"
            className="mb-4 bg-rose-950/40 border-rose-500/80 py-2.5 px-4 font-mono text-xs font-bold flex items-center gap-2.5"
            style={{
              opacity: faultProgress,
              transform: `translateY(${(1 - faultProgress) * -10}px)`,
            }}
          >
            <AlertOctagon className="w-4 h-4 animate-pulse text-rose-400" />
            <span className="text-rose-200">
              {faultEvent?.payloadText || 'CRITICAL FAULT: UNCONTROLLED HIGH-FREQUENCY LOOP DETECTED'}
            </span>
          </Alert>
        )}

        <div className="relative w-full h-[450px] rounded-xl bg-[#080D1A] border border-slate-800/90 overflow-hidden">
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${diagramWidth} ${diagramHeight}`}>
            <defs>
              <pattern id="blueprintGrid" width="36" height="36" patternUnits="userSpaceOnUse">
                <path d="M 36 0 L 0 0 0 36" fill="none" stroke="#131F36" strokeWidth="0.8" />
              </pattern>
            </defs>

            <rect width="100%" height="100%" fill="url(#blueprintGrid)" />

            {props.flows.map((flow, idx) => {
              const src = blockCoords[flow.from];
              const dst = blockCoords[flow.to];
              if (!src || !dst) return null;

              const flowDelay = Math.round(((idx + 0.5) / Math.max(1, blocksCount)) * (totalFrames * 0.4));
              if (frame < flowDelay) return null;

              const flowProgress = spring({
                frame: frame - flowDelay,
                fps,
                config: { damping: 14, mass: 0.8, stiffness: 100 },
              });

              const x1 = src.x + src.width;
              const y1 = src.y + src.height / 2;
              const x2 = dst.x;
              const y2 = dst.y + dst.height / 2;
              const midFlowX = (x1 + x2) / 2;

              const isFractured = Boolean(
                isFault && (props.blocks.find((b) => b.id === flow.from)?.isFaultPoint || idx >= 1)
              );
              const flowColor = isFractured ? '#EF4444' : '#38BDF8';
              const pulseOffset = (-frame * 2.2 + idx * 20) % 100;

              const photonRatio = ((frame * 0.025 + idx * 0.3) % 1);
              const dotX = x1 + (x2 - x1) * photonRatio;

              const labelText = isFractured ? 'FRACTURED' : (flow.label || '');
              const pillWidth = Math.max(90, Math.min(gap - 8, labelText.length * 7.2 + 24));

              return (
                <g key={idx} opacity={flowProgress}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#1E293B"
                    strokeWidth="3"
                  />
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={flowColor}
                    strokeWidth="2"
                    strokeDasharray={isFractured ? '4 4' : '8 12'}
                    strokeDashoffset={pulseOffset}
                  />

                  <circle
                    cx={dotX}
                    cy={y1}
                    r={3}
                    fill={flowColor}
                  />

                  <g transform={`translate(${midFlowX}, ${y1 - 24})`}>
                    <rect
                      x={-pillWidth / 2}
                      y="-12"
                      width={pillWidth}
                      height="24"
                      rx="12"
                      fill="#0B1322"
                      stroke={flowColor}
                      strokeWidth="1.2"
                      style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.6))' }}
                    />
                    <text
                      y="4"
                      textAnchor="middle"
                      fill={isFractured ? '#FCA5A5' : '#E2E8F0'}
                      fontSize="9.5"
                      fontFamily="JetBrains Mono"
                      fontWeight="600"
                      letterSpacing="0.3"
                    >
                      {labelText}
                    </text>
                  </g>
                </g>
              );
            })}

            {props.blocks.map((block) => {
              const pos = blockCoords[block.id];
              if (!pos || !block.isFaultPoint || !isFault) return null;

              return (
                <g key={`fault-rings-${block.id}`}>
                  {[0, 1, 2].map((ringIdx) => {
                    const ripplePhase = ((frame + ringIdx * 12) % 36) / 36;
                    const rippleRadius = pos.width / 2 + ripplePhase * 50;
                    const rippleOpacity = (1 - ripplePhase) * 0.55;
                    return (
                      <circle
                        key={ringIdx}
                        cx={pos.x + pos.width / 2}
                        cy={pos.y + pos.height / 2}
                        r={rippleRadius}
                        fill="none"
                        stroke="#EF4444"
                        strokeWidth="1.8"
                        opacity={rippleOpacity}
                      />
                    );
                  })}
                </g>
              );
            })}
          </svg>

          {props.blocks.map((block, idx) => {
            const pos = blockCoords[block.id];
            if (!pos) return null;

            const blockDelay = Math.round((idx / Math.max(1, blocksCount)) * (totalFrames * 0.35));
            const blockSpring = spring({
              frame: frame - blockDelay,
              fps,
              config: { damping: 14, mass: 0.9, stiffness: 100 },
            });
            const blockOpacity = interpolate(blockSpring, [0, 1], [0, 1]);
            const blockScale = interpolate(blockSpring, [0, 1], [0.92, 1.0]);

            const isFaultBlock = Boolean(block.isFaultPoint) && isFault;

            return (
              <Card
                key={block.id}
                className={cn(
                  'absolute rounded-xl border p-4 flex flex-col justify-between transition-all overflow-hidden',
                  isFaultBlock
                    ? 'bg-rose-950/70 border-rose-500/80 shadow-[0_10px_30px_rgba(239,68,68,0.25)]'
                    : 'bg-[#0E1729]/95 border-slate-700/80 shadow-[0_10px_25px_rgba(0,0,0,0.5)]'
                )}
                style={{
                  left: `${pos.x}px`,
                  top: `${pos.y}px`,
                  width: `${pos.width}px`,
                  height: `${pos.height}px`,
                  opacity: blockOpacity,
                  transform: `scale(${blockScale})`,
                }}
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <Badge variant="mono" className="text-[9px] px-2 py-0.5 bg-slate-800/80 text-slate-300 border-0">
                    {block.id.toUpperCase()}
                  </Badge>
                  <Badge
                    variant={isFaultBlock ? 'destructive' : 'secondary'}
                    className={cn(
                      'text-[9px] font-mono font-semibold px-2 py-0.5 border-0',
                      isFaultBlock ? 'bg-rose-900/80 text-rose-200 animate-pulse' : 'bg-slate-800 text-sky-400'
                    )}
                  >
                    {isFaultBlock ? 'FAULT POINT' : 'OPERATIONAL'}
                  </Badge>
                </div>

                <div className="my-1.5">
                  <h4 className="text-[13px] font-heading font-bold text-slate-100 truncate">
                    {block.title}
                  </h4>
                  <p className="text-[10.5px] font-mono text-slate-400 truncate mt-0.5">
                    {block.subtitle}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px] font-mono">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Cpu className={cn('w-3.5 h-3.5', isFaultBlock ? 'text-rose-400' : 'text-sky-400')} />
                    <span>SYS_BUS</span>
                  </div>
                  {isFaultBlock ? (
                    <AlertOctagon className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
