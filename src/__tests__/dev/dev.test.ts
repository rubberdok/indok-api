import assert from "node:assert";
import { type ResultPromise, execa } from "execa";

describe("Development scripts", () => {
	const controller = new AbortController();
	const cancelSignal = controller.signal;
	let inactivityTimeoutHandle: NodeJS.Timeout | undefined;
	let processId: number | undefined;

	afterAll(() => {
		controller.abort();
		clearTimeout(inactivityTimeoutHandle);
		if (processId) {
			console.log("Killing process", processId);
			process.kill(processId, "SIGKILL");
		}
	});

	beforeAll(async () => {
		/**
		 * We have to run `pnpm run setup` once for the initial generation of gql and the prisma schema
		 * as this isn't fully handled in the dev command. In reality, this would be fixed by saving any changes
		 * to a file in the repo, but for now, we have to run the setup command.
		 */
		await execa({
			cancelSignal,
		})("pnpm", ["run", "setup"]);
	}, 30 * 1000);

	describe("pnpm run dev", () => {
		it(
			"starts the development server, worker, graphql codegen, and prisma",
			async () => {
				const proc: ResultPromise = execa({
					lines: true,
					cancelSignal,
					timeout: 60 * 1000, // 1 minute, GH actions aren't that fast
					stdout: ["pipe", "inherit"],
					env: {
						// Setting NODE_ENV to production results in regular json logs
						// instead of pino-pretty. The latter does some weird stuff with stdout, making it tricky to parse
						NODE_ENV: "production",
						// Missing environment variables
						FEIDE_CLIENT_SECRET: "test",
						POSTMARK_API_TOKEN: "test",
						FORCE_COLOR: "0",
					},
				})("pnpm", ["run", "watch-server"]);
				processId = proc.pid;

				// If there is 10 seconds of inactivity in the logs, it is
				// likely that we have reached a stable state
				// at which point we can cancel the dev process and evaluate the end state
				inactivityTimeoutHandle = setTimeout(() => {
					console.log("Inactivity timeout reached, sending SIGINT");
					proc.kill("SIGINT");
				}, 10 * 1000);

				for await (const line of proc) {
					const message = line.toString();
					if (message) {
						inactivityTimeoutHandle.refresh();
					}
				}

				let server: boolean | undefined;
				let worker: boolean | undefined;
				let graphql: boolean | undefined;
				let prisma: boolean | undefined;

				const { stdout } = await proc;
				// Since we have lines: true, stdout is an array of strings
				assert(Array.isArray(stdout), "stdout is not an array");
				/**
				 * Iterate over stdout in reverse order to find the last log messages
				 * for each subprocess. We only consider two types of messages: the log output for the subprocess
				 * starting and the log output for the subprocess being ready. If the first message we encounter
				 * is a "ready" message, we assume that the subprocess is running as expected. However, if the first message
				 * we encounter is a "starting" message, we assume that the subprocess is not running as expected, as
				 * it has not yet reached a "ready" state.
				 */
				for (const line of stdout.reverse()) {
					assert(typeof line === "string", "stdout is not an array of strings");
					if (line.startsWith("[server]") && server === undefined) {
						if (line.includes("Server listening at http://0.0.0.0:4000")) {
							server = true;
						} else if (line.includes("Restarting")) {
							server = false;
						}
					}

					if (line.startsWith("[worker]") && worker === undefined) {
						if (line.includes("Worker ready")) {
							worker = true;
						} else if (line.includes("Starting worker")) {
							worker = false;
						}
					}

					if (line.startsWith("[gql]") && graphql === undefined) {
						if (line.includes("[SUCCESS] Generate outputs")) {
							graphql = true;
						} else if (line.includes("[STARTED]] ")) {
							graphql = false;
						}
					}

					if (line.startsWith("[prisma]") && prisma === undefined) {
						if (line.includes("Generated Prisma Client")) {
							prisma = true;
						} else if (line.includes("Watching...")) {
							prisma = false;
						}
					}
				}

				assert(server, "Server not started");
				assert(worker, "Worker not started");
				assert(graphql, "GraphQL codegen not started");
				assert(prisma, "Prisma not started");
			},
			60 * 1000,
		);
	});
});
