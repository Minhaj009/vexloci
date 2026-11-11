import React, { useMemo } from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { CameraMotionType, MicroEvent, SceneData } from '../../schemas/timeline.schema';
import { useSceneBeat } from '../director/SceneBeatContext';

interface CameraRigProps {
  scene: SceneData;
  children: React.ReactNode;
}

export interface CameraTransform {
  scale: number;
  transX: number;
  transY: number;
}

export function computeBeatCameraTransform(
  cameraMotion: CameraMotionType,
  beatProgress: number,
  beatLocalFrame: number,
  fps: number,
  maxZoomDelta = 0.018
): CameraTransform {
  switch (cameraMotion) {
    case 'PUSH_IN':
      return {
        scale: interpolate(beatProgress, [0, 1], [1.0, 1.0 + maxZoomDelta], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        }),
        transX: 0,
        transY: 0,
      };

    case 'PULL_OUT':
      return {
        scale: interpolate(beatProgress, [0, 1], [1.0 + maxZoomDelta, 1.0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        }),
        transX: 0,
        transY: 0,
      };

    case 'DRIFT_LEFT':
      return {
        scale: 1.0 + maxZoomDelta * 0.65,
        transX: interpolate(beatProgress, [0, 1], [4, -6], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        }),
        transY: 0,
      };

    case 'DRIFT_RIGHT':
      return {
        scale: 1.0 + maxZoomDelta * 0.65,
        transX: interpolate(beatProgress, [0, 1], [-6, 4], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        }),
        transY: 0,
      };

    case 'FOCUS_PUNCH': {
      const punch = spring({
        frame: beatLocalFrame,
        fps,
        config: { damping: 14, mass: 0.7, stiffness: 120 },
      });
      return {
        scale: 1.0 + punch * maxZoomDelta,
        transX: 0,
        transY: 0,
      };
    }

    case 'IMPACT_SHAKE': {
      if (beatLocalFrame < 18) {
        const decay = interpolate(beatLocalFrame, [0, 18], [1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        return {
          scale: 1.0 + maxZoomDelta * 0.55 + decay * (maxZoomDelta * 0.45),
          transX: Math.sin(beatLocalFrame * 1.9) * decay * 5,
          transY: Math.cos(beatLocalFrame * 2.3) * decay * 3.5,
        };
      }
      return {
        scale: interpolate(beatProgress, [0, 1], [1.0, 1.0 + maxZoomDelta * 0.67], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        }),
        transX: 0,
        transY: 0,
      };
    }

    default: {
      const _exhaustive: never = cameraMotion;
      return _exhaustive;
    }
  }
}

function computeMicroEventTransform(
  targetFrame: number,
  totalFrames: number,
  fps: number,
  zoomEvents: MicroEvent[],
  panEvents: MicroEvent[],
  crashEvents: MicroEvent[]
): CameraTransform {
  const t = Math.min(1, Math.max(0, targetFrame / totalFrames));
  const baseScale = interpolate(t, [0, 1], [1.0, 1.015]);
  const basePanX = interpolate(t, [0, 1], [0, -3]);
  const basePanY = interpolate(t, [0, 1], [0, -1.5]);

  let zoomMultiplier = 1.0;
  for (const zoomEvent of zoomEvents) {
    const triggerFrame = Math.round(zoomEvent.triggerOffsetSec * fps);
    if (targetFrame >= triggerFrame) {
      const zoomProgress = spring({
        frame: targetFrame - triggerFrame,
        fps,
        config: { damping: 16, mass: 0.9, stiffness: 60 },
      });
      zoomMultiplier += zoomProgress * 0.008;
    }
  }

  let currentPanX = 0;
  let currentPanY = 0;
  for (const panEvent of panEvents) {
    const triggerFrame = Math.round(panEvent.triggerOffsetSec * fps);
    if (targetFrame >= triggerFrame) {
      const panProgress = spring({
        frame: targetFrame - triggerFrame,
        fps,
        config: { damping: 18, mass: 1.0, stiffness: 50 },
      });
      currentPanX += panProgress * -8;
      currentPanY += panProgress * -4;
    }
  }

  let shakeX = 0;
  let shakeY = 0;
  for (const crashEvent of crashEvents) {
    const triggerFrame = Math.round(crashEvent.triggerOffsetSec * fps);
    if (targetFrame >= triggerFrame) {
      const crashProgress = spring({
        frame: targetFrame - triggerFrame,
        fps,
        config: { damping: 12, mass: 0.4, stiffness: 180 },
      });
      const decay = Math.max(0, 1 - crashProgress);
      shakeX += Math.sin((targetFrame - triggerFrame) * 1.8) * decay * 4;
      shakeY += Math.cos((targetFrame - triggerFrame) * 2.2) * decay * 3;
    }
  }

  return {
    scale: Math.min(1.02, Math.max(1.0, baseScale * zoomMultiplier)),
    transX: basePanX + currentPanX + shakeX,
    transY: basePanY + currentPanY + shakeY,
  };
}

