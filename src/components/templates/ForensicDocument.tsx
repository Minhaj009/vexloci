import React, { useMemo } from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { FileText, ShieldAlert, Sparkles, AlertTriangle } from 'lucide-react';
import { ForensicDocumentPropsSchema, SceneData } from '../../schemas/timeline.schema';
import { useSceneBeat } from '../director/SceneBeatContext';
import { cn } from '../../lib/utils';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';

interface ForensicDocumentProps {
  scene: SceneData;
}

function renderHighlightedParagraph(
  text: string,
  phrases: string[],
  sweepCursor: number
): React.ReactNode {
  const validPhrases = phrases.filter((p) => p.length > 0);
  if (validPhrases.length === 0) return text;

  let parts: (string | React.ReactNode)[] = [text];
  const sliceSize = 1 / validPhrases.length;

  validPhrases.forEach((phrase, phraseIdx) => {
    const phraseStart = phraseIdx * sliceSize;
    const phraseEnd = phraseStart + sliceSize * 0.85;
    const phraseSweep = interpolate(sweepCursor, [phraseStart, phraseEnd], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });

    const nextParts: (string | React.ReactNode)[] = [];
    for (const part of parts) {
      if (typeof part !== 'string') {
        nextParts.push(part);
        continue;
      }
      const lowerPart = part.toLowerCase();
      const lowerPhrase = phrase.toLowerCase();
      const idx = lowerPart.indexOf(lowerPhrase);
      if (idx === -1) {
        nextParts.push(part);
      } else {
        if (idx > 0) nextParts.push(part.substring(0, idx));
        const match = part.substring(idx, idx + phrase.length);
        nextParts.push(
          <span
            key={`${phrase}-${idx}`}
            className="relative inline-block px-1.5 py-0.5 mx-1 font-bold text-slate-900 border-b-2 rounded-xs"
            style={{
              backgroundImage: 'linear-gradient(90deg, #FEF08A 0%, #FEF08A 100%)',
              backgroundRepeat: 'no-repeat',
              backgroundSize: `${Math.round(phraseSweep * 100)}% 100%`,
              borderBottomColor: phraseSweep > 0.05 ? '#F59E0B' : 'transparent',
            }}
          >
            {match}
          </span>
        );
        if (idx + phrase.length < part.length) {
          nextParts.push(part.substring(idx + phrase.length));
        }
      }
    }
    parts = nextParts;
  });

  return parts;
}

