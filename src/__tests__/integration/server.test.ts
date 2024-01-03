import { createServer, initServer } from "../../server.js";
import { defaultTestDependenciesFactory } from "../dependencies-factory.js";

describe("Server", () => {
	let server: Awaited<ReturnType<typeof initServer>> | undefined;

	beforeAll(async () => {
		const dependencies = defaultTestDependenciesFactory();
		server = await createServer(dependencies);
	});

	test("Get data from server", async () => {
		await server?.inject({ method: "GET", url: "/-/health" }).then((res) => {
			expect(res.statusCode).toBe(200);
		});
	});

	afterAll(() => {
		server?.close();
	});
});
