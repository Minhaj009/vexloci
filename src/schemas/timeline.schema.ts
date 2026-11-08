import { z } from 'zod';

export const MicroEventActionEnum = z.enum([
  'HIGHLIGHT_TEXT',
  'ZOOM_IN',
  'PAN_TO_NODE',
  'TYPE_COMMAND',
  'TRIGGER_CRASH_DROP',
  'REVEAL_CALLOUT',
  'PULSE_FAULT',
  'STAMP_VERDICT',
]);

export const MicroEventSchema = z.object({
  id: z.string(),
  triggerWord: z.string(),
  triggerOffsetSec: z.number().min(0), // Relative to scene start
  action: MicroEventActionEnum,
  targetId: z.string().optional(),
  payloadText: z.string().optional(),
  accentColor: z.enum(['cyan', 'amber', 'crimson']).default('cyan'),
});

export const SfxTriggerSchema = z.object({
  offsetSec: z.number().min(0),
  soundFile: z.enum([
    'ui_tick.wav',
    'keystroke_burst.wav',
    'soft_whoosh.wav',
    'sub_bass_drop.wav',
    'paper_slide.wav',
    'highlighter_sweep.wav',
    'radar_ping.wav',
    'stamp_slam.wav',
  ]),
  volume: z.number().min(0).max(1).default(0.5),
});

export const SceneTemplateEnum = z.enum([
  'ForensicDocument',
  'TerminalReplay',
  'MarketCrashChart',
  'NetworkTopology',
  'ParallaxCutout25D',
  'CommsIntercept',
  'GeoIpTraceMap',
  'SplitAutopsy',
  'ChronoTickingClock',
  'SystemBlueprint',
  'ArchivalFootage',
  'EndScreenOutro',
]);

export const WordTimingSchema = z.object({
  word: z.string(),
  startSec: z.number(),
  endSec: z.number(),
});

export const ForensicDocumentPropsSchema = z.object({
  documentTitle: z.string(),
  dateStamp: z.string(),
  sourceAgency: z.string(),
  paragraphs: z.array(z.string()).default([]),
  highlightPhrases: z.array(z.string()).default([]),
  stampText: z.string().optional(),
  evidenceRef: z.string().optional(),
  docketNumber: z.string().optional(),
  fontScale: z.number().optional().default(1),
  articleImagePath: z.string().nullable().optional(),
  publicationName: z.string().nullable().optional(),
  headline: z.string().nullable().optional(),
  byline: z.string().nullable().optional(),
  highlightBox: z
    .object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
    })
    .nullable()
    .optional(),
});

export const TerminalReplayPropsSchema = z.object({
  hostname: z.string(),
  filePath: z.string(),
  lines: z.array(
    z.object({
      text: z.string(),
      type: z.enum(['cmd', 'output', 'error', 'diff_add', 'diff_del']),
    })
  ),
  telemetryTitle: z.string().optional(),
  metricLabel: z.string().optional(),
  baselineLabel: z.string().optional(),
  peakLabel: z.string().optional(),
  pipelineLabel: z.string().optional(),
  queueLabel: z.string().optional(),
  fontScale: z.number().optional().default(1),
});

export const MarketCrashChartPropsSchema = z.object({
  tickerSymbol: z.string(),
  metricName: z.string(),
  unit: z.string(),
  dataPoints: z.array(
    z.object({
      label: z.string(),
      value: z.number(),
    })
  ),
  crashIndex: z.number(),
  totalLossAmount: z.number().optional(),
  lossLabel: z.string().optional(),
  currencyPrefix: z.string().optional(),
  fontScale: z.number().optional().default(1),
});

export const NetworkTopologyPropsSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      type: z.enum(['bank', 'server', 'person', 'shell']),
      status: z.enum(['normal', 'compromised']),
    })
  ),
  edges: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
      label: z.string().optional(),
    })
  ),
  fontScale: z.number().optional().default(1),
});

export const ParallaxCutout25DPropsSchema = z.object({
  fgImagePath: z.string(),
  bgImagePath: z.string(),
  subjectName: z.string(),
  subjectRole: z.string(),
  quoteOrFact: z.string(),
  fontScale: z.number().optional().default(1),
});

export const CommsInterceptPropsSchema = z.object({
  platformName: z.string(),
  channelOrSubject: z.string(),
  messages: z.array(
    z.object({
      sender: z.string(),
      role: z.string(),
      time: z.string(),
      body: z.string(),
      highlight: z.string().optional(),
    })
  ),
  fontScale: z.number().optional().default(1),
});

export const GeoIpTraceMapPropsSchema = z.object({
  waypoints: z.array(
    z.object({
      city: z.string(),
      country: z.string(),
      lat: z.number(),
      lon: z.number(),
      detail: z.string(),
    })
  ),
  fontScale: z.number().optional().default(1),
});

export const SplitAutopsyPropsSchema = z.object({
  leftTitle: z.string(),
  rightTitle: z.string(),
  leftMetrics: z.array(z.string()),
  rightMetrics: z.array(z.string()),
  fontScale: z.number().optional().default(1),
});

export const ChronoTickingClockPropsSchema = z.object({
  startIsoTime: z.string(),
  endIsoTime: z.string(),
  milestones: z.array(
    z.object({
      timeLabel: z.string(),
      eventTitle: z.string(),
      detail: z.string(),
    })
  ),
  fontScale: z.number().optional().default(1),
});

