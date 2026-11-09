import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

export interface NumberTickerProps {
  value: number;
  startValue?: number;
  startFrame?: number;
  durationFrames?: number;
  prefix?: string;
  suffix?: string;
  decimalPlaces?: number;
  className?: string;
}

export const NumberTicker: React.FC<NumberTickerProps> = ({
  value,
  startValue = 0,
  startFrame = 0,
  durationFrames = 45,
  prefix = '',
  suffix = '',
  decimalPlaces = 0,
  className = '',
}) => {
  const frame = useCurrentFrame();

  const currentValue = interpolate(
    frame,
    [startFrame, startFrame + Math.max(1, durationFrames)],
    [startValue, value],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  const formatted =
    decimalPlaces > 0
      ? currentValue.toLocaleString(undefined, {
          minimumFractionDigits: decimalPlaces,
          maximumFractionDigits: decimalPlaces,
        })
      : Math.round(currentValue).toLocaleString();

  return (
    <span className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
};
