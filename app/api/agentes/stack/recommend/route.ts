/**
 * @fileoverview API Route — POST /api/agentes/stack/recommend
 */

import { type NextRequest } from 'next/server';
import { verifyRequestUser } from '@/lib/firebase-admin';
import { handleApiError } from '@/lib/api-error';
import { AGENT_ACTIVITY, PREP_ACTION_MIN_VISIBLE_MS } from '@/lib/constants/agent-activity';
import { assertAiRegenerationAllowed } from '@/lib/plans/regeneration-guard';
import { isPlanLimitError, planErrorToJson } from '@/lib/plans/plan-errors';
import { getWorkspaceData, saveStackAcrossWorkspace } from '@/lib/workspace-service';
import { recommendProjectStack } from '@/lib/services/stack-service';
import type { StackRecommendResponse } from '@/lib/types/stack';
import {
  AgentStreamEmitter,
  createNdjsonStream,
  ndjsonStreamResponse,
} from '@/lib/utils/llm-stream';
import { getLiveBacklog } from '@/lib/utils/live-backlog';

type RecommendBody = { isRegeneration?: boolean };

export async function POST(request: NextRequest) {
  try {
    const uid = await verifyRequestUser(request);
    const body = (await request.json().catch(() => ({}))) as RecommendBody;

    const { workspace } = await getWorkspaceData(uid);
    if (!workspace.pipeline.agent6Input) {
      return Response.json(
        { error: 'Completa el pipeline antes de recomendar un stack.', code: 'PIPELINE_INCOMPLETE' },
        { status: 403 }
      );
    }

    await assertAiRegenerationAllowed(uid, 'stack', body.isRegeneration);

    const { stream, send, close } = createNdjsonStream();

    void (async () => {
      const emitter = new AgentStreamEmitter(send);

      try {
        const live = getLiveBacklog(workspace);
        const storyCount = live.epics.reduce((n, e) => n + e.userStories.length, 0);

        const result = await emitter.runPhase(
          AGENT_ACTIVITY.PHASE_RECOMMEND_STACK.id,
          AGENT_ACTIVITY.PHASE_RECOMMEND_STACK.label,
          async () => {
            await emitter.runAction(
              AGENT_ACTIVITY.ACTION_READ_STACK_CONTEXT.id,
              `${storyCount} historias · ${live.epics.length} épicas`,
              async () => undefined,
              { minVisibleMs: PREP_ACTION_MIN_VISIBLE_MS }
            );

            return emitter.runAction(
              AGENT_ACTIVITY.ACTION_COMPOSE_STACK.id,
              'Componiendo stack con IA',
              () =>
                recommendProjectStack(uid, workspace, (text) => {
                  send({ type: 'thought', text, delta: true });
                })
            );
          }
        );

        const saved = await saveStackAcrossWorkspace(uid, {
          ...result.stack,
          status: 'saved',
        });

        send({
          type: 'done',
          payload: {
            stack: saved.stack ?? result.stack,
          } satisfies StackRecommendResponse,
        });
      } catch (error) {
        if (isPlanLimitError(error)) {
          send({ type: 'error', error: planErrorToJson(error).error });
        } else {
          send({
            type: 'error',
            error: error instanceof Error ? error.message : 'Error al recomendar stack',
          });
        }
      } finally {
        close();
      }
    })();

    return ndjsonStreamResponse(stream);
  } catch (error) {
    return handleApiError(error, 'Error al recomendar stack');
  }
}
