import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Lock, MessageSquare, Mic, ShieldAlert } from 'lucide-react';
import { CommsInterceptPropsSchema, SceneData } from '../../schemas/timeline.schema';

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
      className="relative w-full h-full flex items-center justify-center p-6"
      style={{ perspective: '1400px', transformStyle: 'preserve-3d' }}
    >
      <div
        className="relative w-[1340px] bg-[#0A0D14] border border-[#1E2536] rounded-xl shadow-[0_30px_70px_rgba(0,0,0,0.95)] overflow-hidden"
        style={{ transform: 'rotateX(2deg)', transformStyle: 'preserve-3d' }}
      >
        <div className="bg-[#080A0F] px-6 py-4 border-b border-[#1E2536] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-[#0E131F] border border-[#1E2536] text-[#00F5D4]">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#00F5D4]/15 border border-[#00F5D4]/40 text-[#00F5D4]">
                  {props.platformName.toUpperCase()} ENCRYPTED INTERCEPT
                </span>
                <span className="text-xs font-mono text-[#94A3B8]">
                  {props.channelOrSubject}
                </span>
              </div>
              <div className="text-[11px] font-mono text-[#94A3B8]/70 mt-0.5 flex items-center gap-2">
                <Lock className="w-3 h-3 text-[#00F5D4]" />
                <span>E2EE CIPHER // CURVE25519 // SUBPOENA EVIDENCE EX-14</span>
              </div>
            </div>
          </div>

          <div className="text-right font-mono text-xs text-[#94A3B8]">
            <div className="flex items-center gap-2 text-[#00F5D4]">
              <span className="w-2 h-2 rounded-full bg-[#00F5D4] animate-pulse" />
              <span>INTERCEPT ACTIVE</span>
            </div>
            <span className="text-[10px] text-[#94A3B8]/60">KEY: 0x8F9A...B301</span>
          </div>
        </div>

        <div className="p-8 space-y-5 min-h-[440px] bg-[#080A0F]/80">
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
                <div
                  className={`p-5 rounded-xl border backdrop-blur-md transition-all ${
                    isIncriminating
                      ? 'bg-[#0E1422] border-[#00F5D4] shadow-[0_0_35px_rgba(0,245,212,0.35)]'
                      : 'bg-[#0B0F17] border-[#1E2536]'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1E2536]">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-[#161B28] border border-[#1E2536] flex items-center justify-center text-xs font-mono font-bold text-[#00F5D4]">
                        {msg.sender.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="text-sm font-heading font-bold text-[#F1F5F9]">
                          {msg.sender}
                        </span>
                        <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#11151F] text-[#94A3B8]">
                          {msg.role}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs font-mono text-[#94A3B8]">
                      {msg.time}
                    </div>
                  </div>

                  <p
                    className="font-serif text-lg leading-relaxed text-[#F1F5F9]/95 my-2"
                    style={{ fontSize: `${18 * (props.fontScale ?? 1)}px` }}
                  >
                    {msg.body}
                  </p>

                  {isIncriminating && (
                    <div className="mt-3 pt-3 border-t border-[#00F5D4]/20">
                      <div className="flex items-center justify-between text-xs font-mono text-[#00F5D4] mb-2">
                        <div className="flex items-center gap-2">
                          <Mic className="w-3.5 h-3.5 animate-pulse" />
                          <span>VOICE SYNTHESIS & WIRETAP DECRYPTION</span>
                        </div>
                        <span className="text-[11px] text-[#94A3B8]">
                          {Math.round(audioProgress)}% COMPLETE
                        </span>
                      </div>

                      <div className="flex items-center gap-1 h-6">
                        {Array.from({ length: 36 }).map((_, barIdx) => {
                          const barHeight = Math.max(
                            4,
                            Math.sin((frame * 0.2) + barIdx * 0.4) * 16 + 8
                          );
                          const isPlayed = (barIdx / 36) * 100 <= audioProgress;

                          return (
                            <div
                              key={barIdx}
                              className="flex-1 rounded-full transition-all duration-75"
                              style={{
                                height: `${barHeight}px`,
                                backgroundColor: isPlayed ? '#00F5D4' : '#1E2536',
                                boxShadow: isPlayed ? '0 0 6px rgba(0, 245, 212, 0.6)' : undefined,
                              }}
                            />
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
