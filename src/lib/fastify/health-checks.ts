import { FastifyPluginAsync } from "fastify";

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
};

export { healthCheckPlugin };
