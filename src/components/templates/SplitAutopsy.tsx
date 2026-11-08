import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { AlertCircle, CheckCircle2, Split } from 'lucide-react';
import { SceneData, SplitAutopsyPropsSchema } from '../../schemas/timeline.schema';

interface SplitAutopsyProps {
  scene: SceneData;
}

export const SplitAutopsy: React.FC<SplitAutopsyProps> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const props = SplitAutopsyPropsSchema.parse(scene.props);

  const leftProgress = spring({
    frame,
    fps,
    config: { damping: 14, mass: 0.9, stiffness: 90 },
  });

  const rightProgress = spring({
    frame: frame - 10,
    fps,
    config: { damping: 14, mass: 0.9, stiffness: 90 },
  });

  const laserPulse = (Math.sin(frame * 0.15) + 1) / 2;

  return (
    <div
      className="relative w-full h-full flex items-center justify-center p-6"
      style={{ perspective: '1400px', transformStyle: 'preserve-3d' }}
    >
      <div
        className="relative w-[1380px] bg-[#0A0D14] border border-[#1E2536] rounded-xl shadow-[0_30px_70px_rgba(0,0,0,0.95)] p-8 overflow-hidden"
        style={{ transform: 'rotateX(2deg)', transformStyle: 'preserve-3d' }}
      >
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#1E2536]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#07090E] border border-[#1E2536] text-[#00F5D4]">
              <Split className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-widest text-[#94A3B8]">
                FORENSIC BALANCE SHEET DISPARITY // SPLIT AUTOPSY
              </span>
              <h2 className="text-xl font-heading font-bold text-[#F1F5F9]">
                Disclosed Valuation vs Forensic Reality
              </h2>
            </div>
          </div>

          <div className="px-3 py-1 rounded-full bg-[#FF2A54]/15 border border-[#FF2A54]/40 text-[#FF2A54] text-xs font-mono font-bold tracking-wider">
            NET VARIANCE: FATAL IMBALANCE
          </div>
        </div>

        <div className="relative grid grid-cols-2 gap-10 min-h-[420px]">
          <div
            className="will-change-transform"
            style={{
              transform: `translateX(${(1 - Math.max(0, leftProgress)) * -80}px)`,
              opacity: Math.max(0, leftProgress),
            }}
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#00F5D4]/30">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#00F5D4]" />
                <h3 className="text-lg font-heading font-bold text-[#00F5D4]">
                  {props.leftTitle}
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[#94A3B8]">OFFICIAL FILINGS</span>
            </div>

            <div className="space-y-3">
              {props.leftMetrics.map((metric, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg bg-[#0C111C] border border-[#00F5D4]/30 flex items-center justify-between shadow-[0_0_15px_rgba(0,245,212,0.08)]"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded bg-[#00F5D4]/10 border border-[#00F5D4]/30 flex items-center justify-center text-xs font-mono font-bold text-[#00F5D4]">
                      {idx + 1}
                    </span>
                    <span className="font-heading font-medium text-base text-[#F1F5F9]">
                      {metric}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#00F5D4] bg-[#00F5D4]/10 px-2 py-0.5 rounded">
                    VERIFIED
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div
            className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-[2px] bg-gradient-to-b from-transparent via-[#00F5D4] to-[#FF2A54] z-20 pointer-events-none"
            style={{
              boxShadow: `0 0 ${10 + laserPulse * 15}px rgba(0, 245, 212, 0.8)`,
            }}
          />

          <div
            className="will-change-transform"
            style={{
              transform: `translateX(${(1 - Math.max(0, rightProgress)) * 80}px)`,
              opacity: Math.max(0, rightProgress),
            }}
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#FF2A54]/30">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-[#FF2A54]" />
                <h3 className="text-lg font-heading font-bold text-[#FF2A54]">
                  {props.rightTitle}
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[#FF2A54]">FORENSIC AUDIT</span>
            </div>

            <div className="space-y-3">
              {props.rightMetrics.map((metric, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg bg-[#140D15] border border-[#FF2A54]/40 flex items-center justify-between shadow-[0_0_15px_rgba(255,42,84,0.12)]"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded bg-[#FF2A54]/15 border border-[#FF2A54]/40 flex items-center justify-center text-xs font-mono font-bold text-[#FF2A54]">
                      !
                    </span>
                    <span className="font-heading font-medium text-base text-[#F1F5F9]">
                      {metric}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#FF2A54] bg-[#FF2A54]/15 px-2 py-0.5 rounded font-bold">
                    UNCOVERED
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
