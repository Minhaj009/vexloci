import React, { useMemo } from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { AlertOctagon, Cpu, Radio, Terminal as TerminalIcon } from 'lucide-react';
import { SceneData, TerminalReplayPropsSchema } from '../../schemas/timeline.schema';

interface TerminalReplayProps {
  scene: SceneData;
}

export const TerminalReplay: React.FC<TerminalReplayProps> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const props = TerminalReplayPropsSchema.parse(scene.props);

  const faultEvent = useMemo(
    () => scene.microEvents.find((e) => e.action === 'PULSE_FAULT'),
    [scene.microEvents]
  );

  const isFault = faultEvent && frame >= Math.round(faultEvent.triggerOffsetSec * fps);
  let faultProgress = 0;
  if (faultEvent && frame >= Math.round(faultEvent.triggerOffsetSec * fps)) {
    const triggerFrame = Math.round(faultEvent.triggerOffsetSec * fps);
    faultProgress = spring({
      frame: frame - triggerFrame,
      fps,
      config: { damping: 12, mass: 0.8, stiffness: 120 },
    });
  }

  const cursorVisible = Math.floor(frame / 15) % 2 === 0;
  const totalFrames = Math.max(1, Math.round(scene.durationSec * fps));
  const linesCount = props.lines.length;

  const baseOrders = interpolate(frame, [0, totalFrames], [124590, 245000], {
    extrapolateRight: 'clamp',
  });
  const currentOrders = Math.round(
    isFault
      ? interpolate(faultProgress, [0, 1], [baseOrders, 840200]) +
          Math.sin(frame * 1.5) * 4500
      : baseOrders + Math.sin(frame * 0.8) * 800
  );

  const loadFactor = isFault ? 0.95 + Math.sin(frame * 0.5) * 0.04 : 0.45 + (frame / totalFrames) * 0.25;

  const isSwiftHost =
    props.hostname.toLowerCase().includes('dhaka') ||
    props.hostname.toLowerCase().includes('swift') ||
    props.filePath.toLowerCase().includes('swift');

  const telemetryTitle =
    props.telemetryTitle ||
    (isSwiftHost
      ? 'SWIFT ALLIANCE TELEMETRY // SAA-01'
      : 'CORE TELEMETRY // ROUTER 08');

  const metricLabel =
    props.metricLabel ||
    (isSwiftHost ? 'MT103 TRANSACTION VOLUME' : 'ORDERS / SEC (EXECUTION RATE)');

  const baselineLabel =
    props.baselineLabel ||
    (isSwiftHost ? 'BASELINE: 140 TX/HR' : 'BASELINE: 124,590');

  const peakLabel =
    props.peakLabel ||
    (isSwiftHost ? 'MAX PEAK: 35 ORDERS ($951M)' : 'MAX PEAK: 840,200');

  const pipelineLabel =
    props.pipelineLabel ||
    (isSwiftHost ? 'SAA ORACLE DLL HOOK PIPELINE' : 'SMARS ALGORITHMIC PIPELINE');

  const queueLabel =
    props.queueLabel ||
    (isSwiftHost ? 'FEDWIRE NY INGESTION QUEUE' : 'NYSE FIX INGESTION QUEUE');

  const metricDisplay = isSwiftHost
    ? (isFault ? '$951,000,000' : '$81,000,000')
    : currentOrders.toLocaleString();

  return (
    <div
      className="relative w-full h-full flex items-center justify-center p-6"
      style={{ perspective: '1400px', transformStyle: 'preserve-3d' }}
    >
      <div
        className="relative w-[1420px] bg-[#0A0D14] border border-[#1E2536] rounded-xl shadow-[0_30px_70px_rgba(0,0,0,0.95)] overflow-hidden"
        style={{
          transform: 'rotateY(8deg)',
          transformStyle: 'preserve-3d',
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none z-30"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 45%)',
          }}
        />

        <div className="bg-[#080A0F] px-5 py-3 border-b border-[#1E2536] flex items-center justify-between z-20 relative">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#FF5F56]" />
              <span className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
              <span className="w-3 h-3 rounded-full bg-[#27C93F]" />
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#94A3B8] ml-4">
              <TerminalIcon className="w-3.5 h-3.5 text-[#00F5D4]" />
              <span>{props.hostname}</span>
              <span className="text-[#1E2536]">:</span>
              <span className="text-[#00F5D4]/90">{props.filePath}</span>
            </div>
          </div>
          <div className="text-[11px] font-mono text-[#94A3B8] flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[#00F5D4]">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              LIVE TELEMETRY FEED
            </span>
            <span className="text-[#1E2536]">|</span>
            <span className="px-1.5 py-0.5 rounded bg-[#11151F] border border-[#1E2536]">
              SSH-2.0-OpenSSH_7.4
            </span>
          </div>
        </div>

        {faultProgress > 0 && (
          <div
            className="border-b border-[#FF2A54] bg-[#FF2A54]/20 px-6 py-2.5 flex items-center gap-3 text-[#FF2A54] font-mono text-xs font-bold tracking-wider z-20 relative"
            style={{
              opacity: faultProgress,
              transform: `translateY(${(1 - faultProgress) * -15}px)`,
              boxShadow: '0 0 25px rgba(255,42,84,0.4)',
            }}
          >
            <AlertOctagon className="w-5 h-5 animate-pulse text-[#FF2A54]" />
            <span className="drop-shadow-[0_0_8px_rgba(255,42,84,0.8)]">
              {faultEvent?.payloadText || 'CRITICAL FAULT: UNCONTROLLED HIGH-FREQUENCY LOOP DETECTED'}
            </span>
          </div>
        )}

        <div className="grid grid-cols-12 min-h-[460px] relative z-10">
          <div
            className="col-span-7 p-6 font-mono text-sm leading-relaxed border-r border-[#1E2536] bg-[#07090E]/90"
            style={{
              fontSize: `${13.5 * (props.fontScale ?? 1)}px`,
              textShadow: '0 0 10px rgba(0, 245, 212, 0.45)',
            }}
          >
            {props.lines.map((line, idx) => {
              const lineRevealFrame = Math.min(
                totalFrames - 15,
                Math.round((idx / linesCount) * (totalFrames - 25))
              );
              if (frame < lineRevealFrame) {
                return null;
              }

              let typedText = line.text;
              if (line.type === 'cmd') {
                const chars = Math.max(0, Math.floor((frame - lineRevealFrame) * 1.8));
                typedText = line.text.slice(0, chars);
              }

              let textClass = 'text-[#94A3B8]';
              let prefix = ' ';
              if (line.type === 'cmd') {
                textClass = 'text-[#00F5D4] font-semibold';
                prefix = '$ ';
              } else if (line.type === 'error') {
                textClass = 'text-[#FF2A54] font-bold drop-shadow-[0_0_8px_rgba(255,42,84,0.7)]';
                prefix = '! ';
              } else if (line.type === 'diff_add') {
                textClass = 'text-[#00F5D4] font-medium';
                prefix = '+ ';
              } else if (line.type === 'diff_del') {
                textClass = 'text-[#FF2A54]/80 font-medium line-through';
                prefix = '- ';
              }

              const isLastVisibleLine =
                idx === props.lines.length - 1 ||
                (idx < props.lines.length - 1 &&
                  frame < Math.min(totalFrames - 15, Math.round(((idx + 1) / linesCount) * (totalFrames - 25))));

              return (
                <div key={idx} className="flex items-start gap-3 mb-1.5">
                  <span className="w-7 text-right text-[#94A3B8]/30 select-none text-xs">
                    {(idx + 1).toString().padStart(2, '0')}
                  </span>
                  <span className="font-mono text-[#00F5D4]/70 select-none">{prefix}</span>
                  <span className={`flex-1 break-all ${textClass}`}>
                    {typedText}
                    {isLastVisibleLine && cursorVisible && (
                      <span className="inline-block w-2 h-4 ml-1 bg-[#00F5D4] align-middle shadow-[0_0_8px_#00F5D4]" />
                    )}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="col-span-5 p-6 bg-[#090C13] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1E2536]">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#94A3B8]">
                  <Cpu className="w-4 h-4 text-[#00F5D4]" />
                  <span>{telemetryTitle}</span>
                </div>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    isFault
                      ? 'bg-[#FF2A54]/20 border-[#FF2A54] text-[#FF2A54] animate-pulse'
                      : 'bg-[#00F5D4]/10 border-[#00F5D4]/40 text-[#00F5D4]'
                  }`}
                >
                  {isFault ? 'FLOOD DETECTED' : 'NOMINAL LOAD'}
                </span>
              </div>

              <div className="p-4 rounded-lg bg-[#06080C] border border-[#1E2536] mb-5">
                <div className="text-[11px] font-mono tracking-widest text-[#94A3B8]">
                  {metricLabel}
                </div>
                <div
                  className={`text-3xl font-mono font-black mt-1 tracking-tight ${
                    isFault
                      ? 'text-[#FF2A54] drop-shadow-[0_0_15px_rgba(255,42,84,0.8)]'
                      : 'text-[#00F5D4] drop-shadow-[0_0_10px_rgba(0,245,212,0.6)]'
                  }`}
                >
                  {metricDisplay}
                </div>
                <div className="text-[10px] font-mono text-[#94A3B8]/60 mt-1 flex items-center justify-between">
                  <span>{baselineLabel}</span>
                  <span>{peakLabel}</span>
                </div>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div>
                  <div className="flex justify-between text-[#94A3B8] text-[11px] mb-1">
                    <span>{pipelineLabel}</span>
                    <span className={isFault ? 'text-[#FF2A54] font-bold' : 'text-[#00F5D4]'}>
                      {Math.round(loadFactor * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded bg-[#11151F] overflow-hidden border border-[#1E2536]">
                    <div
                      className={`h-full transition-all duration-100 ${
                        isFault ? 'bg-[#FF2A54] shadow-[0_0_8px_#FF2A54]' : 'bg-[#00F5D4]'
                      }`}
                      style={{ width: `${Math.min(100, Math.round(loadFactor * 100))}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[#94A3B8] text-[11px] mb-1">
                    <span>{queueLabel}</span>
                    <span className={isFault ? 'text-[#FF2A54] font-bold' : 'text-[#00F5D4]'}>
                      {isFault ? '100% (OVERFLOW)' : '38%'}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded bg-[#11151F] overflow-hidden border border-[#1E2536]">
                    <div
                      className={`h-full transition-all duration-100 ${
                        isFault ? 'bg-[#FF2A54] shadow-[0_0_8px_#FF2A54]' : 'bg-[#00F5D4]'
                      }`}
                      style={{ width: isFault ? '100%' : '38%' }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[#94A3B8] text-[11px] mb-1">
                    <span>MEMORY BUS SATURATION</span>
                    <span className={isFault ? 'text-[#FF2A54] font-bold' : 'text-[#00F5D4]'}>
                      {isFault ? '98.4%' : '26.1%'}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded bg-[#11151F] overflow-hidden border border-[#1E2536]">
                    <div
                      className={`h-full transition-all duration-100 ${
                        isFault ? 'bg-[#FF2A54] shadow-[0_0_8px_#FF2A54]' : 'bg-[#00F5D4]'
                      }`}
                      style={{ width: isFault ? '98.4%' : '26.1%' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`p-3 rounded-lg border font-mono text-[11px] transition-colors duration-200 ${
                isFault
                  ? 'bg-[#FF2A54]/15 border-[#FF2A54] text-[#FF2A54]'
                  : 'bg-[#06080C] border-[#1E2536] text-[#94A3B8]'
              }`}
            >
              <div className="flex items-center justify-between font-bold mb-1">
                <span>{isSwiftHost ? 'SWIFT INTERCEPT INSPECTOR' : 'PACKET FLOOD INSPECTOR'}</span>
                <span className="text-[10px]">{isFault ? 'TRAFFIC BURST' : 'NOMINAL'}</span>
              </div>
              <div className="text-[10px] opacity-75 truncate">
                {isFault
                  ? (isSwiftHost ? '0x0041A28F [PATCH_NOP_NOP] -> LIBORADB.DLL HOOKED' : '0x88F 0xA12 0xFFE [POWER_PEG_RETRY_BURST] -> 212 SYMBOLS')
                  : (isSwiftHost ? '0x0041A280 [SAA_ORACLE_AUTH] -> PORT 1521 ACTIVE' : '0x00A 0x014 0x09F [FIX_HEARTBEAT_ACK] -> PORT 9021')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
