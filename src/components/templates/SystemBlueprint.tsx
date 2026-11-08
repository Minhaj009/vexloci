import React, { useMemo } from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { AlertOctagon, CheckCircle2, Cpu, Workflow } from 'lucide-react';
import { SceneData, SystemBlueprintPropsSchema } from '../../schemas/timeline.schema';

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

  const isFault = faultEvent && frame >= Math.round(faultEvent.triggerOffsetSec * fps);

  let faultProgress = 0;
  if (faultEvent && frame >= Math.round(faultEvent.triggerOffsetSec * fps)) {
    const triggerFrame = Math.round(faultEvent.triggerOffsetSec * fps);
    faultProgress = spring({
      frame: frame - triggerFrame,
      fps,
      config: { damping: 12, mass: 0.8, stiffness: 120 },
    });
  }

  const width = 1380;
  const height = 520;
  const blocksCount = props.blocks.length;

  const blockCoords = useMemo<Record<string, BlockCoord>>(() => {
    const map: Record<string, BlockCoord> = {};
    if (blocksCount === 0) return map;

    const blockWidth = 220;
    const blockHeight = 110;
    const gap = 100; // Generous 100px gap preventing any flow text collision
    const totalW = blocksCount * blockWidth + (blocksCount - 1) * gap;
    const startX = (width - totalW) / 2;
    const y = height / 2 - blockHeight / 2;

    props.blocks.forEach((b, idx) => {
      map[b.id] = {
        x: startX + idx * (blockWidth + gap),
        y,
        width: blockWidth,
        height: blockHeight,
      };
    });

    return map;
  }, [props.blocks, blocksCount, width, height]);

  return (
    <div className="relative w-full h-full flex items-center justify-center p-6 select-none">
      <div className="relative w-[1380px] bg-[#0A0D14] border border-[#1E2536] rounded-2xl shadow-[0_30px_70px_rgba(0,0,0,0.95)] p-8 overflow-hidden">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#1E2536]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#07090E] border border-[#1E2536] text-[#00F5D4] shadow-inner">
              <Workflow className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-widest text-[#94A3B8]">
                ARCHITECTURAL BLUEPRINT // PIPELINE DEPLOYMENT
              </span>
              <h2 className="text-xl font-heading font-extrabold text-[#F1F5F9] tracking-tight">
                {props.systemTitle}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <span
              className={`px-3 py-1 rounded-full border transition-colors duration-300 font-bold ${
                isFault
                  ? 'bg-[#FF2A54]/20 border-[#FF2A54] text-[#FF2A54] shadow-[0_0_15px_rgba(255,42,84,0.4)]'
                  : 'bg-[#00F5D4]/15 border-[#00F5D4]/40 text-[#00F5D4]'
              }`}
            >
              {isFault ? 'FAULT TRIGGERED // RE-ENTRANT DEAD CODE' : 'SYSTEM STATUS: VERIFIED'}
            </span>
          </div>
        </div>

        <div className="relative w-full h-[430px] rounded-xl bg-[#06080D] border border-[#1E2536] overflow-hidden">
          <svg className="w-full h-full" viewBox={`0 0 ${width} ${height}`}>
            <defs>
              <pattern id="blueprintGrid" width="35" height="35" patternUnits="userSpaceOnUse">
                <path d="M 35 0 L 0 0 0 35" fill="none" stroke="#121A2B" strokeWidth="0.8" />
              </pattern>
            </defs>

            <rect width="100%" height="100%" fill="url(#blueprintGrid)" />

            {/* Flow Connecting Lines & Isolated Label Badges */}
            {props.flows.map((flow, idx) => {
              const src = blockCoords[flow.from];
              const dst = blockCoords[flow.to];
              if (!src || !dst) return null;

              const x1 = src.x + src.width;
              const y1 = src.y + src.height / 2;
              const x2 = dst.x;
              const y2 = dst.y + dst.height / 2;
              const midFlowX = (x1 + x2) / 2;

              const isFractured = isFault && (props.blocks.find(b => b.id === flow.from)?.isFaultPoint || idx >= 1);
              const flowColor = isFractured ? '#FF2A54' : '#00F5D4';
              const pulseOffset = (-frame * 2.5 + idx * 20) % 100;

              return (
                <g key={idx}>
                  {/* Base Track */}
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#1E2536"
                    strokeWidth="3"
                  />
                  {/* Glowing Animated Dash Track */}
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={flowColor}
                    strokeWidth="2.5"
                    strokeDasharray={isFractured ? '4 4' : '8 14'}
                    strokeDashoffset={pulseOffset}
                    style={{
                      filter: `drop-shadow(0 0 6px ${flowColor})`,
                    }}
                  />

                  {/* Flow Label Pill: Elevated cleanly ABOVE the line with solid background */}
                  <g transform={`translate(${midFlowX}, ${y1 - 22})`}>
                    <rect
                      x="-48"
                      y="-11"
                      width="96"
                      height="22"
                      rx="11"
                      fill="#0A0E17"
                      stroke={flowColor}
                      strokeWidth="1.5"
                      style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.8))' }}
                    />
                    <text
                      y="4"
                      textAnchor="middle"
                      fill={flowColor}
                      fontSize="9"
                      fontFamily="JetBrains Mono"
                      fontWeight="bold"
                      letterSpacing="0.5"
                    >
                      {isFractured ? 'FRACTURED' : flow.label}
                    </text>
                  </g>
                </g>
              );
            })}

            {/* Architecture Blocks */}
            {props.blocks.map((block, idx) => {
              const pos = blockCoords[block.id];
              if (!pos) return null;

              const isFaultBlock = Boolean(block.isFaultPoint) && isFault;
              const illuminationRatio = Math.min(1, Math.max(0, (frame - idx * 12) / 18));

              return (
                <g
                  key={block.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  style={{
                    filter: isFaultBlock
                      ? 'drop-shadow(0 0 20px rgba(255,42,84,0.8))'
                      : illuminationRatio > 0.5
                      ? 'drop-shadow(0 0 12px rgba(0,245,212,0.3))'
                      : undefined,
                  }}
                >
                  <rect
                    width={pos.width}
                    height={pos.height}
                    rx="12"
                    fill={isFaultBlock ? '#170A0F' : '#0B0F17'}
                    stroke={isFaultBlock ? '#FF2A54' : illuminationRatio > 0.5 ? '#00F5D4' : '#1E2536'}
                    strokeWidth={isFaultBlock ? 2.5 : 1.5}
                  />

                  {/* Block Header */}
                  <rect
                    width={pos.width}
                    height="32"
                    rx="12"
                    fill={isFaultBlock ? '#2A0D15' : '#0E1422'}
                  />
                  <line
                    x1="0"
                    y1="32"
                    x2={pos.width}
                    y2="32"
                    stroke={isFaultBlock ? '#FF2A54' : '#1E2536'}
                    strokeWidth="1"
                  />

                  <g transform="translate(12, 20)">
                    <Cpu className={`w-4 h-4 ${isFaultBlock ? 'text-[#FF2A54]' : 'text-[#00F5D4]'}`} />
                  </g>
                  <text
                    x="34"
                    y="21"
                    fill="#F1F5F9"
                    fontSize="11"
                    fontFamily="Space Grotesk"
                    fontWeight="bold"
                    letterSpacing="0.5"
                  >
                    {block.id.toUpperCase()}
                  </text>

                  {/* Status Indicator Icon */}
                  <g transform={`translate(${pos.width - 24}, 12)`}>
                    {isFaultBlock ? (
                      <AlertOctagon className="w-4 h-4 text-[#FF2A54] animate-pulse" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-[#00F5D4]" />
                    )}
                  </g>

                  {/* Block Title & Subtitle */}
                  <text
                    x="16"
                    y="60"
                    fill={isFaultBlock ? '#FF2A54' : '#F1F5F9'}
                    fontSize="13"
                    fontFamily="Space Grotesk"
                    fontWeight="bold"
                  >
                    {block.title}
                  </text>
                  <text
                    x="16"
                    y="84"
                    fill="#94A3B8"
                    fontSize="10"
                    fontFamily="JetBrains Mono"
                  >
                    {block.subtitle}
                  </text>

                  {/* Red Alert Pill on Fault */}
                  {isFaultBlock && (
                    <g transform="translate(14, 88)">
                      <rect
                        width={pos.width - 28}
                        height="16"
                        rx="4"
                        fill="#FF2A54"
                        opacity="0.2"
                      />
                      <text
                        x={(pos.width - 28) / 2}
                        y="12"
                        textAnchor="middle"
                        fill="#FF2A54"
                        fontSize="9"
                        fontFamily="JetBrains Mono"
                        fontWeight="bold"
                      >
                        [FLAG_POWER_PEG=1]
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
};
