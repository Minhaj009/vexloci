import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { AlertCircle, CheckCircle2, Split, TrendingDown } from 'lucide-react';
import { SceneData, SplitAutopsyPropsSchema } from '../../schemas/timeline.schema';
import { useSceneBeat } from '../director/SceneBeatContext';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/badge';
import { BorderBeam } from '../ui/border-beam';

interface SplitAutopsyProps {
  scene: SceneData;
}

export const SplitAutopsy: React.FC<SplitAutopsyProps> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const beatState = useSceneBeat();

  const props = SplitAutopsyPropsSchema.parse(scene.props);
  const totalFrames = Math.max(1, Math.round(scene.durationSec * fps));

  const leftProgress = spring({
    frame,
    fps,
    config: { damping: 14, mass: 0.9, stiffness: 90 },
  });

  const rightProgress = spring({
    frame: frame - 10,
    fps,
    config: { damping: 14, mass: 0.9, stiffness: 90 },
  });

  const rightCount = Math.max(1, props.rightMetrics.length);
  const leftCount = Math.max(1, props.leftMetrics.length);
  const templateFocus =
    beatState?.beat?.beatType === 'TEMPLATE_STATE'
      ? beatState.beat.templateFocus
      : undefined;
  const rawTargetIdx = beatState
    ? (templateFocus?.targetIndex ?? beatState.beatIndex)
    : Math.floor((frame / Math.max(1, totalFrames * 0.7)) * rightCount);
  const activeRightIdx =
    props.rightMetrics.length > 0
      ? Math.min(rightCount - 1, Math.max(0, rawTargetIdx))
      : -1;
  const activeLeftIdx =
    props.leftMetrics.length > 0
      ? Math.min(leftCount - 1, Math.max(0, rawTargetIdx))
      : -1;

  const beatFocusEase = beatState
    ? interpolate(beatState.beatProgress, [0, 0.16], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 1;

  const getRowRevealProgress = (idx: number, count: number, baseDelayFrames: number): number => {
    const staggerWindow = totalFrames * 0.7;
    const frameReveal = baseDelayFrames + Math.round((idx / Math.max(1, count)) * staggerWindow);

    if (beatState && beatState.totalBeats > 1) {
      const effectiveStep =
        beatState.beat?.beatType === 'TEMPLATE_STATE'
          ? (templateFocus?.targetIndex ?? beatState.beatIndex)
          : beatState.beatIndex;
      if (effectiveStep > idx) {
        return 1;
      }
      if (effectiveStep === idx) {
        const beatDurationFrames = Math.max(
          1,
          Math.round((beatState.beat?.durationSec ?? scene.durationSec / beatState.totalBeats) * fps)
        );
        const beatElapsedFrames = Math.round(beatState.beatProgress * beatDurationFrames);
        const byBeat = spring({
          frame: Math.max(0, beatElapsedFrames),
          fps,
          config: { damping: 14, mass: 0.85, stiffness: 120 },
        });
        const byFrame =
          frame >= frameReveal
            ? spring({
                frame: Math.max(0, frame - frameReveal),
                fps,
                config: { damping: 14, mass: 0.85, stiffness: 120 },
              })
            : 0;
        return Math.max(byBeat, byFrame);
      }
    }

    if (frame < frameReveal) return 0;
    return spring({
      frame: Math.max(0, frame - frameReveal),
      fps,
      config: { damping: 14, mass: 0.85, stiffness: 120 },
    });
  };

  const combinedContext = `${props.leftTitle} ${props.rightTitle} ${props.rightMetrics.join(' ')} ${scene.chapterTitle}`;
  const isKnightCapital = /\b(knight|kcg|440,?000,?000|440m)\b/i.test(combinedContext);
  const explicitDeltaMetric = props.rightMetrics.find((m) =>
    /^(?:[-+]\$[\d,.]+|DELTA:|VARIANCE:)/i.test(m.trim())
  );
  const varianceDeltaLabel = isKnightCapital
    ? '-$440,000,000 // 100% EROSION'
    : explicitDeltaMetric
      ? explicitDeltaMetric.trim().toUpperCase()
      : 'CRITICAL DISPARITY CONFIRMED';

  return (
    <div className="w-[1920px] h-[1080px] pt-12 pb-12 bg-[#F8FAFC] flex items-center justify-center select-none relative overflow-hidden font-sans">
      <div className="absolute w-[900px] h-[600px] bg-rose-100/30 rounded-full blur-[140px] pointer-events-none -top-20 left-1/2 -translate-x-1/2" />

      <div className="relative w-[1560px] h-[840px] bg-white border border-slate-300 rounded-3xl shadow-[0_25px_70px_-15px_rgba(15,23,42,0.08),0_0_0_1px_rgba(203,213,225,0.8)] text-slate-900 p-8 overflow-hidden flex flex-col justify-between">
        <div className="flex flex-row items-center justify-between pb-4 mb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 shadow-xs">
              <Split className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase font-bold">
                FORENSIC BALANCE SHEET DISPARITY // SPLIT AUTOPSY
              </span>
              <h2 className="text-xl font-heading font-extrabold text-slate-900 tracking-tight mt-0.5">
                Disclosed Valuation vs Forensic Reality
              </h2>
            </div>
          </div>

          <Badge
            variant="destructive"
            className="px-3.5 py-1.5 font-mono text-xs font-bold tracking-wider uppercase border border-red-300"
          >
            NET VARIANCE: FATAL IMBALANCE
          </Badge>
        </div>

        <div className="flex-1 grid grid-cols-11 gap-6 my-auto items-stretch">
          <div
            className="col-span-5 relative overflow-hidden bg-emerald-50/60 border border-emerald-300 text-emerald-950 p-5 shadow-xs will-change-transform flex flex-col justify-between rounded-2xl"
            style={{
              transform: `translateX(${(1 - Math.max(0, leftProgress)) * -40}px)`,
              opacity: Math.max(0, leftProgress),
            }}
          >
            <BorderBeam
              size={220}
              duration={12}
              colorFrom="#10B981"
              colorTo="#3B82F6"
            />

            <div>
              <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-emerald-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-base font-heading font-bold text-emerald-900">
                    {props.leftTitle}
                  </h3>
                </div>
                <Badge variant="outline" className="text-[10px] bg-white border-emerald-300 text-emerald-700 font-bold">
                  OFFICIAL FILINGS
                </Badge>
              </div>

              <div className="space-y-2.5">
                {props.leftMetrics.map((metric, idx) => {
                  const rowProgress = getRowRevealProgress(idx, props.leftMetrics.length, 4);
                  const isActiveRow = idx === activeLeftIdx && rowProgress > 0.1;
                  const rowScale = isActiveRow ? interpolate(beatFocusEase, [0, 1], [1, 1.015]) : 1;
                  const rowDim = isActiveRow ? interpolate(beatFocusEase, [0, 1], [0.85, 1]) : 0.85;

                  return (
                    <div
                      key={idx}
                      className={cn(
                        'p-3 rounded-xl border text-slate-900 shadow-xs flex items-center justify-between text-sm',
                        isActiveRow
                          ? 'bg-emerald-50/50 border-emerald-400 ring-2 ring-emerald-500/70 shadow-md'
                          : 'bg-white border-emerald-200'
                      )}
                      style={{
                        opacity: rowProgress * rowDim,
                        transform: `translateY(${(1 - rowProgress) * 10}px) scale(${rowScale})`,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-5 h-5 rounded bg-emerald-50 border border-emerald-300 flex items-center justify-center text-xs font-mono font-bold text-emerald-700">
                          {idx + 1}
                        </span>
                        <span
                          className="font-heading font-semibold text-sm text-slate-900"
                          style={{ fontSize: `${14 * (props.fontScale ?? 1)}px` }}
                        >
                          {metric}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[9px] py-0 bg-emerald-50 border-emerald-300 text-emerald-700 font-bold">
                        VERIFIED
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-white border border-emerald-200 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-500 font-semibold">REGULATORY INTEGRITY</span>
              <Badge variant="outline" className="text-[10px] font-bold bg-emerald-50 border-emerald-300 text-emerald-700">
                100% DISCLOSED
              </Badge>
            </div>
          </div>

          <div className="col-span-1 relative flex items-center justify-center pointer-events-none">
            <div className="w-[2px] h-full bg-gradient-to-b from-transparent via-slate-300 to-transparent" />
            <div
              className="absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-blue-600/30 border border-blue-500"
              style={{
                top: `${((frame * 2.5) % 100)}%`,
              }}
            />
          </div>

          <div
            className="col-span-5 relative overflow-hidden bg-rose-50/60 border border-rose-300 text-rose-950 p-5 shadow-xs will-change-transform flex flex-col justify-between rounded-2xl"
            style={{
              transform: `translateX(${(1 - Math.max(0, rightProgress)) * 40}px)`,
              opacity: Math.max(0, rightProgress),
            }}
          >
            <BorderBeam
              size={220}
              duration={8}
              colorFrom="#DC2626"
              colorTo="#F59E0B"
            />

            <div>
              <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-rose-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                  <h3 className="text-base font-heading font-bold text-rose-900">
                    {props.rightTitle}
                  </h3>
                </div>
                <Badge variant="destructive" className="text-[10px] font-bold">
                  FORENSIC AUDIT
                </Badge>
              </div>

              <div className="space-y-2.5">
                {props.rightMetrics.map((metric, idx) => {
                  const rowProgress = getRowRevealProgress(idx, props.rightMetrics.length, 10);
                  const isActiveRow = idx === activeRightIdx && rowProgress > 0.1;
                  const rowScale = isActiveRow ? interpolate(beatFocusEase, [0, 1], [1, 1.015]) : 1;
                  const rowDim = isActiveRow ? interpolate(beatFocusEase, [0, 1], [0.85, 1]) : 0.85;

                  return (
                    <div
                      key={idx}
                      className={cn(
                        'p-3 rounded-xl border text-slate-900 shadow-xs flex items-center justify-between text-sm',
                        isActiveRow
                          ? 'bg-rose-50/50 border-rose-400 ring-2 ring-rose-500/80 shadow-md'
                          : 'bg-white border-rose-200'
                      )}
                      style={{
                        opacity: rowProgress * rowDim,
                        transform: `translateY(${(1 - rowProgress) * 10}px) scale(${rowScale})`,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-5 h-5 rounded bg-rose-50 border border-rose-300 flex items-center justify-center text-xs font-mono font-bold text-rose-700">
                          !
                        </span>
                        <span
                          className="font-heading font-semibold text-sm text-slate-900"
                          style={{ fontSize: `${14 * (props.fontScale ?? 1)}px` }}
                        >
                          {metric}
                        </span>
                      </div>
                      <Badge variant="destructive" className="text-[9px] py-0 font-bold">
                        UNCOVERED
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-white border border-rose-200 flex items-center justify-between text-xs font-mono text-rose-700 shadow-xs">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-rose-600" />
                <span className="font-bold">VARIANCE DELTA</span>
              </div>
              <Badge
                variant="destructive"
                className="font-mono font-black text-xs"
              >
                {varianceDeltaLabel}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
