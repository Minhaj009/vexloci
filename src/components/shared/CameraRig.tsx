import React, { useMemo } from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { SceneData } from '../../schemas/timeline.schema';

interface CameraRigProps {
  scene: SceneData;
  children: React.ReactNode;
}

export const CameraRig: React.FC<CameraRigProps> = ({ scene, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

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

  const openingProgress = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const introScale = interpolate(openingProgress, [0, 1], [1.04, 1.0]);

  let zoomMultiplier = 1.0;
  for (const zoomEvent of zoomEvents) {
    const triggerFrame = Math.round(zoomEvent.triggerOffsetSec * fps);
    if (frame >= triggerFrame) {
      const zoomProgress = spring({
        frame: frame - triggerFrame,
        fps,
        config: { damping: 16, mass: 0.9, stiffness: 60 },
      });
      zoomMultiplier += zoomProgress * 0.1;
    }
  }

  let currentPanX = 0;
  let currentPanY = 0;
  for (const panEvent of panEvents) {
    const triggerFrame = Math.round(panEvent.triggerOffsetSec * fps);
    if (frame >= triggerFrame) {
      const panProgress = spring({
        frame: frame - triggerFrame,
        fps,
        config: { damping: 18, mass: 1.0, stiffness: 50 },
      });
      currentPanX += panProgress * -45;
      currentPanY += panProgress * -25;
    }
  }

  let shakeX = 0;
  let shakeY = 0;
  for (const crashEvent of crashEvents) {
    const triggerFrame = Math.round(crashEvent.triggerOffsetSec * fps);
    if (frame >= triggerFrame) {
      const crashProgress = spring({
        frame: frame - triggerFrame,
        fps,
        config: { damping: 12, mass: 0.4, stiffness: 180 },
      });
      const decay = Math.max(0, 1 - crashProgress);
      shakeX += Math.sin((frame - triggerFrame) * 1.8) * decay * 14;
      shakeY += Math.cos((frame - triggerFrame) * 2.2) * decay * 10;
    }
  }

  const finalTransX = currentPanX + shakeX;
  const finalTransY = currentPanY + shakeY;

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div
        className="w-full h-full will-change-transform flex items-center justify-center"
        style={{
          transform: `scale(${introScale * zoomMultiplier}) translate(${finalTransX}px, ${finalTransY}px)`,
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
