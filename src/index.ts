import { env } from "./config.js";
import { dependenciesFactory, initServer } from "./server.js";

const dependencies = dependenciesFactory();
await initServer(dependencies, { port: env.PORT, host: "0.0.0.0" });
