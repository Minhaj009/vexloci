import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { cn } from '../../lib/utils';

export interface BorderBeamProps {
  size?: number;
  duration?: number;
  borderWidth?: number;
  colorFrom?: string;
  colorTo?: string;
  className?: string;
}

export const BorderBeam: React.FC<BorderBeamProps> = ({
  size = 200,
  duration = 15,
  borderWidth = 1.5,
  colorFrom = '#00F5D4',
  colorTo = '#FF2A54',
  className,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const totalFrames = Math.max(1, Math.round(duration * (fps || 30)));
  const angle = ((frame % totalFrames) / totalFrames) * 360;
  const spread = Math.min(140, Math.max(25, (size / 200) * 60));

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden',
        className
      )}
      style={{
        padding: `${borderWidth}px`,
        WebkitMask:
          'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
      }}
    >
      <div
        className="absolute inset-[-100%] will-change-transform"
        style={{
          transform: `rotate(${angle}deg)`,
          background: `conic-gradient(from 0deg at 50% 50%, transparent 0deg, ${colorFrom} ${spread * 0.4}deg, ${colorTo} ${spread}deg, transparent ${spread + 15}deg, transparent 360deg)`,
        }}
      />
    </div>
  );
};
