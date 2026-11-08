import React, { useId } from 'react';
import { useCurrentFrame } from 'remotion';

export interface FilmGrainOverlayProps {
  opacity?: number;
  blendMode?: 'overlay' | 'screen' | 'soft-light';
  className?: string;
  baseFrequency?: number;
}

export const FilmGrainOverlay: React.FC<FilmGrainOverlayProps> = ({
  opacity = 0.12,
  blendMode = 'overlay',
  className = '',
  baseFrequency = 0.75,
}) => {
  const frame = useCurrentFrame();
  const seed = (frame % 20) + 1;
  const filterId = useId().replace(/:/g, '_') + '_grain_filter';

  return (
    <div
      className={`absolute inset-0 pointer-events-none overflow-hidden select-none z-10 ${className}`}
      style={{
        opacity,
        mixBlendMode: blendMode,
      }}
    >
      <svg
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: `url(#${filterId})` }}
      >
        <defs>
          <filter id={filterId} x="0%" y="0%" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency={baseFrequency}
              numOctaves={3}
              seed={seed}
              stitchTiles="stitch"
            />
            <feColorMatrix
              type="matrix"
              values="0.33 0.33 0.33 0 0
                      0.33 0.33 0.33 0 0
                      0.33 0.33 0.33 0 0
                      0    0    0    1 0"
            />
          </filter>
        </defs>
        <rect width="100%" height="100%" fill="#808080" />
      </svg>
    </div>
  );
};
