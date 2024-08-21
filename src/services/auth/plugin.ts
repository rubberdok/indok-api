import type { FastifyPluginAsync } from "fastify";
import { env } from "~/config.js";
import { UnauthorizedError } from "~/domain/errors.js";

const fastifyAuthPlugin: FastifyPluginAsync = (fastify) => {
	fastify.route<{
		Querystring: {
			"return-to"?: string;
		};
	}>({
		config: {
			rateLimit: {
				max: 100,
				timeWindow: "1 minute",
			},
		},
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
			const urlResult = fastify.services.auth.generateAuthorizationUrl(req, {
				redirectUri: "/auth/login/callback",
				returnTo,
			});

			if (!urlResult.ok) {
				throw urlResult.error;
			}

			return reply.redirect(urlResult.data.authorizationUrl, 303);
		},
	});

	fastify.route<{
		Querystring: {
			code: string;
		};
	}>({
		config: {
			rateLimit: {
				max: 100,
				timeWindow: "1 minute",
			},
		},
		url: "/login/callback",
		method: "GET",
		schema: {
			querystring: {
				type: "object",
				properties: {
					code: { type: "string" },
				},
				required: ["code"],
			},
		},
		handler: async (req, reply) => {
			const { code } = req.query;
			const tokenResult = await fastify.services.auth.getAuthorizationToken(
				req,
				{
					code,
					redirectUri: "/auth/login/callback",
				},
			);

			if (!tokenResult.ok) {
				throw tokenResult.error;
			}

			const userInfoResult = await fastify.services.auth.getUserInfo(req, {
				token: tokenResult.data.token,
			});

			if (!userInfoResult.ok) {
				throw userInfoResult.error;
			}

			const getOrCreateUserResult = await fastify.services.auth.getOrCreateUser(
				req,
				{
					userInfo: userInfoResult.data.userInfo,
				},
			);

			if (!getOrCreateUserResult.ok) {
				throw getOrCreateUserResult.error;
			}

			await fastify.services.auth.login(req, getOrCreateUserResult.data.user);

			const updateStudyProgramResult =
				await fastify.services.auth.updateStudyProgramForUser(req, {
					token: tokenResult.data.token,
				});
			if (!updateStudyProgramResult.ok) {
				await fastify.services.auth.logout(req);
				req.log.error("Failed to update study program for user", {
					error: updateStudyProgramResult.error,
				});
				throw updateStudyProgramResult.error;
			}
			return reply.redirect(env.CLIENT_URL, 303);
		},
	});

	fastify.route<{
		Querystring: {
			code: string;
		};
	}>({
		config: {
			rateLimit: {
				max: 100,
				timeWindow: "1 minute",
			},
		},
		url: "/study-program/callback",
		method: "GET",
		schema: {
			querystring: {
				type: "object",
				properties: {
					code: { type: "string" },
				},
				required: ["code"],
			},
		},
		handler: async (req, reply) => {
			const { code } = req.query;
			const tokenResult = await fastify.services.auth.getAuthorizationToken(
				req,
				{
					code,
					redirectUri: "/auth/study-program/callback",
				},
			);

			if (!tokenResult.ok) {
				throw tokenResult.error;
			}

			const updateStudyProgramResult =
				await fastify.services.auth.updateStudyProgramForUser(req, {
					token: tokenResult.data.token,
				});

			if (!updateStudyProgramResult.ok) {
				throw updateStudyProgramResult.error;
			}
			return reply.redirect(env.CLIENT_URL, 303);
		},
	});

	fastify.route({
		config: {
			rateLimit: {
				max: 100,
				timeWindow: "1 minute",
			},
		},
		url: "/study-program",
		method: "GET",
		handler: (req, reply) => {
			const urlResult = fastify.services.auth.generateAuthorizationUrl(req, {
				redirectUri: "/auth/study-program/callback",
			});

			if (!urlResult.ok) {
				throw urlResult.error;
			}

			return reply.redirect(urlResult.data.authorizationUrl, 303);
		},
	});

	fastify.route({
		method: "get",
		url: "/logout",
		handler: async (req, reply) => {
			await fastify.services.auth.logout(req);
			req.log.info("User logged out");
			return reply.redirect(env.CLIENT_URL, 303);
		},
	});

	fastify.route({
		method: "GET",
		url: "/me",
		handler: (req, reply) => {
			if (req.session.authenticated) {
				return reply.status(200).send({ user: req.session.userId });
			}
			return reply.send(new UnauthorizedError("Unauthorized"));
		},
	});
	return Promise.resolve();
};

export default fastifyAuthPlugin;
