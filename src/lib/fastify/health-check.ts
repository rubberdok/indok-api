import type { FastifyPluginAsync } from "fastify";

const fastifyHealthCheck: FastifyPluginAsync = (app) => {
	app.route({
		url: "/health",
		method: "GET",
		handler: (_req, reply) => {
			reply.statusCode = 200;
			return reply.send({ status: "ok" });
		},
	});
	return Promise.resolve();
};

export default fastifyHealthCheck;
