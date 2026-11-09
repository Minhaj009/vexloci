import React from 'react';
import { Series } from 'remotion';
import { SceneData, TimelineData } from './schemas/timeline.schema';
import { AtmosphericStage } from './components/shared/AtmosphericStage';
import { ForensicHUD } from './components/shared/ForensicHUD';
import { KineticCaption } from './components/shared/KineticCaption';
import { CameraRig } from './components/shared/CameraRig';
import { FilmGrainOverlay } from './components/shared/FilmGrainOverlay';
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

interface MainCompositionProps {
  videoId: string;
  topicTitle: string;
  fps: number;
  width: number;
  height: number;
  totalDurationSec: number;
  audioTrackPath: string;
  scenes: SceneData[];
}

export const MainForensicComposition: React.FC<MainCompositionProps> = (props) => {
  const timeline: TimelineData = {
    videoId: props.videoId,
    topicTitle: props.topicTitle,
    fps: props.fps,
    width: props.width,
    height: props.height,
    totalDurationSec: props.totalDurationSec,
    audioTrackPath: props.audioTrackPath,
    scenes: props.scenes,
  };

  const renderTemplate = (scene: SceneData) => {
    switch (scene.template) {
      case 'ForensicDocument':
        return <ForensicDocument scene={scene} />;
      case 'TerminalReplay':
        return <TerminalReplay scene={scene} />;
      case 'MarketCrashChart':
        return <MarketCrashChart scene={scene} />;
      case 'NetworkTopology':
        return <NetworkTopology scene={scene} />;
      case 'ParallaxCutout25D':
        return <ParallaxCutout25D scene={scene} />;
      case 'CommsIntercept':
        return <CommsIntercept scene={scene} />;
      case 'GeoIpTraceMap':
        return <GeoIpTraceMap scene={scene} />;
      case 'SplitAutopsy':
        return <SplitAutopsy scene={scene} />;
      case 'ChronoTickingClock':
        return <ChronoTickingClock scene={scene} />;
      case 'SystemBlueprint':
        return <SystemBlueprint scene={scene} />;
      case 'ArchivalFootage':
        return <ArchivalFootage scene={scene} />;
      case 'EndScreenOutro':
        return <EndScreenOutro scene={scene} />;
      default:
        return (
          <div className="flex items-center justify-center w-full h-full text-text-muted font-mono">
            UNKNOWN TEMPLATE
          </div>
        );
    }
  };

  return (
    <div className="w-[1920px] h-[1080px] bg-canvas text-text-primary overflow-hidden relative select-none">
      <Series>
        {timeline.scenes.map((scene) => {
          const durationInFrames = Math.max(1, Math.round(scene.durationSec * timeline.fps));

          return (
            <Series.Sequence key={scene.sceneId} durationInFrames={durationInFrames}>
              <div className="relative w-full h-full overflow-hidden bg-canvas">
                <AtmosphericStage scene={scene} timeline={timeline} />
                <CameraRig scene={scene}>
                  {renderTemplate(scene)}
                </CameraRig>
                <ForensicHUD scene={scene} timeline={timeline} />
                <KineticCaption scene={scene} />
                <FilmGrainOverlay opacity={0.08} />
              </div>
            </Series.Sequence>
          );
        })}
      </Series>
    </div>
  );
};
