import React, { useMemo } from 'react';
import { interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { FileText, ShieldAlert, Sparkles, AlertTriangle } from 'lucide-react';
import { ForensicDocumentPropsSchema, SceneData } from '../../schemas/timeline.schema';

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

  let liftProgress = 0;
  if (highlightEvent) {
    const triggerFrame = Math.round(highlightEvent.triggerOffsetSec * fps);
    if (frame >= triggerFrame) {
      liftProgress = spring({
        frame: frame - triggerFrame,
        fps,
        config: { damping: 14, mass: 0.9, stiffness: 110 },
      });
    }
  }

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
    props.headline ||
    'CRITICAL FORENSIC ANOMALY';

  const stampLabel = stampEvent?.payloadText || props.stampText || 'VERIFIED REPORT';
  const isTriggered = liftProgress > 0.05;

  const totalFrames = Math.max(1, Math.round(scene.durationSec * fps));
  const kenBurnsScale = interpolate(frame, [0, totalFrames], [1.0, 1.03], {
    extrapolateRight: 'clamp',
  });

  const spotlightDimOpacity = interpolate(liftProgress, [0, 1], [1, 0.35], {
    extrapolateRight: 'clamp',
  });

  const isArticleMode = Boolean(props.publicationName);

  if (isArticleMode) {
    return (
      <div className="relative w-full h-full overflow-hidden bg-[#F8F9FA] select-none flex flex-col justify-between">
        <div
          className="relative w-full h-full flex flex-col justify-between px-24 py-16 will-change-transform"
          style={{ transform: `scale(${kenBurnsScale})` }}
        >
          {/* Top Newspaper Masthead */}
          <div className="border-b-2 border-neutral-900 pb-5 flex items-end justify-between">
            <div className="flex items-center gap-4">
              <span className="text-3xl font-serif font-black tracking-wider text-neutral-900 uppercase">
                {props.publicationName || 'REUTERS'}
              </span>
              <span className="h-6 w-[1.5px] bg-neutral-300" />
              <span className="text-xs font-mono font-bold tracking-widest text-neutral-500 uppercase">
                INVESTIGATIVE REPORTING // CYBERSECURITY ARCHIVE
              </span>
            </div>
            <div className="text-xs font-mono text-neutral-500 font-semibold tracking-wide">
              {props.dateStamp || 'FEBRUARY 12, 2016 // 14:22 EST'}
            </div>
          </div>

          {/* Main Editorial Article Content */}
          <div className="flex-1 flex flex-col justify-center max-w-5xl py-8">
            <h1 className="text-5xl font-serif font-black text-neutral-900 leading-[1.18] tracking-tight mb-4">
              {props.headline || props.documentTitle}
            </h1>

            <div className="text-sm font-sans font-medium text-neutral-500 mb-8 flex items-center gap-2">
              <span>{props.byline || 'By Jim Finkle and Nathan Layne'}</span>
              <span>•</span>
              <span className="text-neutral-400">WASHINGTON / DHAKA</span>
            </div>

            <div className="space-y-6">
              {props.paragraphs.map((p, idx) => {
                const targetPhrase = props.highlightPhrases.find(
                  (ph) => ph && p.toLowerCase().includes(ph.toLowerCase())
                );

                if (!targetPhrase) {
                  return (
                    <p
                      key={idx}
                      className="text-2xl font-serif leading-relaxed text-neutral-800 transition-opacity duration-300"
                      style={{
                        opacity: isTriggered ? spotlightDimOpacity : 1,
                      }}
                    >
                      {p}
                    </p>
                  );
                }

                const regex = new RegExp(`(${targetPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                const parts = p.split(regex);

                return (
                  <p
                    key={idx}
                    className="text-2xl font-serif leading-relaxed text-neutral-800"
                  >
                    {parts.map((part, partIdx) => {
                      if (part.toLowerCase() === targetPhrase.toLowerCase()) {
                        return (
                          <span
                            key={partIdx}
                            className="relative inline-block font-bold text-neutral-950 px-1.5 py-0.5 mx-0.5"
                          >
                            <span
                              className="absolute inset-0 bg-[#FFF000] rounded-[3px] will-change-transform"
                              style={{
                                width: `${Math.min(100, Math.max(0, liftProgress * 100))}%`,
                                mixBlendMode: 'multiply',
                                transition: 'width 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
                              }}
                            />
                            <span className="relative z-10 text-neutral-950">
                              {part}
                            </span>
                          </span>
                        );
                      }
                      return (
                        <span
                          key={partIdx}
                          className="transition-opacity duration-300"
                          style={{ opacity: isTriggered ? spotlightDimOpacity : 1 }}
                        >
                          {part}
                        </span>
                      );
                    })}
                  </p>
                );
              })}
            </div>
          </div>

          {/* Bottom Edge Stamp / Exhibit Reference */}
          <div className="pt-4 border-t border-neutral-300 flex items-center justify-between text-xs font-mono text-neutral-500">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              <span className="font-bold text-neutral-700 tracking-wider">
                {props.evidenceRef || 'PRIMARY SOURCE EXHIBIT // OFFICIAL PUBLIC RECORD'}
              </span>
            </div>
            {stampEvent && (
              <div
                className="font-mono font-black text-sm tracking-widest text-red-600 border-2 border-red-600 px-3 py-1 rounded uppercase"
                style={{
                  transform: `rotate(-2deg) scale(${stampOpacity > 0 ? stampScale : 1.0})`,
                  opacity: stampOpacity > 0 ? 1 : 0.4,
                }}
              >
                {stampLabel}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center p-6 select-none">
      <div className="relative w-[1340px] bg-[#0C1019] border border-[#1E2536] rounded-2xl p-8 shadow-[0_30px_70px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col justify-between">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#00F5D4] via-[#F59E0B] to-[#FF2A54]" />

        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#1E2536]">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-[#07090E] border border-[#1E2536] text-[#00F5D4] shadow-inner">
              <FileText className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40">
                  CONFIDENTIAL // EVIDENCE EXHIBIT
                </span>
                <span className="text-xs font-mono tracking-widest text-[#94A3B8]">
                  {props.sourceAgency}
                </span>
              </div>
              <h2 className="text-2xl font-heading font-extrabold text-[#F1F5F9] mt-1 tracking-tight">
                {props.documentTitle}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="bg-[#07090E] border border-[#1E2536] rounded-lg px-4 py-2 flex items-center gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-mono font-bold text-[#00F5D4] tracking-widest">
                  {props.evidenceRef || 'EVIDENCE REF: SEC-2012-08'}
                </span>
                <div className="flex gap-[2px] h-3 items-center mt-0.5">
                  {[2, 1, 3, 1, 4, 2, 5, 1, 2, 4, 1, 3, 2, 4].map((w, idx) => (
                    <span
                      key={idx}
                      className="bg-[#00F5D4]/70 inline-block h-full"
                      style={{ width: `${w * 1.5}px` }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="text-right font-mono text-xs text-[#94A3B8] flex flex-col gap-0.5">
              <span className="text-[#00F5D4] font-bold">{props.dateStamp}</span>
              <span className="text-[11px] text-[#64748B]">
                {props.docketNumber || 'DOCKET // SEC-ENF-3-15570'}
              </span>
            </div>
          </div>
        </div>

        <div className="relative z-10 px-2 space-y-3">
          {props.paragraphs.map((p, idx) => {
            const targetPhrase = props.highlightPhrases.find(
              (ph) => ph && p.toLowerCase().includes(ph.toLowerCase())
            );
            if (!targetPhrase) {
              return (
                <p
                  key={idx}
                  className="text-justify font-serif text-[17px] leading-relaxed text-[#F1F5F9]/90 transition-opacity duration-300"
                  style={{
                    fontSize: `${17 * (props.fontScale ?? 1)}px`,
                    opacity: isTriggered ? spotlightDimOpacity : 1,
                  }}
                >
                  {p}
                </p>
              );
            }

            const regex = new RegExp(`(${targetPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            const parts = p.split(regex);

            return (
              <p
                key={idx}
                className="text-justify font-serif text-[17px] leading-relaxed text-[#F1F5F9]/90"
                style={{
                  fontSize: `${17 * (props.fontScale ?? 1)}px`,
                }}
              >
                {parts.map((part, partIdx) => {
                  if (part.toLowerCase() === targetPhrase.toLowerCase()) {
                    return (
                      <span
                        key={partIdx}
                        className="relative inline-block px-1.5 py-0.5 mx-0.5 rounded-sm font-bold text-[#F1F5F9]"
                      >
                        <span
                          className="absolute inset-0 bg-[#FFE600]/45 border-y-2 border-[#FFE600] rounded-sm will-change-transform"
                          style={{
                            width: `${Math.min(100, Math.max(0, liftProgress * 100))}%`,
                            boxShadow: '0 0 24px rgba(255, 230, 0, 0.65)',
                            transition: 'width 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
                          }}
                        />
                        <span className="relative z-10 drop-shadow-[0_0_12px_rgba(255,230,0,0.7)] text-white">
                          {part}
                        </span>
                      </span>
                    );
                  }
                  return (
                    <span
                      key={partIdx}
                      className="transition-opacity duration-300"
                      style={{ opacity: isTriggered ? spotlightDimOpacity : 1 }}
                    >
                      {part}
                    </span>
                  );
                })}
              </p>
            );
          })}
        </div>

        <div className="mt-5 pt-4 border-t border-[#1E2536] flex items-center justify-between gap-6">
          <div
            className="flex-1 transition-all duration-300"
            style={{
              opacity: isTriggered ? 1 : 0.85,
              transform: `scale(${0.98 + Math.min(1, liftProgress) * 0.02})`,
            }}
          >
            <div className="bg-[#0A0E17] border-2 border-[#00F5D4] rounded-xl p-4 shadow-[0_15px_40px_rgba(0,0,0,0.85)]">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#00F5D4]/30">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#00F5D4] uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-[#00F5D4] animate-pulse" />
                  <span>KEY FORENSIC EXTRACT // AUDIT FINDINGS</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono text-[#F59E0B]">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>CRITICAL ANOMALY DETECTED</span>
                </div>
              </div>
              <div className="text-2xl font-heading font-extrabold text-[#F1F5F9] leading-snug tracking-tight">
                "{liftedText}"
              </div>
            </div>
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
      </div>
    </div>
  );
};
