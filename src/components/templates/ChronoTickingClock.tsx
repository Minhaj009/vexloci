import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Clock, History } from 'lucide-react';
import { ChronoTickingClockPropsSchema, SceneData } from '../../schemas/timeline.schema';
import { Card, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { BorderBeam } from '../ui/border-beam';
import { cn } from '../../lib/utils';

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

  const elapsedTotalSec = Math.round(((validEnd - validStart) * progressRatio) / 1000);
  const elapsedMins = Math.floor(elapsedTotalSec / 60).toString().padStart(2, '0');
  const elapsedSecs = (elapsedTotalSec % 60).toString().padStart(2, '0');

  const milestonesCount = props.milestones.length;

  const sweepAngleDeg = (progressRatio * 360) % 360;
  const sweepRad = (sweepAngleDeg * Math.PI) / 180 - Math.PI / 2;
  const handX = 70 + 48 * Math.cos(sweepRad);
  const handY = 70 + 48 * Math.sin(sweepRad);

  return (
    <div
      className="relative w-full h-full flex items-center justify-center p-6 select-none bg-[#F8FAFC]"
      style={{ perspective: '1400px', transformStyle: 'preserve-3d' }}
    >
      <Card
        className="relative w-[1540px] bg-white border border-slate-200/90 rounded-2xl shadow-[0_4px_24px_rgba(15,23,42,0.04)] text-slate-900 p-7 overflow-hidden mb-12"
        style={{ transform: 'rotateX(3deg)' }}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-4 mb-4 border-b border-slate-200 p-0 space-y-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-600">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">
                TEMPORAL DISSECTION // MISSION EVENT SCRUBBER
              </span>
              <CardTitle className="text-xl font-heading font-bold text-slate-900">
                Chronological Attack Timeline
              </CardTitle>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="cyan" className="flex items-center gap-1.5 text-xs font-mono font-bold">
              <History className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '8s' }} />
              <span>TIMELINE SYNCHRONIZED</span>
            </Badge>
          </div>
        </CardHeader>

        <Card className="my-4 p-5 rounded-xl bg-slate-50/80 border border-slate-200 flex items-center justify-between shadow-xs relative overflow-hidden">
          <div className="flex items-center gap-5">
            <svg width="140" height="140" viewBox="0 0 140 140" className="overflow-visible">
              <circle
                cx="70"
                cy="70"
                r="64"
                fill="#F8FAFC"
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
                strokeWidth="2.2"
              />

              <circle cx="70" cy="70" r="4" fill="#D97706" stroke="#FFFFFF" strokeWidth="1.5" />
            </svg>

            <div>
              <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">
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

          <div className="flex flex-col items-end gap-1.5 font-mono text-xs">
            <Badge variant="mono" className="text-[10px] font-mono">
              T-ZERO DELTA: +{elapsedMins}:{elapsedSecs}
            </Badge>
            <Badge
              variant={progressRatio > 0.7 ? 'destructive' : 'cyan'}
              className="text-xs font-mono font-bold"
            >
              PROGRESS: {Math.round(progressRatio * 100)}%
            </Badge>
          </div>
        </Card>

        <div className="relative pt-2">
          <div className="relative w-full h-2 rounded-full bg-slate-100 border border-slate-200 mb-6 overflow-hidden">
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
              const isCurrent =
                isReached &&
                (idx === milestonesCount - 1 ||
                  progressRatio < (idx + 1) / (milestonesCount - 1) - 0.04);

              return (
                <Card
                  key={idx}
                  className={cn(
                    'relative overflow-hidden p-4 rounded-xl border transition-all duration-300 flex flex-col justify-between',
                    isReached
                      ? 'bg-blue-50/70 border-blue-300 text-slate-900 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 opacity-75'
                  )}
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
                          isReached ? 'text-blue-700' : 'text-slate-500'
                        )}
                      >
                        {m.timeLabel}
                      </span>
                      <Badge
                        variant={isReached ? 'cyan' : 'mono'}
                        className="text-[9px] py-0"
                      >
                        {isReached ? 'TRIGGERED' : `MS 0${idx + 1}`}
                      </Badge>
                    </div>

                    <h4 className="text-sm font-heading font-bold text-slate-900 mb-1">
                      {m.eventTitle}
                    </h4>

                    <p className="text-[11px] font-mono text-slate-600 leading-relaxed">
                      {m.detail}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
};
