import React, { useMemo } from 'react';
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { SceneData, TimelineData, VisualBeat } from '../../schemas/timeline.schema';
import { SceneBeatProvider, SceneBeatState } from './SceneBeatContext';
import { AtmosphericStage } from '../shared/AtmosphericStage';
import { CameraRig } from '../shared/CameraRig';
import { FilmGrainOverlay } from '../shared/FilmGrainOverlay';
import { MidSceneCutaway } from './MidSceneCutaway';
import { KineticHUDOverlay } from './KineticHUDOverlay';

interface SceneDirectorProps {
  scene: SceneData;
  timeline: TimelineData;
  isShort?: boolean;
  hideBackground?: boolean;
  children: React.ReactNode;
}

function createFallbackBeat(scene: SceneData): VisualBeat {
  return {
    beatId: `${scene.sceneId}_beat_0`,
    beatIndex: 0,
    startSec: 0,
    durationSec: Math.max(0.5, scene.durationSec),
    beatType: 'TEMPLATE_STATE',
    hudOverlay: {
      phaseBadge: `ACT ${scene.actNumber}`,
      telemetryTag: scene.chapterTitle,
    },
  };
}

function buildOrderedBeats(scene: SceneData): VisualBeat[] {
  const rawBeats = scene.visualBeats;
  if (!rawBeats || rawBeats.length === 0) {
    return [createFallbackBeat(scene)];
  }

  const validBeats = rawBeats.filter(
    (beat) => beat.startSec >= 0 && beat.startSec < scene.durationSec
  );

  if (validBeats.length === 0) {
    return [createFallbackBeat(scene)];
  }

  return [...validBeats].sort((a, b) =>
    a.startSec !== b.startSec ? a.startSec - b.startSec : a.beatIndex - b.beatIndex
  );
}

function resolveActiveBeat(
  beats: VisualBeat[],
  currentSec: number
): { beat: VisualBeat; beatIndex: number; beatProgress: number } {
  const exactIndex = beats.findIndex(
    (b) => currentSec >= b.startSec && currentSec < b.startSec + b.durationSec
  );

  if (exactIndex !== -1) {
    const beat = beats[exactIndex];
    const progress = Math.min(
      1,
      Math.max(0, (currentSec - beat.startSec) / Math.max(0.001, beat.durationSec))
    );
    return { beat, beatIndex: exactIndex, beatProgress: progress };
  }

  if (currentSec < beats[0].startSec) {
    return { beat: beats[0], beatIndex: 0, beatProgress: 0 };
  }

  let fallbackIndex = beats.length - 1;
  for (let i = beats.length - 1; i >= 0; i--) {
    if (currentSec >= beats[i].startSec) {
      fallbackIndex = i;
      break;
    }
  }

  const beat = beats[fallbackIndex];
  const progress = Math.min(
    1,
    Math.max(0, (currentSec - beat.startSec) / Math.max(0.001, beat.durationSec))
  );
  return { beat, beatIndex: fallbackIndex, beatProgress: progress };
}

export const SceneDirector: React.FC<SceneDirectorProps> = ({
  scene,
  timeline,
  isShort = false,
  hideBackground = false,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const activeFps = Math.max(1, fps);
  const currentSec = frame / activeFps;

  const beats = useMemo(() => buildOrderedBeats(scene), [scene]);
  const { beat, beatIndex, beatProgress } = resolveActiveBeat(beats, currentSec);
  const totalBeats = beats.length;
  const beatFrame = Math.max(0, frame - Math.round(beat.startSec * activeFps));
  const hideTemplateUnderCutaway =
    beat.beatType !== 'TEMPLATE_STATE' && beatFrame >= 8;

  const prevBeat = beatIndex > 0 ? beats[beatIndex - 1] : null;
  const isReturningFromCutaway =
    beat.beatType === 'TEMPLATE_STATE' &&
    prevBeat !== null &&
    prevBeat.beatType !== 'TEMPLATE_STATE' &&
    beatFrame < 8;

  const prevBeatState: SceneBeatState | null =
    isReturningFromCutaway && prevBeat
      ? {
          beat: prevBeat,
          beatIndex: beatIndex - 1,
          totalBeats,
          beatProgress: 1,
          isShort,
        }
      : null;

  const returnDissolveOpacity = isReturningFromCutaway
    ? interpolate(beatFrame, [0, 8], [1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.out(Easing.cubic),
      })
    : 0;

  return (
    <SceneBeatProvider
      value={{
        beat,
        beatIndex,
        totalBeats,
        beatProgress,
        isShort,
      }}
    >
      <div className="relative w-full h-full overflow-hidden">
        {!hideBackground && <AtmosphericStage scene={scene} timeline={timeline} />}
        <div
          className="absolute inset-0 z-10"
          style={{ visibility: hideTemplateUnderCutaway ? 'hidden' : 'visible' }}
        >
          <CameraRig scene={scene}>{children}</CameraRig>
        </div>
        {beat.beatType !== 'TEMPLATE_STATE' && <MidSceneCutaway />}
        {prevBeatState && (
          <div
            className="absolute inset-0 z-30 pointer-events-none"
            style={{ opacity: returnDissolveOpacity }}
          >
            <MidSceneCutaway beatState={prevBeatState} exitTailFrames={10} />
          </div>
        )}
        {!isShort && scene.template !== 'EndScreenOutro' && (
          <KineticHUDOverlay scene={scene} timeline={timeline} />
        )}
        <FilmGrainOverlay opacity={0.02} className="z-50" />
      </div>
    </SceneBeatProvider>
  );
};
