import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import type { EchoOutput } from '../schemas/outputs.js';
import type { RequestContext } from '../types/context.js';
import { CancellationError } from '../utils/cancellation.js';
import { logger } from '../utils/logger.js';

export const echoInputSchema = z
  .object({
    message: z.string().min(1, 'Message cannot be empty').describe('The message to echo back'),
    repeat: z
      .number()
      .int()
      .min(1, 'Repeat must be at least 1')
      .max(5, 'Repeat cannot exceed 5')
      .default(1)
      .describe('Number of times to repeat the message (1-5)'),
  })
  .strict();

export const echoTool = {
  name: 'echo',
  title: 'Echo Message Tool',
  description: 'Echo back a message with optional repetition.',
  inputSchema: echoInputSchema.shape,

  handler: async (
    args: unknown,
    context?: RequestContext,
  ): Promise<CallToolResult> => {
    // Check for cancellation at the start
    try {
      context?.cancellationToken?.throwIfCancelled();
    } catch (error) {
      if (error instanceof CancellationError) {
        return {
          isError: true,
          content: [{ type: 'text', text: 'Operation was cancelled before starting.' }],
        };
      }
      throw error;
    }

    // Validate input with safeParse
    const parsed = echoInputSchema.safeParse(args);
    if (!parsed.success) {
      void logger.warning('echo', {
        message: 'Invalid input parameters',
        errors: parsed.error.errors,
        requestId: context?.requestId,
      });

      const errorDetails = parsed.error.errors
        .map((err) => `- **${err.path.join('.') || 'input'}**: ${err.message}`)
        .join('\n');

      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `## Invalid Input\n\n${errorDetails}`,
          },
        ],
      };
    }

    const { message, repeat } = parsed.data;

    try {
      void logger.info('echo', {
        message: 'Echo tool called',
        receivedMessage: message,
        receivedRepeat: repeat,
        requestId: context?.requestId,
      });

      const repeatedMessage = Array(repeat).fill(message).join(' ');

      // Check for cancellation before returning
      context?.cancellationToken?.throwIfCancelled();

      const result: EchoOutput = {
        message: repeatedMessage,
        repeated: repeat,
        timestamp: new Date().toISOString(),
      };

      void logger.info('echo', {
        message: 'Echo completed',
        repeat,
        requestId: context?.requestId,
      });

      return {
        content: [{ type: 'text', text: result.message }],
        structuredContent: result,
      };
    } catch (error) {
      if (error instanceof CancellationError) {
        void logger.info('echo', {
          message: 'Echo cancelled by user',
          requestId: context?.requestId,
        });
        return {
          isError: true,
          content: [{ type: 'text', text: 'Echo operation was cancelled.' }],
        };
      }

      void logger.error('echo', {
        message: 'Echo failed',
        error: (error as Error).message,
        requestId: context?.requestId,
      });

      return {
        isError: true,
        content: [{ type: 'text', text: `Echo failed: ${(error as Error).message}` }],
      };
    }
  },
};
