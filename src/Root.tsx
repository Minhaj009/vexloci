import React from 'react';
import { Composition } from 'remotion';
import { loadFont as loadSpaceGrotesk } from '@remotion/google-fonts/SpaceGrotesk';
import { loadFont as loadJetBrainsMono } from '@remotion/google-fonts/JetBrainsMono';
import { loadFont as loadNewsreader } from '@remotion/google-fonts/Newsreader';
import { MainForensicComposition } from './MainComposition';
import { ShortForensicComposition } from './ShortComposition';
import {
  SceneData,
  ShortCompositionData,
  ShortCompositionSchema,
  TimelineData,
  TimelineSchema,
} from './schemas/timeline.schema';

loadSpaceGrotesk('normal', { weights: ['400', '700'], ignoreTooManyRequestsWarning: true });
loadJetBrainsMono('normal', { weights: ['400', '700'], ignoreTooManyRequestsWarning: true });
loadNewsreader('normal', { weights: ['400', '600'], ignoreTooManyRequestsWarning: true });

const defaultScene: SceneData = {
  sceneId: 'scene_01',
  actNumber: 1,
  startTimeSec: 0,
  durationSec: 10,
  chapterTitle: 'Critical Anomaly',
  narrationText: 'A single anomaly triggered one of the largest financial investigations in history.',
  template: 'ForensicDocument',
  props: {
    documentTitle: 'EXHIBIT A // FORENSIC RECONSTRUCTION',
    dateStamp: 'AUGUST 01, 2012 // 09:30:14 EST',
    sourceAgency: 'FINANCIAL CONDUCT AUTHORITY',
    paragraphs: [
      'A single anomaly triggered one of the largest financial investigations in modern history.',
      'Internal trading algorithms initiated an uncontrollable order loop exhausting reserves.',
    ],
    highlightPhrases: ['single anomaly', 'uncontrollable order loop'],
    stampText: 'CRITICAL ANOMALY',
    fontScale: 1,
  },
  microEvents: [
    {
      id: 'me_01',
      triggerWord: 'anomaly',
      triggerOffsetSec: 2,
      action: 'HIGHLIGHT_TEXT',
      payloadText: 'single anomaly',
      accentColor: 'amber',
    },
  ],
  sfxTriggers: [],
  words: [],
};

const defaultTimeline: TimelineData = {
  videoId: 'default_preview',
  topicTitle: 'Forensic Case Investigation',
  fps: 30,
  width: 1920,
  height: 1080,
  totalDurationSec: 10,
  audioTrackPath: 'runs/default/audio.wav',
  scenes: [defaultScene],
};

const defaultShortProps: ShortCompositionData = {
  videoId: 'default_preview',
  topicTitle: 'Forensic Case Investigation',
  fps: 30,
  width: 1080,
  height: 1920,
  totalDurationSec: 10,
  audioTrackPath: 'runs/default/audio.wav',
  scene: defaultScene,
  ctaText: 'Watch Full Investigation on Our Channel',
};

export const Root: React.FC = () => {
  return (
    <>
      <Composition<typeof TimelineSchema, TimelineData>
        id="MainForensicComposition"
        component={MainForensicComposition}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
        schema={TimelineSchema}
        defaultProps={defaultTimeline}
        calculateMetadata={({ props }) => {
          const totalDurationSec =
            props.totalDurationSec ||
            props.scenes.reduce((acc, s) => acc + s.durationSec, 0);
          return {
            durationInFrames: Math.max(1, Math.ceil(totalDurationSec * (props.fps || 30))),
            fps: props.fps || 30,
            width: props.width || 1920,
            height: props.height || 1080,
          };
        }}
      />

      <Composition<typeof ShortCompositionSchema, ShortCompositionData>
        id="ShortForensicComposition"
        component={ShortForensicComposition}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
        schema={ShortCompositionSchema}
        defaultProps={defaultShortProps}
        calculateMetadata={({ props }) => {
          const totalDurationSec =
            props.totalDurationSec ||
            (props.scenes && props.scenes.length > 0
              ? props.scenes.reduce((acc, s) => acc + (s.durationSec || 0), 0)
              : props.scene?.durationSec || 35);
          return {
            durationInFrames: Math.max(1, Math.ceil(totalDurationSec * (props.fps || 30))),
            fps: props.fps || 30,
            width: 1080,
            height: 1920,
          };
        }}
      />
    </>
  );
};
