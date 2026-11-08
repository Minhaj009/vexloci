import React, { useMemo } from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { AlertTriangle, TrendingDown } from 'lucide-react';
import { MarketCrashChartPropsSchema, SceneData } from '../../schemas/timeline.schema';

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

  const isCrash = crashEvent && frame >= Math.round(crashEvent.triggerOffsetSec * fps);

  let calloutProgress = 0;
  if (calloutEvent && frame >= Math.round(calloutEvent.triggerOffsetSec * fps)) {
    const triggerFrame = Math.round(calloutEvent.triggerOffsetSec * fps);
    calloutProgress = spring({
      frame: frame - triggerFrame,
      fps,
      config: { damping: 12, mass: 0.8, stiffness: 140 },
    });
  }

  const width = 1920;
  const height = 1080;
  const padLeft = 140;
  const padRight = 100;
  const padTop = 140;
  const padBottom = 120;
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  const dataPoints = props.dataPoints;
  const minVal = Math.min(...dataPoints.map((d) => d.value));
  const maxVal = Math.max(...dataPoints.map((d) => d.value));
  const valRange = maxVal - minVal || 1;

  const coords = dataPoints.map((d, i) => {
    const x = padLeft + (i / (dataPoints.length - 1)) * plotWidth;
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

  const currentFloatIdx = progressRatio * (dataPoints.length - 1);
  const currentIdx = Math.min(dataPoints.length - 1, Math.floor(currentFloatIdx));
  const nextIdx = Math.min(dataPoints.length - 1, currentIdx + 1);
  const frac = currentFloatIdx - currentIdx;

  const currentX = coords[currentIdx].x + (coords[nextIdx].x - coords[currentIdx].x) * frac;
  const currentY = coords[currentIdx].y + (coords[nextIdx].y - coords[currentIdx].y) * frac;
  const currentVal =
    dataPoints[currentIdx].value +
    (dataPoints[nextIdx].value - dataPoints[currentIdx].value) * frac;

  const initialVal = dataPoints[0].value;
  const deltaPct = (((currentVal - initialVal) / initialVal) * 100).toFixed(1);

  let dollarLoss = 0;
  if (crashEvent) {
    const crashFrame = Math.round(crashEvent.triggerOffsetSec * fps);
    if (frame >= crashFrame) {
      const maxTargetLoss =
        props.totalLossAmount ?? (props.unit === '€' ? 1900000000 : 440000000);
      dollarLoss = Math.round(
        interpolate(frame, [crashFrame, crashFrame + 50], [0, maxTargetLoss], {
          extrapolateRight: 'clamp',
        })
      );
    }
  }

  const pingPhase = (frame % 24) / 24;
  const pingRadius = 6 + pingPhase * 24;
  const pingOpacity = 1 - pingPhase;

  const activeStrokeColor = isCrash ? '#FF2A54' : '#00F5D4';
  const activeGlowColor = isCrash ? 'rgba(255, 42, 84, 0.6)' : 'rgba(0, 245, 212, 0.6)';

  const thresholdY = padTop + plotHeight * 0.72;
  const isBlink = Math.floor(frame / 12) % 2 === 0;

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#07090E] select-none">
      <div className="absolute top-0 left-0 right-0 z-20 backdrop-blur-md bg-[#080A0F]/85 border-b border-[#1E2536] px-12 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className={`p-3 rounded-lg bg-[#07090E] border border-[#1E2536] transition-colors duration-300 ${
              isCrash ? 'text-[#FF2A54]' : 'text-[#00F5D4]'
            }`}
          >
            <TrendingDown className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#11151F] border border-[#1E2536] text-[#00F5D4]">
                {props.tickerSymbol}
              </span>
              <span className="text-xs font-mono tracking-widest text-[#94A3B8]">
                {props.metricName}
              </span>
            </div>
            <h2 className="text-2xl font-heading font-bold text-[#F1F5F9] mt-1">
              {props.unit}
              {currentVal.toFixed(2)}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="text-right font-mono flex flex-col items-end">
            <span className="text-[10px] tracking-widest text-[#94A3B8]">
              {props.lossLabel ? props.lossLabel.toUpperCase() : 'CUMULATIVE CAPITAL LOSS'}
            </span>
            <span className="text-2xl font-mono font-black text-[#FF2A54] drop-shadow-[0_0_12px_rgba(255,42,84,0.8)]">
              -{props.currencyPrefix || props.unit}
              {dollarLoss.toLocaleString()}
            </span>
          </div>

          <div className="text-right font-mono flex flex-col items-end gap-1">
            <div
              className={`text-lg font-bold px-3 py-1 rounded border ${
                isCrash
                  ? 'bg-[#FF2A54]/20 border-[#FF2A54] text-[#FF2A54] shadow-[0_0_15px_rgba(255,42,84,0.4)]'
                  : 'bg-[#00F5D4]/10 border-[#00F5D4]/40 text-[#00F5D4]'
              }`}
            >
              {deltaPct}%
            </div>
            <span className="text-xs text-[#94A3B8]">TIMESTEP // {dataPoints[currentIdx].label}</span>
          </div>
        </div>
      </div>

      <div className="relative w-full h-full">
        <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${width} ${height}`}>
          <defs>
            <linearGradient id="marketChartFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={activeStrokeColor} stopOpacity={isCrash ? 0.35 : 0.22} />
              <stop offset="100%" stopColor={activeStrokeColor} stopOpacity={0.0} />
            </linearGradient>
            <pattern id="bloombergGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1E2536" strokeWidth="0.5" strokeOpacity="0.3" />
            </pattern>
          </defs>

          <rect x={padLeft} y={padTop} width={plotWidth} height={plotHeight} fill="url(#bloombergGrid)" />

          {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map((ratio) => {
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
                />
                <text
                  x={padLeft - 18}
                  y={y + 4}
                  textAnchor="end"
                  fill="#94A3B8"
                  fontSize="12"
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
              strokeWidth="2"
              strokeDasharray="6 4"
              style={{ filter: 'drop-shadow(0 0 8px #FF2A54)' }}
            />
            <rect
              x={padLeft + plotWidth - 280}
              y={thresholdY - 14}
              width={270}
              height={24}
              rx={4}
              fill="#0A0D14"
              stroke="#FF2A54"
              strokeWidth="1.2"
            />
            <text
              x={padLeft + plotWidth - 145}
              y={thresholdY + 2}
              textAnchor="middle"
              fill="#FF2A54"
              fontSize="11"
              fontFamily="JetBrains Mono"
              fontWeight="bold"
              letterSpacing="1px"
              opacity={isBlink ? 1 : 0.4}
            >
              LIQUIDATION THRESHOLD // MARGIN CALL
            </text>
          </g>

          <path d={areaPath} fill="url(#marketChartFill)" />

          <path
            d={linePath}
            fill="none"
            stroke={activeStrokeColor}
            strokeWidth="4"
            strokeDasharray={totalLength}
            strokeDashoffset={strokeDashoffset}
            style={{
              filter: `drop-shadow(0px 0px 14px ${activeGlowColor})`,
              transition: 'stroke 0.3s ease',
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
                strokeOpacity="0.35"
              />
              <circle
                cx={pt.x}
                cy={pt.y}
                r={i === currentIdx ? 7 : i >= props.crashIndex ? 5 : 4}
                fill={i >= props.crashIndex && isCrash ? '#FF2A54' : '#00F5D4'}
                stroke="#0A0D14"
                strokeWidth="2"
              />
              <text
                x={pt.x}
                y={padTop + plotHeight + 30}
                textAnchor="middle"
                fill="#94A3B8"
                fontSize="12"
                fontFamily="JetBrains Mono"
              >
                {dataPoints[i].label}
              </text>
            </g>
          ))}

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
              r="7"
              fill={activeStrokeColor}
              stroke="#0A0D14"
              strokeWidth="2"
              style={{ filter: `drop-shadow(0 0 12px ${activeGlowColor})` }}
            />
          </g>
        </svg>

        {calloutProgress > 0 && (
          <div
            className="absolute top-28 right-16 bg-[#0D111A]/95 border-2 border-[#FF2A54] rounded-xl px-7 py-5 shadow-[0_0_50px_rgba(255,42,84,0.7)] z-30"
            style={{
              transform: `scale(${calloutProgress})`,
              opacity: calloutProgress,
            }}
          >
            <div className="flex items-center gap-2 text-[#FF2A54] font-mono font-bold text-xs">
              <AlertTriangle className="w-4 h-4 animate-pulse" />
              <span>CIRCUIT BREAKER TRIGGERED</span>
            </div>
            <div className="text-2xl font-mono font-black text-[#FF2A54] mt-1 drop-shadow-[0_0_12px_rgba(255,42,84,0.8)]">
              {calloutEvent?.payloadText ||
                `-${props.currencyPrefix || props.unit}${dollarLoss.toLocaleString()} LOSS`}
            </div>
            <div className="text-[10px] font-mono text-[#94A3B8] mt-1 uppercase">
              {props.metricName
                ? `${props.metricName.toUpperCase()} // BREACH OF CAPITAL CONTROLS`
                : 'LIQUIDATION EVENT // CAPITAL DEPLETION'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
