import type { FastifyInstance } from "fastify";
import { env } from "~/config.js";
import { fastifyServer } from "~/lib/fastify/fastify.js";
import { registerServices } from "~/lib/server.js";

describe("Headers", () => {
	describe("GET /status", () => {
		let server: FastifyInstance | undefined;

		beforeAll(async () => {
			const { serverInstance } = await fastifyServer(env);
			server = serverInstance;
			await registerServices(server);
		});

		it("sets transaction id header on the response", async () => {
			const res = await server?.inject({
				method: "GET",
				url: "/status",
				headers: { "x-transaction-id": "transaction-id" },
			});
			expect(res?.statusCode).toBe(200);
			expect(res?.headers["x-transaction-id"]).toBe("transaction-id");
		});

		afterAll(async () => {
			await server?.close();
		});
	});
});
