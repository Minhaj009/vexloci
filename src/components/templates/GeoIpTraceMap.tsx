import React, { useMemo } from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Globe, Navigation } from 'lucide-react';
import countriesTopology from 'world-atlas/countries-110m.json';
import * as topojson from 'topojson-client';
import * as d3Geo from 'd3-geo';
import { GeoIpTraceMapPropsSchema, SceneData } from '../../schemas/timeline.schema';
import { useSceneBeat } from '../director/SceneBeatContext';
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

type TopologyInput = Parameters<typeof topojson.feature>[0];
type GeometryInput = Parameters<typeof topojson.feature>[1];

function isCountriesTopology(value: unknown): value is TopologyInput & {
  objects: { countries: GeometryInput };
} {
  if (typeof value !== 'object' || value === null) return false;
  if (!('type' in value) || value.type !== 'Topology') return false;
  if (!('objects' in value) || typeof value.objects !== 'object' || value.objects === null) {
    return false;
  }
  return 'countries' in value.objects;
}

export const GeoIpTraceMap: React.FC<GeoIpTraceMapProps> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const beatState = useSceneBeat();

  const props = GeoIpTraceMapPropsSchema.parse(scene.props);
  const waypoints = props.waypoints;
  const totalFrames = Math.max(1, Math.round(scene.durationSec * fps));

  const width = 1920;
  const height = 1080;

  const countriesGeo = useMemo(() => {
    if (!isCountriesTopology(countriesTopology)) return null;
    const result = topojson.feature(countriesTopology, countriesTopology.objects.countries);
    return 'features' in result ? result : null;
  }, []);

  const projection = useMemo(() => {
    const base = d3Geo.geoNaturalEarth1();
    return countriesGeo
      ? base.fitExtent([[60, 120], [1860, 960]], countriesGeo)
      : base;
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
      if (feature.id === undefined) continue;
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
        if (wy < 500) {
          const i = quadCounts.TL++;
          slotX = 80;
          slotY = 160 + i * 140;
          connX = slotX + cardWidth;
          connY = slotY + cardHeight / 2;
        } else {
          const i = quadCounts.BL++;
          slotX = 80;
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

  const waypointCount = Math.max(1, waypoints.length);
  const hopCount = Math.max(1, waypoints.length - 1);
  const arcWindow = Math.max(30, Math.round((totalFrames * 0.85) / hopCount));

  const activeHopFloat = interpolate(frame, [0, totalFrames], [0, Math.max(0, waypoints.length - 1)], {
    extrapolateRight: 'clamp',
  });
  const activeWaypointIdx = Math.min(Math.max(0, waypoints.length - 1), Math.floor(activeHopFloat));
  const focusedWaypointIdx = Math.max(
    activeWaypointIdx,
    Math.min(
      waypointCount - 1,
      beatState?.beat?.beatType === 'TEMPLATE_STATE'
        ? (beatState.beat.templateFocus?.targetIndex ?? activeWaypointIdx)
        : activeWaypointIdx
    )
  );
  const pulseOpacity = 0.55 + 0.45 * Math.sin(frame * 0.25);

  const lonMarkers = [-120, -60, 0, 60, 120];
  const latMarkers = [60, 30, 0, -30];

  return (
    <div className="relative w-full h-full pt-12 pb-12 overflow-hidden bg-[#F8FAFC] select-none font-sans">
      <div className="absolute top-14 left-12 right-12 z-20 flex items-center justify-between backdrop-blur-xl bg-white/95 border border-slate-200/90 shadow-[0_10px_30px_-5px_rgba(15,23,42,0.06)] rounded-2xl px-8 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shadow-xs">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono tracking-widest text-slate-500 font-bold uppercase">
                GLOBAL TRACE ROUTE // GEOSPATIAL VECTOR MATRIX
              </span>
              <span className="text-[10px] font-mono text-blue-600 font-bold uppercase">
                CROSS-BORDER FUND CASCADE
              </span>
            </div>
            <h2 className="text-xl font-heading font-extrabold text-slate-900 tracking-tight mt-0.5">
              {scene.chapterTitle || 'Global Network Trace & Routing Mesh'}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2 text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 font-bold">
            <Navigation
              className="w-4 h-4"
              style={{ transform: `rotate(${(frame * 1.5) % 360}deg)` }}
            />
            <span>
              ACTIVE HOP {String(waypoints.length > 0 ? focusedWaypointIdx + 1 : 0).padStart(2, '0')} OF {String(waypoints.length).padStart(2, '0')}
            </span>
          </div>
          <span className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-bold">
            PROPAGATION: {(4.1 + Math.sin(frame * 0.2) * 0.2).toFixed(1)}ms
          </span>
        </div>
      </div>

      <svg className="w-full h-full absolute inset-0" viewBox="0 0 1920 1080">
        <defs>
          <linearGradient id="traceArcGlowLight" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2563EB" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#D97706" stopOpacity="0.95" />
          </linearGradient>

          <pattern id="continent-dots-light" width="8" height="8" patternUnits="userSpaceOnUse">
            <circle cx="4" cy="4" r="1.2" fill="#94A3B8" fillOpacity="0.25" />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="#F8FAFC" />

        <path
          d={graticulePath}
          fill="none"
          stroke="#CBD5E1"
          strokeWidth="0.8"
          strokeDasharray="4 4"
        />

        {countriesGeo?.features.map((feature, i) => {
          const d = pathGenerator(feature);
          if (!d) return null;
          const isActive = feature.id !== undefined && activeCountries.has(feature.id);

          return (
            <g key={`country-${feature.id ?? i}`}>
              <path
                d={d}
                fill={isActive ? '#BFDBFE' : '#E2E8F0'}
                stroke={isActive ? '#2563EB' : '#94A3B8'}
                strokeWidth={isActive ? 2.5 : 1.2}
                strokeOpacity={isActive ? 1.0 : 0.9}
              />
              <path
                d={d}
                fill="url(#continent-dots-light)"
                opacity={isActive ? 0.35 : 0.15}
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
                y={114}
                textAnchor="middle"
                fill="#94A3B8"
                fontFamily="JetBrains Mono"
                fontSize="9"
              >
                {label}
              </text>
              <text
                x={x}
                y={978}
                textAnchor="middle"
                fill="#94A3B8"
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
                fill="#94A3B8"
                fontFamily="JetBrains Mono"
                fontSize="9"
              >
                {label}
              </text>
              <text
                x={1896}
                y={y}
                textAnchor="end"
                fill="#94A3B8"
                fontFamily="JetBrains Mono"
                fontSize="9"
              >
                {label}
              </text>
            </g>
          );
        })}

        <RadarSweep cx={960} cy={460} size={520} color="#2563EB" />

        {projectedWaypoints.map((p1, idx) => {
          if (idx === projectedWaypoints.length - 1) return null;
          const p2 = projectedWaypoints[idx + 1];
          const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
          const arcHeight = Math.max(40, Math.min(110, dist * 0.22));
          const midX = (p1.x + p2.x) / 2;
          const midY = Math.min(p1.y, p2.y) - arcHeight;
          const d = `M ${p1.x} ${p1.y} Q ${midX} ${midY} ${p2.x} ${p2.y}`;

          const arcStartFrame = Math.round(idx * arcWindow * 0.8);
          const arcEndFrame = arcStartFrame + arcWindow;
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
                stroke="#CBD5E1"
                strokeWidth={1.5}
                strokeDasharray="4 4"
              />

              {arcProgress > 0 && (
                <path
                  d={d}
                  fill="none"
                  stroke="url(#traceArcGlowLight)"
                  strokeWidth={2.5}
                  strokeDasharray={`${arcLength} ${arcLength}`}
                  strokeDashoffset={(1 - arcProgress) * arcLength}
                  style={{ filter: 'drop-shadow(0 0 6px rgba(37, 99, 235, 0.4))' }}
                />
              )}

              {arcProgress > 0 && arcProgress < 1 && (
                <circle
                  cx={cx}
                  cy={cy}
                  r="4.5"
                  fill="#2563EB"
                  stroke="#FFFFFF"
                  strokeWidth={1.5}
                  style={{ filter: 'drop-shadow(0 0 8px rgba(37, 99, 235, 0.6))' }}
                />
              )}
            </g>
          );
        })}

        {projectedWaypoints.map((wp, idx) => {
          const slot = wp.slot;
          const wpPassFrame =
            idx === 0
              ? 0
              : Math.min(Math.max(0, totalFrames - 5), Math.round(idx * arcWindow * 0.8));
          const isPassed = frame >= wpPassFrame;
          const isFocused = idx === focusedWaypointIdx;
          const isTerminus = idx === waypoints.length - 1;
          const accentStroke = isTerminus ? '#D97706' : '#2563EB';

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
                stroke={isFocused ? accentStroke : '#2563EB'}
                strokeWidth={isFocused ? '2.2' : '1.2'}
                strokeOpacity={isFocused ? 1 : isPassed ? 0.8 : 0.25}
                strokeDasharray={isPassed || isFocused ? 'none' : '3 3'}
              />

              {dots.map((d, dIdx) => (
                <circle
                  key={`dot-${dIdx}`}
                  cx={d.x}
                  cy={d.y}
                  r={isFocused ? 2.8 : 2}
                  fill={isFocused ? accentStroke : '#2563EB'}
                  opacity={isFocused ? 1 : isPassed ? 1 : 0.4}
                />
              ))}

              {isPassed &&
                [0, 1, 2].map((ringIdx) => {
                  const ringPhase = ((frame + ringIdx * 12) % 36) / 36;
                  const ringR = 6 + ringPhase * 36;
                  const ringOpacity = (1 - ringPhase) * 0.6;

                  return (
                    <circle
                      key={`ripple-${idx}-${ringIdx}`}
                      cx={wp.x}
                      cy={wp.y}
                      r={ringR}
                      fill="none"
                      stroke={accentStroke}
                      strokeWidth={1.2}
                      opacity={ringOpacity}
                    />
                  );
                })}

              {isFocused && (
                <circle
                  cx={wp.x}
                  cy={wp.y}
                  r={12 + Math.sin(frame * 0.2) * 2.5}
                  fill="none"
                  stroke={accentStroke}
                  strokeWidth={2.5}
                  opacity={0.95}
                />
              )}

              <circle
                cx={wp.x}
                cy={wp.y}
                r={isFocused ? 7.5 : 5.5}
                fill={isPassed || isFocused ? accentStroke : '#94A3B8'}
                stroke="#FFFFFF"
                strokeWidth={2}
                style={{
                  filter:
                    isPassed || isFocused
                      ? 'drop-shadow(0 0 8px rgba(37, 99, 235, 0.5))'
                      : undefined,
                }}
              />

              <foreignObject
                x={slot.x}
                y={slot.y}
                width={slot.w}
                height={slot.h}
              >
                <div
                  className={`relative w-full h-full backdrop-blur-xl rounded-2xl p-3.5 flex flex-col justify-between overflow-hidden ${
                    isFocused
                      ? isTerminus
                        ? 'bg-amber-50/95 border-2 border-amber-500 shadow-[0_12px_32px_-6px_rgba(217,119,6,0.28)]'
                        : 'bg-blue-50/95 border-2 border-blue-600 shadow-[0_12px_32px_-6px_rgba(37,99,235,0.28)]'
                      : 'bg-white/95 border border-slate-300 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.08),0_0_0_1px_rgba(203,213,225,0.7)] opacity-85'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wider ${
                      isTerminus
                        ? 'bg-amber-50 border border-amber-200 text-amber-800'
                        : isFocused
                          ? 'bg-blue-600 border border-blue-600 text-white'
                          : 'bg-blue-50 border border-blue-200 text-blue-700'
                    }`}>
                      {slot.badge}
                    </span>
                    <span className="text-[9px] font-mono text-slate-500 font-semibold">
                      [{Math.abs(wp.lat).toFixed(2)}°{wp.lat >= 0 ? 'N' : 'S'}, {Math.abs(wp.lon).toFixed(2)}°{wp.lon >= 0 ? 'E' : 'W'}]
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between my-0.5">
                    <span className="text-sm font-heading font-extrabold text-slate-900 truncate">
                      {wp.city}, {wp.country}
                    </span>
                    <span className="text-[9.5px] font-mono font-bold text-blue-600">
                      {(3.8 + Math.sin(frame * 0.2 + idx) * 0.4).toFixed(1)}ms
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[9.5px] font-mono text-slate-500 pt-1.5 border-t border-slate-100">
                    <span className="text-slate-600 font-medium truncate max-w-[220px]">{wp.detail}</span>
                    <span className="text-emerald-600 font-bold">LOSS: 0.00%</span>
                  </div>
                </div>
              </foreignObject>
            </g>
          );
        })}
      </svg>

      <div className="absolute bottom-12 left-12 right-12 z-20 pointer-events-none flex items-center justify-between text-[11px] font-mono text-slate-600">
        <div className="px-3.5 py-1.5 rounded-xl backdrop-blur-md bg-white/90 border border-slate-200/90 shadow-xs flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-blue-600" style={{ opacity: pulseOpacity }} />
          <span className="font-bold text-slate-800 uppercase tracking-wider">
            TRACE TELEMETRY // {waypoints.length} NODES MAPPED
          </span>
        </div>
        {waypoints[focusedWaypointIdx] && (
          <div className="px-3.5 py-1.5 rounded-xl backdrop-blur-md bg-white/90 border border-slate-200/90 shadow-xs font-semibold text-slate-700">
            LOCKED HOP: {waypoints[focusedWaypointIdx].city.toUpperCase()}, {waypoints[focusedWaypointIdx].country.toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
};
