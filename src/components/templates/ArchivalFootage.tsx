import React from 'react';
import { Img, interpolate, Loop, OffthreadVideo, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { ArchivalFootagePropsSchema, SceneData } from '../../schemas/timeline.schema';
import { inferMediaType, resolveMediaSrc } from '../../lib/media';
import { useSceneBeat } from '../director/SceneBeatContext';

interface ArchivalFootageProps {
  scene: SceneData;
}

export const ArchivalFootage: React.FC<ArchivalFootageProps> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const beatState = useSceneBeat();

  const props = ArchivalFootagePropsSchema.parse(scene.props);
  const totalFrames = Math.max(1, Math.round(scene.durationSec * fps));

  const beatIndex = beatState ? beatState.beatIndex : 0;
  const mediaPool = [props.mediaPath, ...(props.secondaryMediaPaths ?? [])].filter(Boolean);
  const activeMediaPath =
    mediaPool.length > 0 ? mediaPool[beatIndex % mediaPool.length] : props.mediaPath;
  const activeMediaType = inferMediaType(activeMediaPath, props.mediaType);

  const progress = beatState
    ? Math.max(0, Math.min(1, beatState.beatProgress))
    : interpolate(frame, [0, totalFrames], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
  const scaleRange: [number, number] = beatIndex % 2 === 0 ? [1.0, 1.07] : [1.07, 1.0];
  const scale = interpolate(progress, [0, 1], scaleRange, {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const totalClipSec = props.videoDurationSec ?? 18;
  const rawOffset = props.videoStartOffsetSec ?? 0;
  const safeOffsetSec = rawOffset >= totalClipSec ? 0 : rawOffset;
  const playableSec = Math.max(0.5, totalClipSec - safeOffsetSec);
  const clipFrames = Math.max(1, Math.round(playableSec * fps));
  const trimBeforeFrames = Math.max(0, Math.round(safeOffsetSec * fps));
  const shouldLoop = props.loop ?? true;

  const activeBeat = beatState?.beat ?? null;
  const beatStartFrame = activeBeat ? Math.max(0, Math.round(activeBeat.startSec * fps)) : 0;
  const isFinalBeat = Boolean(beatState && beatState.beatIndex >= beatState.totalBeats - 1);
  const beatEndFrame = activeBeat
    ? Math.max(
        beatStartFrame + 1,
        isFinalBeat
          ? Math.max(totalFrames, Math.ceil((activeBeat.startSec + activeBeat.durationSec) * fps))
          : Math.ceil((activeBeat.startSec + activeBeat.durationSec) * fps)
      )
    : totalFrames;
  const beatFrames = Math.max(1, beatEndFrame - beatStartFrame);

  const resolvedSrc = resolveMediaSrc(activeMediaPath);

  const videoElement = (
    <OffthreadVideo
      key={activeMediaPath}
      src={resolvedSrc}
      trimBefore={trimBeforeFrames > 0 ? trimBeforeFrames : undefined}
      className="w-full h-full object-cover"
      muted
    />
  );

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-100">
      <div
        className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden will-change-transform z-10"
        style={{ transform: `scale(${scale})` }}
      >
        {activeMediaType === 'video' ? (
          <Sequence
            key={activeBeat?.beatId ?? 'scene'}
            from={beatStartFrame}
            durationInFrames={beatFrames}
            layout="none"
          >
            {shouldLoop ? (
              <Loop durationInFrames={clipFrames} layout="none">
                {videoElement}
              </Loop>
            ) : (
              videoElement
            )}
          </Sequence>
        ) : (
          <Img
            key={activeMediaPath}
            src={resolvedSrc}
            className="w-full h-full object-cover"
          />
        )}
      </div>

      <div className="absolute top-14 left-16 z-20 pointer-events-none">
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

      <div className="absolute left-16 bottom-20 z-20 pointer-events-none max-w-2xl">
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
