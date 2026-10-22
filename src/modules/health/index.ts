import type { FastifyInstance, FastifyPluginOptions } from 'fastify';

/**
 * Health module.
 * Provides a simple liveness probe endpoint for the application.
 *
 * GET /health -> { "ok": true }
 */
export async function healthModule(fastify: FastifyInstance, _opts: FastifyPluginOptions) {
  fastify.get('/health', async (_request, _reply) => {
    return { ok: true };
  });
}
