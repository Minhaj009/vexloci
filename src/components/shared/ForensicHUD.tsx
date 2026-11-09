import React from 'react';
import { SceneData, TimelineData } from '../../schemas/timeline.schema';

interface ForensicHUDProps {
  scene: SceneData;
  timeline: TimelineData;
}

export const ForensicHUD: React.FC<ForensicHUDProps> = () => {
  return (
    <div className="absolute inset-0 pointer-events-none z-40 select-none overflow-hidden">
      {/* Cinematic Anamorphic Dark Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 68%, rgba(4, 6, 10, 0.85) 100%)',
        }}
      />

      {/* Subtle Corner Framing Brackets */}
      <div className="absolute top-8 left-8 text-slate-400/20 font-mono text-xl select-none leading-none">
        ┌
      </div>
      <div className="absolute top-8 right-8 text-slate-400/20 font-mono text-xl select-none leading-none">
        ┐
      </div>
      <div className="absolute bottom-8 left-8 text-slate-400/20 font-mono text-xl select-none leading-none">
        └
      </div>
      <div className="absolute bottom-8 right-8 text-slate-400/20 font-mono text-xl select-none leading-none">
        ┘
      </div>
    </div>
  );
};
