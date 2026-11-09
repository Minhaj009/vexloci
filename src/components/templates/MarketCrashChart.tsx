import React, { useMemo } from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  BarChart3,
  TrendingDown,
} from 'lucide-react';
import { MarketCrashChartPropsSchema, SceneData } from '../../schemas/timeline.schema';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { BorderBeam } from '../ui/border-beam';
import { NumberTicker } from '../ui/number-ticker';
import { cn } from '../../lib/utils';

interface MarketCrashChartProps {
  scene: SceneData;
}

export const MarketCrashChart: React.FC<MarketCrashChartProps> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const props = MarketCrashChartPropsSchema.parse(scene.props);

  const crashEvent = useMemo(
    () => scene.microEvents.find((e) => e.action === 'TRIGGER_CRASH_DROP'),
    [scene.microEvents]
  );

  const calloutEvent = useMemo(
    () => scene.microEvents.find((e) => e.action === 'REVEAL_CALLOUT'),
    [scene.microEvents]
  );

  const crashFrame = crashEvent ? Math.round(crashEvent.triggerOffsetSec * fps) : -1;
  const isCrash = Boolean(crashEvent && frame >= crashFrame);

  let calloutProgress = 0;
  if (calloutEvent && frame >= Math.round(calloutEvent.triggerOffsetSec * fps)) {
    const triggerFrame = Math.round(calloutEvent.triggerOffsetSec * fps);
    calloutProgress = spring({
      frame: frame - triggerFrame,
      fps,
      config: { damping: 12, mass: 0.8, stiffness: 140 },
    });
  }

  const chartWidth = 1380;
  const chartHeight = 740;
  const padLeft = 84;
  const padRight = 36;
  const padTop = 40;
  const padBottom = 80;
  const plotWidth = chartWidth - padLeft - padRight;
  const plotHeight = chartHeight - padTop - padBottom;

  const dataPoints = props.dataPoints;
  const minVal = Math.min(...dataPoints.map((d) => d.value));
  const maxVal = Math.max(...dataPoints.map((d) => d.value));
  const valRange = maxVal - minVal || 1;

  const coords = dataPoints.map((d, i) => {
    const x = padLeft + (i / Math.max(1, dataPoints.length - 1)) * plotWidth;
    const y = padTop + plotHeight - ((d.value - minVal) / valRange) * plotHeight;
    return { x, y };
  });

  const linePath = coords.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${padTop + plotHeight} L ${coords[0].x} ${padTop + plotHeight} Z`;

  let totalLength = 0;
  for (let i = 1; i < coords.length; i++) {
    const dx = coords[i].x - coords[i - 1].x;
    const dy = coords[i].y - coords[i - 1].y;
    totalLength += Math.sqrt(dx * dx + dy * dy);
  }

  const totalFrames = Math.max(1, Math.round(scene.durationSec * fps));
  const progressRatio = interpolate(frame, [0, totalFrames], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const strokeDashoffset = interpolate(progressRatio, [0, 1], [totalLength, 0]);

  const currentFloatIdx = progressRatio * Math.max(1, dataPoints.length - 1);
  const currentIdx = Math.min(dataPoints.length - 1, Math.floor(currentFloatIdx));
  const nextIdx = Math.min(dataPoints.length - 1, currentIdx + 1);
  const frac = currentFloatIdx - currentIdx;

  const currentX = coords[currentIdx].x + (coords[nextIdx].x - coords[currentIdx].x) * frac;
  const currentY = coords[currentIdx].y + (coords[nextIdx].y - coords[currentIdx].y) * frac;
  const currentVal =
    dataPoints[currentIdx].value +
    (dataPoints[nextIdx].value - dataPoints[currentIdx].value) * frac;

  const initialVal = dataPoints[0].value || 1;
  const deltaPct = (((currentVal - initialVal) / initialVal) * 100).toFixed(1);

  const maxTargetLoss =
    props.totalLossAmount ?? (props.unit === '€' ? 1900000000 : 440000000);

  const pingPhase = (frame % 24) / 24;
  const pingRadius = 6 + pingPhase * 24;
  const pingOpacity = 1 - pingPhase;

  const activeStrokeColor = isCrash ? '#FF2A54' : '#00F5D4';
  const activeGlowColor = isCrash ? 'rgba(255, 42, 84, 0.7)' : 'rgba(0, 245, 212, 0.7)';

  const thresholdY = padTop + plotHeight * 0.72;
  const isBlink = Math.floor(frame / 12) % 2 === 0;

  const crashCoord = coords[Math.min(coords.length - 1, Math.max(0, props.crashIndex))];

  const askDepths = [
    { price: (currentVal * 1.04).toFixed(2), size: isCrash ? '94,200' : '24,100', pct: isCrash ? 96 : 42 },
    { price: (currentVal * 1.03).toFixed(2), size: isCrash ? '81,500' : '31,400', pct: isCrash ? 88 : 54 },
    { price: (currentVal * 1.02).toFixed(2), size: isCrash ? '72,100' : '28,800', pct: isCrash ? 78 : 48 },
    { price: (currentVal * 1.01).toFixed(2), size: isCrash ? '64,000' : '39,200', pct: isCrash ? 70 : 62 },
    { price: (currentVal * 1.005).toFixed(2), size: isCrash ? '58,400' : '35,100', pct: isCrash ? 64 : 56 },
  ];

  const bidDepths = [
    { price: (currentVal * 0.995).toFixed(2), size: isCrash ? '2,400' : '38,200', pct: isCrash ? 6 : 64 },
    { price: (currentVal * 0.99).toFixed(2), size: isCrash ? '1,800' : '44,900', pct: isCrash ? 5 : 72 },
    { price: (currentVal * 0.98).toFixed(2), size: isCrash ? '1,100' : '51,600', pct: isCrash ? 3 : 82 },
    { price: (currentVal * 0.97).toFixed(2), size: isCrash ? '650' : '42,100', pct: isCrash ? 2 : 68 },
    { price: (currentVal * 0.96).toFixed(2), size: isCrash ? '280' : '49,000', pct: isCrash ? 1 : 78 },
  ];

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#07090E] select-none">
      <div className="absolute top-0 left-0 right-0 z-20 backdrop-blur-md bg-[#080A0F]/90 border-b border-[#1E2536] px-10 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              'p-2.5 rounded-lg bg-[#07090E] border transition-colors duration-300',
              isCrash
                ? 'border-destructive text-destructive shadow-[0_0_15px_rgba(255,42,84,0.4)]'
                : 'border-border text-primary shadow-[0_0_12px_rgba(0,245,212,0.3)]'
            )}
          >
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="cyan" className="font-mono text-xs font-bold px-2 py-0.5">
                {props.tickerSymbol}
              </Badge>
              <span className="text-xs font-mono tracking-widest text-muted-foreground uppercase">
                {props.metricName}
              </span>
              <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground border-border bg-[#0B0F17]">
                LIVE FEED // 30 FPS
              </Badge>
            </div>
            <div className="flex items-baseline gap-3 mt-1">
              <h2 className="text-2xl font-mono font-bold text-foreground tracking-tight">
                {props.unit}
                {currentVal.toFixed(2)}
              </h2>
              <Badge
                variant={isCrash ? 'destructive' : 'cyan'}
                className={cn('font-mono text-xs font-bold', isCrash && 'animate-pulse')}
              >
                {deltaPct}%
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <Badge
            variant={isCrash ? 'destructive' : 'default'}
            className={cn(
              'px-3 py-1 font-mono text-xs uppercase tracking-wider',
              isCrash && 'animate-pulse shadow-[0_0_18px_rgba(255,42,84,0.6)]'
            )}
          >
            {isCrash ? 'CIRCUIT BREAKER // TRADING HALT' : 'REAL-TIME EXECUTION FEED'}
          </Badge>

          <div className="text-right font-mono flex flex-col items-end">
            <span className="text-[10px] tracking-widest text-muted-foreground">
              {props.lossLabel ? props.lossLabel.toUpperCase() : 'CUMULATIVE CAPITAL LOSS'}
            </span>
            <span className="text-2xl font-mono font-black text-destructive drop-shadow-[0_0_12px_rgba(255,42,84,0.8)]">
              -{props.currencyPrefix || props.unit}
              {isCrash && crashFrame >= 0 ? (
                <NumberTicker
                  value={maxTargetLoss}
                  startValue={0}
                  startFrame={crashFrame}
                  durationFrames={45}
                />
              ) : (
                '0'
              )}
            </span>
          </div>
        </div>
      </div>

      <div className="absolute top-[88px] left-10 right-10 bottom-28 flex gap-6">
        <div className="relative flex-1 rounded-xl bg-[#080B12]/90 border border-border/80 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
          <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
            <defs>
              <linearGradient id="marketChartFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={activeStrokeColor} stopOpacity={isCrash ? 0.42 : 0.22} />
                <stop offset="100%" stopColor={activeStrokeColor} stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="crashFloodGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FF2A54" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#FF2A54" stopOpacity="0.0" />
              </linearGradient>
              <pattern id="bloombergGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1E2536" strokeWidth="0.6" strokeOpacity="0.35" />
              </pattern>
            </defs>

            <rect x={padLeft} y={padTop} width={plotWidth} height={plotHeight} fill="url(#bloombergGrid)" />

            {[0, 0.25, 0.5, 0.75, 1.0].map((ratio) => {
              const y = padTop + plotHeight * ratio;
              const val = maxVal - ratio * valRange;
              return (
                <g key={ratio}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={padLeft + plotWidth}
                    y2={y}
                    stroke="#1E2536"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                    strokeOpacity="0.6"
                  />
                  <text
                    x={padLeft - 14}
                    y={y + 4}
                    textAnchor="end"
                    fill="#94A3B8"
                    fontSize="11"
                    fontFamily="JetBrains Mono"
                  >
                    {props.unit}
                    {val.toFixed(2)}
                  </text>
                  <text
                    x={padLeft + plotWidth + 14}
                    y={y + 4}
                    textAnchor="start"
                    fill="#64748B"
                    fontSize="11"
                    fontFamily="JetBrains Mono"
                  >
                    {props.unit}
                    {val.toFixed(2)}
                  </text>
                </g>
              );
            })}

            <g>
              <line
                x1={padLeft}
                y1={thresholdY}
                x2={padLeft + plotWidth}
                y2={thresholdY}
                stroke="#FF2A54"
                strokeWidth="1.8"
                strokeDasharray="6 4"
                style={{ filter: 'drop-shadow(0 0 8px #FF2A54)' }}
              />
              <rect
                x={padLeft + plotWidth - 270}
                y={thresholdY - 13}
                width={260}
                height={24}
                rx={4}
                fill="#0A0D14"
                stroke="#FF2A54"
                strokeWidth="1.2"
              />
              <text
                x={padLeft + plotWidth - 140}
                y={thresholdY + 3}
                textAnchor="middle"
                fill="#FF2A54"
                fontSize="10"
                fontFamily="JetBrains Mono"
                fontWeight="bold"
                letterSpacing="1px"
                opacity={isBlink ? 1 : 0.4}
              >
                LIQUIDATION THRESHOLD // MARGIN CALL
              </text>
            </g>

            <path d={areaPath} fill="url(#marketChartFill)" />

            {isCrash && (
              <rect
                x={padLeft}
                y={padTop}
                width={plotWidth}
                height={plotHeight}
                fill="url(#crashFloodGradient)"
              />
            )}

            <path
              d={linePath}
              fill="none"
              stroke={activeStrokeColor}
              strokeWidth="3.5"
              strokeDasharray={totalLength}
              strokeDashoffset={strokeDashoffset}
              style={{
                filter: `drop-shadow(0px 0px 14px ${activeGlowColor})`,
              }}
            />

            {coords.map((pt, i) => (
              <g key={i}>
                <line
                  x1={pt.x}
                  y1={padTop}
                  x2={pt.x}
                  y2={padTop + plotHeight}
                  stroke="#1E2536"
                  strokeDasharray="3 3"
                  strokeOpacity="0.3"
                />
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={i === currentIdx ? 6 : i >= props.crashIndex ? 4.5 : 3.5}
                  fill={i >= props.crashIndex && isCrash ? '#FF2A54' : '#00F5D4'}
                  stroke="#07090E"
                  strokeWidth="2"
                />
                <text
                  x={pt.x}
                  y={padTop + plotHeight + 24}
                  textAnchor="middle"
                  fill="#94A3B8"
                  fontSize="11"
                  fontFamily="JetBrains Mono"
                >
                  {dataPoints[i].label}
                </text>
              </g>
            ))}

            {isCrash && crashCoord && (
              <g>
                {[0, 1, 2].map((ringIdx) => {
                  const ringPhase = ((frame + ringIdx * 9) % 28) / 28;
                  const ringRadius = 10 + ringPhase * 60;
                  const ringOpacity = (1 - ringPhase) * 0.75;
                  return (
                    <circle
                      key={ringIdx}
                      cx={crashCoord.x}
                      cy={crashCoord.y}
                      r={ringRadius}
                      fill="none"
                      stroke="#FF2A54"
                      strokeWidth="1.8"
                      opacity={ringOpacity}
                    />
                  );
                })}
              </g>
            )}

            <g>
              <circle
                cx={currentX}
                cy={currentY}
                r={pingRadius}
                fill="none"
                stroke={activeStrokeColor}
                strokeWidth="1.5"
                opacity={pingOpacity}
              />
              <circle
                cx={currentX}
                cy={currentY}
                r="6.5"
                fill={activeStrokeColor}
                stroke="#07090E"
                strokeWidth="2.5"
                style={{ filter: `drop-shadow(0 0 12px ${activeGlowColor})` }}
              />
              <circle cx={currentX} cy={currentY} r="2.5" fill="#FFFFFF" />
            </g>
          </svg>

          {calloutProgress > 0 && (
            <div
              className="absolute top-6 right-6 bg-[#0D111A]/95 border-2 border-destructive rounded-xl px-6 py-4 shadow-[0_0_40px_rgba(255,42,84,0.6)] z-30 max-w-sm"
              style={{
                transform: `scale(${calloutProgress})`,
                opacity: calloutProgress,
              }}
            >
              <div className="flex items-center gap-2 text-destructive font-mono font-bold text-xs">
                <AlertTriangle className="w-4 h-4 animate-pulse" />
                <span>CIRCUIT BREAKER TRIGGERED</span>
              </div>
              <div className="text-xl font-mono font-black text-destructive mt-1 drop-shadow-[0_0_12px_rgba(255,42,84,0.8)]">
                {calloutEvent?.payloadText ||
                  `-${props.currencyPrefix || props.unit}${maxTargetLoss.toLocaleString()} CAPITAL LOSS`}
              </div>
              <div className="text-[10px] font-mono text-muted-foreground mt-1 uppercase">
                {props.metricName
                  ? `${props.metricName.toUpperCase()} // BREACH OF CAPITAL CONTROLS`
                  : 'LIQUIDATION EVENT // CAPITAL DEPLETION'}
              </div>
            </div>
          )}
        </div>

        <Card className="relative w-[380px] bg-[#080B12]/95 border-border/80 flex flex-col justify-between overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
          <BorderBeam
            size={220}
            duration={10}
            colorFrom={isCrash ? '#FF2A54' : '#00F5D4'}
            colorTo={isCrash ? '#F59E0B' : '#3B82F6'}
          />

          <CardHeader className="p-4 border-b border-border/80 bg-[#06080D]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                <CardTitle className="text-sm font-mono tracking-wider uppercase">
                  ORDER BOOK DEPTH
                </CardTitle>
              </div>
              <Badge variant="mono" className="text-[9px]">
                L2 SPREAD
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-4 flex-1 flex flex-col justify-between gap-3 text-xs font-mono">
            <div>
              <div className="text-[10px] text-muted-foreground tracking-wider mb-1 flex justify-between">
                <span>ASK PRICE ({props.unit})</span>
                <span>VOLUME</span>
              </div>
              <div className="space-y-1">
                {askDepths.map((ask, idx) => (
                  <div key={idx} className="relative flex items-center justify-between px-2 py-0.5 rounded overflow-hidden">
                    <div
                      className="absolute inset-y-0 right-0 bg-destructive/15 transition-all duration-200"
                      style={{ width: `${ask.pct}%` }}
                    />
                    <span className="relative z-10 text-destructive font-medium">{ask.price}</span>
                    <span className="relative z-10 text-muted-foreground text-[10px]">{ask.size}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between py-1.5 px-3 rounded bg-[#06080D] border border-border my-1 font-mono text-[11px]">
              <span className="text-muted-foreground">SPREAD</span>
              <Badge variant={isCrash ? 'destructive' : 'cyan'} className="text-[10px] font-mono py-0">
                {isCrash ? 'ILLIQUID // NO BIDS' : '$0.02 (0.02%)'}
              </Badge>
            </div>

            <div>
              <div className="text-[10px] text-muted-foreground tracking-wider mb-1 flex justify-between">
                <span>BID PRICE ({props.unit})</span>
                <span>VOLUME</span>
              </div>
              <div className="space-y-1">
                {bidDepths.map((bid, idx) => (
                  <div key={idx} className="relative flex items-center justify-between px-2 py-0.5 rounded overflow-hidden">
                    <div
                      className="absolute inset-y-0 right-0 bg-primary/15 transition-all duration-200"
                      style={{ width: `${bid.pct}%` }}
                    />
                    <span className="relative z-10 text-primary font-medium">{bid.price}</span>
                    <span className="relative z-10 text-muted-foreground text-[10px]">{bid.size}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#06080D] border border-border space-y-1.5 mt-1">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>BID LIQUIDITY DRAIN</span>
                <span className={cn('font-bold', isCrash ? 'text-destructive' : 'text-primary')}>
                  {isCrash ? '-96.4%' : 'NOMINAL'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>EXECUTION FREQUENCY</span>
                <span className="font-bold text-foreground">
                  <NumberTicker
                    value={isCrash ? 14200 : 820}
                    startValue={450}
                    durationFrames={30}
                    suffix=" REQ/S"
                  />
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
