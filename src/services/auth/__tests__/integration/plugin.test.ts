import assert from "assert";
import type { IncomingMessage } from "http";
import { faker } from "@faker-js/faker";
import type { FastifyInstance, InjectOptions } from "fastify";
import { mock } from "jest-mock-extended";
import type { UserinfoResponse } from "openid-client";
import { makeTestServices } from "~/__tests__/dependencies-factory.js";
import type { MockOpenIdClient } from "~/__tests__/mocks/openIdClient.js";
import { env } from "~/config.js";
import { errorCodes } from "~/domain/errors.js";
import { fastifyServer } from "~/lib/fastify/fastify.js";
import fastifyService from "~/lib/fastify/service.js";
import type { FeideUserInfo } from "../../service.js";

describe("AuthPlugin", () => {
	let app: FastifyInstance;
	let openIdClient: MockOpenIdClient;
	let services: ReturnType<typeof makeTestServices>;

	beforeAll(async () => {
		services = makeTestServices();
		({ openIdClient } = services);
		({ serverInstance: app } = await fastifyServer(env));
		await app.register(fastifyService, { services });
	});

	describe("GET /auth/login?redirect=https://example.com/", () => {
		it("should perform a request to the open ID provider with the correct parameters", async () => {
			const result = await performSSORedirect(app, "https://example.com/");
			expect(openIdClient.authorizationUrl).toHaveBeenCalledWith({
				scope: expect.any(String),
				code_challenge: expect.any(String),
				code_challenge_method: "S256",
				state: "https://example.com/",
				redirect_uri: expect.any(String),
			});

			expect(result.statusCode).toBe(303);
		});

		it("should set session cookie", async () => {
			const result = await performSSORedirect(app);

			expect(result.cookies).toContainEqual({
				domain: env.SESSION_COOKIE_DOMAIN,
				name: env.SESSION_COOKIE_NAME,
				value: expect.any(String),
				path: "/",
				httpOnly: env.SESSION_COOKIE_HTTP_ONLY,
				sameSite: "None",
				expires: expect.any(Date),
			});
		});
	});

	describe("GET /auth/login?kind=studyProgram", () => {
		it("should create a new study program and add it to the user if it does not already exist", async () => {
			const studyProgramId = faker.string.uuid();
			const existingUser = await services.users.create({
				email: faker.internet.exampleEmail({
					firstName: faker.string.uuid(),
				}),
				firstName: faker.person.firstName(),
				lastName: faker.person.lastName(),
				feideId: faker.string.uuid(),
				username: faker.string.sample(20),
			});

			openIdClient.userinfo.mockResolvedValue(
				mock<UserinfoResponse<FeideUserInfo, Record<string, never>>>({
					sub: existingUser.feideId,
				}),
			);
			openIdClient.requestResource.mockResolvedValue({
				body: Buffer.from(
					JSON.stringify([
						{
							id: studyProgramId,
							type: "fc:fs:prg",
							displayName: faker.string.sample(20),
							membership: {
								basic: "member",
								active: true,
								displayName: "Student",
								fsroles: ["STUDENT"],
							},
							parent: "fc:org:ntnu.no",
							url: "http://www.ntnu.no/studier/mtiot",
						},
					]),
					"utf8",
				),
				...mock<IncomingMessage>(),
			});

			const login = await app.inject({
				method: "GET",
				url: "/auth/login?kind=studyProgram",
			});
			expect(login.statusCode).toBe(303);

			const sessionCookie = login.cookies[0]?.value;
			assert(sessionCookie !== undefined);

			const studyProgramResponse = await app.inject({
				method: "GET",
				url: "/auth/study-program?code=code",
				cookies: {
					[env.SESSION_COOKIE_NAME]: sessionCookie,
				},
			});

			expect(studyProgramResponse.statusCode).toBe(303);

			const actual = await services.users.get(existingUser.id);
			assert(actual.studyProgramId !== null);

			const actualStudyProgram = await services.users.getStudyProgram({
				id: actual.studyProgramId,
			});

			expect(actualStudyProgram?.externalId).toBe(studyProgramId);
		});

		it("should add the user to an existing study program", async () => {
			const studyProgramId = faker.string.uuid();
			const existingStudyProgram = await services.users.createStudyProgram({
				name: faker.string.sample(20),
				externalId: studyProgramId,
			});

			const existingUser = await services.users.create({
				email: faker.internet.exampleEmail({
					firstName: faker.string.uuid(),
				}),
				firstName: faker.person.firstName(),
				lastName: faker.person.lastName(),
				feideId: faker.string.uuid(),
				username: faker.string.sample(20),
			});

			openIdClient.userinfo.mockResolvedValue(
				mock<UserinfoResponse<FeideUserInfo, Record<string, never>>>({
					sub: existingUser.feideId,
				}),
			);
			openIdClient.requestResource.mockResolvedValue({
				body: Buffer.from(
					JSON.stringify([
						{
							id: studyProgramId,
							type: "fc:fs:prg",
							displayName: faker.string.sample(20),
							membership: {
								basic: "member",
								active: true,
								displayName: "Student",
								fsroles: ["STUDENT"],
							},
							parent: "fc:org:ntnu.no",
							url: "http://www.ntnu.no/studier/mtiot",
						},
					]),
					"utf8",
				),
				...mock<IncomingMessage>(),
			});

			const login = await app.inject({
				method: "GET",
				url: "/auth/login?kind=studyProgram",
			});
			expect(login.statusCode).toBe(303);

			const sessionCookie = login.cookies[0]?.value;
			assert(sessionCookie !== undefined);

			const studyProgramResponse = await app.inject({
				method: "GET",
				url: "/auth/study-program?code=code",
				cookies: {
					[env.SESSION_COOKIE_NAME]: sessionCookie,
				},
			});

			expect(studyProgramResponse.statusCode).toBe(303);

			const actual = await services.users.get(existingUser.id);
			expect(actual.studyProgramId).toBe(existingStudyProgram.id);
		});
	});

	describe("GET /auth/authenticate", () => {
		it("should error if code verifier is not found in session", async () => {
			const result = await performOAuthAuthentication(app, "code");

			expect(result.statusCode).toBe(400);
			expect(result.json()).toEqual({
				code: errorCodes.ERR_BAD_REQUEST,
				error: "BadRequestError",
				message: expect.stringContaining("code verifier"),
			});
		});

		it("should use the code verifier from the session to validate the response", async () => {
			const result = await performLogin(app);
			expect(result.statusCode).toBe(303);
		});

		it("should require code in query params", async () => {
			const result = await performOAuthAuthentication(app);

			expect(result.statusCode).toBe(400);
			expect(await result.json()).toEqual({
				statusCode: 400,
				code: "FST_ERR_VALIDATION",
				error: "Bad Request",
				message: expect.any(String),
			});
		});

		it("should regenerate session on login", async () => {
			const redirectResult = await performSSORedirect(app);

			const sessionCookie = redirectResult.cookies[0]?.value;
			assert(sessionCookie !== undefined);

			/**
			 * Assert that the session cookie is regenerated on login
			 * to prevent session fixation attacks.
			 */
			const authenticateResult = await performOAuthAuthentication(
				app,
				"code",
				sessionCookie,
			);
			const authenticatedSessionCookie = authenticateResult.cookies[0]?.value;
			assert(authenticatedSessionCookie !== undefined);
			expect(authenticatedSessionCookie).not.toEqual(sessionCookie);

			const unauthenticatedMeResult = await performMe(app, sessionCookie);
			expect(unauthenticatedMeResult.statusCode).toBe(401);

			const meResult = await performMe(app, authenticatedSessionCookie);
			expect(meResult.statusCode).toBe(200);
		});
	});

	describe("POST /auth/logout", () => {
		it("should clear session", async () => {
			const loginResult = await performLogin(app);
			const authenticatedSessionCookie = loginResult.cookies[0]?.value;

			const logoutResult = await performLogout(app, authenticatedSessionCookie);
			const meResult = await performMe(app, authenticatedSessionCookie);
			expect(logoutResult.statusCode).toBe(303);
			expect(meResult.statusCode).toBe(401);
		});
	});

	afterAll(async () => {
		await app.close();
	});
});

