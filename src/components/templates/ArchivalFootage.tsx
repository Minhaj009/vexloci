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

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#080A0F]">
      <div
        className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden will-change-transform"
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
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-md backdrop-blur-md bg-[#080A0F]/80 border border-[#00F5D4]/40 shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
          <span className="w-2 h-2 rounded-full bg-[#00F5D4]" />
          <span className="text-[11px] font-mono font-bold tracking-wider text-[#00F5D4] uppercase">
            {props.licenseBadge || 'FREE ARCHIVAL ASSET // WIKIMEDIA COMMONS [PUBLIC DOMAIN / CC-BY-SA]'}
          </span>
        </div>
      </div>

      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: 'linear-gradient(to top, rgba(8,10,15,0.95) 0%, rgba(8,10,15,0.45) 30%, transparent 60%)',
        }}
      />

      <div className="absolute left-16 bottom-28 z-20 pointer-events-none max-w-2xl">
        <div className="backdrop-blur-xl bg-[#080A0F]/90 border border-white/10 rounded-xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.9)]">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-widest bg-[#00F5D4]/15 border border-[#00F5D4]/40 text-[#00F5D4] uppercase">
              {props.provenanceSource}
            </span>
          </div>
          <h3
            className="text-2xl font-heading font-bold text-[#F1F5F9] leading-tight mb-1.5"
            style={{ fontSize: `${24 * (props.fontScale ?? 1)}px` }}
          >
            {props.headline}
          </h3>
          <p
            className="text-sm font-mono text-[#94A3B8] leading-relaxed"
            style={{ fontSize: `${13 * (props.fontScale ?? 1)}px` }}
          >
            {props.caption}
          </p>
        </div>
      </div>
    </div>
  );
};
