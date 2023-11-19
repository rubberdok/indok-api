import { FastifyPluginAsync } from "fastify";

import { migrationHealthCheck } from "../prisma.js";

const healthCheckPlugin: FastifyPluginAsync = async (app) => {
  /**
   * Straight forward health check, currently just used for testing.
   */
  app.route({
    url: "/health",
    method: "GET",
    handler: async (req, reply) => {
      reply.statusCode = 200;
      return reply.send({ status: "ok" });
    },
  });

  /**
   * Migration health check, used by the StartupProbe for the server container to check if the server is ready to
   * receive connections. See `infrastructure/modules/server/server_app.tf` for infrastructure details.
   * @returns `200: {"status": "ok"}` if the Prisma migrations in `prisma/migrations` are applied, `503: { "status": "error", "message": "Missing migrations" }` otherwise.
   */
  app.route({
    url: "/migration-health",
    method: "GET",
    handler: async (req, reply) => {
      req.log.info("Health check");
      const { status, message } = await migrationHealthCheck(app);
      if (!status) {
        req.log.info("Health check failed");
        reply.statusCode = 503;
        return reply.send({ message, status: "error" });
      } else {
        req.log.info("Health check succeeded");
        reply.statusCode = 200;
        return reply.send({ statusCode: 200, status: "ok" });
      }
    },
  });
};

export { healthCheckPlugin };
