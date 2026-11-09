import React from 'react';
import { Img, interpolate, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ArchivalFootagePropsSchema, SceneData } from '../../schemas/timeline.schema';

interface ArchivalFootageProps {
  scene: SceneData;
}

export const ArchivalFootage: React.FC<ArchivalFootageProps> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const props = ArchivalFootagePropsSchema.parse(scene.props);
  const totalFrames = Math.max(1, Math.round(scene.durationSec * fps));

  const scale = interpolate(frame, [0, totalFrames], [1.0, 1.05], {
    extrapolateRight: 'clamp',
  });

  const resolvedSrc = props.mediaPath.startsWith('http') || props.mediaPath.startsWith('data:')
    ? props.mediaPath
    : staticFile(props.mediaPath.replace(/^\/?public\//, ''));

  // Derive static image fallback if available
  const imageFallbackSrc = props.mediaPath.includes('broll_archival_')
    ? staticFile(props.mediaPath.replace('broll_archival_', 'archival_img_').replace('.mp4', '.png').replace(/^\/?public\//, ''))
    : null;

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-100">
      {imageFallbackSrc && (
        <div className="absolute inset-0 w-full h-full">
          <Img
            src={imageFallbackSrc}
            className="w-full h-full object-cover opacity-80"
          />
        </div>
      )}

      <div
        className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden will-change-transform z-10"
        style={{ transform: `scale(${scale})` }}
      >
        {props.mediaType === 'video' ? (
          <OffthreadVideo
            src={resolvedSrc}
            className="w-full h-full object-cover"
            muted
          />
        ) : (
          <Img
            src={resolvedSrc}
            className="w-full h-full object-cover"
          />
        )}
      </div>

      <div className="absolute top-10 left-16 z-20 pointer-events-none">
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-lg backdrop-blur-md bg-white/95 border border-slate-200 text-slate-700 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-blue-600" />
          <span className="text-[11px] font-mono font-bold tracking-wider text-slate-700 uppercase">
            {props.licenseBadge || 'FREE ARCHIVAL ASSET // WIKIMEDIA COMMONS [PUBLIC DOMAIN / CC-BY-SA]'}
          </span>
        </div>
      </div>

      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: 'linear-gradient(to top, rgba(15,23,42,0.45) 0%, rgba(15,23,42,0.15) 30%, transparent 60%)',
        }}
      />

      <div className="absolute left-16 bottom-28 z-20 pointer-events-none max-w-2xl">
        <div className="backdrop-blur-xl bg-white/95 border border-slate-200 rounded-2xl p-6 text-slate-900 shadow-[0_10px_35px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-widest bg-blue-50 border border-blue-200 text-blue-700 uppercase">
              {props.provenanceSource}
            </span>
          </div>
          <h3
            className="text-2xl font-heading font-bold text-slate-900 leading-tight mb-1.5"
            style={{ fontSize: `${24 * (props.fontScale ?? 1)}px` }}
          >
            {props.headline}
          </h3>
          <p
            className="text-sm font-sans text-slate-600 leading-relaxed"
            style={{ fontSize: `${13 * (props.fontScale ?? 1)}px` }}
          >
            {props.caption}
          </p>
        </div>
      </div>
    </div>
  );
};
