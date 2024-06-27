import type { PrismaClient } from "@prisma/client";
import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

type FastifyPrismaPluginOptions = {
	client: PrismaClient;
};

declare module "fastify" {
	interface FastifyInstance {
		database: PrismaClient<{
			log: (
				| {
						emit: "event";
						level: "error";
				  }
				| {
						emit: "event";
						level: "warn";
				  }
				| {
						emit: "event";
						level: "info";
				  }
				| {
						emit: "event";
						level: "query";
				  }
			)[];
		}>;
	}
}

const fastifyPrisma: FastifyPluginAsync<FastifyPrismaPluginOptions> = (
	fastify,
	{ client },
) => {
	fastify.decorate("database", client);

	fastify.addHook("onClose", async (app) => {
		await app.database.$disconnect();
	});

	return Promise.resolve();
};

export default fp(fastifyPrisma);
