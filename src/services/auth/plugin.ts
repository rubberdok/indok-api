import { FastifyPluginAsync, FastifyRequest } from "fastify";
import { env } from "~/config.js";
import { InvalidArgumentError, UnauthorizedError } from "~/domain/errors.js";
import { User } from "~/domain/users.js";

export interface AuthService {
	authorizationUrl(req: FastifyRequest, redirect?: string | null): string;
	authorizationCallback(
		req: FastifyRequest,
		data: { code: string },
	): Promise<User>;
	login(req: FastifyRequest, user: User): Promise<User>;
	logout(req: FastifyRequest): Promise<void>;
}

function assertValidRedirectUrl(url: string): void {
	const parsedUrl = new URL(url);
	if (!env.REDIRECT_ORIGINS.some((origin) => origin === parsedUrl.origin)) {
		throw new InvalidArgumentError(
			`Invalid redirect URL. Must be one of ${env.REDIRECT_ORIGINS.join(", ")}`,
		);
	}
}

function getAuthPlugin(authService: AuthService): FastifyPluginAsync {
	return async (app) => {
		app.route<{
			Querystring: {
				redirect?: string;
			};
		}>({
			url: "/login",
			method: "GET",
			schema: {
				querystring: {
					type: "object",
					properties: {
						redirect: { type: "string" },
					},
				},
			},
			handler: (req, reply) => {
				const { redirect } = req.query;
				let redirectUrl = new URL("/auth/me", env.SERVER_URL);

				if (redirect) {
					try {
						assertValidRedirectUrl(redirect);
						redirectUrl = new URL(redirect);
					} catch (err) {
						return reply.send(err);
					}
				}

				const url = authService.authorizationUrl(req, redirectUrl.toString());

				return reply.redirect(303, url);
			},
		});

		app.route<{
			Querystring: {
				code: string;
				state?: string;
			};
		}>({
			url: "/authenticate",
			method: "GET",
			schema: {
				querystring: {
					type: "object",
					properties: {
						code: { type: "string" },
						state: { type: "string" },
					},
					required: ["code"],
				},
			},
			handler: async (req, reply) => {
				const { code, state } = req.query;
				let redirectUrl = new URL("/auth/me", env.SERVER_URL);

				if (state) {
					try {
						assertValidRedirectUrl(state);
						redirectUrl = new URL(state);
					} catch (err) {
						return reply.send(err);
					}
				}

				try {
					const user = await authService.authorizationCallback(req, { code });

					await authService.login(req, user);

					return reply.redirect(303, redirectUrl.toString());
				} catch (err) {
					if (err instanceof Error) {
						req.log.error(err, "Authentication failed");
						return reply.send(err);
					}
				}
			},
		});

		app.route({
			method: "POST",
			url: "/logout",
			handler: async (req, reply) => {
				await authService.logout(req);
				req.log.info("User logged out");
				return reply.redirect(303, "/");
			},
		});

		app.route({
			method: "GET",
			url: "/me",
			handler: (req, reply) => {
				if (req.session.authenticated) {
					return reply.status(200).send({ user: req.session.userId });
				}
				return reply.send(new UnauthorizedError("Unauthorized"));
			},
		});
	};
}

export { getAuthPlugin };
