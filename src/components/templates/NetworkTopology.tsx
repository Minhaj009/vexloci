import React, { useMemo } from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import {
  Activity,
  Building,
  Layers,
  Server,
  ShieldAlert,
  User,
} from 'lucide-react';
import { NetworkTopologyPropsSchema, SceneData } from '../../schemas/timeline.schema';
import { useSceneBeat } from '../director/SceneBeatContext';
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
  const beatState = useSceneBeat();

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

  const nodeCount = props.nodes.length;
  const beatFocus =
    beatState?.beat?.beatType === 'TEMPLATE_STATE'
      ? beatState.beat.templateFocus
      : undefined;
  const rawFocusNodeIdx =
    beatFocus?.targetIndex ?? (beatState ? beatState.beatIndex : 0);
  const activeNodeIdx = nodeCount > 0 ? Math.max(0, rawFocusNodeIdx) % nodeCount : -1;
  const activeNode = activeNodeIdx >= 0 ? props.nodes[activeNodeIdx] : null;
  const activeNodeId = activeNode?.id;
  const pulseOpacity = 0.55 + 0.45 * Math.sin(frame * 0.25);

  const radarAngle = (frame * 2.2) % 360;
  const radarRad = (radarAngle * Math.PI) / 180;
  const radarLeadX = centerX + 480 * Math.cos(radarRad);
  const radarLeadY = centerY + 480 * Math.sin(radarRad);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#F8FAFC] select-none flex flex-col pt-12 pb-10 px-10 gap-5">
      <div className="relative z-20 backdrop-blur-md bg-white/95 border border-slate-200 rounded-2xl px-8 py-4 flex items-center justify-between text-slate-900 shadow-xs shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-600">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">
              TOPOLOGICAL RECONSTRUCTION // ENTITY MAP
            </span>
            <h2 className="text-xl font-heading font-bold text-slate-900">
              Global Liquidity & Threat Routing Mesh
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <Badge variant="mono">
            NODES: <strong className="text-blue-600 ml-1">{props.nodes.length}</strong>
          </Badge>
          <Badge variant="mono">
            EDGES: <strong className="text-blue-600 ml-1">{props.edges.length}</strong>
          </Badge>
          <Badge
            variant={isFault ? 'destructive' : 'cyan'}
            className="font-bold"
            style={isFault ? { opacity: pulseOpacity } : undefined}
          >
            {isFault ? 'CRITICAL SYSTEM BREACH' : 'MESH ENCRYPTED'}
          </Badge>
        </div>
      </div>

      <div className="relative flex-1 min-h-0 flex gap-6">
        <div className="relative flex-1 rounded-2xl bg-white border border-slate-200/90 overflow-hidden shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
          <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${width} ${height}`}>
            <defs>
              <radialGradient id="threatGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={isFault ? '#DC2626' : '#2563EB'} stopOpacity={0.06} />
                <stop offset="100%" stopColor={isFault ? '#DC2626' : '#2563EB'} stopOpacity={0.0} />
              </radialGradient>
              <pattern id="meshGrid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#E2E8F0" strokeWidth="0.8" strokeOpacity="0.8" />
              </pattern>
            </defs>

            <rect width={width} height={height} fill="#F8FAFC" />
            <rect width={width} height={height} fill="url(#meshGrid)" />
            <circle cx={centerX} cy={centerY} r={460} fill="url(#threatGlow)" />

            {[120, 240, 360, 480].map((r) => (
              <circle
                key={r}
                cx={centerX}
                cy={centerY}
                r={r}
                fill="none"
                stroke="#E2E8F0"
                strokeWidth={1}
                strokeDasharray="4 6"
              />
            ))}

            <line
              x1={centerX - 480}
              y1={centerY}
              x2={centerX + 480}
              y2={centerY}
              stroke="#E2E8F0"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <line
              x1={centerX}
              y1={centerY - 480}
              x2={centerX}
              y2={centerY + 480}
              stroke="#E2E8F0"
              strokeWidth={1}
              strokeDasharray="3 3"
            />

            <line
              x1={centerX}
              y1={centerY}
              x2={radarLeadX}
              y2={radarLeadY}
              stroke="#3B82F6"
              strokeWidth={1.5}
              strokeOpacity={0.4}
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
              const edgeColor = isFault ? '#DC2626' : '#2563EB';
              const isEdgeActive = Boolean(
                activeNodeId && (edge.from === activeNodeId || edge.to === activeNodeId)
              );

              return (
                <g
                  key={`${edge.from}-${edge.to}-${idx}`}
                  opacity={beatState ? (isEdgeActive ? 1 : 0.45) : 1}
                >
                  <path
                    d={d}
                    fill="none"
                    stroke="#CBD5E1"
                    strokeWidth={isEdgeActive ? '2.5' : '2'}
                    strokeOpacity="0.9"
                  />
                  <path
                    d={d}
                    fill="none"
                    stroke={edgeColor}
                    strokeWidth={isEdgeActive ? '3' : '2.5'}
                    strokeDasharray="6 28"
                    strokeDashoffset={packetOffset}
                  />

                  <circle
                    cx={dotX}
                    cy={dotY}
                    r={isEdgeActive ? 4.5 : 3.5}
                    fill={edgeColor}
                  />

                  {edge.label && (
                    <g transform={`translate(${midX}, ${midY - 10})`}>
                      <rect
                        x="-48"
                        y="-10"
                        width="96"
                        height="20"
                        rx="6"
                        fill="#FFFFFF"
                        stroke={isEdgeActive ? edgeColor : '#CBD5E1'}
                        strokeWidth={isEdgeActive ? '1.5' : '1'}
                      />
                      <text
                        y="4"
                        textAnchor="middle"
                        fill="#475569"
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

            {props.nodes.map((node, nodeIdx) => {
              const pos = nodePositions[node.id];
              if (!pos) return null;

              const isCompromised =
                node.status === 'compromised' || (isFault && node.type === 'server');
              const isFocusedNode = nodeIdx === activeNodeIdx;
              const nodeStroke = isCompromised ? '#DC2626' : '#2563EB';
              const nodeFill = isCompromised ? '#FEF2F2' : '#FFFFFF';
              const pulseScale = isCompromised ? 1 + Math.sin(frame * 0.25) * 0.08 : 1;
              const focusScale = isFocusedNode ? 1.08 : 1;
              const focusHaloRadius = 56 + Math.sin(frame * 0.18) * 5;
              const focusHaloOpacity = 0.55 + Math.sin(frame * 0.18) * 0.25;

              return (
                <g
                  key={node.id}
                  transform={`translate(${pos.x}, ${pos.y}) scale(${appearProgress * pulseScale * focusScale})`}
                  opacity={beatState && !isFocusedNode ? 0.72 : 1}
                >
                  {isFocusedNode && (
                    <>
                      <circle
                        r={focusHaloRadius}
                        fill="none"
                        stroke={nodeStroke}
                        strokeWidth="2"
                        strokeOpacity={focusHaloOpacity}
                      />
                      <circle
                        r="38"
                        fill="none"
                        stroke={nodeStroke}
                        strokeWidth="2.5"
                        strokeOpacity={0.9}
                      />
                    </>
                  )}

                  <circle
                    r="46"
                    fill="none"
                    stroke={nodeStroke}
                    strokeWidth="1.2"
                    strokeDasharray="4 4"
                    strokeOpacity={isFocusedNode ? 0.75 : 0.4}
                  />

                  <circle
                    r="30"
                    fill={nodeFill}
                    stroke={nodeStroke}
                    strokeWidth={isFocusedNode ? '3.5' : '2.5'}
                  />

                  <foreignObject x="-15" y="-15" width="30" height="30">
                    <div
                      className={cn(
                        'w-full h-full flex items-center justify-center',
                        isCompromised ? 'text-rose-600' : 'text-blue-600'
                      )}
                    >
                      {getNodeIcon(node.type)}
                    </div>
                  </foreignObject>

                  <text
                    y="48"
                    textAnchor="middle"
                    fill="#0F172A"
                    fontSize="12"
                    fontFamily="Space Grotesk"
                    fontWeight="bold"
                  >
                    {node.label}
                  </text>

                  {isFocusedNode && (
                    <rect
                      x="-78"
                      y="54"
                      width="156"
                      height="15"
                      rx="7.5"
                      fill={isCompromised ? '#FEE2E2' : '#DBEAFE'}
                      stroke={nodeStroke}
                      strokeWidth="1"
                    />
                  )}

                  <text
                    y="64"
                    textAnchor="middle"
                    fill={isCompromised ? '#DC2626' : isFocusedNode ? '#1D4ED8' : '#64748B'}
                    fontSize="9"
                    fontFamily="JetBrains Mono"
                    fontWeight={isFocusedNode ? 'bold' : 'normal'}
                  >
                    [{node.type.toUpperCase()}] // {isCompromised ? 'COMPROMISED' : 'NORMAL'}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <Card className="relative w-[380px] bg-white border border-slate-200/90 rounded-2xl shadow-[0_4px_24px_rgba(15,23,42,0.04)] text-slate-900 flex flex-col justify-between overflow-hidden">
          <BorderBeam
            size={220}
            duration={10}
            colorFrom={isFault ? '#DC2626' : '#2563EB'}
            colorTo={isFault ? '#F59E0B' : '#60A5FA'}
          />

          <CardHeader className="p-4 border-b border-slate-200 bg-slate-50/70">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-blue-600" />
                <CardTitle className="text-sm font-mono tracking-wider uppercase text-slate-900">
                  TELEMETRY OVERWATCH
                </CardTitle>
              </div>
              <Badge variant={isFault ? 'destructive' : 'cyan'} className="text-[9px]">
                {isFault ? 'THREAT LEVEL 5' : 'SECURE'}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-4 flex-1 flex flex-col justify-between gap-4 font-mono text-xs">
            <Card className="p-3 rounded-xl bg-slate-50 border-slate-200">
              <div className="text-[10px] text-slate-500 tracking-widest uppercase">
                ACTIVE COMPROMISED NODES
              </div>
              <div className="text-2xl font-mono font-black mt-1 text-rose-600">
                <NumberTicker
                  value={compromisedCount}
                  startValue={0}
                  durationFrames={30}
                />
                <span className="text-sm text-slate-500 font-normal ml-1">
                  / {props.nodes.length} CLUSTERS
                </span>
              </div>
            </Card>

            {props.nodes.length > 0 && (
              <Card className="p-3 rounded-xl bg-slate-50 border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-slate-500 tracking-widest uppercase">
                    ACTIVE NODE INSPECTOR
                  </span>
                  {activeNode && (
                    <Badge
                      variant={
                        activeNode.status === 'compromised' || (isFault && activeNode.type === 'server')
                          ? 'destructive'
                          : 'default'
                      }
                      className="text-[9px] py-0"
                    >
                      {activeNode.type.toUpperCase()}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {props.nodes.map((node, idx) => {
                    const isNodeFocused = idx === activeNodeIdx;
                    const isNodeCompromised =
                      node.status === 'compromised' || (isFault && node.type === 'server');

                    return (
                      <Badge
                        key={node.id}
                        variant={
                          isNodeCompromised
                            ? 'destructive'
                            : isNodeFocused
                              ? 'default'
                              : 'outline'
                        }
                        className={cn(
                          'text-[10px] font-mono',
                          isNodeFocused
                            ? isNodeCompromised
                              ? 'ring-2 ring-rose-500 bg-rose-100 text-rose-800 font-bold shadow-xs'
                              : 'ring-2 ring-blue-500 bg-blue-100 text-blue-800 font-bold shadow-xs'
                            : 'opacity-60'
                        )}
                      >
                        {node.label}
                      </Badge>
                    );
                  })}
                </div>
              </Card>
            )}

            <Card className="p-3 rounded-xl bg-slate-50 border-slate-200">
              <div className="text-[10px] text-slate-500 tracking-widest uppercase">
                PACKET THROUGHPUT RATE
              </div>
              <div className="text-2xl font-mono font-black mt-1 text-blue-600">
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
                  className="h-1.5 bg-slate-200 border border-slate-200"
                  indicatorClassName={isFault ? 'bg-rose-600' : 'bg-blue-600'}
                />
              </div>
            </Card>

            <div className="space-y-2 text-[11px]">
              <div className="flex items-center justify-between text-slate-500">
                <span>MESH ENCRYPTION SYNC</span>
                <span className={isFault ? 'text-rose-600 font-bold' : 'text-blue-600'}>
                  {isFault ? 'UNROUTED (42.6%)' : '99.98% NOMINAL'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>COMPROMISE SEVERITY</span>
                <Badge variant={isFault ? 'destructive' : 'cyan'} className="text-[9px] py-0">
                  {isFault ? 'CRITICAL BREACH' : 'LEVEL 1 CLEAR'}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>CORE INGESTION LATENCY</span>
                <span className="font-mono text-slate-900 font-medium">
                  {isFault ? '148.6ms (SPIKE)' : '4.2ms (OPTICAL)'}
                </span>
              </div>
            </div>

            <Card className="p-2.5 rounded-xl bg-slate-50 border-slate-200 text-[10px] text-slate-600">
              <div className="flex items-center justify-between mb-1 font-bold">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3 h-3 text-blue-600" />
                  <span className="text-slate-800">LATERAL INTRUSION LOG</span>
                </span>
                <span className="text-slate-400">LIVE</span>
              </div>
              <div className="truncate text-slate-600">
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
