import type { FastifyPluginAsync, RouteShorthandOptions } from "fastify";
import fp from "fastify-plugin";
import { env } from "~/config.js";
import {
	BadRequestError,
	NotFoundError,
	UnauthorizedError,
} from "~/domain/errors.js";
import type { User } from "~/domain/users.js";
import { isValidRedirectUrl } from "~/utils/validate-redirect-url.js";

const rateLimitConfig: RouteShorthandOptions["config"] = {
	rateLimit: {
		max: 100,
		timeWindow: 60 * 1_000,
	},
};

const fastifyAuthPlugin: FastifyPluginAsync = (fastify) => {
	fastify.register(
		async (instance) => {
			instance.route<{
				Querystring: {
					"return-to"?: string;
				};
			}>({
				config: rateLimitConfig,
				schema: {
					querystring: {
						type: "object",
						properties: {
							"return-to": { type: "string" },
						},
					},
				},
				url: "/login",
				method: "GET",
				handler: (req, reply) => {
					const { "return-to": returnTo } = req.query;
					const urlResult = instance.services.auth.generateAuthorizationUrl(
						req,
						{
							redirectUri: "/auth/login/callback",
							returnTo,
						},
					);

					if (!urlResult.ok) {
						throw urlResult.error;
					}

					return reply.redirect(urlResult.data.authorizationUrl, 303);
				},
			});

			instance.route<{
				Querystring: {
					code: string;
					state?: string;
				};
			}>({
				config: rateLimitConfig,
				url: "/login/callback",
				method: "GET",
				schema: {
					querystring: {
						type: "object",
						properties: {
							state: { type: "string" },
							code: { type: "string" },
						},
						required: ["code"],
					},
				},
				handler: async (req, reply) => {
					const { code, state } = req.query;
					let returnTo = env.CLIENT_URL;
					if (state) {
						const validationResult = isValidRedirectUrl(state);
						if (validationResult.ok) {
							returnTo = validationResult.data.urlAsString;
						} else {
							throw new BadRequestError(
								"Invalid returnTo url",
								validationResult.error,
							);
						}
					}

					const tokenResult =
						await instance.services.auth.getAuthorizationToken(req, {
							code,
							redirectUri: "/auth/login/callback",
						});

					if (!tokenResult.ok) {
						req.log.error(
							{
								error: tokenResult.error,
							},
							"Failed to get authorization token",
						);
						switch (tokenResult.error.name) {
							case "BadRequestError": {
								throw new BadRequestError("Bad request", tokenResult.error);
							}
							default:
								throw tokenResult.error;
						}
					}

					const userInfoResult = await instance.services.auth.getUserInfo(req, {
						token: tokenResult.data.token,
					});

					if (!userInfoResult.ok) {
						throw userInfoResult.error;
					}

					const getOrCreateUserResult =
						await instance.services.auth.getOrCreateUser(req, {
							userInfo: userInfoResult.data.userInfo,
						});

					if (!getOrCreateUserResult.ok) {
						throw getOrCreateUserResult.error;
					}

					await instance.services.auth.login(
						req,
						getOrCreateUserResult.data.user,
					);

					const updateStudyProgramResult =
						await instance.services.auth.updateStudyProgramForUser(req, {
							token: tokenResult.data.token,
						});
					if (!updateStudyProgramResult.ok) {
						await instance.services.auth.logout(req);
						req.log.error("Failed to update study program for user", {
							error: updateStudyProgramResult.error,
						});
						throw updateStudyProgramResult.error;
					}
					return reply.redirect(returnTo, 303);
				},
			});

			instance.route<{
				Querystring: {
					code: string;
					state?: string;
				};
			}>({
				config: rateLimitConfig,
				url: "/study-program/callback",
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
					let returnTo = env.CLIENT_URL;
					if (state) {
						const validationResult = isValidRedirectUrl(state);
						if (validationResult.ok) {
							returnTo = validationResult.data.urlAsString;
						} else {
							throw new BadRequestError(
								"Invalid returnTo url",
								validationResult.error,
							);
						}
					}

					const tokenResult =
						await instance.services.auth.getAuthorizationToken(req, {
							code,
							redirectUri: "/auth/study-program/callback",
						});

					if (!tokenResult.ok) {
						throw tokenResult.error;
					}

					const updateStudyProgramResult =
						await instance.services.auth.updateStudyProgramForUser(req, {
							token: tokenResult.data.token,
						});

					if (!updateStudyProgramResult.ok) {
						throw updateStudyProgramResult.error;
					}
					return reply.redirect(returnTo, 303);
				},
			});

			instance.route<{
				Querystring: {
					"return-to"?: string;
				};
			}>({
				config: rateLimitConfig,
				schema: {
					querystring: {
						type: "object",
						properties: {
							"return-to": { type: "string" },
						},
					},
				},
				url: "/study-program",
				method: "GET",
				handler: (req, reply) => {
					const { "return-to": returnTo } = req.query;
					const urlResult = instance.services.auth.generateAuthorizationUrl(
						req,
						{
							redirectUri: "/auth/study-program/callback",
							returnTo,
						},
					);

					if (!urlResult.ok) {
						throw urlResult.error;
					}

					return reply.redirect(urlResult.data.authorizationUrl, 303);
				},
			});

			instance.route({
				method: "get",
				url: "/logout",
				handler: async (req, reply) => {
					await instance.services.auth.logout(req);
					req.log.info("User logged out");
					return reply.redirect(env.CLIENT_URL, 303);
				},
			});

			instance.route({
				method: "GET",
				url: "/me",
				handler: (req, reply) => {
					if (req.user) {
						return reply.status(200).send({ user: req.user });
					}
					return reply.send(new UnauthorizedError("Unauthorized"));
				},
			});
		},
		{
			prefix: "/auth",
		},
	);

	fastify.addHook("preHandler", async (request) => {
		const userId = request.session.get("userId");
		request.log.info({ userId }, "User ID from session");
		if (userId) {
			try {
				const user = await request.server.services.users.get(userId);
				request.user = user;
				return;
			} catch (err) {
				if (err instanceof NotFoundError) {
					await request.server.services.auth.logout(request);
				} else {
					throw err;
				}
			}
		}
		request.user = null;
	});
	return Promise.resolve();
};

declare module "fastify" {
	interface FastifyRequest {
		user: User | null;
	}
}

export default fp(fastifyAuthPlugin);
