import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Lock, MessageSquare, Mic } from 'lucide-react';
import { CommsInterceptPropsSchema, SceneData } from '../../schemas/timeline.schema';
import { useSceneBeat } from '../director/SceneBeatContext';
import { cn } from '../../lib/utils';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { BorderBeam } from '../ui/border-beam';

interface CommsInterceptProps {
  scene: SceneData;
}

export const CommsIntercept: React.FC<CommsInterceptProps> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const beatState = useSceneBeat();

  const props = CommsInterceptPropsSchema.parse(scene.props);

  const totalFrames = Math.max(1, Math.round(scene.durationSec * fps));
  const messagesCount = props.messages.length;
  const safeMessagesCount = Math.max(1, messagesCount);
  const templateFocus =
    beatState?.beat?.beatType === 'TEMPLATE_STATE'
      ? beatState.beat.templateFocus
      : undefined;
  const activeMessageIdx =
    messagesCount === 0
      ? -1
      : beatState
        ? Math.min(
            messagesCount - 1,
            Math.max(0, templateFocus?.targetIndex ?? beatState.beatIndex % safeMessagesCount)
          )
        : -1;
  const beatStartFrame = beatState?.beat
    ? Math.max(0, Math.round(beatState.beat.startSec * fps))
    : 0;
  const pulseOpacity = 0.55 + 0.45 * Math.sin(frame * 0.25);

  return (
    <div className="w-[1920px] h-[1080px] pt-12 pb-10 bg-[#F8FAFC] flex items-center justify-center select-none relative overflow-hidden font-sans">
      <div className="absolute w-[900px] h-[600px] bg-blue-100/40 rounded-full blur-[140px] pointer-events-none -top-20 left-1/2 -translate-x-1/2" />

      <div className="relative w-[1460px] h-[860px] bg-white border border-slate-300 rounded-3xl shadow-[0_25px_70px_-15px_rgba(15,23,42,0.08),0_0_0_1px_rgba(203,213,225,0.8)] text-slate-900 overflow-hidden flex flex-col justify-between">
        <div className="px-8 py-5 border-b border-slate-200 bg-slate-50 flex flex-row items-center justify-between space-y-0 text-slate-900 z-10">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 shadow-xs">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono tracking-widest text-blue-600 font-bold uppercase bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200/80">
                  {props.platformName.toUpperCase()}
                </span>
                <span className="text-[11px] font-mono text-slate-400">|</span>
                <span className="text-[11px] font-mono text-slate-600 font-medium">
                  {props.channelOrSubject}
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-500 mt-1 flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-[10px] font-mono text-slate-500">
                  E2EE CIPHER // CURVE25519 // SUBPOENA EVIDENCE EX-14
                </span>
              </div>
            </div>
          </div>

          <div className="text-right font-mono text-xs text-slate-500">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 font-bold">
              <span className="w-2 h-2 rounded-full bg-blue-600" style={{ opacity: pulseOpacity }} />
              <span>INTERCEPT ACTIVE</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">KEY: 0x8F9A...B301</div>
          </div>
        </div>

        <div className="p-6 flex-1 flex flex-col justify-center space-y-3.5 bg-slate-50/40 overflow-hidden">
          {props.messages.map((msg, idx) => {
            const rawRevealFrame = Math.min(
              totalFrames - 15,
              Math.round((idx / safeMessagesCount) * (totalFrames - 20))
            );
            const revealFrame =
              beatState && idx <= activeMessageIdx
                ? Math.min(rawRevealFrame, beatStartFrame)
                : rawRevealFrame;
            if (frame < revealFrame) return null;

            const msgProgress = spring({
              frame: frame - revealFrame,
              fps,
              config: { damping: 14, mass: 0.8, stiffness: 120 },
            });

            const isIncriminating = Boolean(msg.highlight) || idx === props.messages.length - 1;
            const isFocusedMsg = beatState ? idx === activeMessageIdx : isIncriminating;
            const isCrimsonFocus =
              isFocusedMsg && (isIncriminating || templateFocus?.highlightMode === 'pulse_fault');
            const isDimmedMsg = Boolean(beatState && activeMessageIdx >= 0 && !isFocusedMsg);
            const cardOpacity = msgProgress * (isDimmedMsg ? 0.72 : 1);

            const audioProgress = interpolate(
              frame,
              [revealFrame + 10, totalFrames],
              [0, 100],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            );

            return (
              <div
                key={idx}
                className="will-change-transform"
                style={{
                  transform: `translateY(${(1 - msgProgress) * 15}px)`,
                  opacity: cardOpacity,
                }}
              >
                <div
                  className={cn(
                    'p-4 rounded-2xl border relative overflow-hidden bg-white shadow-xs',
                    isCrimsonFocus
                      ? 'border-2 border-rose-500 ring-4 ring-rose-500/20 bg-rose-50/50 shadow-md'
                      : isFocusedMsg
                        ? 'border-2 border-blue-500 ring-4 ring-blue-500/20 bg-blue-50/60 shadow-md'
                        : isIncriminating
                          ? 'border border-blue-300 bg-blue-50/30'
                          : 'border border-slate-300 text-slate-900'
                  )}
                >
                  {isFocusedMsg && (
                    <BorderBeam
                      size={180}
                      duration={10}
                      borderWidth={1.5}
                      colorFrom={isCrimsonFocus ? '#DC2626' : '#2563EB'}
                      colorTo={isCrimsonFocus ? '#F59E0B' : '#60A5FA'}
                    />
                  )}

                  <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-200/80">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-7 h-7 border border-slate-300 bg-slate-100">
                        <AvatarFallback className="text-xs font-mono font-bold text-blue-700 bg-transparent">
                          {msg.sender.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="text-sm font-heading font-bold text-slate-900">
                          {msg.sender}
                        </span>
                        <span className="ml-2 px-1.5 py-0.5 text-[10px] font-mono text-slate-600 bg-slate-100 rounded border border-slate-200">
                          {msg.role}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs font-mono text-slate-500 font-semibold">
                      {msg.time}
                    </div>
                  </div>

                  <p
                    className="font-serif text-base leading-relaxed text-slate-900 my-1"
                    style={{ fontSize: `${17 * (props.fontScale ?? 1)}px` }}
                  >
                    {msg.body}
                  </p>

                  {isIncriminating && (
                    <div className="mt-2.5 pt-2.5 border-t border-blue-200">
                      <div className="flex items-center justify-between text-xs font-mono text-blue-700 mb-1.5">
                        <div className="flex items-center gap-2">
                          <Mic className="w-3.5 h-3.5" style={{ opacity: pulseOpacity }} />
                          <span className="font-bold">VOICE SYNTHESIS & WIRETAP DECRYPTION</span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-bold">
                          {Math.round(audioProgress)}% COMPLETE
                        </span>
                      </div>

                      <div className="relative flex items-center gap-1 h-8 px-2 rounded-lg bg-white border border-blue-200">
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-blue-600 z-10"
                          style={{ left: `${audioProgress}%` }}
                        />
                        {Array.from({ length: 48 }).map((_, barIdx) => {
                          const base = Math.sin(frame * 0.25 + barIdx * 0.35);
                          const harmonic = Math.cos(frame * 0.45 + barIdx * 0.7) * 0.5;
                          const peak = Math.sin(frame * 0.1 + barIdx * 0.15) * 0.3;
                          const barHeight = Math.max(
                            4,
                            Math.min(22, Math.abs(base + harmonic + peak) * 18 + 4)
                          );
                          const isPlayed = (barIdx / 48) * 100 <= audioProgress;

                          return (
                            <div
                              key={barIdx}
                              className="flex-1 flex flex-col justify-center items-center h-full"
                            >
                              <div
                                className="w-full rounded-full"
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
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
