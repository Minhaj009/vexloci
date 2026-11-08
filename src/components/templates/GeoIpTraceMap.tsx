import React, { useMemo } from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Globe, Navigation } from 'lucide-react';
import countriesTopology from 'world-atlas/countries-110m.json';
import * as topojson from 'topojson-client';
import * as d3Geo from 'd3-geo';
import { GeoIpTraceMapPropsSchema, SceneData } from '../../schemas/timeline.schema';

interface GeoIpTraceMapProps {
  scene: SceneData;
}

interface HudSlot {
  x: number;
  y: number;
  w: number;
  h: number;
  connX: number;
  connY: number;
  badge: string;
}

const HUD_SLOTS: HudSlot[] = [
  { x: 80, y: 780, w: 320, h: 86, connX: 400, connY: 823, badge: 'HOP 01 // ORIGIN' },
  { x: 80, y: 170, w: 320, h: 86, connX: 400, connY: 213, badge: 'HOP 02 // DETECTED' },
  { x: 1520, y: 170, w: 320, h: 86, connX: 1520, connY: 213, badge: 'HOP 03 // TRANSATLANTIC' },
  { x: 1520, y: 780, w: 320, h: 86, connX: 1520, connY: 823, badge: 'HOP 04 // CASCADE' },
];

export const GeoIpTraceMap: React.FC<GeoIpTraceMapProps> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const props = GeoIpTraceMapPropsSchema.parse(scene.props);
  const waypoints = props.waypoints;
  const totalFrames = Math.max(1, Math.round(scene.durationSec * fps));

  const width = 1920;
  const height = 1080;

  const countriesGeo = useMemo(() => {
    return topojson.feature(
      countriesTopology as any,
      (countriesTopology as any).objects.countries as any
    ) as any;
  }, []);

  const projection = useMemo(() => {
    return d3Geo
      .geoNaturalEarth1()
      .fitExtent([[60, 100], [1860, 980]], countriesGeo);
  }, [countriesGeo]);

  const pathGenerator = useMemo(() => d3Geo.geoPath(projection), [projection]);

  const graticulePath = useMemo(() => {
    const graticule = d3Geo.geoGraticule().step([15, 15])();
    return pathGenerator(graticule) || '';
  }, [pathGenerator]);

  const activeCountries = useMemo(() => {
    if (!countriesGeo?.features) return new Set<string | number>();
    const matched = new Set<string | number>();
    for (const feature of countriesGeo.features) {
      for (const wp of waypoints) {
        try {
          if (d3Geo.geoContains(feature, [wp.lon, wp.lat])) {
            matched.add(feature.id);
            break;
          }
        } catch {
        }
      }
    }
    return matched;
  }, [countriesGeo, waypoints]);

  const projectedWaypoints = useMemo(() => {
    return waypoints.map((wp, idx) => {
      const pt = projection([wp.lon, wp.lat]) || [width / 2, height / 2];
      return {
        ...wp,
        x: pt[0],
        y: pt[1],
        slot: HUD_SLOTS[idx % HUD_SLOTS.length],
      };
    });
  }, [waypoints, projection]);

  const activeHopFloat = interpolate(frame, [0, totalFrames], [0, waypoints.length - 1], {
    extrapolateRight: 'clamp',
  });
  const activeHopIdx = Math.floor(activeHopFloat);

  const radarPhase = (frame % 30) / 30;
  const radarRadius = 6 + radarPhase * 36;
  const radarOpacity = 1 - radarPhase;

  const lonMarkers = [-120, -60, 0, 60, 120];
  const latMarkers = [60, 30, 0, -30];

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#07090E] select-none">
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between backdrop-blur-md bg-[#080A0F]/85 border border-[#1E2536] rounded-xl px-6 py-3 mx-12 mt-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#07090E] border border-[#1E2536] text-[#00F5D4]">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-mono tracking-widest text-[#94A3B8]">
              GLOBAL TRACE ROUTE // GEOSPATIAL VECTOR MATRIX
            </span>
            <h2 className="text-xl font-heading font-bold text-[#F1F5F9]">
              Transatlantic Order Propagation & Execution Mesh
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2 text-[#00F5D4]">
            <Navigation className="w-4 h-4 animate-spin" style={{ animationDuration: '8s' }} />
            <span>ACTIVE HOP 0{activeHopIdx + 1} OF 0{waypoints.length}</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-[#00F5D4]/15 border border-[#00F5D4]/40 text-[#00F5D4]">
            PACKET PROPAGATION: 4.2ms
          </span>
        </div>
      </div>

      <svg className="w-full h-full absolute inset-0" viewBox="0 0 1920 1080">
        <defs>
          <linearGradient id="traceArcGlow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#00F5D4" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#FF2A54" stopOpacity="0.9" />
          </linearGradient>

          <pattern id="continent-dots" width="6" height="6" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="1.1" fill="#1E3A5F" />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="#07090E" />

        <path
          d={graticulePath}
          fill="none"
          stroke="#1E293B"
          strokeWidth="0.8"
          strokeDasharray="3 3"
          opacity={0.6}
        />

        {countriesGeo?.features?.map((feature: any, i: number) => {
          const d = pathGenerator(feature);
          if (!d) return null;
          const isActive = activeCountries.has(feature.id);

          return (
            <g key={`country-${feature.id || i}`}>
              <path
                d={d}
                fill={isActive ? 'rgba(0, 245, 212, 0.14)' : '#090E17'}
                stroke="#00F5D4"
                strokeWidth={isActive ? 1.2 : 0.75}
                strokeOpacity={isActive ? 0.85 : 0.35}
              />
              <path
                d={d}
                fill="url(#continent-dots)"
                opacity={isActive ? 0.9 : 0.55}
                pointerEvents="none"
              />
            </g>
          );
        })}

        {lonMarkers.map((lon) => {
          const pt = projection([lon, 0]);
          if (!pt) return null;
          const x = pt[0];
          const label = lon === 0 ? '0°PR' : lon < 0 ? `${Math.abs(lon)}°W` : `${lon}°E`;

          return (
            <g key={`lon-${lon}`}>
              <text
                x={x}
                y={95}
                textAnchor="middle"
                fill="#475569"
                fontFamily="JetBrains Mono"
                fontSize="9"
              >
                {label}
              </text>
              <text
                x={x}
                y={1060}
                textAnchor="middle"
                fill="#475569"
                fontFamily="JetBrains Mono"
                fontSize="9"
              >
                {label}
              </text>
            </g>
          );
        })}

        {latMarkers.map((lat) => {
          const pt = projection([0, lat]);
          if (!pt) return null;
          const y = pt[1] + 3;
          const label = lat === 0 ? '0°EQ' : lat > 0 ? `${lat}°N` : `${Math.abs(lat)}°S`;

          return (
            <g key={`lat-${lat}`}>
              <text
                x={24}
                y={y}
                textAnchor="start"
                fill="#475569"
                fontFamily="JetBrains Mono"
                fontSize="9"
              >
                {label}
              </text>
              <text
                x={1896}
                y={y}
                textAnchor="end"
                fill="#475569"
                fontFamily="JetBrains Mono"
                fontSize="9"
              >
                {label}
              </text>
            </g>
          );
        })}

        {projectedWaypoints.map((p1, idx) => {
          if (idx === projectedWaypoints.length - 1) return null;
          const p2 = projectedWaypoints[idx + 1];
          const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
          const arcHeight = Math.max(40, Math.min(110, dist * 0.22));
          const midX = (p1.x + p2.x) / 2;
          const midY = Math.min(p1.y, p2.y) - arcHeight;
          const d = `M ${p1.x} ${p1.y} Q ${midX} ${midY} ${p2.x} ${p2.y}`;

          const arcStartFrame = idx * 45;
          const arcEndFrame = arcStartFrame + 60;
          const arcProgress = interpolate(frame, [arcStartFrame, arcEndFrame], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });

          const arcLength = dist * 1.25;

          const cx =
            (1 - arcProgress) * (1 - arcProgress) * p1.x +
            2 * (1 - arcProgress) * arcProgress * midX +
            arcProgress * arcProgress * p2.x;
          const cy =
            (1 - arcProgress) * (1 - arcProgress) * p1.y +
            2 * (1 - arcProgress) * arcProgress * midY +
            arcProgress * arcProgress * p2.y;

          return (
            <g key={`arc-${idx}`}>
              <path
                d={d}
                fill="none"
                stroke="#1E2536"
                strokeWidth={1.5}
                strokeDasharray="4 4"
              />

              {arcProgress > 0 && (
                <path
                  d={d}
                  fill="none"
                  stroke="url(#traceArcGlow)"
                  strokeWidth={2.5}
                  strokeDasharray={`${arcLength} ${arcLength}`}
                  strokeDashoffset={(1 - arcProgress) * arcLength}
                  style={{ filter: 'drop-shadow(0 0 8px rgba(0, 245, 212, 0.8))' }}
                />
              )}

              {arcProgress > 0 && arcProgress < 1 && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={4}
                  fill="#00F5D4"
                  stroke="#0A0E17"
                  strokeWidth={1.5}
                  style={{ filter: 'drop-shadow(0 0 8px #00F5D4)' }}
                />
              )}
            </g>
          );
        })}

        {projectedWaypoints.map((wp, idx) => {
          const slot = wp.slot;
          const isPassed = frame >= idx * 45;
          const isCurrent = activeHopIdx === idx;

          let leaderPoints: string;
          let dots: { x: number; y: number }[] = [];

          if (idx === 0) {
            const elbow1 = { x: wp.x - 45, y: wp.y + 45 };
            const elbow2 = { x: elbow1.x, y: slot.connY };
            leaderPoints = `${wp.x},${wp.y} ${elbow1.x},${elbow1.y} ${elbow2.x},${elbow2.y} ${slot.connX},${slot.connY}`;
            dots = [elbow1, elbow2, { x: slot.connX, y: slot.connY }];
          } else {
            const dy = slot.connY - wp.y;
            const isLeft = slot.connX < wp.x;
            const dx = isLeft ? -Math.abs(dy) : Math.abs(dy);
            const elbow = { x: wp.x + dx, y: slot.connY };
            leaderPoints = `${wp.x},${wp.y} ${elbow.x},${elbow.y} ${slot.connX},${slot.connY}`;
            dots = [elbow, { x: slot.connX, y: slot.connY }];
          }

          return (
            <g key={`wp-leader-${idx}`}>
              <polyline
                points={leaderPoints}
                fill="none"
                stroke="#00F5D4"
                strokeWidth="1.2"
                strokeOpacity={isPassed ? 0.9 : 0.35}
                strokeDasharray={isPassed ? 'none' : '3 3'}
              />

              {dots.map((d, dIdx) => (
                <circle key={`dot-${dIdx}`} cx={d.x} cy={d.y} r={2} fill="#00F5D4" opacity={isPassed ? 1 : 0.5} />
              ))}

              {isCurrent && (
                <circle
                  cx={wp.x}
                  cy={wp.y}
                  r={radarRadius}
                  fill="none"
                  stroke="#00F5D4"
                  strokeWidth={1.5}
                  opacity={radarOpacity}
                />
              )}

              <circle
                cx={wp.x}
                cy={wp.y}
                r={5}
                fill={isPassed ? '#00F5D4' : '#1E2536'}
                stroke="#0A0E17"
                strokeWidth={2}
                style={{
                  filter: isPassed ? 'drop-shadow(0 0 8px #00F5D4)' : undefined,
                }}
              />

              <foreignObject
                x={slot.x}
                y={slot.y}
                width={slot.w}
                height={slot.h}
              >
                <div className="w-full h-full bg-[#0A0E17]/95 border border-[#1E2536] rounded-lg p-2.5 flex flex-col justify-between shadow-[0_8px_24px_rgba(0,0,0,0.85)] select-none">
                  <div className="flex items-center justify-between">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider bg-[#00F5D4]/15 border border-[#00F5D4]/30 text-[#00F5D4]">
                      {slot.badge}
                    </span>
                    <span className="text-[9px] font-mono text-[#64748B]">
                      [{Math.abs(wp.lat).toFixed(2)}°{wp.lat >= 0 ? 'N' : 'S'}, {Math.abs(wp.lon).toFixed(2)}°{wp.lon >= 0 ? 'E' : 'W'}]
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-heading font-bold text-[#F1F5F9]">
                      {wp.city}, {wp.country}
                    </span>
                  </div>

                  <div className="text-[9.5px] font-mono text-[#00F5D4]/90 truncate">
                    {wp.detail}
                  </div>
                </div>
              </foreignObject>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
