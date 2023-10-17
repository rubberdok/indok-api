import { initServer } from "./server.js";

await initServer();

declare module "fastify" {
  interface Session {
    codeVerifier?: string;
    userId?: string;
    authenticated: boolean;
  }
}
