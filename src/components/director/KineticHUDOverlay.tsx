import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { SceneData, TimelineData } from '../../schemas/timeline.schema';
import { ForensicHUD } from '../shared/ForensicHUD';

interface KineticHUDOverlayProps {
  scene: SceneData;
  timeline: TimelineData;
}

export const KineticHUDOverlay: React.FC<KineticHUDOverlayProps> = ({ scene, timeline }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const totalSceneFrames = Math.max(1, Math.round(scene.durationSec * fps));
  const sceneProgress = Math.min(1, Math.max(0, frame / totalSceneFrames));

  return (
    <div className="absolute inset-0 pointer-events-none z-40 select-none overflow-hidden">
      <ForensicHUD scene={scene} timeline={timeline} />

      <div className="absolute top-0 left-0 right-0 h-[2px] bg-slate-200/40">
        <div
          className="h-full bg-blue-600/35"
          style={{ width: `${(sceneProgress * 100).toFixed(3)}%` }}
        />
      </div>
    </div>
  );
};
