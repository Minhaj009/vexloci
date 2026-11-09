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
    <div className="relative w-full h-full overflow-hidden bg-[#F8FAFC] select-none">
      <div
        className="absolute inset-0 will-change-transform overflow-hidden"
        style={{
          transform: `scale(${bgScale})`,
        }}
      >
        {resolvedBgSrc ? (
          <Img
            src={resolvedBgSrc}
            className="w-full h-full object-cover filter brightness-95"
          />
        ) : (
          <div
            className="w-full h-full bg-[#F1F5F9]"
            style={{
              background: `radial-gradient(circle at 70% 50%, rgba(37,99,235,0.08) 0%, transparent 65%),
                           linear-gradient(to right, #F8FAFC, #EDF2F7)`,
            }}
          />
        )}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: `linear-gradient(rgba(148, 163, 184, 0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.25) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 45%, rgba(248, 250, 252, 0.7) 100%)',
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
            className="w-full h-[90%] object-contain object-bottom drop-shadow-[0_20px_40px_rgba(15,23,42,0.12)]"
          />
        ) : (
          <div className="relative w-[420px] h-[640px] mb-12 rounded-2xl bg-white border border-slate-200 shadow-[0_10px_35px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col items-center justify-center p-8">
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-48 h-48 rounded-full border-2 border-slate-200 bg-slate-50 flex items-center justify-center p-3 text-blue-600">
                <div className="w-full h-full rounded-full border border-dashed border-blue-300 flex items-center justify-center text-blue-600">
                  <UserCheck className="w-24 h-24 opacity-90" />
                </div>
              </div>

              <div className="mt-8 text-center">
                <span className="px-3.5 py-1 rounded-full text-[11px] font-mono font-bold tracking-widest bg-blue-50 border border-blue-200 text-blue-700">
                  SUBJECT RECORD IDENTIFIED
                </span>
                <div className="text-2xl font-heading font-bold text-slate-900 mt-3">
                  {props.subjectName}
                </div>
                <div className="text-sm font-mono text-slate-500 mt-1">
                  {props.subjectRole}
                </div>
              </div>
            </div>

            <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between text-[11px] font-mono text-slate-500 border-t border-slate-200 pt-3">
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
        <div className="w-full backdrop-blur-xl bg-white/95 border border-slate-200 rounded-2xl p-10 text-slate-900 shadow-[0_10px_35px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-blue-50 border border-blue-200 text-blue-600">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono tracking-widest text-slate-500">
                  CONFIDENTIAL TESTIMONY // DOSSIER EXHIBIT
                </span>
                <div className="text-xs font-mono font-semibold text-blue-600">
                  CHAIN OF CUSTODY VERIFIED
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Fingerprint className="w-5 h-5 text-slate-400" />
              <span className="text-[10px] font-mono text-slate-500">
                ID: #SEC-KCG-{props.subjectName.replace(/\s+/g, '_').toUpperCase().slice(0, 8)}
              </span>
            </div>
          </div>

          <div className="relative mb-8">
            <Quote className="w-10 h-10 text-[#2563EB]/20 absolute -top-4 -left-4" />
            <p
              className="relative z-10 text-3xl font-serif italic leading-relaxed text-[#0F172A] pl-6"
              style={{ fontSize: `${26 * (props.fontScale ?? 1)}px` }}
            >
              "{props.quoteOrFact}"
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              <span className="text-slate-600">DEPOSITION ADMISSIBLE UNDER RULE 803</span>
            </div>
            <span className="text-blue-600 font-bold">STATUS: ARCHIVED</span>
          </div>
        </div>
      </div>
    </div>
  );
};
