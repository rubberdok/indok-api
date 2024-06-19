import { execa } from "execa";

const controller = new AbortController();
const cancelSignal = controller.signal;
const timeout = 10_000;

describe("Development scripts", () => {
	afterAll(() => {
		controller.abort();
	});

	describe("pnpm run dev", () => {
		it(
			`starts the dev server in less than ${timeout / 1000} seconds`,
			async () => {
				let serverListening = false;
				let prismaGenerated = false;
				let workerReady = false;
				let graphqlGenerated = false;
				const process = execa({
					cancelSignal,
					lines: true,
					env: {
						// pino-pretty does some tricks with stdout, so we run with NODE_ENV=production for regular log output
						NODE_ENV: "production",
					},
				})("pnpm", ["run", "dev"]);

				setTimeout(() => {
					process.kill("SIGINT");
				}, timeout);

				for await (const line of process) {
					const message = line.toString();
					if (message.includes("Restarting './src/server.ts'")) {
						serverListening = false;
					}
					if (message.includes("Server listening at http://0.0.0.0:4000")) {
						serverListening = true;
					}

					if (message.includes("[prisma] Watching...")) {
						prismaGenerated = false;
					}
					if (message.includes("Generated Prisma Client")) {
						prismaGenerated = true;
					}

					if (message.includes("[gql] [STARTED] Parse Configuration")) {
						graphqlGenerated = false;
					}
					if (message.includes("[gql] [SUCCESS] Generate outputs")) {
						graphqlGenerated = true;
					}

					if (message.includes("Starting worker")) {
						workerReady = false;
					}
					if (message.includes("Worker ready")) {
						workerReady = true;
					}
				}

				expect(serverListening).toBe(true);
				expect(prismaGenerated).toBe(true);
				expect(workerReady).toBe(true);
				expect(graphqlGenerated).toBe(true);
				expect(process.killed).toBe(true);
			},
			timeout + 5_000,
		);
	});
});
