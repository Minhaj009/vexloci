import React, { useMemo } from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import {
  Activity,
  Building,
  Cpu,
  Layers,
  Server,
  ShieldAlert,
  User,
} from 'lucide-react';
import { NetworkTopologyPropsSchema, SceneData } from '../../schemas/timeline.schema';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { BorderBeam } from '../ui/border-beam';
import { NumberTicker } from '../ui/number-ticker';
import { Progress } from '../ui/progress';
import { cn } from '../../lib/utils';

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

  const faultEvent = useMemo(
    () => scene.microEvents.find((e) => e.action === 'PULSE_FAULT'),
    [scene.microEvents]
  );

  const isFault = Boolean(faultEvent && frame >= Math.round(faultEvent.triggerOffsetSec * fps));

  const appearProgress = interpolate(frame, [0, 25], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const width = 1380;
  const height = 740;
  const centerX = width / 2;
  const centerY = height / 2;

  const nodePositions = useMemo<Record<string, NodePosition>>(() => {
    const map: Record<string, NodePosition> = {};
    const count = props.nodes.length;
    if (count === 0) return map;

    const angleStep = (Math.PI * 2) / count;
    props.nodes.forEach((node, i) => {
      const radiusX = 460;
      const radiusY = 240;
      const angle = i * angleStep - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radiusX;
      const y = centerY + Math.sin(angle) * radiusY;
      map[node.id] = { x, y };
    });

    return map;
  }, [props.nodes, centerX, centerY]);

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'bank':
        return <Building className="w-5 h-5" />;
      case 'server':
        return <Server className="w-5 h-5" />;
      case 'person':
        return <User className="w-5 h-5" />;
      case 'shell':
      default:
        return <Layers className="w-5 h-5" />;
    }
  };

  const compromisedCount = props.nodes.filter(
    (n) => n.status === 'compromised' || (isFault && n.type === 'server')
  ).length;

  const radarAngle = (frame * 2.2) % 360;
  const radarRad = (radarAngle * Math.PI) / 180;
  const radarLeadX = centerX + 480 * Math.cos(radarRad);
  const radarLeadY = centerY + 480 * Math.sin(radarRad);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#07090E] select-none">
      <div className="backdrop-blur-md bg-[#080A0F]/90 border-b border-[#1E2536] px-10 py-4 absolute top-0 left-0 right-0 z-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#07090E] border border-border text-primary">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
              TOPOLOGICAL RECONSTRUCTION // ENTITY MAP
            </span>
            <h2 className="text-xl font-heading font-bold text-foreground">
              Global Liquidity & Threat Routing Mesh
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <Badge variant="mono">
            NODES: <strong className="text-primary ml-1">{props.nodes.length}</strong>
          </Badge>
          <Badge variant="mono">
            EDGES: <strong className="text-primary ml-1">{props.edges.length}</strong>
          </Badge>
          <Badge
            variant={isFault ? 'destructive' : 'cyan'}
            className={cn('font-bold', isFault && 'animate-pulse shadow-[0_0_15px_rgba(255,42,84,0.5)]')}
          >
            {isFault ? 'CRITICAL SYSTEM BREACH' : 'MESH ENCRYPTED'}
          </Badge>
        </div>
      </div>

      <div className="absolute top-[88px] left-10 right-10 bottom-28 flex gap-6">
        <div className="relative flex-1 rounded-xl bg-[#080B12]/90 border border-border/80 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
          <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${width} ${height}`}>
            <defs>
              <radialGradient id="threatGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={isFault ? '#FF2A54' : '#00F5D4'} stopOpacity="0.12" />
                <stop offset="100%" stopColor={isFault ? '#FF2A54' : '#00F5D4'} stopOpacity="0.0" />
              </radialGradient>
              <pattern id="meshGrid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#1E2536" strokeWidth="0.5" strokeOpacity="0.35" />
              </pattern>
            </defs>

            <rect width={width} height={height} fill="url(#meshGrid)" />
            <circle cx={centerX} cy={centerY} r={460} fill="url(#threatGlow)" />

            {[120, 240, 360, 480].map((r) => (
              <circle
                key={r}
                cx={centerX}
                cy={centerY}
                r={r}
                fill="none"
                stroke={isFault ? '#FF2A54' : '#00F5D4'}
                strokeWidth={1}
                strokeOpacity={0.16}
                strokeDasharray="4 6"
              />
            ))}

            <line
              x1={centerX - 480}
              y1={centerY}
              x2={centerX + 480}
              y2={centerY}
              stroke={isFault ? '#FF2A54' : '#00F5D4'}
              strokeWidth={0.8}
              strokeOpacity={0.2}
              strokeDasharray="3 3"
            />
            <line
              x1={centerX}
              y1={centerY - 480}
              x2={centerX}
              y2={centerY + 480}
              stroke={isFault ? '#FF2A54' : '#00F5D4'}
              strokeWidth={0.8}
              strokeOpacity={0.2}
              strokeDasharray="3 3"
            />

            <line
              x1={centerX}
              y1={centerY}
              x2={radarLeadX}
              y2={radarLeadY}
              stroke={isFault ? '#FF2A54' : '#00F5D4'}
              strokeWidth={1.5}
              strokeOpacity={0.7}
              style={{ filter: `drop-shadow(0 0 6px ${isFault ? '#FF2A54' : '#00F5D4'})` }}
            />

            {props.edges.map((edge, idx) => {
              const p1 = nodePositions[edge.from];
              const p2 = nodePositions[edge.to];
              if (!p1 || !p2) return null;

              const midX = (p1.x + p2.x) / 2 + (p1.y - p2.y) * 0.12;
              const midY = (p1.y + p2.y) / 2 + (p2.x - p1.x) * 0.12;
              const d = `M ${p1.x} ${p1.y} Q ${midX} ${midY} ${p2.x} ${p2.y}`;

              const packetOffset = (-frame * 3 + idx * 40) % 200;
              const photonRatio = ((frame * 0.02 + idx * 0.25) % 1);
              const oneMinusT = 1 - photonRatio;
              const dotX = oneMinusT * oneMinusT * p1.x + 2 * oneMinusT * photonRatio * midX + photonRatio * photonRatio * p2.x;
              const dotY = oneMinusT * oneMinusT * p1.y + 2 * oneMinusT * photonRatio * midY + photonRatio * photonRatio * p2.y;
              const edgeColor = isFault ? '#FF2A54' : '#00F5D4';

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
                    stroke={edgeColor}
                    strokeWidth="2.5"
                    strokeDasharray="6 28"
                    strokeDashoffset={packetOffset}
                    style={{
                      filter: `drop-shadow(0 0 6px ${edgeColor})`,
                    }}
                  />

                  <circle
                    cx={dotX}
                    cy={dotY}
                    r={3.5}
                    fill={edgeColor}
                    style={{ filter: `drop-shadow(0 0 6px ${edgeColor})` }}
                  />

                  {edge.label && (
                    <g transform={`translate(${midX}, ${midY - 10})`}>
                      <rect
                        x="-48"
                        y="-10"
                        width="96"
                        height="20"
                        rx="10"
                        fill="#0A0E17"
                        stroke="#1E2536"
                        strokeWidth="1"
                      />
                      <text
                        y="4"
                        textAnchor="middle"
                        fill="#94A3B8"
                        fontSize="9"
                        fontFamily="JetBrains Mono"
                        fontWeight="bold"
                      >
                        {edge.label}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {props.nodes.map((node) => {
              const pos = nodePositions[node.id];
              if (!pos) return null;

              const isCompromised =
                node.status === 'compromised' || (isFault && node.type === 'server');
              const nodeGlow = isCompromised ? '#FF2A54' : '#00F5D4';
              const pulseScale = isCompromised ? 1 + Math.sin(frame * 0.25) * 0.08 : 1;

              return (
                <g
                  key={node.id}
                  transform={`translate(${pos.x}, ${pos.y}) scale(${appearProgress * pulseScale})`}
                  style={{
                    filter: `drop-shadow(0 0 14px ${nodeGlow})`,
                  }}
                >
                  <circle
                    r="46"
                    fill="none"
                    stroke={nodeGlow}
                    strokeWidth="1.2"
                    strokeDasharray="4 4"
                    strokeOpacity={0.6}
                  />

                  <circle
                    r="30"
                    fill="#080A0F"
                    stroke={nodeGlow}
                    strokeWidth="2.5"
                  />

                  <foreignObject x="-15" y="-15" width="30" height="30">
                    <div
                      className={cn(
                        'w-full h-full flex items-center justify-center',
                        isCompromised ? 'text-destructive' : 'text-primary'
                      )}
                    >
                      {getNodeIcon(node.type)}
                    </div>
                  </foreignObject>

                  <text
                    y="48"
                    textAnchor="middle"
                    fill="#F1F5F9"
                    fontSize="12"
                    fontFamily="Space Grotesk"
                    fontWeight="bold"
                  >
                    {node.label}
                  </text>

                  <text
                    y="64"
                    textAnchor="middle"
                    fill={isCompromised ? '#FF2A54' : '#94A3B8'}
                    fontSize="9"
                    fontFamily="JetBrains Mono"
                  >
                    [{node.type.toUpperCase()}] // {isCompromised ? 'COMPROMISED' : 'NORMAL'}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <Card className="relative w-[380px] bg-[#080B12]/95 border-border/80 flex flex-col justify-between overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
          <BorderBeam
            size={220}
            duration={10}
            colorFrom={isFault ? '#FF2A54' : '#00F5D4'}
            colorTo={isFault ? '#F59E0B' : '#3B82F6'}
          />

          <CardHeader className="p-4 border-b border-border/80 bg-[#06080D]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-primary" />
                <CardTitle className="text-sm font-mono tracking-wider uppercase">
                  TELEMETRY OVERWATCH
                </CardTitle>
              </div>
              <Badge variant={isFault ? 'destructive' : 'cyan'} className="text-[9px]">
                {isFault ? 'THREAT LEVEL 5' : 'SECURE'}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-4 flex-1 flex flex-col justify-between gap-4 font-mono text-xs">
            <Card className="p-3 rounded-lg bg-[#06080D] border-border">
              <div className="text-[10px] text-muted-foreground tracking-widest uppercase">
                ACTIVE COMPROMISED NODES
              </div>
              <div className="text-2xl font-mono font-black mt-1 text-destructive drop-shadow-[0_0_12px_rgba(255,42,84,0.6)]">
                <NumberTicker
                  value={compromisedCount}
                  startValue={0}
                  durationFrames={30}
                />
                <span className="text-sm text-muted-foreground font-normal ml-1">
                  / {props.nodes.length} CLUSTERS
                </span>
              </div>
            </Card>

            <Card className="p-3 rounded-lg bg-[#06080D] border-border">
              <div className="text-[10px] text-muted-foreground tracking-widest uppercase">
                PACKET THROUGHPUT RATE
              </div>
              <div className="text-2xl font-mono font-black mt-1 text-primary drop-shadow-[0_0_10px_rgba(0,245,212,0.5)]">
                <NumberTicker
                  value={isFault ? 842100 : 124500}
                  startValue={98000}
                  durationFrames={45}
                  suffix=" PKT/S"
                />
              </div>
              <div className="mt-2">
                <Progress
                  value={isFault ? 98 : 34}
                  className="h-1.5 bg-surface border border-border"
                  indicatorClassName={isFault ? 'bg-destructive shadow-[0_0_8px_#FF2A54]' : 'bg-primary'}
                />
              </div>
            </Card>

            <div className="space-y-2 text-[11px]">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>MESH ENCRYPTION SYNC</span>
                <span className={isFault ? 'text-destructive font-bold' : 'text-primary'}>
                  {isFault ? 'UNROUTED (42.6%)' : '99.98% NOMINAL'}
                </span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>COMPROMISE SEVERITY</span>
                <Badge variant={isFault ? 'destructive' : 'cyan'} className="text-[9px] py-0">
                  {isFault ? 'CRITICAL BREACH' : 'LEVEL 1 CLEAR'}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>CORE INGESTION LATENCY</span>
                <span className="font-mono text-foreground">
                  {isFault ? '148.6ms (SPIKE)' : '4.2ms (OPTICAL)'}
                </span>
              </div>
            </div>

            <Card className="p-2.5 rounded-lg bg-[#06080D] border-border text-[10px] text-muted-foreground">
              <div className="flex items-center justify-between mb-1 font-bold">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3 h-3 text-primary" />
                  <span>LATERAL INTRUSION LOG</span>
                </span>
                <span className="text-border">LIVE</span>
              </div>
              <div className="truncate">
                {isFault
                  ? '0x99A -> UNCHECKED_ROUTER_CALL (RPC 445)'
                  : '0x01B -> SECURE_SOCKET_ACK (PORT 8443)'}
              </div>
            </Card>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
