/**
 * Extend the Fastify session interface to include our custom properties.
 */
declare module "fastify" {
	interface Session {
		codeVerifier?: string;
		userId?: string;
		authenticated: boolean;
	}
}
