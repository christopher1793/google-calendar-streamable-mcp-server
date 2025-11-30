import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { logger } from '../utils/logger.js';

export function registerPrompts(server: McpServer): void {
  // Register prompts here
  logger.info('prompts', { message: 'No prompts registered' });
}