export const CameraRig: React.FC<CameraRigProps> = ({ scene, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const beatState = useSceneBeat();

  const activeFps = Math.max(1, fps);
  const totalFrames = Math.max(1, Math.round(scene.durationSec * activeFps));

  const orderedBeats = useMemo(() => {
    const raw = scene.visualBeats;
    if (!raw || raw.length === 0) {
      return [];
    }
    return [...raw]
      .filter((b) => b.startSec >= 0 && b.startSec < scene.durationSec)
      .sort((a, b) =>
        a.startSec !== b.startSec ? a.startSec - b.startSec : a.beatIndex - b.beatIndex
      );
  }, [scene.visualBeats, scene.durationSec]);

  const zoomEvents = useMemo(
    () => scene.microEvents.filter((e) => e.action === 'ZOOM_IN'),
    [scene.microEvents]
  );

  const panEvents = useMemo(
    () => scene.microEvents.filter((e) => e.action === 'PAN_TO_NODE'),
    [scene.microEvents]
  );

  const crashEvents = useMemo(
    () => scene.microEvents.filter((e) => e.action === 'TRIGGER_CRASH_DROP'),
    [scene.microEvents]
  );

  const currBeat = beatState?.beat ?? null;
  const beatFrame = currBeat
    ? Math.max(0, frame - Math.round(currBeat.startSec * activeFps))
    : 0;

  let currTransform: CameraTransform;
  if (currBeat?.cameraMotion && beatState) {
    const beatTransform = computeBeatCameraTransform(
      currBeat.cameraMotion,
      beatState.beatProgress,
      beatFrame,
      activeFps
    );
    currTransform = {
      scale: Math.min(1.02, Math.max(1.0, beatTransform.scale)),
      transX: beatTransform.transX,
      transY: beatTransform.transY,
    };
  } else {
    currTransform = computeMicroEventTransform(
      frame,
      totalFrames,
      activeFps,
      zoomEvents,
      panEvents,
      crashEvents
    );
  }

  let finalScale = currTransform.scale;
  let finalTransX = currTransform.transX;
  let finalTransY = currTransform.transY;

  if (
    beatState &&
    beatState.beatIndex > 0 &&
    currBeat?.beatType === 'TEMPLATE_STATE' &&
    beatFrame < 10
  ) {
    const prevBeat = orderedBeats[beatState.beatIndex - 1] ?? null;
    if (prevBeat && prevBeat.beatType === 'TEMPLATE_STATE') {
      const prevEndFrames = Math.max(1, Math.round(prevBeat.durationSec * activeFps));
      const prevEndTransform = prevBeat.cameraMotion
        ? computeBeatCameraTransform(prevBeat.cameraMotion, 1, prevEndFrames, activeFps)
        : computeMicroEventTransform(
            Math.round((prevBeat.startSec + prevBeat.durationSec) * activeFps),
            totalFrames,
            activeFps,
            zoomEvents,
            panEvents,
            crashEvents
          );

      const prevEndScale = Math.min(1.02, Math.max(1.0, prevEndTransform.scale));
      const rawBlend = Math.min(1, Math.max(0, beatFrame / 10));
      const smoothBlend = rawBlend * rawBlend * (3 - 2 * rawBlend);

      finalScale = prevEndScale + (currTransform.scale - prevEndScale) * smoothBlend;
      finalTransX =
        prevEndTransform.transX + (currTransform.transX - prevEndTransform.transX) * smoothBlend;
      finalTransY =
        prevEndTransform.transY + (currTransform.transY - prevEndTransform.transY) * smoothBlend;
    }
  }

  finalScale = Math.min(1.02, Math.max(1.0, finalScale));

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div
        className="w-full h-full will-change-transform flex items-center justify-center"
        style={{
          transform: `scale(${finalScale}) translate(${finalTransX}px, ${finalTransY}px)`,
          transformOrigin: '50% 50%',
        }}
      >
        <div className="w-full h-full flex items-center justify-center">
          {children}
        </div>
      </div>
    </div>
  );
};
