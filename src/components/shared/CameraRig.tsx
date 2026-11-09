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

  const totalFrames = Math.max(1, Math.round(scene.durationSec * fps));
  const t = Math.min(1, Math.max(0, frame / totalFrames));

  const baseScale = interpolate(t, [0, 1], [1.0, 1.015]);
  const basePanX = interpolate(t, [0, 1], [0, -3]);
  const basePanY = interpolate(t, [0, 1], [0, -1.5]);

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

  let zoomMultiplier = 1.0;
  for (const zoomEvent of zoomEvents) {
    const triggerFrame = Math.round(zoomEvent.triggerOffsetSec * fps);
    if (frame >= triggerFrame) {
      const zoomProgress = spring({
        frame: frame - triggerFrame,
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
    if (frame >= triggerFrame) {
      const panProgress = spring({
        frame: frame - triggerFrame,
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
    if (frame >= triggerFrame) {
      const crashProgress = spring({
        frame: frame - triggerFrame,
        fps,
        config: { damping: 12, mass: 0.4, stiffness: 180 },
      });
      const decay = Math.max(0, 1 - crashProgress);
      shakeX += Math.sin((frame - triggerFrame) * 1.8) * decay * 4;
      shakeY += Math.cos((frame - triggerFrame) * 2.2) * decay * 3;
    }
  }

  const finalScale = Math.min(1.018, baseScale * zoomMultiplier);
  const finalTransX = basePanX + currentPanX + shakeX;
  const finalTransY = basePanY + currentPanY + shakeY;

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
