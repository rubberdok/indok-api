import { type ResultPromise, execa } from "execa";

const controller = new AbortController();
const cancelSignal = controller.signal;
const timeout = 60_000;

describe("Development scripts", () => {
	let timeoutHandle: NodeJS.Timeout | undefined;
	let proc: ResultPromise | undefined;

	afterAll(() => {
		if (timeoutHandle) {
			clearTimeout(timeoutHandle);
		}
		controller.abort();
		proc?.kill();
	});

	beforeAll(async () => {
		await execa({
			cancelSignal,
		})("pnpm", ["run", "setup"]);
	}, 30_000);

	describe("pnpm run dev", () => {
		it(
			`starts the dev server in less than ${timeout / 1000} seconds`,
			async () => {
				let serverListening = false;
				let prismaGenerated = false;
				let workerReady = false;
				let graphqlGenerated = false;
				proc = execa({
					stdout: ["pipe", "inherit"],
					cancelSignal,
					lines: true,
					env: {
						// pino-pretty does some tricks with stdout, so we run with NODE_ENV=production for regular log output
						NODE_ENV: "production",
						FEIDE_CLIENT_SECRET: "test",
						POSTMARK_API_TOKEN: "test",
					},
				})("pnpm", ["run", "dev"]);

				/**
				 * If we haven't received a log message from the process in 5 seconds, kill the process
				 */
				let logStabilityTimeoutHandle = setTimeout(() => {
					if (!proc?.killed) {
						proc?.kill("SIGINT");
					}
				}, timeout);

				timeoutHandle = setTimeout(() => {
					if (!proc?.killed) {
						console.log("Max timeout reached, killing process");
						proc?.kill("SIGINT");
					}
					clearTimeout(logStabilityTimeoutHandle);
				}, timeout);

				for await (const line of proc) {
					clearTimeout(logStabilityTimeoutHandle);
					logStabilityTimeoutHandle = setTimeout(() => {
						if (!proc?.killed) {
							console.log("Killing process due to inactivity");
							proc?.kill("SIGINT");
						}
					}, 5_000);

					const message = line.toString();
					if (message.includes("Restarting './src/server.ts'")) {
						serverListening = false;
					}
					if (message.includes("Server listening at http://0.0.0.0:4000")) {
						console.log("Server registered as listening");
						serverListening = true;
					}

					if (message.includes("[prisma] Watching...")) {
						prismaGenerated = false;
					}
					if (message.includes("Generated Prisma Client")) {
						console.log("Prisma generated");
						prismaGenerated = true;
					}

					if (message.includes("[gql] [STARTED] Parse Configuration")) {
						graphqlGenerated = false;
					}
					if (message.includes("[gql] [SUCCESS] Generate outputs")) {
						console.log("GraphQL generated");
						graphqlGenerated = true;
					}

					if (message.includes("Starting worker")) {
						workerReady = false;
					}
					if (message.includes("Worker ready")) {
						console.log("Worker ready");
						workerReady = true;
					}
				}

				expect(serverListening).toBe(true);
				expect(prismaGenerated).toBe(true);
				expect(workerReady).toBe(true);
				expect(graphqlGenerated).toBe(true);
				expect(proc.killed).toBe(true);
			},
			timeout + 5_000,
		);
	});
});
