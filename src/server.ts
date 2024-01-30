import { env } from "./config.js";
import { fastifyServer } from "./lib/fastify/fastify.js";
import { registerServices, startServer } from "./lib/server.js";

const { serverInstance } = await fastifyServer(env);

await registerServices(serverInstance, env);

await startServer({ server: serverInstance }, env);
