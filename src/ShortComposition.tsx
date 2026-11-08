import React from 'react';
import { interpolate, Series, useCurrentFrame, useVideoConfig } from 'remotion';
import { SceneData, ShortCompositionData, TimelineData } from './schemas/timeline.schema';
import { AtmosphericStage } from './components/shared/AtmosphericStage';
import { CameraRig } from './components/shared/CameraRig';
import { KineticCaption } from './components/shared/KineticCaption';
import { ForensicDocument } from './components/templates/ForensicDocument';
import { TerminalReplay } from './components/templates/TerminalReplay';
import { MarketCrashChart } from './components/templates/MarketCrashChart';
import { NetworkTopology } from './components/templates/NetworkTopology';
import { ParallaxCutout25D } from './components/templates/ParallaxCutout25D';
import { CommsIntercept } from './components/templates/CommsIntercept';
import { GeoIpTraceMap } from './components/templates/GeoIpTraceMap';
import { SplitAutopsy } from './components/templates/SplitAutopsy';
import { ChronoTickingClock } from './components/templates/ChronoTickingClock';
import { SystemBlueprint } from './components/templates/SystemBlueprint';
import { ArchivalFootage } from './components/templates/ArchivalFootage';

export type ShortCompositionProps = ShortCompositionData;

export const ShortForensicComposition: React.FC<ShortCompositionProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scenesList: SceneData[] =
    props.scenes && props.scenes.length > 0
      ? props.scenes
      : props.scene
      ? [props.scene]
      : [];

  const timeline: TimelineData = {
    videoId: props.videoId,
    topicTitle: props.topicTitle,
    fps: 30,
    width: 1080,
    height: 1920,
    totalDurationSec: props.totalDurationSec,
    audioTrackPath: props.audioTrackPath,
    scenes: scenesList,
  };

  const renderTemplate = (s: SceneData) => {
    switch (s.template) {
      case 'ForensicDocument':
        return <ForensicDocument scene={s} />;
      case 'TerminalReplay':
        return <TerminalReplay scene={s} />;
      case 'MarketCrashChart':
        return <MarketCrashChart scene={s} />;
      case 'NetworkTopology':
        return <NetworkTopology scene={s} />;
      case 'ParallaxCutout25D':
        return <ParallaxCutout25D scene={s} />;
      case 'CommsIntercept':
        return <CommsIntercept scene={s} />;
      case 'GeoIpTraceMap':
        return <GeoIpTraceMap scene={s} />;
      case 'SplitAutopsy':
        return <SplitAutopsy scene={s} />;
      case 'ChronoTickingClock':
        return <ChronoTickingClock scene={s} />;
      case 'SystemBlueprint':
        return <SystemBlueprint scene={s} />;
      case 'ArchivalFootage':
        return <ArchivalFootage scene={s} />;
      default:
        return (
          <div className="flex items-center justify-center w-full h-full text-slate-400 font-mono">
            UNKNOWN TEMPLATE
          </div>
        );
    }
  };

  const pulse = Math.sin(frame * 0.15);
  const totalFrames = Math.max(1, Math.round(props.totalDurationSec * fps));
  const ctaOpacity = interpolate(frame, [totalFrames - 45, totalFrames - 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div className="w-[1080px] h-[1920px] bg-[#080A0F] text-[#F1F5F9] overflow-hidden relative select-none">
      {/* Top Mobile Header */}
      <div className="absolute top-16 left-0 right-0 z-40 flex justify-between items-center px-10 pointer-events-none">
        <div className="flex items-center gap-3 bg-[#0A0D14]/90 border border-white/10 px-4 py-2 rounded-full shadow-lg">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF2A54] animate-pulse" />
          <span className="text-xs font-mono font-bold tracking-widest text-[#F1F5F9] uppercase">
            VEXLOCI // FORENSIC SHORT
          </span>
        </div>
        <div className="bg-[#0A0D14]/90 border border-[#00F5D4]/30 px-3.5 py-1.5 rounded-md text-[11px] font-mono font-bold text-[#00F5D4]">
          EXHIBIT CUT
        </div>
      </div>

      {/* Sequenced Scenes for 30s-60s Short */}
      <Series>
        {scenesList.map((scene, idx) => {
          const durFrames = Math.max(1, Math.round(scene.durationSec * fps));
          return (
            <Series.Sequence key={scene.sceneId || `short_seq_${idx}`} durationInFrames={durFrames}>
              {/* Dynamic Background Stage */}
              <AtmosphericStage scene={scene} timeline={timeline} />

              {/* Scaled Center Card Visual */}
              <div className="absolute inset-x-0 top-[260px] h-[1050px] flex items-center justify-center overflow-hidden z-20">
                <div
                  className="w-[1920px] h-[1080px] origin-center flex items-center justify-center"
                  style={{
                    transform: 'scale(0.56)',
                  }}
                >
                  <CameraRig scene={scene}>
                    {renderTemplate(scene)}
                  </CameraRig>
                </div>
              </div>

              {/* Mobile-Positioned Kinetic Captions */}
              <KineticCaption
                scene={scene}
                className="absolute left-0 right-0 bottom-[360px] z-50 flex justify-center pointer-events-none select-none px-8"
              />
            </Series.Sequence>
          );
        })}
      </Series>

      {/* Bottom Call To Action Banner */}
      <div
        className="absolute bottom-16 left-10 right-10 z-40 flex flex-col items-center justify-center transition-opacity"
        style={{ opacity: Math.max(0.85, ctaOpacity) }}
      >
        <div className="w-full bg-[#0D121F]/95 border-2 border-[#00F5D4]/60 rounded-2xl p-5 flex items-center justify-between shadow-[0_15px_45px_rgba(0,0,0,0.9)]">
          <div className="flex items-center gap-3.5">
            <div className="w-3 h-3 rounded-full bg-[#00F5D4]" style={{ opacity: 0.6 + pulse * 0.4 }} />
            <div className="flex flex-col">
              <span className="text-xs font-mono font-bold tracking-widest text-[#00F5D4] uppercase">
                FULL INVESTIGATION AVAILABLE
              </span>
              <span className="text-sm font-heading font-medium text-[#F1F5F9]">
                Link In Pinned Comment & Description
              </span>
            </div>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-[#00F5D4]/15 border border-[#00F5D4]/40 text-xs font-mono font-bold text-[#00F5D4]">
            WATCH FULL ▶
          </div>
        </div>
      </div>
    </div>
  );
};
