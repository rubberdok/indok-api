import assert from "node:assert";
import { execa } from "execa";

const timeout = 60 * 1000; // 60 seconds, GH actions are quite slow, so we need to give it some time to start up

describe("Development scripts", () => {
	const controller = new AbortController();
	const cancelSignal = controller.signal;
	describe("pnpm run dev", () => {
		beforeAll(async () => {
			/*
			 * We have to run `pnpm run setup` once for the initial generation of gql and the prisma schema
			 * as this isn't fully handled in the dev command. In reality, this would be fixed by saving any changes
			 * to a file in the repo, but for now, we have to run the setup command.
			 */
			await execa({
				cancelSignal,
			})("pnpm", ["run", "setup"]);
		}, timeout);

		afterAll(() => {
			if (!cancelSignal.aborted) {
				controller.abort();
			}
		});

		it(
			`starts the development server, worker, graphql codegen, and prisma in less than ${timeout / 1000} seconds`,
			async () => {
				const proc = execa({
					lines: true,
					reject: false,
					timeout,
					stdin: "ignore",
					stdout: ["pipe", "inherit"],
					detached: true,
					env: {
						// Missing environment variables
						FEIDE_CLIENT_SECRET: "test",
						POSTMARK_API_TOKEN: "test",
					},
				})("pnpm", ["run", "dev"]);

				proc.on("exit", () => {
					console.log("Process exited");
				});

				// If there is 10 seconds of inactivity in the logs, it is
				// likely that we have reached a stable state
				// at which point we can cancel the dev process and evaluate the end state
				const inactivityTimeoutHandle = setTimeout(() => {
					console.log("Inactivity timeout reached, sending SIGTERM");
					controller.abort();
				}, 10 * 1000);

				/**
				 * Instead of passing the signal to the process, we listen for the abort event
				 * and send the signal to the process group. Honestly, this was found to work in GH actions after
				 * a lot of trial and error. The process group is used because the process spawns child processes
				 * and we want to kill all of them.
				 */
				cancelSignal.addEventListener("abort", () => {
					if (proc.pid) {
						process.kill(-proc.pid, "SIGINT");
					}
					clearTimeout(inactivityTimeoutHandle);
				});

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
						} else if (line.includes("[STARTED]")) {
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
				assert(
					(await proc).exitCode === 0,
					"Process exited with non-zero exit code",
				);
			},
			timeout,
		);
	});
});
