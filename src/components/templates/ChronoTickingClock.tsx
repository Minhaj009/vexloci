import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Clock, History } from 'lucide-react';
import { ChronoTickingClockPropsSchema, SceneData } from '../../schemas/timeline.schema';
import { useSceneBeat } from '../director/SceneBeatContext';
import { BorderBeam } from '../ui/border-beam';
import { cn } from '../../lib/utils';

interface ChronoTickingClockProps {
  scene: SceneData;
}

export const ChronoTickingClock: React.FC<ChronoTickingClockProps> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const beatState = useSceneBeat();

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

  const elapsedTotalSec = Math.round(((validEnd - validStart) * progressRatio) / 1000);
  const elapsedMins = Math.floor(elapsedTotalSec / 60).toString().padStart(2, '0');
  const elapsedSecs = (elapsedTotalSec % 60).toString().padStart(2, '0');

  const milestonesCount = props.milestones.length;
  const safeMilestonesCount = Math.max(1, milestonesCount);
  const templateFocus =
    beatState?.beat?.beatType === 'TEMPLATE_STATE'
      ? beatState.beat.templateFocus
      : undefined;
  const activeMilestoneIdx =
    milestonesCount === 0
      ? -1
      : beatState
        ? Math.min(
            milestonesCount - 1,
            Math.max(0, templateFocus?.targetIndex ?? beatState.beatIndex % safeMilestonesCount)
          )
        : -1;

  const sweepAngleDeg = (progressRatio * 360) % 360;
  const sweepRad = (sweepAngleDeg * Math.PI) / 180 - Math.PI / 2;
  const handX = 70 + 48 * Math.cos(sweepRad);
  const handY = 70 + 48 * Math.sin(sweepRad);

  return (
    <div className="w-[1920px] h-[1080px] pt-12 pb-10 bg-[#F8FAFC] flex items-center justify-center select-none relative overflow-hidden font-sans">
      <div className="absolute w-[900px] h-[600px] bg-blue-100/30 rounded-full blur-[140px] pointer-events-none -top-20 left-1/2 -translate-x-1/2" />

      <div className="relative w-[1560px] h-[860px] bg-white border border-slate-300 rounded-3xl shadow-[0_25px_70px_-15px_rgba(15,23,42,0.08),0_0_0_1px_rgba(203,213,225,0.8)] text-slate-900 p-8 overflow-hidden flex flex-col justify-between">
        <div className="flex flex-row items-center justify-between pb-4 mb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 shadow-xs">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase font-bold">
                TEMPORAL DISSECTION // MISSION EVENT SCRUBBER
              </span>
              <h2 className="text-xl font-heading font-extrabold text-slate-900 tracking-tight mt-0.5">
                Chronological Attack Timeline
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-mono font-bold">
              <History
                className="w-4 h-4"
                style={{ transform: `rotate(${(frame * 1.5) % 360}deg)` }}
              />
              <span>TIMELINE SYNCHRONIZED</span>
            </div>
          </div>
        </div>

        <div className="my-3 p-5 rounded-2xl bg-slate-50 border border-slate-300 flex items-center justify-between shadow-xs relative overflow-hidden">
          <div className="flex items-center gap-6">
            <svg width="140" height="140" viewBox="0 0 140 140" className="overflow-visible">
              <circle
                cx="70"
                cy="70"
                r="64"
                fill="#FFFFFF"
                stroke="#CBD5E1"
                strokeWidth="1.5"
              />
              <circle
                cx="70"
                cy="70"
                r="48"
                fill="none"
                stroke="#2563EB"
                strokeWidth="1"
                strokeOpacity="0.25"
                strokeDasharray="3 3"
              />

              {Array.from({ length: 60 }).map((_, i) => {
                const angle = (i * 6 * Math.PI) / 180;
                const isMajor = i % 5 === 0;
                const r1 = isMajor ? 54 : 58;
                const r2 = 62;
                const x1 = 70 + r1 * Math.cos(angle);
                const y1 = 70 + r1 * Math.sin(angle);
                const x2 = 70 + r2 * Math.cos(angle);
                const y2 = 70 + r2 * Math.sin(angle);
                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isMajor ? '#2563EB' : '#CBD5E1'}
                    strokeWidth={isMajor ? 1.8 : 0.9}
                  />
                );
              })}

              <line
                x1="70"
                y1="70"
                x2={handX}
                y2={handY}
                stroke="#2563EB"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              <circle cx="70" cy="70" r="4.5" fill="#D97706" stroke="#FFFFFF" strokeWidth="2" />
            </svg>

            <div>
              <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase font-bold">
                ATOMIC FORENSIC CLOCK // UTC ZERO SKEW
              </span>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="text-xl font-mono font-bold text-slate-500">
                  {formattedDate} //
                </span>
                <span className="text-4xl font-mono font-black text-[#0F172A] tracking-tight">
                  <span className="text-blue-600">{formattedTime.slice(0, 8)}</span>
                  <span className="text-slate-500 text-2xl">{formattedTime.slice(8)}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 font-mono text-xs">
            <span className="px-3 py-1 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold text-[11px]">
              T-ZERO DELTA: +{elapsedMins}:{elapsedSecs}
            </span>
            <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
              progressRatio > 0.7
                ? 'bg-red-50 border border-red-200 text-red-700'
                : 'bg-blue-50 border border-blue-200 text-blue-700'
            }`}>
              PROGRESS: {Math.round(progressRatio * 100)}%
            </span>
          </div>
        </div>

        <div className="relative pt-2">
          <div className="relative w-full h-2 rounded-full bg-slate-100 border border-slate-200 mb-5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 via-amber-500 to-red-600 shadow-xs"
              style={{ width: `${progressRatio * 100}%` }}
            />
          </div>

          <div
            className={cn(
              'grid gap-5',
              props.milestones.length === 4 ? 'grid-cols-4' : 'grid-cols-3'
            )}
          >
            {props.milestones.map((m, idx) => {
              const targetRatio = milestonesCount > 1 ? idx / (milestonesCount - 1) : 0;
              const isReached = progressRatio >= targetRatio - 0.04;
              const isSpotlight = beatState !== null && idx === activeMilestoneIdx;
              const isCurrent = beatState
                ? isSpotlight
                : isReached &&
                  (idx === milestonesCount - 1 ||
                    progressRatio < (idx + 1) / Math.max(1, milestonesCount - 1) - 0.04);

              return (
                <div
                  key={idx}
                  className={cn(
                    'relative overflow-hidden p-4 rounded-2xl border flex flex-col justify-between',
                    isSpotlight
                      ? 'bg-blue-50/90 border-2 border-blue-600 ring-4 ring-blue-500/20 text-slate-900 shadow-[0_14px_34px_-8px_rgba(37,99,235,0.28)]'
                      : isReached
                        ? 'bg-blue-50/55 border border-blue-300 text-slate-900 shadow-xs'
                        : 'bg-white border border-slate-300 text-slate-600'
                  )}
                  style={{ opacity: beatState && !isSpotlight ? 0.78 : 1 }}
                >
                  {isCurrent && (
                    <BorderBeam
                      size={160}
                      duration={6}
                      colorFrom="#2563EB"
                      colorTo="#60A5FA"
                    />
                  )}

                  <div>
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/80">
                      <span
                        className={cn(
                          'text-xs font-mono font-bold',
                          isSpotlight || isReached ? 'text-blue-700' : 'text-slate-500'
                        )}
                      >
                        {m.timeLabel}
                      </span>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-[9px] font-mono font-bold border',
                          isSpotlight
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : isReached
                              ? 'bg-blue-100 text-blue-700 border-blue-300'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                        )}
                      >
                        {isSpotlight
                          ? isReached
                            ? 'ACTIVE // TRIGGERED'
                            : 'ACTIVE FOCUS'
                          : isReached
                            ? 'TRIGGERED'
                            : `MS 0${idx + 1}`}
                      </span>
                    </div>

                    <h4 className="text-sm font-heading font-bold text-slate-900 mb-1">
                      {m.eventTitle}
                    </h4>

                    <p className="text-[11px] font-mono text-slate-600 leading-relaxed">
                      {m.detail}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
