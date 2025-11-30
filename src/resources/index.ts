import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { logger } from '../utils/logger.js';

export function registerResources(server: McpServer): void {
  // Register resources here
  logger.info('resources', { message: 'No resources registered' });
}
