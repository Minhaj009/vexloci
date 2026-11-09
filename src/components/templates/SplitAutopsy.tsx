import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { AlertCircle, CheckCircle2, Split, TrendingDown } from 'lucide-react';
import { SceneData, SplitAutopsyPropsSchema } from '../../schemas/timeline.schema';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
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
      className="relative w-full h-full flex items-center justify-center p-6 select-none"
      style={{ perspective: '1400px', transformStyle: 'preserve-3d' }}
    >
      <Card
        className="relative w-[1540px] bg-[#0A0D14]/95 border-border/80 rounded-2xl shadow-[0_30px_70px_rgba(0,0,0,0.95)] p-7 overflow-hidden mb-12"
        style={{ transform: 'rotateX(2deg)', transformStyle: 'preserve-3d' }}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-4 mb-6 border-b border-border/80 p-0 space-y-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#07090E] border border-border text-primary">
              <Split className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
                FORENSIC BALANCE SHEET DISPARITY // SPLIT AUTOPSY
              </span>
              <CardTitle className="text-xl font-heading font-bold text-foreground">
                Disclosed Valuation vs Forensic Reality
              </CardTitle>
            </div>
          </div>

          <Badge
            variant="destructive"
            className="px-3 py-1 font-mono text-xs font-bold tracking-wider shadow-[0_0_15px_rgba(255,42,84,0.4)]"
          >
            NET VARIANCE: FATAL IMBALANCE
          </Badge>
        </CardHeader>

        <div className="relative grid grid-cols-11 gap-4 min-h-[440px]">
          <Card
            className="col-span-5 relative overflow-hidden bg-[#0A0E17]/90 border-[#00F5D4]/30 p-5 shadow-[0_0_20px_rgba(0,245,212,0.06)] will-change-transform flex flex-col justify-between"
            style={{
              transform: `translateX(${(1 - Math.max(0, leftProgress)) * -60}px)`,
              opacity: Math.max(0, leftProgress),
            }}
          >
            <BorderBeam
              size={220}
              duration={12}
              colorFrom="#00F5D4"
              colorTo="#3B82F6"
            />

            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#00F5D4]/25">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  <h3 className="text-base font-heading font-bold text-primary">
                    {props.leftTitle}
                  </h3>
                </div>
                <Badge variant="cyan" className="text-[10px]">
                  OFFICIAL FILINGS
                </Badge>
              </div>

              <div className="space-y-2.5">
                {props.leftMetrics.map((metric, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-lg bg-[#0C111C] border border-[#00F5D4]/20 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded bg-[#00F5D4]/10 border border-[#00F5D4]/30 flex items-center justify-center text-xs font-mono font-bold text-primary">
                        {idx + 1}
                      </span>
                      <span className="font-heading font-medium text-sm text-foreground">
                        {metric}
                      </span>
                    </div>
                    <Badge variant="cyan" className="text-[9px] py-0">
                      VERIFIED
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-[#0C111C] border border-border flex items-center justify-between text-xs font-mono">
              <span className="text-muted-foreground">REGULATORY INTEGRITY</span>
              <Badge variant="cyan" className="text-[10px] font-bold">
                100% DISCLOSED
              </Badge>
            </div>
          </Card>

          <div className="col-span-1 relative flex items-center justify-center pointer-events-none">
            <div className="w-[2px] h-full bg-gradient-to-b from-transparent via-[#00F5D4] to-[#FF2A54] opacity-80" />

            <div
              className="absolute left-1/2 -translate-x-1/2 w-6 h-6 rounded-full"
              style={{
                top: `${((frame * 2.5) % 100)}%`,
                background: 'radial-gradient(circle, rgba(0,245,212,1) 0%, rgba(255,42,84,0.6) 50%, transparent 80%)',
                filter: 'drop-shadow(0 0 12px rgba(0, 245, 212, 0.9))',
              }}
            />

            <div
              className="absolute left-1/2 -translate-x-1/2 w-20 h-[2px]"
              style={{
                top: `${((frame * 2.5) % 100)}%`,
                background: 'linear-gradient(90deg, transparent, #FFFFFF, transparent)',
                boxShadow: '0 0 15px rgba(0, 245, 212, 0.8)',
              }}
            />
          </div>

          <Card
            className="col-span-5 relative overflow-hidden bg-[#160B12]/90 border-destructive/40 p-5 shadow-[0_0_20px_rgba(255,42,84,0.1)] will-change-transform flex flex-col justify-between"
            style={{
              transform: `translateX(${(1 - Math.max(0, rightProgress)) * 60}px)`,
              opacity: Math.max(0, rightProgress),
            }}
          >
            <BorderBeam
              size={220}
              duration={8}
              colorFrom="#FF2A54"
              colorTo="#F59E0B"
            />

            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-destructive/30">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-destructive" />
                  <h3 className="text-base font-heading font-bold text-destructive">
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
                    className="p-3.5 rounded-lg bg-[#140D15] border border-destructive/30 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded bg-destructive/15 border border-destructive/40 flex items-center justify-center text-xs font-mono font-bold text-destructive">
                        !
                      </span>
                      <span className="font-heading font-medium text-sm text-foreground">
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

            <Card className="mt-4 p-3 rounded-lg bg-[#140D15] border border-destructive/50 flex items-center justify-between text-xs font-mono text-destructive">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-destructive" />
                <span className="font-bold">VARIANCE DELTA</span>
              </div>
              <Badge
                variant="destructive"
                className="font-mono font-black text-xs shadow-[0_0_12px_rgba(255,42,84,0.6)]"
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
