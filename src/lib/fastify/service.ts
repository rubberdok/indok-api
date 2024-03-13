import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import type { Services } from "../server.js";

declare module "fastify" {
	interface FastifyInstance {
		services: Services;
	}
}

const fastifyServicePlugin: FastifyPluginAsync<{
	services: Services;
	// biome-ignore lint/suspicious/useAwait: We need to use async/await API here
}> = async (fastify, opts) => {
	fastify.decorate("services", opts.services);
};

export default fp(fastifyServicePlugin);
