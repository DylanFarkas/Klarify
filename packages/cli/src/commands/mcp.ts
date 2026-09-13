import { defineCommand } from 'citty';
import { fail } from '../print';
import { runMcpStdio } from '../mcp';

export const mcpCommand = defineCommand({
  meta: { description: 'Servidor MCP stdio (adaptador sobre la misma API)' },
  async run() {
    try {
      await runMcpStdio();
    } catch (error) {
      fail(error);
    }
  },
});
