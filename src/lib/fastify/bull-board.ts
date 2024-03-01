import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter.js";
import { FastifyAdapter } from "@bull-board/fastify";
import type { FastifyPluginAsync } from "fastify";
import { compact } from "lodash-es";

const fastifyBullBoardPlugin: FastifyPluginAsync = async (fastify, options) => {
	fastify.after(() => {
		const serverAdapter = new FastifyAdapter();
		const queues = compact(Object.values(fastify.queues));

		createBullBoard({
			queues: queues.map((queue) => new BullMQAdapter(queue)),
			serverAdapter,
		});

		serverAdapter.setBasePath("/admin/queues");
		fastify.register(serverAdapter.registerPlugin(), {
			basePath: "/queues",
		});

		fastify.addHook("preHandler", async (request, reply) => {
			const { userId } = request.session;
			if (!userId) {
				return reply
					.code(401)
					.send({ error: "You must an admin to access this page." });
			}
			try {
				const user = await fastify.services.users.get(userId);
				if (user.isSuperUser !== true) {
					return reply
						.code(401)
						.send({ error: "You must an admin to access this page." });
				}
			} catch (error) {
				return reply
					.code(401)
					.send({ error: "You must an admin to access this page." });
			}
		});
	});
};

export default fastifyBullBoardPlugin;
