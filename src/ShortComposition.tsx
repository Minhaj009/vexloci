import React from 'react';
import { Series, useVideoConfig } from 'remotion';
import { SceneData, ShortCompositionData, TimelineData } from './schemas/timeline.schema';
import { AtmosphericStage } from './components/shared/AtmosphericStage';
import { KineticCaption } from './components/shared/KineticCaption';
import { SceneDirector } from './components/director/SceneDirector';
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
import { EndScreenOutro } from './components/templates/EndScreenOutro';

export type ShortCompositionProps = ShortCompositionData;

export const ShortForensicComposition: React.FC<ShortCompositionProps> = (props) => {
  const { fps } = useVideoConfig();
  const activeFps = fps || props.fps || 30;

  const scenesList: SceneData[] =
    props.scenes && props.scenes.length > 0
      ? props.scenes
      : props.scene
      ? [props.scene]
      : [];

  const timeline: TimelineData = {
    videoId: props.videoId,
    topicTitle: props.topicTitle,
    fps: activeFps,
    width: props.width || 1080,
    height: props.height || 1920,
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
      case 'EndScreenOutro':
        return <EndScreenOutro scene={s} />;
      default: {
        const _exhaustive: never = s;
        return _exhaustive;
      }
    }
  };

  return (
    <div
      className="w-[1080px] h-[1920px] bg-[#F8FAFC] text-slate-900 overflow-hidden relative select-none"
      style={{
        backgroundImage: 'radial-gradient(circle, #CBD5E1 1.2px, transparent 1.2px)',
        backgroundSize: '28px 28px',
      }}
    >
      <div className="absolute top-[80px] left-0 right-0 z-40 flex flex-col items-center pointer-events-none px-6">
        <div className="bg-white/95 border border-slate-300 rounded-full px-5 py-2 shadow-sm text-xs font-mono font-bold text-slate-800 flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
          <span className="tracking-wider uppercase">
            VEXLOCI // FORENSIC SHORT • EXHIBIT DOSSIER
          </span>
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight text-center px-6 mt-3.5 font-heading leading-tight line-clamp-2 max-w-[960px]">
          {props.topicTitle || 'FORENSIC INVESTIGATION'}
        </h1>
      </div>

      <Series>
        {scenesList.map((scene, idx) => {
          const durFrames = Math.max(1, Math.round(scene.durationSec * activeFps));
          return (
            <Series.Sequence key={scene.sceneId || `short_seq_${idx}`} durationInFrames={durFrames}>
              <AtmosphericStage scene={scene} timeline={timeline} />

              <div className="absolute top-[290px] left-0 right-0 z-20 flex flex-col items-center gap-6 pointer-events-none">
                <div className="w-[1040px] h-[646px] mx-auto bg-white rounded-3xl border border-slate-300 shadow-[0_20px_50px_-10px_rgba(15,23,42,0.12),0_0_0_1px_rgba(203,213,225,0.8)] overflow-hidden relative flex flex-col items-center">
                  <div className="w-full bg-slate-50/90 border-b border-slate-200 px-6 py-3.5 flex justify-between items-center text-xs font-mono font-bold text-slate-600 shrink-0 z-30">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                      <span>{scene.template ? `EXHIBIT // ${scene.template.toUpperCase()}` : 'EXHIBIT // FORENSIC EVIDENCE'}</span>
                    </div>
                    <div className="text-slate-500 font-mono tracking-wider">
                      {scene.chapterTitle ? scene.chapterTitle.toUpperCase() : `ACT ${scene.actNumber || 1}`}
                    </div>
                  </div>

                  <div className="flex-1 w-full flex items-center justify-center overflow-hidden">
                    <div
                      className="w-[1920px] h-[1080px] shrink-0 origin-center flex items-center justify-center"
                      style={{
                        transform: 'scale(0.535)',
                      }}
                    >
                      <SceneDirector
                        scene={scene}
                        timeline={timeline}
                        isShort={true}
                        hideBackground={true}
                      >
                        {renderTemplate(scene)}
                      </SceneDirector>
                    </div>
                  </div>
                </div>

                <div className="w-[1040px] mx-auto bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 px-7 py-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono font-bold tracking-widest text-blue-600 uppercase">
                      ACT {scene.actNumber || 1} // CASE TRANSCRIPT
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      VERIFIED EVIDENCE LOG
                    </span>
                  </div>
                  <p className="text-xl font-sans font-medium text-slate-800 leading-relaxed line-clamp-4">
                    {scene.narrationText}
                  </p>
                </div>
              </div>

              <KineticCaption
                scene={scene}
                className="absolute left-0 right-0 bottom-[330px] z-40 flex justify-center pointer-events-none px-6"
              />
            </Series.Sequence>
          );
        })}
      </Series>

      {props.ctaText && (
        <div className="absolute left-0 right-0 bottom-[235px] z-40 flex justify-center pointer-events-none px-6">
          <div className="inline-flex items-center gap-2.5 rounded-full bg-white/95 backdrop-blur-md border border-slate-300 shadow-[0_10px_30px_rgba(15,23,42,0.10)] px-5 py-2 text-sm font-mono font-bold tracking-wide text-slate-800">
            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
            <span className="truncate max-w-[920px]">{props.ctaText}</span>
          </div>
        </div>
      )}
    </div>
  );
};