export const ForensicDocument: React.FC<ForensicDocumentProps> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const beatState = useSceneBeat();

  const props = ForensicDocumentPropsSchema.parse(scene.props);

  const highlightEvent = useMemo(
    () => scene.microEvents.find((e) => e.action === 'HIGHLIGHT_TEXT' || e.action === 'REVEAL_CALLOUT'),
    [scene.microEvents]
  );

  const stampEvent = useMemo(
    () => scene.microEvents.find((e) => e.action === 'STAMP_VERDICT'),
    [scene.microEvents]
  );

  const totalFrames = Math.max(1, Math.round(scene.durationSec * fps));
  const pulseOpacity = 0.55 + 0.45 * Math.sin(frame * 0.25);

  const highlightTriggerFrame = highlightEvent
    ? Math.round(highlightEvent.triggerOffsetSec * fps)
    : Math.round(totalFrames * 0.2);

  const liftProgress = spring({
    frame: Math.max(0, frame - highlightTriggerFrame),
    fps,
    config: { damping: 14, mass: 0.9, stiffness: 90 },
  });

  const isMultiBeat = Boolean(beatState && beatState.totalBeats > 1);
  const sweepCursor = beatState
    ? isMultiBeat
      ? (beatState.beatIndex + beatState.beatProgress) / Math.max(1, beatState.totalBeats - 1)
      : Math.max(liftProgress, beatState.beatProgress)
    : Math.max(
        liftProgress,
        interpolate(
          frame,
          [highlightTriggerFrame, Math.min(totalFrames, highlightTriggerFrame + Math.max(24, Math.round(totalFrames * 0.4)))],
          [0, 1],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        )
      );

  const stampTriggerFrame = stampEvent
    ? Math.round(stampEvent.triggerOffsetSec * fps)
    : Math.round(totalFrames * 0.72);

  const isFinalBeat = Boolean(
    beatState && beatState.totalBeats > 1 && beatState.beatIndex >= beatState.totalBeats - 1
  );

  let stampVisible = false;
  let stampScale = 2.0;
  let stampOpacity = 0;

  if (beatState && beatState.totalBeats > 1) {
    if (isFinalBeat) {
      const beatDurFrames = Math.max(
        1,
        Math.round((beatState.beat?.durationSec ?? scene.durationSec / beatState.totalBeats) * fps)
      );
      const finalBeatStartFrame = Math.max(0, Math.round(frame - beatState.beatProgress * beatDurFrames));
      const effectiveStampFrame =
        stampEvent && stampTriggerFrame >= finalBeatStartFrame && stampTriggerFrame < totalFrames
          ? stampTriggerFrame
          : finalBeatStartFrame;

      if (frame >= effectiveStampFrame) {
        stampVisible = true;
        const stampSpring = spring({
          frame: frame - effectiveStampFrame,
          fps,
          config: { damping: 10, mass: 1.1, stiffness: 140 },
        });
        stampScale = interpolate(stampSpring, [0, 1], [2.0, 1.0]);
        stampOpacity = interpolate(stampSpring, [0, 0.2, 1], [0, 1, 1]);
      }
    }
  } else if (frame >= stampTriggerFrame) {
    stampVisible = true;
    const stampSpring = spring({
      frame: frame - stampTriggerFrame,
      fps,
      config: { damping: 10, mass: 1.1, stiffness: 140 },
    });
    stampScale = interpolate(stampSpring, [0, 1], [2.0, 1.0]);
    stampOpacity = interpolate(stampSpring, [0, 0.2, 1], [0, 1, 1]);
  }

  const liftedText =
    highlightEvent?.payloadText ||
    props.highlightPhrases[0] ||
    "A routine transfer addressed to the Shalika Foundation was halted when a routing clerk noticed the hackers misspelled foundation as 'fandation'.";

  const stampLabel = stampEvent?.payloadText || props.stampText || 'VERIFIED REPORT';

  const paraCount = props.paragraphs.length;
  const activeParaIdx =
    paraCount === 0
      ? -1
      : Math.min(
          paraCount - 1,
          beatState?.beat?.beatType === 'TEMPLATE_STATE'
            ? (beatState.beat.templateFocus?.targetIndex ?? beatState.beatIndex)
            : Math.min(paraCount - 1, beatState?.beatIndex ?? paraCount - 1)
        );

  const visibleParagraphCount =
    beatState && beatState.totalBeats > 1
      ? isFinalBeat
        ? paraCount
        : Math.min(paraCount, Math.max(0, activeParaIdx) + 1)
      : paraCount;

  const activeParagraphIdx =
    beatState && beatState.totalBeats > 1 && activeParaIdx >= 0
      ? Math.min(Math.max(0, visibleParagraphCount - 1), activeParaIdx)
      : -1;

  const prevVisibleCount = useMemo(() => {
    if (!beatState || beatState.totalBeats <= 1 || beatState.beatIndex <= 0 || paraCount === 0) {
      return 0;
    }
    const rawBeats = scene.visualBeats;
    if (!rawBeats || rawBeats.length === 0) {
      return Math.min(paraCount, beatState.beatIndex);
    }
    const sorted = [...rawBeats].sort((a, b) =>
      a.startSec !== b.startSec ? a.startSec - b.startSec : a.beatIndex - b.beatIndex
    );
    let maxShown = 0;
    for (let i = 0; i < Math.min(beatState.beatIndex, sorted.length); i++) {
      const priorBeat = sorted[i];
      if (priorBeat.beatType === 'TEMPLATE_STATE') {
        const priorIdx = Math.min(paraCount - 1, priorBeat.templateFocus?.targetIndex ?? i);
        maxShown = Math.max(maxShown, priorIdx + 1);
      }
    }
    return Math.min(paraCount, maxShown);
  }, [beatState, paraCount, scene.visualBeats]);

  const isArticleMode = Boolean(props.publicationName) || Boolean(props.articleImagePath);

  if (isArticleMode) {
    const extraParagraphs =
      props.paragraphs && props.paragraphs.length > 1 ? props.paragraphs.slice(1) : [];
    const visibleExtraCount =
      beatState && beatState.totalBeats > 1
        ? Math.max(0, visibleParagraphCount - 1)
        : extraParagraphs.length;

    return (
      <div className="relative w-full h-full overflow-hidden bg-[#F8FAFC] select-none">
        <div className="absolute inset-x-10 top-14 bottom-12 flex flex-col justify-between px-20 py-8 z-20 bg-white/95 rounded-2xl border border-slate-200 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="border-b border-slate-200 pb-4 flex items-end justify-between">
            <div className="flex items-center gap-4">
              <span className="text-3xl font-serif font-black tracking-widest text-[#0F172A] uppercase">
                {props.publicationName || 'REUTERS'}
              </span>
              <span className="h-6 w-[2px] bg-[#2563EB]" />
              <Badge variant="mono" className="text-slate-600 bg-slate-100 border-slate-200 text-xs font-bold tracking-widest uppercase">
                INVESTIGATIVE REPORTING // PRIMARY EVIDENCE ARCHIVE
              </Badge>
            </div>
            <div className="text-xs font-mono text-slate-600 font-bold tracking-wide flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600" style={{ opacity: pulseOpacity }} />
              <span>{props.dateStamp || 'FEBRUARY 12, 2016 // 14:22 EST'}</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center py-6 space-y-6">
            <div>
              <h1 className="text-4xl font-serif font-extrabold text-[#0F172A] leading-[1.2] tracking-tight max-w-5xl" style={{ fontFamily: 'Georgia, serif' }}>
                {props.headline || props.documentTitle || "Forensic Investigation Report"}
              </h1>
              <div className="text-xs font-mono text-[#475569] mt-2 flex items-center gap-2">
                <span className="text-slate-700 font-semibold">{props.byline || 'By Special Investigative Bureau'}</span>
                <span className="text-blue-600">•</span>
                <span>{props.sourceAgency || 'INVESTIGATIVE ARCHIVE BUREAU'}</span>
              </div>
            </div>

            <div className="p-6 rounded-xl bg-amber-50/80 border-2 border-amber-400 text-amber-950 shadow-sm max-w-5xl relative overflow-hidden">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-amber-300">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-800 tracking-wider uppercase">
                  <span className="w-2 h-2 rounded-full bg-amber-500" style={{ opacity: pulseOpacity }} />
                  <span>KEY FORENSIC SMOKING GUN // HALT TRIGGER</span>
                </div>
                {liftProgress > 0.35 && (
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-amber-200/80 border border-amber-400 text-amber-900 font-mono font-bold text-xs tracking-wider uppercase shadow-xs"
                    style={{
                      transform: `scale(${interpolate(liftProgress, [0.35, 1], [0.85, 1])})`,
                      opacity: interpolate(liftProgress, [0.35, 0.7], [0, 1]),
                    }}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                    {props.stampText || 'KEY FORENSIC TRIGGER'}
                  </span>
                )}
              </div>

              <p className="text-xl font-serif text-slate-800 leading-relaxed" style={{ fontFamily: 'Georgia, serif' }}>
                {renderHighlightedParagraph(
                  props.paragraphs?.[0] || liftedText,
                  props.highlightPhrases || [],
                  sweepCursor
                )}
              </p>
            </div>

            <div className="space-y-3 max-w-5xl">
              {extraParagraphs.slice(0, visibleExtraCount).map((p, pIdx) => {
                const actualIdx = pIdx + 1;
                const isNewlyEntered = Boolean(isMultiBeat && beatState && actualIdx >= prevVisibleCount);
                const entryProgress = isNewlyEntered && beatState
                  ? interpolate(beatState.beatProgress, [0, 0.22], [0, 1], {
                      extrapolateLeft: 'clamp',
                      extrapolateRight: 'clamp',
                    })
                  : 1;
                const isActive = isMultiBeat && actualIdx === activeParagraphIdx;
                const targetOpacity = isMultiBeat ? (isActive ? 1 : 0.65) : 1;

                return (
                  <p
                    key={pIdx}
                    className={cn(
                      'text-sm font-serif leading-relaxed',
                      isActive ? 'text-slate-800 border-l-2 border-blue-500 pl-3' : 'text-[#475569]'
                    )}
                    style={{
                      fontFamily: 'Georgia, serif',
                      opacity: entryProgress * targetOpacity,
                      transform: `translateY(${(1 - entryProgress) * 10}px)`,
                    }}
                  >
                    {renderHighlightedParagraph(p, props.highlightPhrases || [], sweepCursor)}
                  </p>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs font-mono text-slate-500">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <Badge variant="mono" className="font-bold text-slate-700 tracking-wider bg-transparent border-0 p-0">
                {props.evidenceRef || 'PRIMARY SOURCE EXHIBIT // OFFICIAL PUBLIC RECORD'}
              </Badge>
            </div>
            {(stampEvent || props.stampText || isMultiBeat) && stampVisible && (
              <Badge
                variant="destructive"
                className="font-mono font-black text-sm tracking-widest text-red-600 border-2 border-red-600 px-3 py-1 rounded uppercase bg-red-50"
                style={{
                  transform: `rotate(-2deg) scale(${stampScale})`,
                  opacity: stampOpacity,
                }}
              >
                {stampLabel}
              </Badge>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center px-10 pt-14 pb-12 select-none bg-[#F8FAFC]">
      <Card className="relative w-[1340px] bg-white border border-slate-200 rounded-2xl p-8 shadow-[0_10px_35px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col justify-between">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-amber-500 to-red-600" />

        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-blue-600">
              <FileText className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="warning" className="font-mono font-bold bg-amber-50 text-amber-800 border-amber-300">
                  CONFIDENTIAL // EVIDENCE EXHIBIT
                </Badge>
                <Badge variant="secondary" className="font-mono tracking-widest text-slate-600 bg-slate-100 border-slate-200">
                  {props.sourceAgency}
                </Badge>
              </div>
              <h2 className="text-2xl font-heading font-extrabold text-slate-900 mt-1 tracking-tight">
                {props.documentTitle}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <Card className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 flex items-center gap-3">
              <div className="flex flex-col gap-0.5">
                <Badge variant="mono" className="font-bold text-blue-600 tracking-widest bg-transparent border-0 p-0">
                  {props.evidenceRef || 'EVIDENCE REF: SEC-2012-08'}
                </Badge>
                <div className="flex gap-[2px] h-3 items-center mt-0.5">
                  {[2, 1, 3, 1, 4, 2, 5, 1, 2, 4, 1, 3, 2, 4].map((w, idx) => (
                    <span
                      key={idx}
                      className="bg-blue-600/70 inline-block h-full"
                      style={{ width: `${w * 1.5}px` }}
                    />
                  ))}
                </div>
              </div>
            </Card>

            <div className="text-right font-mono text-xs text-slate-500 flex flex-col gap-0.5">
              <span className="text-blue-600 font-bold">{props.dateStamp}</span>
              <span className="text-[11px] text-slate-400">
                {props.docketNumber || 'DOCKET // SEC-ENF-3-15570'}
              </span>
            </div>
          </div>
        </div>

        <div className="relative z-10 px-2 space-y-3">
          {props.paragraphs.slice(0, visibleParagraphCount).map((p, idx) => {
            const isNewlyEntered = Boolean(isMultiBeat && beatState && idx >= prevVisibleCount);
            const entryProgress = isNewlyEntered && beatState
              ? interpolate(beatState.beatProgress, [0, 0.22], [0, 1], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                })
              : 1;
            const isActive = isMultiBeat && idx === activeParagraphIdx;
            const targetOpacity = isMultiBeat ? (isActive ? 1 : 0.6) : 1;

            return (
              <p
                key={idx}
                className={cn(
                  'text-justify font-serif text-[17px] leading-relaxed text-slate-700 pl-4',
                  isActive
                    ? 'border-l-4 border-blue-600 text-slate-900'
                    : isMultiBeat
                      ? 'border-l-2 border-slate-200'
                      : 'border-l-0 pl-0'
                )}
                style={{
                  fontSize: `${17 * (props.fontScale ?? 1)}px`,
                  fontFamily: 'Georgia, serif',
                  opacity: entryProgress * targetOpacity,
                  transform: `translateY(${(1 - entryProgress) * 12}px)`,
                }}
              >
                {renderHighlightedParagraph(p, props.highlightPhrases || [], sweepCursor)}
              </p>
            );
          })}
        </div>

        <div className="mt-5 pt-4 border-t border-slate-200 flex items-center justify-between gap-6">
          <div
            className="flex-1"
            style={{
              opacity: liftProgress > 0 ? 1 : 0.85,
              transform: `scale(${0.98 + Math.min(1, liftProgress) * 0.02})`,
            }}
          >
            <Card className="bg-amber-50/80 border-2 border-amber-400 text-amber-950 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-amber-300">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-800 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>KEY FORENSIC EXTRACT // AUDIT FINDINGS</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono text-amber-700">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>CRITICAL ANOMALY DETECTED</span>
                </div>
              </div>
              <div className="text-xl font-heading font-extrabold text-slate-900 leading-snug tracking-tight">
                "{renderHighlightedParagraph(liftedText, props.highlightPhrases || [], sweepCursor)}"
              </div>
            </Card>
          </div>

          <div
            className="w-[320px] flex items-center justify-center"
            style={{
              opacity: stampVisible ? stampOpacity : 0,
              transform: `rotate(-3deg) scale(${stampVisible ? stampScale : 2.0})`,
            }}
          >
            <div className="border-4 border-red-600 bg-red-50/90 shadow-sm px-6 py-3 rounded-xl w-full flex flex-col items-center justify-center">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-7 h-7 text-red-600" />
                <span className="text-2xl font-mono font-black tracking-widest uppercase text-red-600">
                  {stampLabel}
                </span>
              </div>
              <div className="text-[9px] font-mono tracking-wider mt-0.5 uppercase text-red-600/80">
                EXHIBIT SEALED // OFFICIAL VERDICT
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
