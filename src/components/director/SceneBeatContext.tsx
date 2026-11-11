import React, { createContext, useContext } from 'react';
import { VisualBeat } from '../../schemas/timeline.schema';

export interface SceneBeatState {
  beat: VisualBeat | null;
  beatIndex: number;
  totalBeats: number;
  beatProgress: number;
  isShort: boolean;
}

export const SceneBeatContext = createContext<SceneBeatState | null>(null);

export const SceneBeatProvider: React.FC<{
  value: SceneBeatState;
  children: React.ReactNode;
}> = ({ value, children }) => {
  return (
    <SceneBeatContext.Provider value={value}>
      {children}
    </SceneBeatContext.Provider>
  );
};

export function useSceneBeat(): SceneBeatState | null {
  return useContext(SceneBeatContext);
}
