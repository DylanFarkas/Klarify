'use client';

import { useCallback, useMemo, useReducer } from 'react';
import type { AgentActivityEntry } from '@/lib/types/agent-activity';
import {
  collectThoughtText,
  INITIAL_AGENT_ACTIVITY_STATE,
  reduceAgentActivity,
  RESET_AGENT_ACTIVITY_ACTION,
} from '@/lib/utils/agent-activity-reducer';
import type { AgentActivityAction, AgentStreamEvent } from '@/lib/types/agent-activity';
import { consumeAgentStream } from '@/lib/utils/llm-stream';

export function useAgentActivity() {
  const [state, dispatch] = useReducer(reduceAgentActivity, INITIAL_AGENT_ACTIVITY_STATE);

  const reset = useCallback(() => {
    dispatch(RESET_AGENT_ACTIVITY_ACTION);
  }, []);

  const consumeStream = useCallback(async <T>(response: Response): Promise<T> => {
    return consumeAgentStream<T>(response, (event: AgentStreamEvent) => {
      dispatch(event);
    });
  }, []);

  const thoughtText = useMemo(() => collectThoughtText(state.entries), [state.entries]);

  return {
    entries: state.entries as AgentActivityEntry[],
    thoughtText,
    reset,
    consumeStream,
  };
}
