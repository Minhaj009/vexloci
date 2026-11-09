import React from 'react';
import { SceneData, TimelineData } from '../../schemas/timeline.schema';

interface ForensicHUDProps {
  scene: SceneData;
  timeline: TimelineData;
}

export const ForensicHUD: React.FC<ForensicHUDProps> = () => {
  return (
    <div className="absolute inset-0 pointer-events-none z-40 select-none overflow-hidden">
      <div className="absolute top-8 left-8 text-[#94A3B8]/30 font-mono text-xl select-none leading-none">
        ┌
      </div>
      <div className="absolute top-8 right-8 text-[#94A3B8]/30 font-mono text-xl select-none leading-none">
        ┐
      </div>
      <div className="absolute bottom-8 left-8 text-[#94A3B8]/30 font-mono text-xl select-none leading-none">
        └
      </div>
      <div className="absolute bottom-8 right-8 text-[#94A3B8]/30 font-mono text-xl select-none leading-none">
        ┘
      </div>
    </div>
  );
};
