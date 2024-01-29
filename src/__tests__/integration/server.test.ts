import type { FastifyInstance } from "fastify";
import { env } from "~/config.js";
import { fastifyServer } from "~/lib/fastify/fastify.js";
import { registerServices, startServer } from "~/lib/server.js";

describe("Server", () => {
	describe("#registerServices", () => {
		let server: FastifyInstance | undefined;

		beforeAll(async () => {
			const { serverInstance } = await fastifyServer(env);
			server = serverInstance;
			await registerServices(server);
		});

		it("GET /-/health", async () => {
			const res = await server?.inject({ method: "GET", url: "/-/health" });
			expect(res?.statusCode).toBe(200);
		});

		afterAll(() => {
			server?.close();
		});
	});

	describe("#startServer", () => {
		let server: FastifyInstance | undefined;

		beforeAll(async () => {
			const { serverInstance } = await fastifyServer(env);
			server = serverInstance;
			await registerServices(server);
			await startServer({ server: serverInstance }, { PORT: 4001 });
		});

		it("GET /-/health should be available on port 4001", async () => {
			const res = await fetch("http://localhost:4001/-/health");
			expect(res.status).toBe(200);
		});

		afterAll(() => {
			server?.close();
		});
	});
});
