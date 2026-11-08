import React, { useMemo } from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Building, Layers, Server, User } from 'lucide-react';
import { NetworkTopologyPropsSchema, SceneData } from '../../schemas/timeline.schema';

interface NetworkTopologyProps {
  scene: SceneData;
}

interface NodePosition {
  x: number;
  y: number;
}

export const NetworkTopology: React.FC<NetworkTopologyProps> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const props = NetworkTopologyPropsSchema.parse(scene.props);

  const panEvent = useMemo(
    () => scene.microEvents.find((e) => e.action === 'PAN_TO_NODE'),
    [scene.microEvents]
  );

  const faultEvent = useMemo(
    () => scene.microEvents.find((e) => e.action === 'PULSE_FAULT'),
    [scene.microEvents]
  );

  const isFault = faultEvent && frame >= Math.round(faultEvent.triggerOffsetSec * fps);

  const appearProgress = interpolate(frame, [0, 25], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const width = 1920;
  const height = 1080;
  const centerX = width / 2;
  const centerY = height / 2;

  const nodePositions = useMemo<Record<string, NodePosition>>(() => {
    const map: Record<string, NodePosition> = {};
    const count = props.nodes.length;
    if (count === 0) return map;

    const angleStep = (Math.PI * 2) / count;
    props.nodes.forEach((node, i) => {
      const radiusX = 520;
      const radiusY = 320;
      const angle = i * angleStep - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radiusX;
      const y = centerY + Math.sin(angle) * radiusY;
      map[node.id] = { x, y };
    });

    return map;
  }, [props.nodes, centerX, centerY]);

  const focusedNodeId = panEvent?.targetId || props.nodes[0]?.id;

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'bank':
        return <Building className="w-6 h-6" />;
      case 'server':
        return <Server className="w-6 h-6" />;
      case 'person':
        return <User className="w-6 h-6" />;
      case 'shell':
      default:
        return <Layers className="w-6 h-6" />;
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#07090E] select-none">
      <div className="backdrop-blur-md bg-[#080A0F]/85 border border-[#1E2536] rounded-xl px-6 py-3 mx-12 mt-6 absolute top-0 left-0 right-0 z-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#07090E] border border-[#1E2536] text-[#00F5D4]">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-mono tracking-widest text-[#94A3B8]">
              TOPOLOGICAL RECONSTRUCTION // ENTITY MAP
            </span>
            <h2 className="text-xl font-heading font-bold text-[#F1F5F9]">
              Global Liquidity & Routing Mesh
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="text-[#94A3B8]">
            NODES: <strong className="text-[#00F5D4]">{props.nodes.length}</strong>
          </span>
          <span className="text-[#94A3B8]">
            EDGES: <strong className="text-[#00F5D4]">{props.edges.length}</strong>
          </span>
          {isFault && (
            <span className="px-2 py-0.5 rounded bg-[#FF2A54]/20 border border-[#FF2A54] text-[#FF2A54] font-bold animate-pulse">
              BREACH PROPAGATING
            </span>
          )}
        </div>
      </div>

      <div className="absolute bottom-8 left-12 z-20 font-mono text-xs bg-[#080A0F]/85 backdrop-blur-md border border-[#1E2536] rounded-lg px-4 py-3 flex flex-col gap-1 pointer-events-none">
        <div className="text-[10px] text-[#94A3B8] tracking-widest uppercase">
          NETWORK TELEMETRY // LATENCY MESH
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-[#00F5D4]">SYNC: 99.98%</span>
          <span className="text-[#1E2536]">|</span>
          <span className={isFault ? 'text-[#FF2A54] font-bold' : 'text-[#94A3B8]'}>
            {isFault ? 'STATUS: UNROUTED PACKETS' : 'STATUS: NOMINAL'}
          </span>
        </div>
      </div>

      <div className="absolute bottom-8 right-12 z-20 font-mono text-xs bg-[#080A0F]/85 backdrop-blur-md border border-[#1E2536] rounded-lg px-4 py-3 flex flex-col gap-1 pointer-events-none">
        <div className="text-[10px] text-[#94A3B8] tracking-widest uppercase">
          THREAT CLASSIFICATION
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isFault ? 'bg-[#FF2A54] animate-ping' : 'bg-[#00F5D4]'}`} />
          <span className={`font-bold ${isFault ? 'text-[#FF2A54]' : 'text-[#00F5D4]'}`}>
            {isFault ? 'CRITICAL SYSTEM BREACH' : 'ENCRYPTED CHANNEL'}
          </span>
        </div>
      </div>

      <div className="relative w-full h-full">
        <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${width} ${height}`}>
          <defs>
            <radialGradient id="meshCenterGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#00F5D4" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#00F5D4" stopOpacity="0.0" />
            </radialGradient>
            <pattern id="meshGrid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#1E2536" strokeWidth="0.5" strokeOpacity="0.4" />
            </pattern>
          </defs>

          <rect width="1920" height="1080" fill="url(#meshGrid)" />
          <circle cx={centerX} cy={centerY} r={420} fill="url(#meshCenterGlow)" />

          {props.edges.map((edge, idx) => {
            const p1 = nodePositions[edge.from];
            const p2 = nodePositions[edge.to];
            if (!p1 || !p2) return null;

            const midX = (p1.x + p2.x) / 2 + (p1.y - p2.y) * 0.1;
            const midY = (p1.y + p2.y) / 2 + (p2.x - p1.x) * 0.1;
            const d = `M ${p1.x} ${p1.y} Q ${midX} ${midY} ${p2.x} ${p2.y}`;

            const packetOffset = (-frame * 3 + idx * 40) % 200;

            return (
              <g key={`${edge.from}-${edge.to}-${idx}`}>
                <path
                  d={d}
                  fill="none"
                  stroke="#1E2536"
                  strokeWidth="2"
                  strokeOpacity="0.8"
                />
                <path
                  d={d}
                  fill="none"
                  stroke={isFault ? '#FF2A54' : '#00F5D4'}
                  strokeWidth="2.5"
                  strokeDasharray="6 32"
                  strokeDashoffset={packetOffset}
                  style={{
                    filter: isFault
                      ? 'drop-shadow(0 0 6px rgba(255,42,84,0.8))'
                      : 'drop-shadow(0 0 6px rgba(0,245,212,0.8))',
                  }}
                />
                {edge.label && (
                  <text
                    x={midX}
                    y={midY - 8}
                    textAnchor="middle"
                    fill="#94A3B8"
                    fontSize="11"
                    fontFamily="JetBrains Mono"
                    opacity="0.85"
                  >
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}

          {props.nodes.map((node) => {
            const pos = nodePositions[node.id];
            if (!pos) return null;

            const isCompromised = node.status === 'compromised' || (isFault && node.type === 'server');
            const isTargeted = focusedNodeId === node.id;
            const nodeGlow = isCompromised ? '#FF2A54' : '#00F5D4';

            const pulseScale = isCompromised ? 1 + Math.sin(frame * 0.2) * 0.08 : 1;

            return (
              <g
                key={node.id}
                transform={`translate(${pos.x}, ${pos.y}) scale(${appearProgress * pulseScale})`}
                style={{
                  filter: isTargeted || isCompromised ? `drop-shadow(0 0 14px ${nodeGlow})` : undefined,
                }}
              >
                {isTargeted && (
                  <circle
                    r="48"
                    fill="none"
                    stroke="#00F5D4"
                    strokeWidth="1.5"
                    strokeDasharray="5 3"
                    className="animate-spin"
                    style={{ animationDuration: '6s' }}
                  />
                )}

                <circle
                  r="32"
                  fill="#080A0F"
                  stroke={nodeGlow}
                  strokeWidth={isTargeted ? '3' : '2'}
                />

                <foreignObject x="-16" y="-16" width="32" height="32">
                  <div
                    className={`w-full h-full flex items-center justify-center ${
                      isCompromised ? 'text-[#FF2A54]' : 'text-[#00F5D4]'
                    }`}
                  >
                    {getNodeIcon(node.type)}
                  </div>
                </foreignObject>

                <text
                  y="52"
                  textAnchor="middle"
                  fill="#F1F5F9"
                  fontSize="13"
                  fontFamily="Space Grotesk"
                  fontWeight="bold"
                >
                  {node.label}
                </text>

                <text
                  y="68"
                  textAnchor="middle"
                  fill={isCompromised ? '#FF2A54' : '#94A3B8'}
                  fontSize="10"
                  fontFamily="JetBrains Mono"
                >
                  [{node.type.toUpperCase()}] // {isCompromised ? 'COMPROMISED' : 'NORMAL'}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
