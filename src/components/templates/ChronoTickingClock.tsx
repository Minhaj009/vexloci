import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Clock, History } from 'lucide-react';
import { ChronoTickingClockPropsSchema, SceneData } from '../../schemas/timeline.schema';

interface ChronoTickingClockProps {
  scene: SceneData;
}

export const ChronoTickingClock: React.FC<ChronoTickingClockProps> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const props = ChronoTickingClockPropsSchema.parse(scene.props);

  const totalFrames = Math.max(1, Math.round(scene.durationSec * fps));

  const startDate = new Date(props.startIsoTime).getTime();
  const endDate = new Date(props.endIsoTime).getTime();
  const validStart = isNaN(startDate) ? 1343827800000 : startDate;
  const validEnd = isNaN(endDate) ? 1343830500000 : endDate;

  const progressRatio = interpolate(frame, [0, totalFrames], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const currentMillis = Math.round(validStart + (validEnd - validStart) * progressRatio);
  const curDate = new Date(currentMillis);

  const year = curDate.getUTCFullYear();
  const month = (curDate.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = curDate.getUTCDate().toString().padStart(2, '0');
  const hours = curDate.getUTCHours().toString().padStart(2, '0');
  const mins = curDate.getUTCMinutes().toString().padStart(2, '0');
  const secs = curDate.getUTCSeconds().toString().padStart(2, '0');
  const ms = curDate.getUTCMilliseconds().toString().padStart(3, '0');

  const formattedDate = `${year}-${month}-${day}`;
  const formattedTime = `${hours}:${mins}:${secs}.${ms} UTC`;

  const milestonesCount = props.milestones.length;

  return (
    <div
      className="relative w-full h-full flex items-center justify-center p-6"
      style={{ perspective: '1400px', transformStyle: 'preserve-3d' }}
    >
      <div
        className="relative w-[1380px] bg-[#0A0D14] border border-[#1E2536] rounded-xl shadow-[0_30px_70px_rgba(0,0,0,0.95)] p-8 overflow-hidden"
        style={{ transform: 'rotateX(3deg)' }}
      >
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#1E2536]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#07090E] border border-[#1E2536] text-[#00F5D4]">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-widest text-[#94A3B8]">
                TEMPORAL DISSECTION // MISSION EVENT SCRUBBER
              </span>
              <h2 className="text-xl font-heading font-bold text-[#F1F5F9]">
                Chronological Attack Timeline
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-[#00F5D4]">
            <History className="w-4 h-4 animate-spin" style={{ animationDuration: '10s' }} />
            <span>TIMELINE SYNCHRONIZED</span>
          </div>
        </div>

        <div className="my-6 p-8 rounded-xl bg-[#06080D] border-2 border-[#1E2536] flex flex-col items-center justify-center text-center shadow-inner relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none hud-grid" />
          <span className="text-xs font-mono tracking-widest text-[#94A3B8] mb-2 uppercase">
            ATOMIC FORENSIC CLOCK // ZERO SKEW
          </span>
          <div className="flex items-baseline gap-4">
            <span className="text-2xl font-mono font-bold text-[#94A3B8]">
              {formattedDate} //
            </span>
            <span className="text-5xl font-mono font-black text-[#00F5D4] drop-shadow-[0_0_20px_rgba(0,245,212,0.7)] tracking-tight">
              {formattedTime}
            </span>
          </div>
        </div>

        <div className="relative pt-6">
          <div className="relative w-full h-2 rounded-full bg-[#11151F] border border-[#1E2536] mb-8 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#00F5D4] to-[#FF2A54] shadow-[0_0_10px_#00F5D4]"
              style={{ width: `${progressRatio * 100}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-6">
            {props.milestones.map((m, idx) => {
              const targetRatio = milestonesCount > 1 ? idx / (milestonesCount - 1) : 0;
              const isReached = progressRatio >= targetRatio - 0.05;

              return (
                <div
                  key={idx}
                  className={`p-5 rounded-xl border transition-all duration-300 ${
                    isReached
                      ? 'bg-[#0E1524] border-[#00F5D4] shadow-[0_0_25px_rgba(0,245,212,0.25)] scale-102'
                      : 'bg-[#080B12] border-[#1E2536] opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1E2536]">
                    <span
                      className={`text-xs font-mono font-bold ${
                        isReached ? 'text-[#00F5D4]' : 'text-[#94A3B8]'
                      }`}
                    >
                      {m.timeLabel}
                    </span>
                    <span className="text-[10px] font-mono text-[#94A3B8]">
                      MILESTONE 0{idx + 1}
                    </span>
                  </div>

                  <h4 className="text-base font-heading font-bold text-[#F1F5F9] mb-1">
                    {m.eventTitle}
                  </h4>

                  <p className="text-xs font-mono text-[#94A3B8] leading-relaxed">
                    {m.detail}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
