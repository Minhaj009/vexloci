import React, { useMemo } from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Globe, Navigation } from 'lucide-react';
import countriesTopology from 'world-atlas/countries-110m.json';
import * as topojson from 'topojson-client';
import * as d3Geo from 'd3-geo';
import { GeoIpTraceMapPropsSchema, SceneData } from '../../schemas/timeline.schema';
import { BorderBeam } from '../ui/border-beam';
import { RadarSweep } from '../ui/radar-sweep';

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
    const cardWidth = 360;
    const cardHeight = 104;
    const quadCounts = { TL: 0, BL: 0, TR: 0, BR: 0 };
    const badges = [
      'HOP 01 // ORIGIN',
      'HOP 02 // DETECTED',
      'HOP 03 // ROUTED',
      'HOP 04 // CASCADE',
      'HOP 05 // SETTLED',
      'HOP 06 // TERMINUS',
    ];

    return waypoints.map((wp, idx) => {
      const pt = projection([wp.lon, wp.lat]) || [width / 2, height / 2];
      const wx = pt[0];
      const wy = pt[1];
      const badge = badges[idx] || `HOP ${String(idx + 1).padStart(2, '0')} // NODE`;

      let slotX: number;
      let slotY: number;
      let connX: number;
      let connY: number;

      if (wx < 960) {
        if (wy < 540) {
          const i = quadCounts.TL++;
          slotX = 70;
          slotY = 160 + i * 140;
          connX = slotX + cardWidth;
          connY = slotY + cardHeight / 2;
        } else {
          const i = quadCounts.BL++;
          slotX = 70;
          slotY = 680 + i * 140;
          connX = slotX + cardWidth;
          connY = slotY + cardHeight / 2;
        }
      } else {
        if (wy < 440) {
          const i = quadCounts.TR++;
          slotX = 1480;
          slotY = 160 + i * 140;
          connX = slotX;
          connY = slotY + cardHeight / 2;
        } else {
          const i = quadCounts.BR++;
          slotX = 1480;
          slotY = 680 + i * 140;
          connX = slotX;
          connY = slotY + cardHeight / 2;
        }
      }

      const slot: HudSlot = {
        x: slotX,
        y: slotY,
        w: cardWidth,
        h: cardHeight,
        connX,
        connY,
        badge,
      };

      return {
        ...wp,
        x: wx,
        y: wy,
        slot,
      };
    });
  }, [waypoints, projection]);

  const activeHopFloat = interpolate(frame, [0, totalFrames], [0, waypoints.length - 1], {
    extrapolateRight: 'clamp',
  });
  const activeHopIdx = Math.floor(activeHopFloat);

  const lonMarkers = [-120, -60, 0, 60, 120];
  const latMarkers = [60, 30, 0, -30];

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0B1220] select-none">
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between backdrop-blur-md bg-[#0B1220]/90 border border-[#1E293B] rounded-xl px-6 py-3 mx-12 mt-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#0E1726] border border-[#1E293B] text-[#38BDF8]">
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
          <div className="flex items-center gap-2 text-[#38BDF8]">
            <Navigation className="w-4 h-4 animate-spin" style={{ animationDuration: '8s' }} />
            <span>ACTIVE HOP 0{activeHopIdx + 1} OF 0{waypoints.length}</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-[#38BDF8]/15 border border-[#38BDF8]/40 text-[#38BDF8]">
            PROPAGATION: {(4.1 + Math.sin(frame * 0.2) * 0.2).toFixed(1)}ms
          </span>
        </div>
      </div>

      <svg className="w-full h-full absolute inset-0" viewBox="0 0 1920 1080">
        <defs>
          <linearGradient id="traceArcGlow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.95" />
          </linearGradient>

          <pattern id="continent-dots" width="8" height="8" patternUnits="userSpaceOnUse">
            <circle cx="4" cy="4" r="1.3" fill="#38BDF8" fillOpacity="0.14" />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="#0B1220]" />

        <path
          d={graticulePath}
          fill="none"
          stroke="#1E293B"
          strokeWidth="0.8"
          strokeDasharray="3 3"
          opacity={0.5}
        />

        {countriesGeo?.features?.map((feature: any, i: number) => {
          const d = pathGenerator(feature);
          if (!d) return null;
          const isActive = activeCountries.has(feature.id);

          return (
            <g key={`country-${feature.id || i}`}>
              <path
                d={d}
                fill={isActive ? 'rgba(56, 189, 248, 0.12)' : '#0E1726'}
                stroke={isActive ? '#38BDF8' : '#1E293B'}
                strokeWidth={isActive ? 1.5 : 0.75}
                strokeOpacity={isActive ? 0.95 : 0.5}
                style={
                  isActive
                    ? { filter: 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.5))' }
                    : undefined
                }
              />
              <path
                d={d}
                fill="url(#continent-dots)"
                opacity={isActive ? 0.95 : 0.5}
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
                fill="#64748B"
                fontFamily="JetBrains Mono"
                fontSize="9"
              >
                {label}
              </text>
              <text
                x={x}
                y={1060}
                textAnchor="middle"
                fill="#64748B"
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
                fill="#64748B"
                fontFamily="JetBrains Mono"
                fontSize="9"
              >
                {label}
              </text>
              <text
                x={1896}
                y={y}
                textAnchor="end"
                fill="#64748B"
                fontFamily="JetBrains Mono"
                fontSize="9"
              >
                {label}
              </text>
            </g>
          );
        })}

        <RadarSweep cx={960} cy={460} size={520} color="#38BDF8" />

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
                stroke="#1E293B"
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
                  style={{ filter: 'drop-shadow(0 0 10px rgba(56, 189, 248, 0.75))' }}
                />
              )}

              {arcProgress > 0 && arcProgress < 1 && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={4.5}
                  fill="#38BDF8"
                  stroke="#0B1220"
                  strokeWidth={1.5}
                  style={{ filter: 'drop-shadow(0 0 10px #38BDF8)' }}
                />
              )}
            </g>
          );
        })}

        {projectedWaypoints.map((wp, idx) => {
          const slot = wp.slot;
          const isPassed = frame >= idx * 45;

          const isCardLeft = slot.connX < wp.x;
          const midX = isCardLeft
            ? Math.min(wp.x - 24, Math.max(slot.connX + 32, (slot.connX + wp.x) * 0.5))
            : Math.max(wp.x + 24, Math.min(slot.connX - 32, (slot.connX + wp.x) * 0.5));
          const leaderPoints = `${wp.x},${wp.y} ${midX},${wp.y} ${midX},${slot.connY} ${slot.connX},${slot.connY}`;
          const dots = [
            { x: midX, y: wp.y },
            { x: midX, y: slot.connY },
            { x: slot.connX, y: slot.connY },
          ];

          return (
            <g key={`wp-leader-${idx}`}>
              <polyline
                points={leaderPoints}
                fill="none"
                stroke="#38BDF8"
                strokeWidth="1.2"
                strokeOpacity={isPassed ? 0.85 : 0.25}
                strokeDasharray={isPassed ? 'none' : '3 3'}
              />

              {dots.map((d, dIdx) => (
                <circle
                  key={`dot-${dIdx}`}
                  cx={d.x}
                  cy={d.y}
                  r={2}
                  fill="#38BDF8"
                  opacity={isPassed ? 1 : 0.4}
                />
              ))}

              {isPassed &&
                [0, 1, 2].map((ringIdx) => {
                  const ringPhase = ((frame + ringIdx * 12) % 36) / 36;
                  const ringR = 6 + ringPhase * 36;
                  const ringOpacity = (1 - ringPhase) * 0.7;

                  return (
                    <circle
                      key={`ripple-${idx}-${ringIdx}`}
                      cx={wp.x}
                      cy={wp.y}
                      r={ringR}
                      fill="none"
                      stroke={idx === waypoints.length - 1 ? '#F59E0B' : '#38BDF8'}
                      strokeWidth={1.2}
                      opacity={ringOpacity}
                    />
                  );
                })}

              <circle
                cx={wp.x}
                cy={wp.y}
                r={5}
                fill={isPassed ? (idx === waypoints.length - 1 ? '#F59E0B' : '#38BDF8') : '#1E293B'}
                stroke="#0B1220"
                strokeWidth={2}
                style={{
                  filter: isPassed ? 'drop-shadow(0 0 10px #38BDF8)' : undefined,
                }}
              />

              <foreignObject
                x={slot.x}
                y={slot.y}
                width={slot.w}
                height={slot.h}
              >
                <div className="relative w-full h-full bg-[#0B1220]/95 backdrop-blur-md border border-[#1E293B] rounded-xl p-3 flex flex-col justify-between shadow-[0_12px_32px_rgba(0,0,0,0.85)] overflow-hidden">
                  {isPassed && (
                    <BorderBeam
                      size={180}
                      duration={8}
                      borderWidth={1.5}
                      colorFrom="#38BDF8"
                      colorTo="#F59E0B"
                    />
                  )}
                  <div className="flex items-center justify-between">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider ${
                      idx === waypoints.length - 1
                        ? 'bg-[#F59E0B]/15 border border-[#F59E0B]/30 text-[#F59E0B]'
                        : 'bg-[#38BDF8]/15 border border-[#38BDF8]/30 text-[#38BDF8]'
                    }`}>
                      {slot.badge}
                    </span>
                    <span className="text-[9px] font-mono text-[#64748B]">
                      [{Math.abs(wp.lat).toFixed(2)}°{wp.lat >= 0 ? 'N' : 'S'}, {Math.abs(wp.lon).toFixed(2)}°{wp.lon >= 0 ? 'E' : 'W'}]
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-heading font-bold text-[#F1F5F9] truncate">
                      {wp.city}, {wp.country}
                    </span>
                    <span className="text-[9px] font-mono text-[#38BDF8]">
                      {(3.8 + Math.sin(frame * 0.2 + idx) * 0.4).toFixed(1)}ms
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[9px] font-mono text-[#94A3B8]">
                    <span className="text-[#38BDF8]/90 truncate max-w-[200px]">{wp.detail}</span>
                    <span className="text-slate-400/70">LOSS: 0.00%</span>
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
