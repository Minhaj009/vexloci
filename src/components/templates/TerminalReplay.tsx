import React, { useMemo } from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { AlertOctagon, Cpu, Radio, Terminal as TerminalIcon } from 'lucide-react';
import { SceneData, TerminalReplayPropsSchema } from '../../schemas/timeline.schema';
import { useSceneBeat } from '../director/SceneBeatContext';
import { cn } from '../../lib/utils';
import { Card, CardHeader } from '../ui/card';
import { Badge } from '../ui/badge';
import { Alert } from '../ui/alert';
import { Separator } from '../ui/separator';
import { Progress } from '../ui/progress';
import { BorderBeam } from '../ui/border-beam';
import { NumberTicker } from '../ui/number-ticker';

interface TerminalReplayProps {
  scene: SceneData;
}

export const TerminalReplay: React.FC<TerminalReplayProps> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const beatState = useSceneBeat();

  const props = TerminalReplayPropsSchema.parse(scene.props);

  const faultEvent = useMemo(
    () => scene.microEvents.find((e) => e.action === 'PULSE_FAULT'),
    [scene.microEvents]
  );

  const isFault = Boolean(faultEvent && frame >= Math.round(faultEvent.triggerOffsetSec * fps));
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
  const safeLinesCount = Math.max(1, linesCount);

  const loadFactor = isFault ? 0.95 + Math.sin(frame * 0.5) * 0.04 : 0.45 + (frame / totalFrames) * 0.25;

  const hostAndPathLower = `${props.hostname} ${props.filePath}`.toLowerCase();
  const isSwiftHost =
    hostAndPathLower.includes('dhaka') || hostAndPathLower.includes('swift');
  const isSmarsHost =
    !isSwiftHost &&
    (hostAndPathLower.includes('smars') || hostAndPathLower.includes('kcg'));

  const telemetryTitle =
    props.telemetryTitle ||
    (isSwiftHost
      ? 'SWIFT ALLIANCE TELEMETRY // SAA-01'
      : isSmarsHost
        ? 'CORE TELEMETRY // ROUTER 08'
        : 'CORE SYSTEM TELEMETRY // NODE 01');

  const metricLabel =
    props.metricLabel ||
    (isSwiftHost
      ? 'MT103 TRANSACTION VOLUME'
      : isSmarsHost
        ? 'ORDERS / SEC (EXECUTION RATE)'
        : 'EVENT THROUGHPUT (OPS / SEC)');

  const baselineLabel =
    props.baselineLabel ||
    (isSwiftHost
      ? 'BASELINE: 140 TX/HR'
      : isSmarsHost
        ? 'BASELINE: 124,590'
        : 'BASELINE: NOMINAL');

  const peakLabel =
    props.peakLabel ||
    (isSwiftHost
      ? 'MAX PEAK: 35 ORDERS ($951M)'
      : isSmarsHost
        ? 'MAX PEAK: 840,200'
        : 'PEAK: THRESHOLD ALERT');

  const pipelineLabel =
    props.pipelineLabel ||
    (isSwiftHost
      ? 'SAA ORACLE DLL HOOK PIPELINE'
      : isSmarsHost
        ? 'SMARS ALGORITHMIC PIPELINE'
        : 'PRIMARY EXECUTION PIPELINE');

  const queueLabel =
    props.queueLabel ||
    (isSwiftHost
      ? 'FEDWIRE NY INGESTION QUEUE'
      : isSmarsHost
        ? 'NYSE FIX INGESTION QUEUE'
        : 'SYSTEM INGESTION QUEUE');

  const lineRevealFrames = props.lines.map((_, idx) =>
    Math.min(
      Math.max(0, totalFrames - 15),
      Math.round((idx / safeLinesCount) * Math.max(1, totalFrames - 25))
    )
  );
  let lastRevealedIdx = -1;
  for (let i = 0; i < lineRevealFrames.length; i++) {
    if (frame >= lineRevealFrames[i]) {
      lastRevealedIdx = i;
    }
  }

  const templateFocus =
    beatState?.beat?.beatType === 'TEMPLATE_STATE'
      ? beatState.beat.templateFocus
      : undefined;
  const activeLineIdx =
    lastRevealedIdx < 0 || linesCount === 0
      ? -1
      : templateFocus?.targetIndex !== undefined
        ? Math.min(lastRevealedIdx, Math.min(linesCount - 1, Math.max(0, templateFocus.targetIndex)))
        : lastRevealedIdx;

  const hasMultiBeat = Boolean(beatState && beatState.totalBeats > 1);
  const focusLeftPane = hasMultiBeat && beatState ? beatState.beatIndex % 2 === 0 : !isFault;
  const pulseOpacity = 0.55 + 0.45 * Math.sin(frame * 0.25);

  return (
    <div className="w-[1920px] h-[1080px] pt-12 pb-12 bg-[#F8FAFC] flex items-center justify-center select-none relative overflow-hidden font-sans">
      <div className="absolute w-[900px] h-[600px] bg-blue-100/30 rounded-full blur-[140px] pointer-events-none -top-20 left-1/2 -translate-x-1/2" />
      <div className="relative w-[1520px] h-[840px] bg-white border border-slate-300 rounded-3xl shadow-[0_25px_70px_-15px_rgba(15,23,42,0.08),0_0_0_1px_rgba(203,213,225,0.8)] overflow-hidden flex flex-col justify-between">
        <BorderBeam
          size={320}
          duration={12}
          borderWidth={1.5}
          colorFrom={isFault ? '#DC2626' : '#2563EB'}
          colorTo={isFault ? '#F59E0B' : '#60A5FA'}
        />

        <CardHeader className="bg-slate-100 px-5 py-3 border-b border-slate-200 flex flex-row items-center justify-between z-20 relative space-y-0 text-slate-700">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#FF5F56]" />
              <span className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
              <span className="w-3 h-3 rounded-full bg-[#27C93F]" />
            </div>
            <Badge variant="secondary" className="flex items-center gap-2 text-xs font-mono ml-4 text-slate-700 border-slate-200 bg-white">
              <TerminalIcon className="w-3.5 h-3.5 text-blue-600" />
              <span>{props.hostname}</span>
              <span className="text-slate-400">:</span>
              <span className="text-blue-600 font-semibold">{props.filePath}</span>
            </Badge>
          </div>
          <div className="text-[11px] font-mono text-slate-600 flex items-center gap-3">
            <Badge variant="cyan" className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5" style={{ opacity: pulseOpacity }} />
              LIVE TELEMETRY FEED
            </Badge>
            <Separator orientation="vertical" className="h-4 bg-slate-300" />
            <Badge variant="mono" className="border-slate-200 bg-white text-slate-600">
              SSH-2.0-OpenSSH_7.4
            </Badge>
          </div>
        </CardHeader>

        {faultProgress > 0 && (
          <Alert
            variant="destructive"
            className="border-b border-red-200 bg-red-50 rounded-none px-6 py-2.5 flex items-center gap-3 text-red-700 font-mono text-xs font-bold tracking-wider z-20 relative"
            style={{
              opacity: faultProgress,
              transform: `translateY(${(1 - faultProgress) * -15}px)`,
            }}
          >
            <AlertOctagon className="w-5 h-5 text-red-600" style={{ opacity: pulseOpacity }} />
            <span>
              {faultEvent?.payloadText || 'CRITICAL FAULT: UNCONTROLLED HIGH-FREQUENCY LOOP DETECTED'}
            </span>
          </Alert>
        )}

        <div className="grid grid-cols-12 min-h-[460px] relative z-10 flex-1">
          <div
            className={cn(
              'col-span-7 p-6 font-mono text-sm leading-relaxed bg-[#0F172A] text-slate-100',
              focusLeftPane ? 'ring-2 ring-inset ring-cyan-400/50 opacity-100' : 'opacity-90'
            )}
            style={{
              fontSize: `${13.5 * (props.fontScale ?? 1)}px`,
            }}
          >
            {props.lines.map((line, idx) => {
              const lineRevealFrame = lineRevealFrames[idx] ?? 0;
              if (frame < lineRevealFrame) {
                return null;
              }

              let typedText = line.text;
              if (line.type === 'cmd') {
                const chars = Math.max(0, Math.floor((frame - lineRevealFrame) * 1.8));
                typedText = line.text.slice(0, chars);
              }

              let textClass = 'text-slate-300';
              let prefix = ' ';
              if (line.type === 'cmd') {
                textClass = 'text-[#38BDF8] font-semibold';
                prefix = '$ ';
              } else if (line.type === 'error') {
                textClass = 'text-[#F87171] font-bold';
                prefix = '! ';
              } else if (line.type === 'diff_add') {
                textClass = 'text-[#4ADE80] font-medium';
                prefix = '+ ';
              } else if (line.type === 'diff_del') {
                textClass = 'text-[#F87171]/80 font-medium line-through';
                prefix = '- ';
              }

              const isLastVisibleLine = idx === lastRevealedIdx;
              const isActiveLine = idx === activeLineIdx;

              return (
                <div
                  key={idx}
                  className={cn(
                    'flex items-start gap-3 mb-1.5 py-0.5',
                    isActiveLine && 'bg-slate-800/90 border-l-2 border-cyan-400 pl-2 -ml-2 rounded-r'
                  )}
                >
                  <span className="w-7 text-right text-slate-500 select-none text-xs">
                    {(idx + 1).toString().padStart(2, '0')}
                  </span>
                  <span className="font-mono text-slate-400 select-none">{prefix}</span>
                  <span className={`flex-1 break-all ${textClass}`}>
                    {typedText}
                    {isLastVisibleLine && cursorVisible && (
                      <span className="inline-block w-2 h-4 ml-1 bg-[#38BDF8] align-middle" />
                    )}
                  </span>
                </div>
              );
            })}
          </div>

          <div
            className={cn(
              'col-span-5 bg-white text-slate-900 p-6 flex flex-col justify-between border-l border-slate-200',
              !focusLeftPane ? 'ring-2 ring-inset ring-blue-500/40 bg-slate-50/40 opacity-100' : 'opacity-95'
            )}
          >
            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-600">
                  <Cpu className="w-4 h-4 text-blue-600" />
                  <span>{telemetryTitle}</span>
                </div>
                <Badge
                  variant={isFault ? 'destructive' : 'default'}
                  className="text-[10px] font-mono"
                  style={isFault ? { opacity: pulseOpacity } : undefined}
                >
                  {isFault ? 'FLOOD DETECTED' : 'NOMINAL LOAD'}
                </Badge>
              </div>

              <Card className="p-4 rounded-xl bg-slate-50 border border-slate-200 mb-5">
                <div className="text-[11px] font-mono tracking-widest text-slate-500">
                  {metricLabel}
                </div>
                <div
                  className={cn(
                    'text-3xl font-mono font-black mt-1 tracking-tight',
                    isFault ? 'text-rose-600' : 'text-blue-600'
                  )}
                >
                  {isSwiftHost ? (
                    <NumberTicker
                      value={isFault ? 951000000 : 81000000}
                      startValue={isFault ? 81000000 : 14000000}
                      startFrame={0}
                      durationFrames={isFault ? 30 : 60}
                      prefix="$"
                    />
                  ) : isSmarsHost ? (
                    <NumberTicker
                      value={isFault ? 840200 : 245000}
                      startValue={124590}
                      startFrame={0}
                      durationFrames={isFault ? 25 : totalFrames}
                    />
                  ) : (
                    <NumberTicker
                      value={isFault ? 98400 : 18500}
                      startValue={12400}
                      startFrame={0}
                      durationFrames={isFault ? 25 : totalFrames}
                    />
                  )}
                </div>
                <div className="text-[10px] font-mono text-slate-500 mt-1 flex items-center justify-between">
                  <span>{baselineLabel}</span>
                  <span>{peakLabel}</span>
                </div>
              </Card>

              <div className="space-y-3 font-mono text-xs">
                <div>
                  <div className="flex justify-between text-slate-500 text-[11px] mb-1">
                    <span>{pipelineLabel}</span>
                    <span className={isFault ? 'text-rose-600 font-bold' : 'text-blue-600'}>
                      {Math.round(loadFactor * 100)}%
                    </span>
                  </div>
                  <Progress
                    value={Math.min(100, Math.round(loadFactor * 100))}
                    className="h-2 rounded bg-slate-200 border border-slate-200"
                    indicatorClassName={isFault ? 'bg-rose-600' : 'bg-blue-600'}
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-500 text-[11px] mb-1">
                    <span>{queueLabel}</span>
                    <span className={isFault ? 'text-rose-600 font-bold' : 'text-blue-600'}>
                      {isFault ? '100% (OVERFLOW)' : '38%'}
                    </span>
                  </div>
                  <Progress
                    value={isFault ? 100 : 38}
                    className="h-2 rounded bg-slate-200 border border-slate-200"
                    indicatorClassName={isFault ? 'bg-rose-600' : 'bg-blue-600'}
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-500 text-[11px] mb-1">
                    <span>MEMORY BUS SATURATION</span>
                    <span className={isFault ? 'text-rose-600 font-bold' : 'text-blue-600'}>
                      {isFault ? '98.4%' : '26.1%'}
                    </span>
                  </div>
                  <Progress
                    value={isFault ? 98.4 : 26.1}
                    className="h-2 rounded bg-slate-200 border border-slate-200"
                    indicatorClassName={isFault ? 'bg-rose-600' : 'bg-blue-600'}
                  />
                </div>
              </div>
            </div>

            <Card
              className={cn(
                'p-3 rounded-xl border font-mono text-[11px]',
                isFault
                  ? 'bg-rose-50 border-rose-200 text-rose-700'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              )}
            >
              <div className="flex items-center justify-between font-bold mb-1">
                <span className="text-slate-800">
                  {isSwiftHost
                    ? 'SWIFT INTERCEPT INSPECTOR'
                    : isSmarsHost
                      ? 'PACKET FLOOD INSPECTOR'
                      : 'RUNTIME EVENT INSPECTOR'}
                </span>
                <Badge variant={isFault ? 'destructive' : 'outline'} className="text-[10px] py-0 px-1.5">
                  {isFault ? 'TRAFFIC BURST' : 'NOMINAL'}
                </Badge>
              </div>
              <div className="text-[10px] opacity-75 truncate text-slate-600">
                {isFault
                  ? isSwiftHost
                    ? '0x0041A28F [PATCH_NOP_NOP] -> LIBORADB.DLL HOOKED'
                    : isSmarsHost
                      ? '0x88F 0xA12 0xFFE [POWER_PEG_RETRY_BURST] -> 212 SYMBOLS'
                      : '0x00F 0xA41 0xE20 [EXECUTION_THREAD_SPIKE] -> BUFFER SATURATED'
                  : isSwiftHost
                    ? '0x0041A280 [SAA_ORACLE_AUTH] -> PORT 1521 ACTIVE'
                    : isSmarsHost
                      ? '0x00A 0x014 0x09F [FIX_HEARTBEAT_ACK] -> PORT 9021'
                      : '0x00A 0x014 0x09F [SYSTEM_HEARTBEAT_ACK] -> CHANNEL ACTIVE'}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
