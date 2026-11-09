import React from 'react';
import { useCurrentFrame } from 'remotion';
import { cn } from '../../lib/utils';

export interface RadarSweepProps {
  size?: number;
  cx?: number;
  cy?: number;
  color?: string;
  className?: string;
}

export const RadarSweep: React.FC<RadarSweepProps> = ({
  size = 400,
  cx,
  cy,
  color = '#00F5D4',
  className,
}) => {
  const frame = useCurrentFrame();
  const radius = size / 2;

  const sweepAngle = (frame * 2.5) % 360;
  const leadRad = (sweepAngle * Math.PI) / 180;
  const leadX = radius + radius * Math.cos(leadRad);
  const leadY = radius + radius * Math.sin(leadRad);

  const trailSlices = 14;
  const sliceSpanDeg = 3.5;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      x={cx !== undefined ? cx - radius : undefined}
      y={cy !== undefined ? cy - radius : undefined}
      className={cn('pointer-events-none overflow-visible', className)}
      style={{
        position: 'absolute',
        left: cx !== undefined ? cx - radius : undefined,
        top: cy !== undefined ? cy - radius : undefined,
      }}
    >
      <circle
        cx={radius}
        cy={radius}
        r={radius * 0.25}
        fill="none"
        stroke={color}
        strokeWidth={1}
        strokeOpacity={0.15}
      />
      <circle
        cx={radius}
        cy={radius}
        r={radius * 0.5}
        fill="none"
        stroke={color}
        strokeWidth={1}
        strokeOpacity={0.18}
      />
      <circle
        cx={radius}
        cy={radius}
        r={radius * 0.75}
        fill="none"
        stroke={color}
        strokeWidth={1}
        strokeOpacity={0.18}
      />
      <circle
        cx={radius}
        cy={radius}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={1.2}
        strokeOpacity={0.3}
        strokeDasharray="4 4"
      />

      <line
        x1={0}
        y1={radius}
        x2={size}
        y2={radius}
        stroke={color}
        strokeWidth={0.8}
        strokeOpacity={0.2}
        strokeDasharray="3 3"
      />
      <line
        x1={radius}
        y1={0}
        x2={radius}
        y2={size}
        stroke={color}
        strokeWidth={0.8}
        strokeOpacity={0.2}
        strokeDasharray="3 3"
      />

      {Array.from({ length: trailSlices }).map((_, i) => {
        const startDeg = sweepAngle - (i + 1) * sliceSpanDeg;
        const endDeg = sweepAngle - i * sliceSpanDeg;
        const r1 = (startDeg * Math.PI) / 180;
        const r2 = (endDeg * Math.PI) / 180;
        const x1 = radius + radius * Math.cos(r1);
        const y1 = radius + radius * Math.sin(r1);
        const x2 = radius + radius * Math.cos(r2);
        const y2 = radius + radius * Math.sin(r2);
        const d = `M ${radius} ${radius} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;
        const sliceOpacity = 0.26 * Math.pow(1 - i / trailSlices, 1.8);

        return (
          <path
            key={i}
            d={d}
            fill={color}
            fillOpacity={sliceOpacity}
            stroke="none"
          />
        );
      })}

      <line
        x1={radius}
        y1={radius}
        x2={leadX}
        y2={leadY}
        stroke={color}
        strokeWidth={1.5}
        strokeOpacity={0.95}
        style={{ filter: `drop-shadow(0 0 6px ${color})` }}
      />

      <circle
        cx={radius}
        cy={radius}
        r={3}
        fill={color}
        stroke="#080A0F"
        strokeWidth={1}
      />
    </svg>
  );
};