function performSSORedirect(app: FastifyInstance, redirect?: string) {
	if (redirect) {
		return app.inject({
			method: "GET",
			url: `/auth/login?redirect=${encodeURIComponent(redirect)}`,
		});
	}
	return app.inject({
		method: "GET",
		url: "/auth/login",
	});
}

async function performLogin(app: FastifyInstance) {
	const ssoRedirect = await performSSORedirect(app);
	const sessionCookie = ssoRedirect.cookies[0]?.value;

	return performOAuthAuthentication(app, "code", sessionCookie);
}

function performOAuthAuthentication(
	app: FastifyInstance,
	code?: string,
	sessionCookie?: string,
) {
	let cookies: InjectOptions["cookies"] = {};
	if (sessionCookie) {
		cookies = {
			[env.SESSION_COOKIE_NAME]: sessionCookie,
		};
	}

	if (code) {
		return app.inject({
			method: "GET",
			url: `/auth/authenticate?code=${code}`,
			cookies,
		});
	}
	return app.inject({
		method: "GET",
		url: "/auth/authenticate",
		cookies,
	});
}

function performLogout(app: FastifyInstance, sessionCookie?: string) {
	let cookies: InjectOptions["cookies"] = {};
	if (sessionCookie) {
		cookies = {
			[env.SESSION_COOKIE_NAME]: sessionCookie,
		};
	}
	return app.inject({
		method: "POST",
		url: "/auth/logout",
		cookies,
	});
}

function performMe(app: FastifyInstance, sessionCookie?: string) {
	let cookies: InjectOptions["cookies"] = {};
	if (sessionCookie) {
		cookies = {
			[env.SESSION_COOKIE_NAME]: sessionCookie,
		};
	}
	return app.inject({
		method: "GET",
		url: "/auth/me",
		cookies,
	});
}
