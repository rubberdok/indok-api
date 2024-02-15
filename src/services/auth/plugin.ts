import type { FastifyPluginAsync } from "fastify";
import { env } from "~/config.js";
import { UnauthorizedError } from "~/domain/errors.js";
import { assertValidRedirectUrl } from "~/utils/validateRedirectUrl.js";

const fastifyAuthPlugin: FastifyPluginAsync = (fastify) => {
	fastify.route<{
		Querystring: {
			redirect?: string;
			kind?: "login" | "studyProgram";
		};
	}>({
		url: "/login",
		method: "GET",
		schema: {
			querystring: {
				type: "object",
				properties: {
					kind: { type: "string" },
					redirect: { type: "string" },
				},
			},
		},
		handler: (req, reply) => {
			const { redirect, kind = "login" } = req.query;
			let redirectUrl = new URL("/auth/me", env.SERVER_URL);

			if (redirect) {
				assertValidRedirectUrl(redirect);
				redirectUrl = new URL(redirect);
			}

			const url = fastify.services.auth.authorizationUrl(
				req,
				redirectUrl.toString(),
				kind,
			);

			return reply.redirect(303, url);
		},
	});

	fastify.route<{
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
				assertValidRedirectUrl(state);
				redirectUrl = new URL(state);
			}

			try {
				const user = await fastify.services.auth.userLoginCallback(req, {
					code,
				});

				await fastify.services.auth.login(req, user);

				return reply.redirect(303, redirectUrl.toString());
			} catch (err) {
				if (err instanceof Error) {
					req.log.error(err, "Authentication failed");
				}
				throw err;
			}
		},
	});

	fastify.route<{
		Querystring: {
			code: string;
			state?: string;
		};
	}>({
		url: "/study-program",
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
				assertValidRedirectUrl(state);
				redirectUrl = new URL(state);
			}

			try {
				await fastify.services.auth.studyProgramCallback(req, { code });
				return reply.redirect(303, redirectUrl.toString());
			} catch (err) {
				if (err instanceof Error) {
					req.log.error(err, "Failed to fetch study programs for user");
				}
				throw err;
			}
		},
	});

	fastify.route({
		method: "POST",
		url: "/logout",
		handler: async (req, reply) => {
			await fastify.services.auth.logout(req);
			req.log.info("User logged out");
			return reply.redirect(303, "/");
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
