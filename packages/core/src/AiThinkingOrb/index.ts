export interface AiOrbStateMap {
  idle: true;
  listening: true;
  thinking: true;
  generating: true;
  complete: true;
}

export { AiThinkingOrb } from './AiThinkingOrb';
export type { AiOrbState, AiThinkingOrbProps } from './AiThinkingOrb';
