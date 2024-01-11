import { env } from "./config.js";
import { dependenciesFactory } from "./lib/fastify/dependencies.js";
import { initServer } from "./server.js";
import { initWorkers } from "./worker.js";

if (env.WORKER) {
	initWorkers();
}

if (env.SERVE_HTTP) {
	const dependencies = dependenciesFactory();
	await initServer(dependencies, { port: env.PORT, host: "0.0.0.0" });
}
