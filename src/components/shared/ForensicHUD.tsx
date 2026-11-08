import React from 'react';
import { SceneData, TimelineData } from '../../schemas/timeline.schema';

interface ForensicHUDProps {
  scene: SceneData;
  timeline: TimelineData;
}

export const ForensicHUD: React.FC<ForensicHUDProps> = ({ scene }) => {
  const isLightArticle =
    scene?.template === 'ForensicDocument' &&
    Boolean((scene?.props as any)?.publicationName);

  if (isLightArticle) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-40 select-none">
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 72%, rgba(6, 8, 12, 0.7) 100%)',
        }}
      />
    </div>
  );
};