export const SystemBlueprintPropsSchema = z.object({
  systemTitle: z.string(),
  blocks: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      subtitle: z.string(),
      isFaultPoint: z.boolean().optional(),
    })
  ),
  flows: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
      label: z.string(),
    })
  ),
  fontScale: z.number().optional().default(1),
});

export const ArchivalFootagePropsSchema = z.object({
  mediaType: z.enum(['video', 'image']),
  mediaPath: z.string(),
  headline: z.string(),
  caption: z.string(),
  provenanceSource: z.string(),
  licenseBadge: z.string().optional(),
  fontScale: z.number().optional().default(1),
});

export const EndScreenOutroPropsSchema = z.object({
  title: z.string().default('CASE DOSSIER CLOSED'),
  subtitle: z.string().default('SELECT NEXT INVESTIGATION'),
  leftCardLabel: z.string().default('RECOMMENDED DOSSIER'),
  rightCardLabel: z.string().default('LATEST CASE FILE'),
  subscribeLabel: z.string().default('DECRYPT // SUBSCRIBE'),
});

const BaseSceneFields = {
  sceneId: z.string(),
  actNumber: z.number().int().min(1).max(6),
  startTimeSec: z.number().min(0),
  durationSec: z.number().gt(1.5),
  chapterTitle: z.string(),
  narrationText: z.string(),
  words: z.array(WordTimingSchema),
  sfxTriggers: z.array(SfxTriggerSchema),
  microEvents: z.array(MicroEventSchema).min(1),
};

export const ForensicDocumentSceneSchema = z.object({
  ...BaseSceneFields,
  template: z.literal('ForensicDocument'),
  props: ForensicDocumentPropsSchema,
});

export const TerminalReplaySceneSchema = z.object({
  ...BaseSceneFields,
  template: z.literal('TerminalReplay'),
  props: TerminalReplayPropsSchema,
});

export const MarketCrashChartSceneSchema = z.object({
  ...BaseSceneFields,
  template: z.literal('MarketCrashChart'),
  props: MarketCrashChartPropsSchema,
});

export const NetworkTopologySceneSchema = z.object({
  ...BaseSceneFields,
  template: z.literal('NetworkTopology'),
  props: NetworkTopologyPropsSchema,
});

export const ParallaxCutout25DSceneSchema = z.object({
  ...BaseSceneFields,
  template: z.literal('ParallaxCutout25D'),
  props: ParallaxCutout25DPropsSchema,
});

export const CommsInterceptSceneSchema = z.object({
  ...BaseSceneFields,
  template: z.literal('CommsIntercept'),
  props: CommsInterceptPropsSchema,
});

export const GeoIpTraceMapSceneSchema = z.object({
  ...BaseSceneFields,
  template: z.literal('GeoIpTraceMap'),
  props: GeoIpTraceMapPropsSchema,
});

export const SplitAutopsySceneSchema = z.object({
  ...BaseSceneFields,
  template: z.literal('SplitAutopsy'),
  props: SplitAutopsyPropsSchema,
});

export const ChronoTickingClockSceneSchema = z.object({
  ...BaseSceneFields,
  template: z.literal('ChronoTickingClock'),
  props: ChronoTickingClockPropsSchema,
});

export const SystemBlueprintSceneSchema = z.object({
  ...BaseSceneFields,
  template: z.literal('SystemBlueprint'),
  props: SystemBlueprintPropsSchema,
});

export const ArchivalFootageSceneSchema = z.object({
  ...BaseSceneFields,
  template: z.literal('ArchivalFootage'),
  props: ArchivalFootagePropsSchema,
});

export const EndScreenOutroSceneSchema = z.object({
  ...BaseSceneFields,
  template: z.literal('EndScreenOutro'),
  props: EndScreenOutroPropsSchema,
});

export const SceneSchema = z.discriminatedUnion('template', [
  ForensicDocumentSceneSchema,
  TerminalReplaySceneSchema,
  MarketCrashChartSceneSchema,
  NetworkTopologySceneSchema,
  ParallaxCutout25DSceneSchema,
  CommsInterceptSceneSchema,
  GeoIpTraceMapSceneSchema,
  SplitAutopsySceneSchema,
  ChronoTickingClockSceneSchema,
  SystemBlueprintSceneSchema,
  ArchivalFootageSceneSchema,
  EndScreenOutroSceneSchema,
]);

export const TimelineSchema = z.object({
  videoId: z.string(),
  topicTitle: z.string(),
  fps: z.number().int().default(30),
  width: z.number().int().default(1920),
  height: z.number().int().default(1080),
  totalDurationSec: z.number().gt(0),
  audioTrackPath: z.string(),
  scenes: z.array(SceneSchema).min(1),
});

export const ShortCompositionSchema = z.object({
  videoId: z.string(),
  topicTitle: z.string(),
  fps: z.number().int().default(30),
  width: z.number().int().default(1080),
  height: z.number().int().default(1920),
  totalDurationSec: z.number().gt(0),
  audioTrackPath: z.string(),
  scene: SceneSchema.optional(),
  scenes: z.array(SceneSchema).optional(),
  ctaText: z.string().optional(),
});

export type MicroEvent = z.infer<typeof MicroEventSchema>;
export type SfxTrigger = z.infer<typeof SfxTriggerSchema>;
export type SceneTemplate = z.infer<typeof SceneTemplateEnum>;
export type WordTiming = z.infer<typeof WordTimingSchema>;
export type SceneData = z.infer<typeof SceneSchema>;
export type TimelineData = z.infer<typeof TimelineSchema>;
export type ShortCompositionData = z.infer<typeof ShortCompositionSchema>;
