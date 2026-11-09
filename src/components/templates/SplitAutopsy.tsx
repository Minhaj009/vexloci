import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { AlertCircle, CheckCircle2, Split, TrendingDown } from 'lucide-react';
import { SceneData, SplitAutopsyPropsSchema } from '../../schemas/timeline.schema';
import { Card, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { BorderBeam } from '../ui/border-beam';

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

  return (
    <div
      className="relative w-full h-full flex items-center justify-center p-6 select-none bg-[#F8FAFC]"
      style={{ perspective: '1400px', transformStyle: 'preserve-3d' }}
    >
      <Card
        className="relative w-[1540px] bg-white border border-slate-200/90 rounded-2xl shadow-[0_4px_24px_rgba(15,23,42,0.04)] text-slate-900 p-7 overflow-hidden mb-12"
        style={{ transform: 'rotateX(2deg)', transformStyle: 'preserve-3d' }}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-4 mb-6 border-b border-slate-200 p-0 space-y-0 text-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-600">
              <Split className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">
                FORENSIC BALANCE SHEET DISPARITY // SPLIT AUTOPSY
              </span>
              <CardTitle className="text-xl font-heading font-bold text-slate-900">
                Disclosed Valuation vs Forensic Reality
              </CardTitle>
            </div>
          </div>

          <Badge
            variant="destructive"
            className="px-3 py-1 font-mono text-xs font-bold tracking-wider"
          >
            NET VARIANCE: FATAL IMBALANCE
          </Badge>
        </CardHeader>

        <div className="relative grid grid-cols-11 gap-4 min-h-[440px]">
          <Card
            className="col-span-5 relative overflow-hidden bg-emerald-50/60 border border-emerald-300 text-emerald-950 p-5 shadow-xs will-change-transform flex flex-col justify-between rounded-2xl"
            style={{
              transform: `translateX(${(1 - Math.max(0, leftProgress)) * -60}px)`,
              opacity: Math.max(0, leftProgress),
            }}
          >
            <BorderBeam
              size={220}
              duration={12}
              colorFrom="#10B981"
              colorTo="#3B82F6"
            />

            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-emerald-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-base font-heading font-bold text-emerald-900">
                    {props.leftTitle}
                  </h3>
                </div>
                <Badge variant="outline" className="text-[10px] bg-white border-emerald-300 text-emerald-700">
                  OFFICIAL FILINGS
                </Badge>
              </div>

              <div className="space-y-2.5">
                {props.leftMetrics.map((metric, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-white border border-emerald-200 text-slate-900 shadow-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded bg-emerald-50 border border-emerald-300 flex items-center justify-center text-xs font-mono font-bold text-emerald-700">
                        {idx + 1}
                      </span>
                      <span className="font-heading font-medium text-sm text-slate-900">
                        {metric}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[9px] py-0 bg-emerald-50 border-emerald-300 text-emerald-700">
                      VERIFIED
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-white border border-emerald-200 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-500">REGULATORY INTEGRITY</span>
              <Badge variant="outline" className="text-[10px] font-bold bg-emerald-50 border-emerald-300 text-emerald-700">
                100% DISCLOSED
              </Badge>
            </div>
          </Card>

          <div className="col-span-1 relative flex items-center justify-center pointer-events-none">
            <div className="w-[1.5px] h-full bg-gradient-to-b from-transparent via-slate-300 to-transparent" />
            <div
              className="absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-blue-600/30 border border-blue-500"
              style={{
                top: `${((frame * 2.5) % 100)}%`,
              }}
            />
          </div>

          <Card
            className="col-span-5 relative overflow-hidden bg-rose-50/60 border border-rose-300 text-rose-950 p-5 shadow-xs will-change-transform flex flex-col justify-between rounded-2xl"
            style={{
              transform: `translateX(${(1 - Math.max(0, rightProgress)) * 60}px)`,
              opacity: Math.max(0, rightProgress),
            }}
          >
            <BorderBeam
              size={220}
              duration={8}
              colorFrom="#DC2626"
              colorTo="#F59E0B"
            />

            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-rose-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                  <h3 className="text-base font-heading font-bold text-rose-900">
                    {props.rightTitle}
                  </h3>
                </div>
                <Badge variant="destructive" className="text-[10px]">
                  FORENSIC AUDIT
                </Badge>
              </div>

              <div className="space-y-2.5">
                {props.rightMetrics.map((metric, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-white border border-rose-200 text-slate-900 shadow-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded bg-rose-50 border border-rose-300 flex items-center justify-center text-xs font-mono font-bold text-rose-700">
                        !
                      </span>
                      <span className="font-heading font-medium text-sm text-slate-900">
                        {metric}
                      </span>
                    </div>
                    <Badge variant="destructive" className="text-[9px] py-0 font-bold">
                      UNCOVERED
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <Card className="mt-4 p-3 rounded-xl bg-white border border-rose-200 flex items-center justify-between text-xs font-mono text-rose-700 shadow-xs">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-rose-600" />
                <span className="font-bold">VARIANCE DELTA</span>
              </div>
              <Badge
                variant="destructive"
                className="font-mono font-black text-xs"
              >
                -$440,000,000 // 100% EROSION
              </Badge>
            </Card>
          </Card>
        </div>
      </Card>
    </div>
  );
};
