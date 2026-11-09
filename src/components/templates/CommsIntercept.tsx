import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Lock, MessageSquare, Mic } from 'lucide-react';
import { CommsInterceptPropsSchema, SceneData } from '../../schemas/timeline.schema';
import { cn } from '../../lib/utils';
import { Card, CardHeader } from '../ui/card';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { BorderBeam } from '../ui/border-beam';

interface CommsInterceptProps {
  scene: SceneData;
}

export const CommsIntercept: React.FC<CommsInterceptProps> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const props = CommsInterceptPropsSchema.parse(scene.props);

  const totalFrames = Math.max(1, Math.round(scene.durationSec * fps));
  const messagesCount = props.messages.length;

  return (
    <div
      className="relative w-full h-full flex items-center justify-center p-6 bg-[#F8FAFC]"
      style={{ perspective: '1400px', transformStyle: 'preserve-3d' }}
    >
      <Card
        className="relative w-[1340px] bg-white border border-slate-200/90 rounded-2xl shadow-[0_4px_24px_rgba(15,23,42,0.04)] text-slate-900 overflow-hidden"
        style={{ transform: 'rotateX(2deg)', transformStyle: 'preserve-3d' }}
      >
        <CardHeader className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-row items-center justify-between space-y-0 text-slate-900">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-600">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="cyan" className="font-bold">
                  {props.platformName.toUpperCase()} ENCRYPTED INTERCEPT
                </Badge>
                <Badge variant="secondary" className="font-mono text-slate-600">
                  {props.channelOrSubject}
                </Badge>
              </div>
              <div className="text-[11px] font-mono text-slate-500 mt-1 flex items-center gap-2">
                <Lock className="w-3 h-3 text-blue-600" />
                <Badge variant="outline" className="text-[10px] font-mono border-slate-200 py-0 text-slate-600">
                  E2EE CIPHER // CURVE25519 // SUBPOENA EVIDENCE EX-14
                </Badge>
              </div>
            </div>
          </div>

          <div className="text-right font-mono text-xs text-slate-500">
            <Badge variant="default" className="flex items-center gap-2 border-blue-200 bg-blue-50 text-blue-700">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              <span>INTERCEPT ACTIVE</span>
            </Badge>
            <div className="text-[10px] text-slate-400 mt-1">KEY: 0x8F9A...B301</div>
          </div>
        </CardHeader>

        <div className="p-8 space-y-5 min-h-[440px] bg-slate-50/40">
          {props.messages.map((msg, idx) => {
            const revealFrame = Math.min(
              totalFrames - 15,
              Math.round((idx / messagesCount) * (totalFrames - 20))
            );
            if (frame < revealFrame) return null;

            const msgProgress = spring({
              frame: frame - revealFrame,
              fps,
              config: { damping: 14, mass: 0.8, stiffness: 120 },
            });

            const isIncriminating = Boolean(msg.highlight) || idx === props.messages.length - 1;

            const audioProgress = interpolate(
              frame,
              [revealFrame + 10, totalFrames],
              [0, 100],
              { extrapolateRight: 'clamp' }
            );

            return (
              <div
                key={idx}
                className="transition-all duration-300 will-change-transform"
                style={{
                  transform: `translateY(${(1 - msgProgress) * 20}px) ${
                    isIncriminating ? 'translateZ(50px) scale(1.02)' : 'translateZ(0px)'
                  }`,
                  opacity: msgProgress,
                  transformStyle: 'preserve-3d',
                }}
              >
                <Card
                  className={cn(
                    'p-5 rounded-2xl border transition-all relative overflow-hidden',
                    isIncriminating
                      ? 'bg-blue-50/70 border-2 border-blue-400 text-slate-900 shadow-md'
                      : 'bg-white border border-slate-200 text-slate-900 shadow-xs'
                  )}
                >
                  {isIncriminating && (
                    <BorderBeam
                      size={180}
                      duration={10}
                      borderWidth={1.5}
                      colorFrom="#2563EB"
                      colorTo="#60A5FA"
                    />
                  )}

                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/80">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-7 h-7 border-slate-200 bg-slate-100">
                        <AvatarFallback className="text-xs font-mono font-bold text-blue-700 bg-transparent">
                          {msg.sender.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="text-sm font-heading font-bold text-slate-900">
                          {msg.sender}
                        </span>
                        <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-[10px] font-mono text-slate-600 bg-slate-100">
                          {msg.role}
                        </Badge>
                      </div>
                    </div>

                    <div className="text-xs font-mono text-slate-500">
                      {msg.time}
                    </div>
                  </div>

                  <p
                    className="font-serif text-lg leading-relaxed text-slate-900 my-2"
                    style={{ fontSize: `${18 * (props.fontScale ?? 1)}px` }}
                  >
                    {msg.body}
                  </p>

                  {isIncriminating && (
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <div className="flex items-center justify-between text-xs font-mono text-blue-700 mb-2">
                        <div className="flex items-center gap-2">
                          <Mic className="w-3.5 h-3.5 animate-pulse" />
                          <span>VOICE SYNTHESIS & WIRETAP DECRYPTION</span>
                        </div>
                        <span className="text-[11px] text-slate-500">
                          {Math.round(audioProgress)}% COMPLETE
                        </span>
                      </div>

                      <div className="relative flex items-center gap-1 h-9 px-2 rounded-lg bg-white border border-blue-200">
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-blue-600 transition-all z-10"
                          style={{ left: `${audioProgress}%` }}
                        />
                        {Array.from({ length: 48 }).map((_, barIdx) => {
                          const base = Math.sin(frame * 0.25 + barIdx * 0.35);
                          const harmonic = Math.cos(frame * 0.45 + barIdx * 0.7) * 0.5;
                          const peak = Math.sin(frame * 0.1 + barIdx * 0.15) * 0.3;
                          const barHeight = Math.max(
                            4,
                            Math.min(28, Math.abs(base + harmonic + peak) * 22 + 4)
                          );
                          const isPlayed = (barIdx / 48) * 100 <= audioProgress;

                          return (
                            <div
                              key={barIdx}
                              className="flex-1 flex flex-col justify-center items-center h-full"
                            >
                              <div
                                className="w-full rounded-full transition-all duration-75"
                                style={{
                                  height: `${barHeight}px`,
                                  backgroundColor: isPlayed ? '#2563EB' : '#E2E8F0',
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
