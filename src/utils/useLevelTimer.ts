import { getContext } from "svelte";

export interface TimerContext {
  finishTimer: (finished: boolean, error: number) => void;
}

const TIMER_CONTEXT_KEY = Symbol("levelTimer");

export function setLevelTimerContext(context: TimerContext) {
  return {
    provide: () => context,
    key: TIMER_CONTEXT_KEY,
  };
}

export function useLevelTimer(): TimerContext {
  const context = getContext<TimerContext>(TIMER_CONTEXT_KEY);
  if (!context) {
    throw new Error("useLevelTimer must be used within LevelLayout");
  }
  return context;
}

