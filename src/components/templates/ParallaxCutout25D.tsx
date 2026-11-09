import React from 'react';
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Fingerprint, Quote, Shield, UserCheck } from 'lucide-react';
import { ParallaxCutout25DPropsSchema, SceneData } from '../../schemas/timeline.schema';

interface ParallaxCutout25DProps {
  scene: SceneData;
}

export const ParallaxCutout25D: React.FC<ParallaxCutout25DProps> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const props = ParallaxCutout25DPropsSchema.parse(scene.props);

  const totalFrames = Math.max(1, Math.round(scene.durationSec * fps));

  const bgScale = interpolate(frame, [0, totalFrames], [1.0, 1.08], {
    extrapolateRight: 'clamp',
  });

  const fgScale = interpolate(frame, [0, totalFrames], [1.0, 1.15], {
    extrapolateRight: 'clamp',
  });

  const dossierProgress = spring({
    frame: frame - 10,
    fps,
    config: { damping: 14, mass: 0.9, stiffness: 90 },
  });

  const resolvedBgSrc = props.bgImagePath
    ? props.bgImagePath.startsWith('http') || props.bgImagePath.startsWith('data:')
      ? props.bgImagePath
      : staticFile(props.bgImagePath.replace(/^\/?public\//, ''))
    : null;

  const resolvedFgSrc = props.fgImagePath
    ? props.fgImagePath.startsWith('http') || props.fgImagePath.startsWith('data:')
      ? props.fgImagePath
      : staticFile(props.fgImagePath.replace(/^\/?public\//, ''))
    : null;

  return (
    <div className="relative w-full h-full overflow-hidden bg-gradient-to-b from-[#111827] to-[#0A0F1A] select-none">
      <div
        className="absolute inset-0 will-change-transform overflow-hidden"
        style={{
          transform: `scale(${bgScale})`,
        }}
      >
        {resolvedBgSrc ? (
          <Img
            src={resolvedBgSrc}
            className="w-full h-full object-cover filter brightness-90"
          />
        ) : (
          <div
            className="w-full h-full"
            style={{
              background: `radial-gradient(circle at 70% 50%, rgba(0,245,212,0.25) 0%, transparent 65%),
                           linear-gradient(to right, #1A2338, #0E1524)`,
            }}
          />
        )}
        <div
          className="absolute inset-0 opacity-35"
          style={{
            backgroundImage: `linear-gradient(rgba(50, 75, 120, 0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(50, 75, 120, 0.45) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 35%, rgba(7, 9, 14, 0.85) 100%)',
        }}
      />

      <div
        className="absolute right-16 bottom-0 top-0 w-[540px] flex items-end justify-center will-change-transform z-15"
        style={{
          transform: `scale(${fgScale})`,
          transformOrigin: 'bottom center',
        }}
      >
        {resolvedFgSrc ? (
          <Img
            src={resolvedFgSrc}
            className="w-full h-[90%] object-contain object-bottom drop-shadow-[0_20px_50px_rgba(0,0,0,0.95)]"
          />
        ) : (
          <div className="relative w-[420px] h-[640px] mb-12 rounded-2xl bg-[#0F1420]/85 border-2 border-[#00F5D4]/40 shadow-[0_0_50px_rgba(0,245,212,0.25)] overflow-hidden flex flex-col items-center justify-center p-8">
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-48 h-48 rounded-full border-2 border-[#00F5D4]/60 bg-[#080A0F] flex items-center justify-center p-3 shadow-[0_0_30px_rgba(0,245,212,0.35)]">
                <div className="w-full h-full rounded-full border border-dashed border-[#00F5D4]/40 flex items-center justify-center text-[#00F5D4]">
                  <UserCheck className="w-24 h-24 opacity-90" />
                </div>
              </div>

              <div className="mt-8 text-center">
                <span className="px-3.5 py-1 rounded-full text-[11px] font-mono font-bold tracking-widest bg-[#00F5D4]/15 border border-[#00F5D4]/40 text-[#00F5D4]">
                  SUBJECT RECORD IDENTIFIED
                </span>
                <div className="text-2xl font-heading font-bold text-[#F1F5F9] mt-3">
                  {props.subjectName}
                </div>
                <div className="text-sm font-mono text-[#94A3B8] mt-1">
                  {props.subjectRole}
                </div>
              </div>
            </div>

            <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between text-[11px] font-mono text-[#94A3B8]/80 border-t border-[#1E2536] pt-3">
              <span>FACIAL RECOGNITION: 99.4%</span>
              <span>BIOMETRIC HASH // #8F22</span>
            </div>
          </div>
        )}
      </div>

      <div
        className="absolute left-16 top-24 bottom-24 w-[740px] z-20 will-change-transform flex items-center"
        style={{
          transform: `translateX(${(1 - Math.max(0, dossierProgress)) * -120}px)`,
          opacity: Math.max(0, dossierProgress),
        }}
      >
        <div className="w-full backdrop-blur-xl bg-[#080A0F]/90 border border-white/10 rounded-2xl p-10 shadow-[0_35px_70px_rgba(0,0,0,0.95)]">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#1E2536]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-[#0E131F] border border-[#1E2536] text-[#00F5D4]">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono tracking-widest text-[#94A3B8]">
                  CONFIDENTIAL TESTIMONY // DOSSIER EXHIBIT
                </span>
                <div className="text-xs font-mono font-semibold text-[#00F5D4]">
                  CHAIN OF CUSTODY VERIFIED
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Fingerprint className="w-5 h-5 text-[#94A3B8]" />
              <span className="text-[10px] font-mono text-[#94A3B8]">
                ID: #SEC-KCG-{props.subjectName.replace(/\s+/g, '_').toUpperCase().slice(0, 8)}
              </span>
            </div>
          </div>

          <div className="relative mb-8">
            <Quote className="w-10 h-10 text-[#00F5D4]/25 absolute -top-4 -left-4" />
            <p
              className="relative z-10 text-3xl font-serif italic leading-relaxed text-[#F1F5F9]/95 pl-6"
              style={{ fontSize: `${26 * (props.fontScale ?? 1)}px` }}
            >
              "{props.quoteOrFact}"
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[#1E2536] text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00F5D4] animate-pulse" />
              <span className="text-[#94A3B8]">DEPOSITION ADMISSIBLE UNDER RULE 803</span>
            </div>
            <span className="text-[#00F5D4] font-bold">STATUS: ARCHIVED</span>
          </div>
        </div>
      </div>
    </div>
  );
};
