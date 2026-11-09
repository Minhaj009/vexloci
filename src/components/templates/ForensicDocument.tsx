import React, { useMemo } from 'react';
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { FileText, ShieldAlert, Sparkles, AlertTriangle } from 'lucide-react';
import { ForensicDocumentPropsSchema, SceneData } from '../../schemas/timeline.schema';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';

interface ForensicDocumentProps {
  scene: SceneData;
}

export const ForensicDocument: React.FC<ForensicDocumentProps> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

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

  const kenBurnsScale = interpolate(frame, [0, totalFrames], [1.0, 1.15], {
    extrapolateRight: 'clamp',
  });

  const highlightTriggerFrame = highlightEvent
    ? Math.round(highlightEvent.triggerOffsetSec * fps)
    : Math.round(totalFrames * 0.2);

  const liftProgress = spring({
    frame: Math.max(0, frame - highlightTriggerFrame),
    fps,
    config: { damping: 14, mass: 0.9, stiffness: 90 },
  });

  let stampScale = 0;
  let stampOpacity = 0;
  if (stampEvent) {
    const triggerFrame = Math.round(stampEvent.triggerOffsetSec * fps);
    if (frame >= triggerFrame) {
      const stampSpring = spring({
        frame: frame - triggerFrame,
        fps,
        config: { damping: 10, mass: 1.1, stiffness: 140 },
      });
      stampScale = interpolate(stampSpring, [0, 1], [2.2, 1.0]);
      stampOpacity = interpolate(stampSpring, [0, 0.2, 1], [0, 1, 1]);
    }
  }

  const liftedText =
    highlightEvent?.payloadText ||
    props.highlightPhrases[0] ||
    "A routine transfer addressed to the Shalika Foundation was halted when a routing clerk noticed the hackers misspelled foundation as 'fandation'.";

  const stampLabel = stampEvent?.payloadText || props.stampText || 'VERIFIED REPORT';

  const isArticleMode = Boolean(props.publicationName) || Boolean(props.articleImagePath);
  const articleSrc = props.articleImagePath
    ? (props.articleImagePath.startsWith('http') || props.articleImagePath.startsWith('data:')
        ? props.articleImagePath
        : staticFile(props.articleImagePath.replace(/^\/?public\//, '')))
    : null;

  if (isArticleMode) {
    return (
      <div className="relative w-full h-full overflow-hidden bg-[#0B1220] select-none flex flex-col justify-between">
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 65%, rgba(6, 10, 18, 0.9) 100%)',
          }}
        />

        <div
          className="relative w-full h-full flex flex-col justify-between px-20 py-10 will-change-transform z-20"
          style={{
            transform: `scale(${kenBurnsScale})`,
            transformOrigin: '50% 55%',
          }}
        >
          <div className="border-b border-[#1E293B] pb-4 flex items-end justify-between">
            <div className="flex items-center gap-4">
              <span className="text-3xl font-serif font-black tracking-widest text-white uppercase drop-shadow-[0_0_12px_rgba(255,255,255,0.35)]">
                {props.publicationName || 'REUTERS'}
              </span>
              <span className="h-6 w-[2px] bg-[#38BDF8]/70 shadow-[0_0_8px_#38BDF8]" />
              <Badge variant="mono" className="text-[#94A3B8] bg-[#0E1726] border-[#1E293B] text-xs font-bold tracking-widest uppercase">
                INVESTIGATIVE REPORTING // PRIMARY EVIDENCE ARCHIVE
              </Badge>
            </div>
            <div className="text-xs font-mono text-[#38BDF8] font-bold tracking-wide flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-pulse shadow-[0_0_8px_#38BDF8]" />
              <span>{props.dateStamp || 'FEBRUARY 12, 2016 // 14:22 EST'}</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center py-6 space-y-6">
            <div>
              <h1 className="text-4xl font-serif font-extrabold text-[#F8FAFC] leading-[1.2] tracking-tight drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] max-w-5xl">
                {props.headline || props.documentTitle || "Spelling error halts $1 billion cyber heist from Bangladesh Bank"}
              </h1>
              <div className="text-xs font-mono text-[#94A3B8] mt-2 flex items-center gap-2">
                <span className="text-slate-300 font-semibold">{props.byline || 'By Jim Finkle and Nathan Layne // CYBERSECURITY INVESTIGATION'}</span>
                <span className="text-[#38BDF8]">•</span>
                <span>DHAKA / NEW YORK / MANILA BUREAU</span>
              </div>
            </div>

            <div className="p-6 rounded-xl bg-[#0E1726]/95 border-2 border-[#F59E0B]/70 shadow-[0_15px_40px_rgba(0,0,0,0.85)] max-w-5xl relative overflow-hidden">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#F59E0B]/30">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#F59E0B] tracking-wider uppercase">
                  <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse" />
                  <span>KEY FORENSIC SMOKING GUN // HALT TRIGGER</span>
                </div>
                {liftProgress > 0.35 && (
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/60 text-amber-300 font-mono font-bold text-xs tracking-wider uppercase shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                    style={{
                      transform: `scale(${interpolate(liftProgress, [0.35, 1], [0.85, 1])})`,
                      opacity: interpolate(liftProgress, [0.35, 0.7], [0, 1]),
                    }}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    CRITICAL TYPO // $20M BLOCKED
                  </span>
                )}
              </div>

              <p className="text-xl font-serif text-slate-100 leading-relaxed">
                Hackers routed a twenty-million-dollar transfer instruction to the Shalika Foundation, but intermediary routing halted when clerks noticed the attackers{' '}
                <span className="relative inline-block px-1.5 py-0.5 mx-1 font-bold text-white">
                  <span
                    className="absolute inset-0 bg-[#FFE600]/40 border-y-2 border-[#FFE600] rounded-sm will-change-transform"
                    style={{
                      width: `${Math.min(100, Math.max(0, liftProgress * 100))}%`,
                      boxShadow: '0 0 24px rgba(255, 230, 0, 0.75)',
                      transition: 'width 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
                    }}
                  />
                  <span className="relative z-10 text-white drop-shadow-[0_0_10px_rgba(255,230,0,0.85)]">
                    misspelled foundation as 'fandation'
                  </span>
                </span>
                , blocking execution before funds could settle.
              </p>
            </div>

            <div className="space-y-3 max-w-5xl">
              <p className="text-sm font-serif text-slate-300 leading-relaxed">
                The subsequent emergency audit by Bangladesh Bank and the Federal Reserve Bank of New York prevented an additional $850 million in fraudulent SWIFT transfers from clearing.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-[#1E293B] flex items-center justify-between text-xs font-mono text-[#94A3B8]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10B981]" />
              <Badge variant="mono" className="font-bold text-slate-300 tracking-wider bg-transparent border-0 p-0">
                {props.evidenceRef || 'PRIMARY SOURCE EXHIBIT // OFFICIAL PUBLIC RECORD'}
              </Badge>
            </div>
            {stampEvent && (
              <Badge
                variant="destructive"
                className="font-mono font-black text-sm tracking-widest text-[#FF2A54] border-2 border-[#FF2A54] px-3 py-1 rounded uppercase bg-destructive/15 shadow-[0_0_15px_rgba(255,42,84,0.4)]"
                style={{
                  transform: `rotate(-2deg) scale(${stampOpacity > 0 ? stampScale : 1.0})`,
                  opacity: stampOpacity > 0 ? 1 : 0.4,
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
    <div className="relative w-full h-full flex items-center justify-center p-6 select-none bg-[#0B1220]">
      <Card className="relative w-[1340px] bg-[#0E1726] border border-[#1E293B] rounded-2xl p-8 shadow-[0_30px_70px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col justify-between">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#38BDF8] via-[#F59E0B] to-[#FF2A54]" />

        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#1E293B]">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-[#0B1220] border border-[#1E293B] text-[#38BDF8] shadow-inner">
              <FileText className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="warning" className="font-mono font-bold bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/50">
                  CONFIDENTIAL // EVIDENCE EXHIBIT
                </Badge>
                <Badge variant="secondary" className="font-mono tracking-widest text-[#94A3B8] bg-[#0B1220] border-[#1E293B]">
                  {props.sourceAgency}
                </Badge>
              </div>
              <h2 className="text-2xl font-heading font-extrabold text-foreground mt-1 tracking-tight">
                {props.documentTitle}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <Card className="bg-[#0B1220] border border-[#1E293B] rounded-lg px-4 py-2 flex items-center gap-3">
              <div className="flex flex-col gap-0.5">
                <Badge variant="mono" className="font-bold text-[#38BDF8] tracking-widest bg-transparent border-0 p-0">
                  {props.evidenceRef || 'EVIDENCE REF: SEC-2012-08'}
                </Badge>
                <div className="flex gap-[2px] h-3 items-center mt-0.5">
                  {[2, 1, 3, 1, 4, 2, 5, 1, 2, 4, 1, 3, 2, 4].map((w, idx) => (
                    <span
                      key={idx}
                      className="bg-[#38BDF8]/70 inline-block h-full"
                      style={{ width: `${w * 1.5}px` }}
                    />
                  ))}
                </div>
              </div>
            </Card>

            <div className="text-right font-mono text-xs text-muted-foreground flex flex-col gap-0.5">
              <span className="text-[#38BDF8] font-bold">{props.dateStamp}</span>
              <span className="text-[11px] text-[#64748B]">
                {props.docketNumber || 'DOCKET // SEC-ENF-3-15570'}
              </span>
            </div>
          </div>
        </div>

        <div className="relative z-10 px-2 space-y-3">
          {props.paragraphs.map((p, idx) => (
            <p
              key={idx}
              className="text-justify font-serif text-[17px] leading-relaxed text-foreground/90"
              style={{ fontSize: `${17 * (props.fontScale ?? 1)}px` }}
            >
              {p}
            </p>
          ))}
        </div>

        <div className="mt-5 pt-4 border-t border-[#1E293B] flex items-center justify-between gap-6">
          <div
            className="flex-1 transition-all duration-300"
            style={{
              opacity: liftProgress > 0 ? 1 : 0.85,
              transform: `scale(${0.98 + Math.min(1, liftProgress) * 0.02})`,
            }}
          >
            <Card className="bg-[#0B1220] border-2 border-[#38BDF8] rounded-xl p-4 shadow-[0_15px_40px_rgba(0,0,0,0.85)]">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#38BDF8]/30">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#38BDF8] uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-[#38BDF8] animate-pulse" />
                  <span>KEY FORENSIC EXTRACT // AUDIT FINDINGS</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono text-[#F59E0B]">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>CRITICAL ANOMALY DETECTED</span>
                </div>
              </div>
              <div className="text-xl font-heading font-extrabold text-foreground leading-snug tracking-tight">
                "{liftedText}"
              </div>
            </Card>
          </div>

          <div
            className="w-[320px] flex items-center justify-center transition-all duration-300"
            style={{
              opacity: stampEvent ? (stampOpacity > 0 ? 1 : 0.4) : 1,
              transform: `rotate(-3deg) scale(${stampOpacity > 0 ? stampScale : 1.0})`,
            }}
          >
            <div className="border-4 border-[#FF2A54] bg-[#FF2A54]/15 shadow-[0_0_30px_rgba(255,42,84,0.5)] px-6 py-3 rounded-xl w-full flex flex-col items-center justify-center">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-7 h-7 text-[#FF2A54]" />
                <span className="text-2xl font-mono font-black tracking-widest uppercase text-[#FF2A54]">
                  {stampLabel}
                </span>
              </div>
              <div className="text-[9px] font-mono tracking-wider mt-0.5 uppercase text-[#FF2A54]/80">
                EXHIBIT SEALED // OFFICIAL VERDICT
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
