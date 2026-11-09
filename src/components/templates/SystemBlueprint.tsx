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

  const gap = 145;
  const blockWidth = 240;
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
      <Card className="relative w-[1540px] bg-white border border-slate-200/90 shadow-[0_4px_24px_rgba(0,0,0,0.04)] rounded-2xl p-7 overflow-hidden mb-12">
        <CardHeader className="flex flex-row items-center justify-between pb-4 mb-4 border-b border-slate-200 p-0 space-y-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-blue-600">
              <Workflow className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">
                ARCHITECTURAL BLUEPRINT // PIPELINE DEPLOYMENT
              </span>
              <CardTitle className="text-xl font-heading font-extrabold text-slate-900 tracking-tight mt-0.5">
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
                  ? 'bg-red-50 border-red-300 text-red-700 animate-pulse'
                  : 'bg-slate-100 border-slate-200 text-slate-700'
              )}
            >
              {isFault ? 'FAULT TRIGGERED // RE-ENTRANT LOOP' : 'STATUS: OPERATIONAL'}
            </Badge>
          </div>
        </CardHeader>

        {faultProgress > 0 && (
          <Alert
            variant="destructive"
            className="mb-4 bg-red-50 border-red-300 py-2.5 px-4 font-mono text-xs font-bold flex items-center gap-2.5 text-red-800"
            style={{
              opacity: faultProgress,
              transform: `translateY(${(1 - faultProgress) * -10}px)`,
            }}
          >
            <AlertOctagon className="w-4 h-4 animate-pulse text-red-600" />
            <span>
              {faultEvent?.payloadText || 'CRITICAL FAULT: UNCONTROLLED HIGH-FREQUENCY LOOP DETECTED'}
            </span>
          </Alert>
        )}

        <div className="relative w-full h-[450px] rounded-xl bg-slate-50/70 border border-slate-200 overflow-hidden">
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${diagramWidth} ${diagramHeight}`}>
            <defs>
              <pattern id="blueprintGrid" width="36" height="36" patternUnits="userSpaceOnUse">
                <path d="M 36 0 L 0 0 0 36" fill="none" stroke="#E2E8F0" strokeWidth="0.8" />
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
              const midFlowX = (x1 + x2) / 2;

              const isFractured = Boolean(
                isFault && (props.blocks.find((b) => b.id === flow.from)?.isFaultPoint || idx >= 1)
              );
              const flowColor = isFractured ? '#DC2626' : '#2563EB';
              const pulseOffset = (-frame * 2.2 + idx * 20) % 100;

              const photonRatio = ((frame * 0.025 + idx * 0.3) % 1);
              const dotX = x1 + (x2 - x1) * photonRatio;

              const labelText = isFractured ? 'FRACTURED' : (flow.label || '');
              const words = labelText.split(' ');
              let line1 = labelText;
              let line2 = '';
              if (words.length >= 2 && labelText.length > 10) {
                const mid = Math.ceil(words.length / 2);
                line1 = words.slice(0, mid).join(' ');
                line2 = words.slice(mid).join(' ');
              }

              return (
                <g key={idx} opacity={flowProgress}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y1}
                    stroke="#CBD5E1"
                    strokeWidth="2.5"
                  />
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y1}
                    stroke={flowColor}
                    strokeWidth="2"
                    strokeDasharray={isFractured ? '4 4' : '8 12'}
                    strokeDashoffset={pulseOffset}
                  />

                  <circle
                    cx={dotX}
                    cy={y1}
                    r={3.5}
                    fill={flowColor}
                  />

                  <g transform={`translate(${midFlowX}, ${y1 - 24})`}>
                    <rect
                      x="-48"
                      y="-16"
                      width="96"
                      height="32"
                      rx="8"
                      fill="#FFFFFF"
                      stroke={flowColor}
                      strokeWidth="1.2"
                      style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.06))' }}
                    />
                    {line2 ? (
                      <>
                        <text
                          y="-3"
                          textAnchor="middle"
                          fill={isFractured ? '#DC2626' : '#1E293B'}
                          fontSize="9"
                          fontFamily="JetBrains Mono"
                          fontWeight="600"
                        >
                          {line1}
                        </text>
                        <text
                          y="9"
                          textAnchor="middle"
                          fill={isFractured ? '#DC2626' : '#1E293B'}
                          fontSize="9"
                          fontFamily="JetBrains Mono"
                          fontWeight="600"
                        >
                          {line2}
                        </text>
                      </>
                    ) : (
                      <text
                        y="3"
                        textAnchor="middle"
                        fill={isFractured ? '#DC2626' : '#1E293B'}
                        fontSize="9.5"
                        fontFamily="JetBrains Mono"
                        fontWeight="600"
                      >
                        {line1}
                      </text>
                    )}
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
                        stroke="#DC2626"
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
                    ? 'bg-red-50/90 border-red-300 shadow-[0_4px_16px_rgba(220,38,38,0.15)] text-red-950'
                    : 'bg-slate-50 border-slate-200 shadow-xs text-slate-900'
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
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <Badge variant="mono" className="text-[9px] px-2 py-0.5 bg-slate-200/70 text-slate-700 border-0">
                    {block.id.toUpperCase()}
                  </Badge>
                  <Badge
                    variant={isFaultBlock ? 'destructive' : 'secondary'}
                    className={cn(
                      'text-[9px] font-mono font-semibold px-2 py-0.5 border-0',
                      isFaultBlock ? 'bg-red-200 text-red-900 animate-pulse' : 'bg-blue-100 text-blue-700'
                    )}
                  >
                    {isFaultBlock ? 'FAULT POINT' : 'OPERATIONAL'}
                  </Badge>
                </div>

                <div className="my-1.5">
                  <h4 className="text-[13px] font-heading font-extrabold text-slate-900 truncate">
                    {block.title}
                  </h4>
                  <p className="text-[10.5px] font-mono text-slate-500 truncate mt-0.5">
                    {block.subtitle}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-[10px] font-mono">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Cpu className={cn('w-3.5 h-3.5', isFaultBlock ? 'text-red-600' : 'text-blue-600')} />
                    <span>SYS_BUS</span>
                  </div>
                  {isFaultBlock ? (
                    <AlertOctagon className="w-3.5 h-3.5 text-red-600 animate-pulse" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
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
