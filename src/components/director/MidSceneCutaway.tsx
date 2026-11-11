import React from 'react';
import {
  Easing,
  Img,
  Loop,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { Activity, TrendingDown, TrendingUp } from 'lucide-react';
import {
  BeatTransition,
  CameraMotionType,
  CutawayBrollProps,
  CutawaySplitProps,
  CutawayStatCardProps,
} from '../../schemas/timeline.schema';
import { SceneBeatState, useSceneBeat } from './SceneBeatContext';
import { BorderBeam } from '../ui/border-beam';
import { NumberTicker } from '../ui/number-ticker';
import { cn } from '../../lib/utils';
import { inferMediaType, resolveMediaSrc } from '../../lib/media';
import { computeBeatCameraTransform } from '../shared/CameraRig';

type AccentKey = NonNullable<CutawayStatCardProps['accentColor']>;

interface AccentStyle {
  glowRgba: string;
  beamFrom: string;
  beamTo: string;
  statTextClass: string;
  accentBarClass: string;
  badgeClass: string;
  dotClass: string;
}

const ACCENT_STYLES: Record<AccentKey, AccentStyle> = {
  cyan: {
    glowRgba: 'rgba(37, 99, 235, 0.14)',
    beamFrom: '#2563EB',
    beamTo: '#60A5FA',
    statTextClass: 'text-blue-600',
    accentBarClass: 'bg-blue-600',
    badgeClass: 'border-blue-200 bg-blue-50 text-blue-700',
    dotClass: 'bg-blue-600',
  },
  amber: {
    glowRgba: 'rgba(217, 119, 6, 0.14)',
    beamFrom: '#D97706',
    beamTo: '#FBBF24',
    statTextClass: 'text-amber-600',
    accentBarClass: 'bg-amber-600',
    badgeClass: 'border-amber-200 bg-amber-50 text-amber-800',
    dotClass: 'bg-amber-600',
  },
  crimson: {
    glowRgba: 'rgba(220, 38, 38, 0.14)',
    beamFrom: '#DC2626',
    beamTo: '#F87171',
    statTextClass: 'text-red-600',
    accentBarClass: 'bg-red-600',
    badgeClass: 'border-rose-200 bg-rose-50 text-rose-700',
    dotClass: 'bg-red-600',
  },
};

interface TickerConfig {
  value: number;
  decimalPlaces: number;
  prefix: string;
  suffix: string;
}

function parseTickerConfig(stat: CutawayStatCardProps): TickerConfig | null {
  const raw = stat.statValue.trim();
  const hasExplicitAffix = Boolean(stat.prefix || stat.suffix);

  if (/^-?[\d,]+(\.\d+)?$/.test(raw)) {
    const cleaned = raw.replace(/,/g, '');
    const parsed = Number(cleaned);
    if (!Number.isFinite(parsed)) {
      return null;
    }
    const isPlainYear =
      !hasExplicitAffix &&
      !raw.includes(',') &&
      !raw.includes('.') &&
      Number.isInteger(parsed) &&
      parsed >= 1900 &&
      parsed <= 2100;
    if (isPlainYear) {
      return null;
    }
    const decimalPart = cleaned.split('.')[1];
    const explicitPrefix = stat.prefix ?? '';
    if (parsed < 0 && /^[$€£¥₹]$/.test(explicitPrefix.trim())) {
      return {
        value: Math.abs(parsed),
        decimalPlaces: decimalPart ? decimalPart.length : 0,
        prefix: `-${explicitPrefix}`,
        suffix: stat.suffix ?? '',
      };
    }
    return {
      value: parsed,
      decimalPlaces: decimalPart ? decimalPart.length : 0,
      prefix: explicitPrefix,
      suffix: stat.suffix ?? '',
    };
  }

  if (!hasExplicitAffix) {
    const match = raw.match(
      /^([^\d.:/]*?)([+-]?)([$€£¥₹]?)([+-]?)([\d,]+(?:\.\d+)?)([^\d.:/]*)$/
    );
    if (match) {
      const [, leadingText, preSign, currency, postSign, numericPart, inlineSuffix] = match;
      if (preSign && postSign) {
        return null;
      }
      const sign = preSign || postSign;
      const cleaned = numericPart.replace(/,/g, '');
      const parsedMagnitude = Number(cleaned);
      if (Number.isFinite(parsedMagnitude)) {
        const isPlainYear =
          !leadingText &&
          !sign &&
          !currency &&
          !inlineSuffix &&
          !numericPart.includes(',') &&
          !numericPart.includes('.') &&
          Number.isInteger(parsedMagnitude) &&
          parsedMagnitude >= 1900 &&
          parsedMagnitude <= 2100;
        if (isPlainYear) {
          return null;
        }
        const decimalPart = cleaned.split('.')[1];
        if (currency) {
          return {
            value: parsedMagnitude,
            decimalPlaces: decimalPart ? decimalPart.length : 0,
            prefix: `${leadingText}${sign}${currency}`,
            suffix: inlineSuffix,
          };
        }
        return {
          value: sign === '-' ? -parsedMagnitude : parsedMagnitude,
          decimalPlaces: decimalPart ? decimalPart.length : 0,
          prefix: sign === '+' ? `${leadingText}+` : leadingText,
          suffix: inlineSuffix,
        };
      }
    }
  }

  return null;
}

interface TransitionPresentation {
  style: React.CSSProperties;
  scanFlashOpacity: number;
  scanLineTopPct: number | null;
}

function getTransitionPresentation(
  transitionIn: BeatTransition | undefined,
  beatLocalFrame: number
): TransitionPresentation {
  const mode: BeatTransition = transitionIn ?? 'DISSOLVE';

  switch (mode) {
    case 'CUT': {
      const opacity = interpolate(beatLocalFrame, [0, 3], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
      const scale = interpolate(beatLocalFrame, [0, 3], [1.01, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
      return {
        style: { opacity, transform: `scale(${scale})` },
        scanFlashOpacity: 0,
        scanLineTopPct: null,
      };
    }

    case 'DISSOLVE': {
      const progress = interpolate(beatLocalFrame, [0, 8], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.out(Easing.cubic),
      });
      const scale = interpolate(progress, [0, 1], [1.015, 1]);
      return {
        style: { opacity: progress, transform: `scale(${scale})` },
        scanFlashOpacity: 0,
        scanLineTopPct: null,
      };
    }

    case 'WHIP_PAN': {
      const progress = interpolate(beatLocalFrame, [0, 8], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.out(Easing.cubic),
      });
      const translateXPct = (1 - progress) * 100;
      const opacity = interpolate(beatLocalFrame, [0, 2], [0.65, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
      return {
        style: {
          opacity,
          transform: `translateX(${translateXPct}%)`,
        },
        scanFlashOpacity: 0,
        scanLineTopPct: null,
      };
    }

    case 'SCANLINE_GLITCH': {
      if (beatLocalFrame >= 8) {
        return {
          style: { opacity: 1 },
          scanFlashOpacity: 0,
          scanLineTopPct: null,
        };
      }
      const progress = interpolate(beatLocalFrame, [0, 8], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
      const jitterDirection = Math.floor(beatLocalFrame) % 2 === 0 ? -1 : 1;
      const jitterX = jitterDirection * (1 - progress) * 18;
      const clipTop = Math.round((1 - progress) * 14);
      const clipBottom = Math.round((1 - progress) * 18);
      const opacity = interpolate(beatLocalFrame, [0, 3], [0.4, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
      return {
        style: {
          opacity,
          transform: `translateX(${jitterX}px)`,
          clipPath: `inset(${clipTop}% 0% ${clipBottom}% 0%)`,
        },
        scanFlashOpacity: (1 - progress) * 0.42,
        scanLineTopPct: progress * 100,
      };
    }

    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

interface MediaFeedProps {
  broll: CutawayBrollProps;
  beatProgress: number;
  beatDurationSec: number;
  beatStartFrame: number;
  beatFrames: number;
  beatLocalFrame: number;
  cameraMotion?: CameraMotionType;
  exitTailFrames?: number;
  isShort: boolean;
  compact?: boolean;
}

const MediaFeed: React.FC<MediaFeedProps> = ({
  broll,
  beatProgress,
  beatDurationSec,
  beatStartFrame,
  beatFrames,
  beatLocalFrame,
  cameraMotion,
  exitTailFrames = 0,
  isShort,
  compact = false,
}) => {
  const { fps } = useVideoConfig();
  const activeFps = Math.max(1, fps);
  const resolvedSrc = resolveMediaSrc(broll.mediaPath);
  const mediaType = inferMediaType(broll.mediaPath, broll.mediaType);

  const rawDurationSec = broll.videoDurationSec ?? Math.max(1, Math.min(beatDurationSec, 4));
  const durationSec = Math.max(0.1, rawDurationSec);
  const rawOffsetSec = Math.max(0, broll.videoStartOffsetSec ?? 0);
  const safeOffsetSec = rawOffsetSec >= durationSec ? 0 : rawOffsetSec;
  const offsetFrames = Math.max(0, Math.round(safeOffsetSec * activeFps));
  const clipFrames = Math.max(1, Math.round((durationSec - safeOffsetSec) * activeFps));

  const motion = computeBeatCameraTransform(
    cameraMotion ?? 'PUSH_IN',
    beatProgress,
    beatLocalFrame,
    activeFps,
    0.055
  );

  const mediaElement = (
    <div
      className="relative w-full h-full will-change-transform"
      style={{
        transform: `scale(${motion.scale}) translate(${motion.transX}px, ${motion.transY}px)`,
        transformOrigin: '50% 50%',
      }}
    >
      {mediaType === 'video' ? (
        <Sequence
          from={beatStartFrame}
          durationInFrames={beatFrames + exitTailFrames}
          layout="none"
        >
          <Loop durationInFrames={clipFrames} layout="none">
            <OffthreadVideo
              src={resolvedSrc}
              trimBefore={offsetFrames > 0 ? offsetFrames : undefined}
              className="w-full h-full object-cover"
              muted
            />
          </Loop>
        </Sequence>
      ) : (
        <Img src={resolvedSrc} className="w-full h-full object-cover" />
      )}
    </div>
  );

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-100">
      {mediaElement}

      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background:
            'linear-gradient(to top, rgba(15, 23, 42, 0.42) 0%, rgba(15, 23, 42, 0.12) 32%, transparent 62%)',
        }}
      />

      {broll.licenseBadge && (
        <div
          className={cn(
            'absolute z-20 pointer-events-none',
            compact ? 'top-5 left-5' : isShort ? 'top-8 left-8' : 'top-14 left-12'
          )}
        >
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg backdrop-blur-md bg-white/95 border border-slate-200/90 text-slate-700 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            <span
              className={cn(
                'font-mono font-bold tracking-wider text-slate-700 uppercase',
                isShort ? 'text-xs' : 'text-[11px]'
              )}
            >
              {broll.licenseBadge}
            </span>
          </div>
        </div>
      )}

      <div
        className={cn(
          'absolute z-20 pointer-events-none',
          compact
            ? 'left-5 right-5 bottom-5'
            : isShort
            ? 'left-8 right-8 bottom-14'
            : 'left-12 bottom-14 max-w-3xl'
        )}
      >
        <div
          className={cn(
            'backdrop-blur-xl bg-white/95 border border-slate-200/90 text-slate-900 shadow-[0_14px_40px_rgba(15,23,42,0.12)]',
            compact ? 'rounded-2xl p-5' : isShort ? 'rounded-2xl p-7' : 'rounded-2xl p-6'
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            <span
              className={cn(
                'px-2.5 py-0.5 rounded font-mono font-bold tracking-widest bg-blue-50 border border-blue-200 text-blue-700 uppercase',
                isShort && !compact ? 'text-sm' : 'text-[10px]'
              )}
            >
              {broll.provenanceSource}
            </span>
          </div>
          <h3
            className={cn(
              'font-heading font-bold text-slate-900 leading-tight mb-1.5',
              compact ? 'text-2xl' : isShort ? 'text-4xl' : 'text-2xl'
            )}
          >
            {broll.headline}
          </h3>
          <p
            className={cn(
              'font-sans text-slate-600 leading-relaxed',
              compact ? 'text-base line-clamp-2' : isShort ? 'text-2xl' : 'text-sm'
            )}
          >
            {broll.caption}
          </p>
        </div>
      </div>
    </div>
  );
};

interface StatCardViewProps {
  stat: CutawayStatCardProps;
  beatStartFrame: number;
  beatLocalFrame: number;
  beatFrames: number;
  beatProgress: number;
  cameraMotion?: CameraMotionType;
  isShort: boolean;
  compact?: boolean;
}

const StatCardView: React.FC<StatCardViewProps> = ({
  stat,
  beatStartFrame,
  beatLocalFrame,
  beatFrames,
  beatProgress,
  cameraMotion,
  isShort,
  compact = false,
}) => {
  const { fps } = useVideoConfig();
  const activeFps = Math.max(1, fps);
  const accent = ACCENT_STYLES[stat.accentColor ?? 'cyan'];
  const tickerConfig = parseTickerConfig(stat);

  const enterSpring = spring({
    frame: beatLocalFrame,
    fps: activeFps,
    config: { damping: 16, stiffness: 110, mass: 0.85 },
  });
  const cardTranslateY = interpolate(enterSpring, [0, 1], [14, 0]);
  const cardScale = interpolate(enterSpring, [0, 1], [0.985, 1]);

  const motion = cameraMotion
    ? computeBeatCameraTransform(cameraMotion, beatProgress, beatLocalFrame, activeFps, 0.018)
    : { scale: 1, transX: 0, transY: 0 };

  const totalChars =
    (stat.prefix?.length ?? 0) + stat.statValue.length + (stat.suffix?.length ?? 0);

  const statFontSizeClass = compact
    ? totalChars > 10
      ? 'text-[56px]'
      : totalChars > 6
      ? 'text-[74px]'
      : 'text-[92px]'
    : isShort
    ? totalChars > 10
      ? 'text-[84px]'
      : totalChars > 6
      ? 'text-[108px]'
      : 'text-[132px]'
    : totalChars > 10
    ? 'text-[88px]'
    : totalChars > 6
    ? 'text-[116px]'
    : 'text-[148px]';

  const DeltaIcon =
    stat.deltaPositive === true
      ? TrendingUp
      : stat.deltaPositive === false
      ? TrendingDown
      : Activity;

  const deltaPillClass =
    stat.deltaPositive === true
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : stat.deltaPositive === false
      ? 'border-rose-200 bg-rose-50 text-rose-700'
      : accent.badgeClass;

  const tickerDuration = Math.min(30, Math.max(12, Math.round(beatFrames * 0.45)));

  return (
    <div
      className={cn(
        'relative w-full h-full flex items-center justify-center overflow-hidden bg-[#F8FAFC]',
        compact ? 'p-6' : isShort ? 'px-12 pt-14 pb-12' : 'px-16 pt-14 pb-12'
      )}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 960px 620px at 50% 48%, ${accent.glowRgba} 0%, rgba(248, 250, 252, 0) 70%)`,
        }}
      />

      <div
        className="absolute inset-0 pointer-events-none opacity-55"
        style={{
          backgroundImage: 'radial-gradient(#94A3B8 1.1px, transparent 1.1px)',
          backgroundSize: '28px 28px',
          maskImage: 'radial-gradient(ellipse at 50% 50%, black 45%, transparent 88%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 50%, black 45%, transparent 88%)',
        }}
      />

      <div
        className={cn(
          'relative w-full bg-white rounded-3xl border border-slate-200/90 shadow-[0_24px_70px_-15px_rgba(15,23,42,0.12),0_0_0_1px_rgba(226,232,240,0.8)] overflow-hidden will-change-transform',
          compact ? 'max-w-full p-8' : isShort ? 'max-w-[1440px] p-12' : 'max-w-[1260px] p-16'
        )}
        style={{
          transform: `translate(${motion.transX}px, ${cardTranslateY + motion.transY}px) scale(${Math.min(1.02, cardScale * motion.scale)})`,
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none opacity-35"
          style={{
            backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)',
            backgroundSize: '22px 22px',
            maskImage: 'radial-gradient(ellipse at 50% 45%, black 35%, transparent 85%)',
            WebkitMaskImage: 'radial-gradient(ellipse at 50% 45%, black 35%, transparent 85%)',
          }}
        />

        <BorderBeam
          size={compact ? 220 : isShort ? 280 : 340}
          duration={8}
          borderWidth={2}
          colorFrom={accent.beamFrom}
          colorTo={accent.beamTo}
        />

        <div className={cn('relative z-10 flex flex-col', compact ? 'gap-4' : 'gap-6')}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <span className={cn('w-2.5 h-8 rounded-full', accent.accentBarClass)} />
              <h2
                className={cn(
                  'font-mono font-bold uppercase tracking-widest text-slate-600',
                  compact ? 'text-base' : isShort ? 'text-2xl' : 'text-lg'
                )}
              >
                {stat.headline}
              </h2>
            </div>

            {stat.deltaLabel && (
              <div
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border font-mono font-bold tracking-wider uppercase shadow-sm',
                  compact ? 'px-3.5 py-1.5 text-sm' : isShort ? 'px-5 py-2 text-lg' : 'px-4 py-1.5 text-sm',
                  deltaPillClass
                )}
              >
                <DeltaIcon className={cn(compact ? 'w-4 h-4' : isShort ? 'w-5 h-5' : 'w-4 h-4')} />
                <span>{stat.deltaLabel}</span>
              </div>
            )}
          </div>

          <div className="py-2">
            <div
              className={cn(
                'font-heading font-black tracking-tight tabular-nums leading-none',
                statFontSizeClass,
                accent.statTextClass
              )}
            >
              {tickerConfig ? (
                <NumberTicker
                  value={tickerConfig.value}
                  startFrame={beatStartFrame + 2}
                  durationFrames={tickerDuration}
                  prefix={tickerConfig.prefix}
                  suffix={tickerConfig.suffix}
                  decimalPlaces={tickerConfig.decimalPlaces}
                  className="tabular-nums"
                />
              ) : (
                <span>
                  {stat.prefix ?? ''}
                  {stat.statValue}
                  {stat.suffix ?? ''}
                </span>
              )}
            </div>
          </div>

          {stat.subtext && (
            <div className="pt-4 border-t border-slate-200/80 flex items-start gap-3">
              <span className={cn('w-2 h-2 rounded-full mt-2.5 shrink-0', accent.dotClass)} />
              <p
                className={cn(
                  'font-sans text-slate-600 leading-relaxed',
                  compact ? 'text-lg' : isShort ? 'text-3xl' : 'text-2xl'
                )}
              >
                {stat.subtext}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface SplitFallbackPanelProps {
  broll?: CutawayBrollProps;
  narrationSnippet?: string;
  phaseBadge?: string;
  telemetryTag?: string;
  beatProgress: number;
  beatLocalFrame: number;
  cameraMotion?: CameraMotionType;
  isShort: boolean;
}

const SplitExhibitFallbackCard: React.FC<SplitFallbackPanelProps> = ({
  broll,
  narrationSnippet,
  phaseBadge,
  telemetryTag,
  beatProgress,
  beatLocalFrame,
  cameraMotion,
  isShort,
}) => {
  const { fps } = useVideoConfig();
  const activeFps = Math.max(1, fps);
  const enterSpring = spring({
    frame: beatLocalFrame,
    fps: activeFps,
    config: { damping: 16, stiffness: 110, mass: 0.85 },
  });
  const cardTranslateY = interpolate(enterSpring, [0, 1], [12, 0]);
  const motion = cameraMotion
    ? computeBeatCameraTransform(cameraMotion, beatProgress, beatLocalFrame, activeFps, 0.015)
    : { scale: 1, transX: 0, transY: 0 };

  const badgeLabel = broll?.provenanceSource || phaseBadge || 'FORENSIC EXHIBIT';
  const heading = broll?.headline || telemetryTag || 'EVIDENTIARY RECORD';
  const body =
    broll?.caption ||
    narrationSnippet ||
    'Primary archival record synchronized to active forensic beat.';
  const showQuoteNote = Boolean(
    broll && narrationSnippet && narrationSnippet.trim() !== broll.caption.trim()
  );

  return (
    <div className="w-full h-full flex items-center justify-center bg-[#F8FAFC] p-8">
      <div
        className="relative w-full bg-white rounded-3xl border border-slate-200 p-8 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.1)] overflow-hidden will-change-transform"
        style={{
          transform: `translate(${motion.transX}px, ${cardTranslateY + motion.transY}px) scale(${Math.min(1.02, motion.scale)})`,
        }}
      >
        <BorderBeam size={240} duration={9} borderWidth={1.5} />
        <span className="inline-block px-3 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-700 font-mono text-xs font-bold uppercase tracking-wider mb-4">
          {badgeLabel}
        </span>
        <h3 className={cn('font-heading font-bold text-slate-900 mb-3', isShort ? 'text-3xl' : 'text-3xl')}>
          {heading}
        </h3>
        <p className={cn('font-sans text-slate-600 leading-relaxed', isShort ? 'text-xl' : 'text-lg')}>
          {body}
        </p>
        {showQuoteNote && narrationSnippet && (
          <div className="mt-5 pt-4 border-t border-slate-200/80 text-sm font-mono text-slate-500 leading-relaxed">
            {narrationSnippet}
          </div>
        )}
      </div>
    </div>
  );
};

interface CutawaySplitViewProps {
  split: CutawaySplitProps;
  beatProgress: number;
  beatDurationSec: number;
  beatStartFrame: number;
  beatLocalFrame: number;
  beatFrames: number;
  cameraMotion?: CameraMotionType;
  exitTailFrames?: number;
  narrationSnippet?: string;
  phaseBadge?: string;
  telemetryTag?: string;
  isShort: boolean;
}

const CutawaySplitView: React.FC<CutawaySplitViewProps> = ({
  split,
  beatProgress,
  beatDurationSec,
  beatStartFrame,
  beatLocalFrame,
  beatFrames,
  cameraMotion,
  exitTailFrames = 0,
  narrationSnippet,
  phaseBadge,
  telemetryTag,
  isShort,
}) => {
  const ratio = split.splitRatio ?? 0.5;
  const primaryPct = `${Math.round(ratio * 1000) / 10}%`;

  return (
    <div className="w-full h-full bg-[#F8FAFC] flex flex-row overflow-hidden px-12 pt-14 pb-12 gap-5">
      <div
        className="relative rounded-3xl overflow-hidden border border-slate-200/90 shadow-lg bg-slate-100 shrink-0"
        style={{ width: primaryPct, height: '100%' }}
      >
        {split.brollMedia ? (
          <MediaFeed
            broll={split.brollMedia}
            beatProgress={beatProgress}
            beatDurationSec={beatDurationSec}
            beatStartFrame={beatStartFrame}
            beatFrames={beatFrames}
            beatLocalFrame={beatLocalFrame}
            cameraMotion={cameraMotion}
            exitTailFrames={exitTailFrames}
            isShort={isShort}
            compact
          />
        ) : (
          <div className="w-full h-full bg-white flex items-center justify-center p-8">
            <span className="font-mono text-sm text-slate-400 uppercase tracking-widest">
              NO ARCHIVAL FEED
            </span>
          </div>
        )}
      </div>

      <div className="relative flex-1 rounded-3xl overflow-hidden border border-slate-200/90 shadow-lg bg-[#F8FAFC] min-w-0 min-h-0">
        {split.statCard ? (
          <StatCardView
            stat={split.statCard}
            beatStartFrame={beatStartFrame}
            beatLocalFrame={beatLocalFrame}
            beatFrames={beatFrames}
            beatProgress={beatProgress}
            cameraMotion={cameraMotion}
            isShort={isShort}
            compact
          />
        ) : (
          <SplitExhibitFallbackCard
            broll={split.brollMedia}
            narrationSnippet={narrationSnippet}
            phaseBadge={phaseBadge}
            telemetryTag={telemetryTag}
            beatProgress={beatProgress}
            beatLocalFrame={beatLocalFrame}
            cameraMotion={cameraMotion}
            isShort={isShort}
          />
        )}
      </div>
    </div>
  );
};

export interface MidSceneCutawayProps {
  beatState?: SceneBeatState;
  exitTailFrames?: number;
}

export const MidSceneCutaway: React.FC<MidSceneCutawayProps> = ({
  beatState,
  exitTailFrames = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const contextState = useSceneBeat();
  const activeState = beatState ?? contextState;

  if (!activeState || !activeState.beat || activeState.beat.beatType === 'TEMPLATE_STATE') {
    return null;
  }

  const activeFps = Math.max(1, fps);
  const { beat, beatProgress, isShort } = activeState;
  const beatStartFrame = Math.round(beat.startSec * activeFps);
  const beatFrames = Math.max(1, Math.round(beat.durationSec * activeFps));
  const beatLocalFrame = Math.max(0, frame - beatStartFrame);
  const transitionFrame = exitTailFrames > 0 ? Math.max(8, beatLocalFrame) : beatLocalFrame;

  const transition = getTransitionPresentation(beat.transitionIn, transitionFrame);

  const renderBeatContent = () => {
    switch (beat.beatType) {
      case 'CUTAWAY_BROLL':
        return isShort ? (
          <div className="w-full h-full bg-[#F8FAFC] p-6">
            <div className="w-full h-full rounded-3xl overflow-hidden border border-slate-200/90 shadow-xl">
              <MediaFeed
                broll={beat.cutawayBroll}
                beatProgress={beatProgress}
                beatDurationSec={beat.durationSec}
                beatStartFrame={beatStartFrame}
                beatFrames={beatFrames}
                beatLocalFrame={beatLocalFrame}
                cameraMotion={beat.cameraMotion}
                exitTailFrames={exitTailFrames}
                isShort={isShort}
              />
            </div>
          </div>
        ) : (
          <MediaFeed
            broll={beat.cutawayBroll}
            beatProgress={beatProgress}
            beatDurationSec={beat.durationSec}
            beatStartFrame={beatStartFrame}
            beatFrames={beatFrames}
            beatLocalFrame={beatLocalFrame}
            cameraMotion={beat.cameraMotion}
            exitTailFrames={exitTailFrames}
            isShort={isShort}
          />
        );

      case 'CUTAWAY_STATCARD':
        return (
          <StatCardView
            stat={beat.cutawayStat}
            beatStartFrame={beatStartFrame}
            beatLocalFrame={beatLocalFrame}
            beatFrames={beatFrames}
            beatProgress={beatProgress}
            cameraMotion={beat.cameraMotion}
            isShort={isShort}
          />
        );

      case 'CUTAWAY_SPLIT':
        return (
          <CutawaySplitView
            split={beat.cutawaySplit}
            beatProgress={beatProgress}
            beatDurationSec={beat.durationSec}
            beatStartFrame={beatStartFrame}
            beatLocalFrame={beatLocalFrame}
            beatFrames={beatFrames}
            cameraMotion={beat.cameraMotion}
            exitTailFrames={exitTailFrames}
            narrationSnippet={beat.narrationSnippet}
            phaseBadge={beat.hudOverlay?.phaseBadge}
            telemetryTag={beat.hudOverlay?.telemetryTag}
            isShort={isShort}
          />
        );

      default: {
        const _exhaustive: never = beat;
        return _exhaustive;
      }
    }
  };

  return (
    <div
      className="absolute inset-0 z-30 overflow-hidden will-change-transform"
      style={transition.style}
    >
      {renderBeatContent()}

      {transition.scanFlashOpacity > 0 && (
        <div
          className="absolute inset-0 pointer-events-none bg-white z-40"
          style={{ opacity: transition.scanFlashOpacity }}
        />
      )}

      {transition.scanLineTopPct !== null && (
        <div
          className="absolute left-0 right-0 h-1 bg-blue-500/80 shadow-[0_0_14px_rgba(37,99,235,0.65)] pointer-events-none z-50"
          style={{ top: `${transition.scanLineTopPct}%` }}
        />
      )}
    </div>
  );
};
