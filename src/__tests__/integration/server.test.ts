import { createServer, initServer } from "../../server.js";
import { defaultTestDependenciesFactory } from "../dependencies-factory.js";

describe("Server", () => {
	describe("#createServer", () => {
		let server: Awaited<ReturnType<typeof createServer>> | undefined;

		beforeAll(async () => {
			const dependencies = defaultTestDependenciesFactory();
			server = await createServer(dependencies);
		});

		it("GET /-/health", async () => {
			const res = await server?.inject({ method: "GET", url: "/-/health" });
			expect(res?.statusCode).toBe(200);
		});

		afterAll(() => {
			server?.close();
		});
	});

	describe("#initServer", () => {
		let server: Awaited<ReturnType<typeof initServer>> | undefined;

		beforeAll(async () => {
			const dependencies = defaultTestDependenciesFactory();
			server = await initServer(dependencies, { port: 4001, host: "0.0.0.0" });
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
