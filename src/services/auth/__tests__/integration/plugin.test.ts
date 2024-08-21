import assert from "node:assert";
import { faker } from "@faker-js/faker";
import type {} from "fastify";
import { TokenSet, type UserinfoResponse } from "openid-client";
import { Issuer } from "openid-client";
import { makeTestServices } from "~/__tests__/dependencies-factory.js";
import { env } from "~/config.js";
import { User } from "~/domain/users.js";
import { makeMockContext } from "~/lib/context.js";
import { fastifyServer } from "~/lib/fastify/fastify.js";
import fastifyService from "~/lib/fastify/service.js";
import type { FeideUserInfo } from "../../service.js";

describe("Authentication", () => {
	let dependencies: Awaited<ReturnType<typeof makeDependencies>>;

	beforeEach(async () => {
		dependencies = await makeDependencies();
	});

	afterEach(async () => {
		await dependencies.serverInstance.close();
	});

	describe("GET /auth/login", () => {
		it("creates a user and fetches study programs for the user", async () => {
			const { serverInstance, makeUserinfo, makeStudyProgram } = dependencies;
			const studyProgramId = faker.string.uuid();
			const userFeideId = faker.string.uuid();
			makeUserinfo({ sub: userFeideId });
			makeStudyProgram({ id: studyProgramId });

			const loginResponse = await serverInstance.inject({
				method: "GET",
				url: "/auth/login",
			});

			expect(loginResponse.statusCode).toEqual(303);
			expect(loginResponse.headers.location).toEqual(
				expect.stringContaining("code_challenge_method=S256"),
			);

			const sessionCookie = loginResponse.cookies.find(
				(cookie) => cookie.name === env.SESSION_COOKIE_NAME,
			);
			assert(sessionCookie, "Session cookie not found");

			const callbackResponse = await serverInstance.inject({
				method: "GET",
				url: "/auth/login/callback?code=code",
				cookies: { [env.SESSION_COOKIE_NAME]: sessionCookie?.value },
			});

			expect(callbackResponse.statusCode).toEqual(303);
			expect(callbackResponse.headers.location).toEqual("https://indokntnu.no");

			const authenticatedSessionCookie = callbackResponse.cookies.find(
				(cookie) => cookie.name === env.SESSION_COOKIE_NAME,
			);
			assert(
				authenticatedSessionCookie,
				"Authenticated session cookie not found",
			);

			const user = await dependencies.services.users.getByFeideID(userFeideId);
			assert(user, "User not found");

			assert(
				user?.confirmedStudyProgramId,
				"User has no confirmed study program",
			);
			const studyProgram = await dependencies.services.users.getStudyProgram({
				id: user.confirmedStudyProgramId,
			});
			expect(studyProgram).not.toBeNull();
			expect(studyProgram?.externalId).toEqual(studyProgramId);
			assert(
				sessionCookie.value !== authenticatedSessionCookie.value,
				"Session cookie should be different after authentication",
			);
		});

		it("updates last login for an existing user", async () => {
			const { serverInstance, makeUserinfo, makeUser } = dependencies;
			const userFeideId = faker.string.uuid();
			const existingUser = await makeUser({
				feideId: userFeideId,
			});
			makeUserinfo({ sub: existingUser.feideId });

			const loginResponse = await serverInstance.inject({
				method: "GET",
				url: "/auth/login",
			});

			expect(loginResponse.statusCode).toEqual(303);

			const sessionCookie = loginResponse.cookies.find(
				(cookie) => cookie.name === env.SESSION_COOKIE_NAME,
			);
			assert(sessionCookie, "Session cookie not found");

			const callbackResponse = await serverInstance.inject({
				method: "GET",
				url: "/auth/login/callback?code=code",
				cookies: { [env.SESSION_COOKIE_NAME]: sessionCookie?.value },
			});

			expect(callbackResponse.statusCode).toEqual(303);
			expect(callbackResponse.headers.location).toEqual("https://indokntnu.no");

			const authenticatedSessionCookie = callbackResponse.cookies.find(
				(cookie) => cookie.name === env.SESSION_COOKIE_NAME,
			);
			assert(
				authenticatedSessionCookie,
				"Authenticated session cookie not found",
			);

			const user = await dependencies.services.users.getByFeideID(userFeideId);
			assert(user, "User not found");
			expect(user?.lastLogin).not.toEqual(existingUser.lastLogin);

			assert(
				sessionCookie.value !== authenticatedSessionCookie.value,
				"Session cookie should be different after authentication",
			);
		});

		it("parses userinfo response", async () => {
			const { serverInstance, makeUserinfo } = dependencies;
			const userFeideId = faker.string.uuid();
			const firstName = faker.person.firstName();
			const lastName = faker.person.lastName();
			const username = faker.string.uuid();
			const email = `${username}@ntnu.stud.no`;
			const phoneNumber = "40000000";
			makeUserinfo({
				sub: userFeideId,
				name: `${firstName} ${lastName}`,
				phone_number: phoneNumber,
				email,
				"https://n.feide.no/claims/eduPersonPrincipalName": email,
				"https://n.feide.no/claims/userid_sec": [`feide:${email}`],
			});

			const loginResponse = await serverInstance.inject({
				method: "GET",
				url: "/auth/login",
			});

			expect(loginResponse.statusCode).toEqual(303);

			const sessionCookie = loginResponse.cookies.find(
				(cookie) => cookie.name === env.SESSION_COOKIE_NAME,
			);
			assert(sessionCookie, "Session cookie not found");

			const callbackResponse = await serverInstance.inject({
				method: "GET",
				url: "/auth/login/callback?code=code",
				cookies: { [env.SESSION_COOKIE_NAME]: sessionCookie?.value },
			});

			expect(callbackResponse.statusCode).toEqual(303);
			expect(callbackResponse.headers.location).toEqual("https://indokntnu.no");

			const authenticatedSessionCookie = callbackResponse.cookies.find(
				(cookie) => cookie.name === env.SESSION_COOKIE_NAME,
			);
			assert(
				authenticatedSessionCookie,
				"Authenticated session cookie not found",
			);

			const user = await dependencies.services.users.getByFeideID(userFeideId);
			assert(user, "User not found");
			expect(user).toEqual(
				new User({
					id: expect.any(String),
					firstName,
					lastName,
					email,
					allergies: "",
					phoneNumber,
					graduationYear: null,
					username,
					feideId: userFeideId,
					confirmedStudyProgramId: null,
					createdAt: expect.any(Date),
					firstLogin: true,
					graduationYearUpdatedAt: null,
					lastLogin: expect.any(Date),
					isSuperUser: false,
					updatedAt: expect.any(Date),
				}),
			);
		});

		it("redirects to ?return-to if provided, and is an approved origin", async () => {
			const { serverInstance, makeUserinfo, makeStudyProgram } = dependencies;
			const studyProgramId = faker.string.uuid();
			const userFeideId = faker.string.uuid();
			makeUserinfo({ sub: userFeideId });
			makeStudyProgram({ id: studyProgramId });
			env.REDIRECT_ORIGINS = ["https://indokntnu.no"];

			const loginResponse = await serverInstance.inject({
				method: "GET",
				url: "/auth/login?return-to=https://indokntnu.no/profile",
			});

			expect(loginResponse.statusCode).toEqual(303);
			assert(loginResponse.headers.location, "Location header not found");
			const authUrl = new URL(loginResponse.headers.location);
			expect(authUrl.searchParams.get("state")).toEqual(
				"https://indokntnu.no/profile",
			);

			const sessionCookie = loginResponse.cookies.find(
				(cookie) => cookie.name === env.SESSION_COOKIE_NAME,
			);
			assert(sessionCookie, "Session cookie not found");

			const callbackResponse = await serverInstance.inject({
				method: "GET",
				url: `/auth/login/callback?code=code&state=${authUrl.searchParams.get("state")}`,
				cookies: { [env.SESSION_COOKIE_NAME]: sessionCookie?.value },
			});

			expect(callbackResponse.statusCode).toEqual(303);
			expect(callbackResponse.headers.location).toEqual(
				"https://indokntnu.no/profile",
			);
		});

		it("returns 400 if return-to is not an approved origin", async () => {
			const { serverInstance, makeUserinfo, makeStudyProgram } = dependencies;
			const studyProgramId = faker.string.uuid();
			const userFeideId = faker.string.uuid();
			makeUserinfo({ sub: userFeideId });
			makeStudyProgram({ id: studyProgramId });
			env.REDIRECT_ORIGINS = [];

			const loginResponse = await serverInstance.inject({
				method: "GET",
				url: "/auth/login?return-to=https://indokntnu.no/profile",
			});

			expect(loginResponse.statusCode).toEqual(400);
			assert(!loginResponse.headers.location, "Location header found");
		});
	});

	describe("GET /auth/study-program", () => {
		it("updates study programs for the user", async () => {
			const { serverInstance, makeStudyProgram, performLogin } = dependencies;
			const studyProgramId = faker.string.uuid();
			makeStudyProgram({ id: studyProgramId });
			const userFeideId = faker.string.uuid();
			const { cookies } = await performLogin({ userFeideId });

			const studyProgramResponse = await serverInstance.inject({
				method: "GET",
				url: "/auth/study-program",
				cookies,
			});
			expect(studyProgramResponse.statusCode).toEqual(303);
			expect(studyProgramResponse.headers.location).toEqual(
				expect.stringContaining("https://auth.dataporten.no"),
			);
			expect(studyProgramResponse.headers.location).toEqual(
				expect.stringContaining("code_challenge_method=S256"),
			);

			const callbackResponse = await serverInstance.inject({
				method: "GET",
				url: "/auth/study-program/callback?code=code",
				cookies,
			});
			expect(callbackResponse.statusCode).toEqual(303);
			expect(callbackResponse.headers.location).toEqual("https://indokntnu.no");

			const user = await dependencies.services.users.getByFeideID(userFeideId);
			assert(user, "User not found");
			assert(
				user.confirmedStudyProgramId !== null,
				"User has no confirmed study program",
			);

			const studyProgram = await dependencies.services.users.getStudyProgram({
				id: user.confirmedStudyProgramId,
			});
			expect(studyProgram).not.toBeNull();
			expect(studyProgram?.externalId).toEqual(studyProgramId);
		});

		it("stores all enrolled study programs for the user", async () => {
			const { serverInstance, makeStudyProgram, performLogin } = dependencies;
			const studyProgramId1 = faker.string.uuid();
			const studyProgramId2 = faker.string.uuid();
			makeStudyProgram({ id: studyProgramId1 });
			makeStudyProgram({ id: studyProgramId2 });

			const userFeideId = faker.string.uuid();
			const { cookies } = await performLogin({ userFeideId });

			await serverInstance.inject({
				method: "GET",
				url: "/auth/study-program",
				cookies,
			});

			await serverInstance.inject({
				method: "GET",
				url: "/auth/study-program/callback?code=code",
				cookies,
			});

			const user = await dependencies.services.users.getByFeideID(userFeideId);
			assert(user, "User not found");

			const enrolledResult =
				await serverInstance.services.users.findManyStudyPrograms(
					makeMockContext(user),
				);
			assert(enrolledResult.ok, "Failed to fetch enrolled study programs");

			const enrolledStudyPrograms = enrolledResult.data.studyPrograms;
			expect(enrolledStudyPrograms).toHaveLength(2);

			expect(
				enrolledStudyPrograms.some(
					(studyProgram) => studyProgram.externalId === studyProgramId1,
				),
			).toBe(true);
			expect(
				enrolledStudyPrograms.some(
					(studyProgram) => studyProgram.externalId === studyProgramId2,
				),
			).toBe(true);
		});

		it("requires login", async () => {
			const { serverInstance, makeUserinfo, makeStudyProgram, makeUser } =
				dependencies;
			const studyProgramId = faker.string.uuid();
			const userFeideId = faker.string.uuid();
			await makeUser({
				feideId: userFeideId,
			});
			makeUserinfo({ sub: userFeideId });
			makeStudyProgram({ id: studyProgramId });
			// login

			const studyProgramResponse = await serverInstance.inject({
				method: "GET",
				url: "/auth/study-program",
				cookies: {
					[env.SESSION_COOKIE_NAME]: "invalid",
				},
			});
			expect(studyProgramResponse.statusCode).toEqual(303);

			const sessionCookie = studyProgramResponse.cookies.find(
				(cookie) => cookie.name === env.SESSION_COOKIE_NAME,
			);
			assert(sessionCookie, "Session cookie not found");

			const callbackResponse = await serverInstance.inject({
				method: "GET",
				url: "/auth/study-program/callback?code=code",
				cookies: {
					[env.SESSION_COOKIE_NAME]: sessionCookie.value,
				},
			});
			expect(callbackResponse.statusCode).toEqual(401);
		});

		it("redirects to ?return-to if provided, and is an approved origin", async () => {
			const { serverInstance, makeStudyProgram, performLogin } = dependencies;
			const studyProgramId = faker.string.uuid();
			makeStudyProgram({ id: studyProgramId });
			const userFeideId = faker.string.uuid();
			const { cookies } = await performLogin({ userFeideId });
			env.REDIRECT_ORIGINS = ["https://indokntnu.no"];

			const studyProgramResponse = await serverInstance.inject({
				method: "GET",
				url: "/auth/study-program?return-to=https://indokntnu.no/profile",
				cookies,
			});
			expect(studyProgramResponse.statusCode).toEqual(303);
			assert(
				studyProgramResponse.headers.location,
				"Location header not found",
			);
			const authUrl = new URL(studyProgramResponse.headers.location);

			const callbackResponse = await serverInstance.inject({
				method: "GET",
				url: `/auth/study-program/callback?code=code&state=${authUrl.searchParams.get("state")}`,
				cookies,
			});
			expect(callbackResponse.statusCode).toEqual(303);
			expect(callbackResponse.headers.location).toEqual(
				"https://indokntnu.no/profile",
			);
		});

		it("returns 400 if return-to is not an approved origin", async () => {
			const { serverInstance, makeStudyProgram, performLogin } = dependencies;
			const studyProgramId = faker.string.uuid();
			makeStudyProgram({ id: studyProgramId });
			const userFeideId = faker.string.uuid();
			const { cookies } = await performLogin({ userFeideId });
			env.REDIRECT_ORIGINS = [];

			const studyProgramResponse = await serverInstance.inject({
				method: "GET",
				url: "/auth/study-program?return-to=https://indokntnu.no/profile",
				cookies,
			});
			expect(studyProgramResponse.statusCode).toEqual(400);
			assert(!studyProgramResponse.headers.location, "Location header found");
		});
	});

	describe("GET /auth/logout", () => {
		it("logs out the user", async () => {
			const { serverInstance, performLogin } = dependencies;
			const userFeideId = faker.string.uuid();
			const { cookies, authenticatedSessionCookie } = await performLogin({
				userFeideId,
			});

			const logoutResponse = await serverInstance.inject({
				method: "GET",
				url: "/auth/logout",
				cookies,
			});
			expect(logoutResponse.statusCode).toEqual(303);
			expect(logoutResponse.headers.location).toEqual("https://indokntnu.no");

			const unauthenticatedSessionCookie = logoutResponse.cookies.find(
				(cookie) => cookie.name === env.SESSION_COOKIE_NAME,
			);
			assert(
				unauthenticatedSessionCookie?.value !==
					authenticatedSessionCookie.value,
				"Session cookie should be different after logout",
			);
		});

		it("requires login", async () => {
			const { serverInstance } = dependencies;

			const logoutResponse = await serverInstance.inject({
				method: "GET",
				url: "/auth/logout",
				cookies: {
					[env.SESSION_COOKIE_NAME]: "invalid",
				},
			});
			expect(logoutResponse.statusCode).toEqual(401);
		});
	});

	describe("rate limits", () => {
		it("GET /auth/login has a limit of 100 requests per minte", async () => {
			const { serverInstance } = dependencies;

			const response = await serverInstance.inject({
				method: "GET",
				url: "/auth/login",
			});

			expect(response.headers["x-ratelimit-limit"]).toEqual("100");
		});

		it("GET /auth/login/callback has a limit of 100 requests per minte", async () => {
			const { serverInstance } = dependencies;

			const response = await serverInstance.inject({
				method: "GET",
				url: "/auth/login/callback",
			});

			expect(response.headers["x-ratelimit-limit"]).toEqual("100");
		});

		it("GET /auth/study-program has a limit of 100 requests per minte", async () => {
			const { serverInstance } = dependencies;

			const response = await serverInstance.inject({
				method: "GET",
				url: "/auth/study-program",
			});

			expect(response.headers["x-ratelimit-limit"]).toEqual("100");
		});

		it("GET /auth/study-program/callback has a limit of 100 requests per minte", async () => {
			const { serverInstance } = dependencies;

			const response = await serverInstance.inject({
				method: "GET",
				url: "/auth/study-program/callback",
			});

			expect(response.headers["x-ratelimit-limit"]).toEqual("100");
		});
	});
});

type FeideStudyProgram = {
	id: string;
	displayName: string;
	parent: string;
	type: string;
	membership: {
		basic: string;
		active: boolean;
		displayName: string;
		fsroles: string[];
	};
};

async function makeDependencies() {
	const { serverInstance } = await fastifyServer(env);
	const studyPrograms: FeideStudyProgram[] = [];
	let userinfo: UserinfoResponse<FeideUserInfo, Record<string, never>> = {
		sub: faker.string.uuid(),
		email: faker.internet.exampleEmail({
			firstName: faker.string.uuid(),
		}),
		name: faker.person.fullName(),
		"https://n.feide.no/claims/userid_sec": [
			`feide:${faker.internet.exampleEmail({
				firstName: faker.string.uuid(),
			})}`,
		],
		"https://n.feide.no/claims/eduPersonPrincipalName":
			faker.internet.exampleEmail({
				firstName: faker.string.uuid(),
			}),
	};

	function makeStudyProgram(
		data?: Partial<FeideStudyProgram>,
	): FeideStudyProgram {
		const studyProgram = {
			id: faker.string.uuid(),
			displayName: faker.string.sample(20),
			parent: "fc:org:ntnu.no",
			type: "fc:fs:prg",
			membership: {
				basic: "member",
				active: true,
				displayName: "Student",
				fsroles: ["STUDENT"],
			},
			...data,
		};
		studyPrograms.push(studyProgram);
		return studyProgram;
	}

	function makeUserinfo(
		data?: Partial<UserinfoResponse<FeideUserInfo, Record<string, never>>>,
	): UserinfoResponse<FeideUserInfo, Record<string, never>> {
		const { sub, ...rest } = data ?? {};
		const id = sub ?? faker.string.uuid();
		const email = faker.internet.exampleEmail({
			firstName: faker.string.uuid(),
		});
		userinfo = {
			sub: id,
			email: email,
			name: faker.person.fullName(),
			"https://n.feide.no/claims/userid_sec": [`feide:${email}`],
			"https://n.feide.no/claims/eduPersonPrincipalName": email,
			...rest,
		};
		return userinfo;
	}

	/**
	 * From https://auth.dataporten.no/.well-known/openid-configuration
	 *
	 * Details here can change, but for the purpose of this this, this fixture will suffice.
	 */
	const issuer = new Issuer({
		issuer: "https://auth.dataporten.no",
		authorization_endpoint: "https://auth.dataporten.no/oauth/authorization",
		token_endpoint: "https://auth.dataporten.no/oauth/token",
		token_endpoint_auth_methods_supported: [
			"client_secret_basic",
			"client_secret_post",
		],
		token_endpoint_auth_signing_alg_values_supported: ["RS256"],
		userinfo_endpoint: "https://auth.dataporten.no/openid/userinfo",
		ui_locales_supported: ["en", "no", "nb", "nn"],
		service_documentation: "https://docs.feide.no",
		jwks_uri: "https://auth.dataporten.no/openid/jwks",
		response_modes_supported: ["query", "fragment", "form_post"],
		response_types_supported: ["code", "code id_token", "id_token token"],
		grant_types_supported: [
			"authorization_code",
			"client_credentials",
			"implicit",
			"urn:ietf:params:oauth:grant-type:token-exchange",
		],
		subject_types_supported: ["public"],
		id_token_signing_alg_values_supported: ["RS256"],
		code_challenge_methods_supported: ["S256"],
		claims_supported: [
			"aud",
			"dataporten-userid_sec",
			"email",
			"email_verified",
			"exp",
			"https://n.feide.no/claims/eduPersonPrincipalName",
			"https://n.feide.no/claims/nin",
			"https://n.feide.no/claims/userid_sec",
			"iat",
			"iss",
			"name",
			"picture",
			"sub",
		],
		claims_parameter_supported: false,
		request_parameter_supported: false,
		request_uri_parameter_supported: false,
		scopes_supported: ["openid", "profile", "email"],
		end_session_endpoint: "https://auth.dataporten.no/openid/endsession",
	});
	const client = new issuer.Client({
		client_id: "client_id",
	});

	const services = makeTestServices({
		/**
		 * Most of these methods will send requests to the OpenID Provider,
		 * which we do not want to do in our tests. Instead, we will mock most
		 * of these methods to return a static response.
		 */
		openIdClient: {
			userinfo() {
				return Promise.resolve(userinfo);
			},
			/**
			 * We will keep the authorizationUrl method as is, as it is used to
			 * generate the authorization URL for the user to authenticate with
			 * the OpenID Provider. By keeping this, we can validate search parameters.
			 */
			authorizationUrl: (options) => client.authorizationUrl(options),
			callback() {
				return Promise.resolve(new TokenSet());
			},
			requestResource() {
				const body = Buffer.from(JSON.stringify(studyPrograms), "utf8");
				return Promise.resolve({ body });
			},
		},
	});
	await serverInstance.register(fastifyService, { services });
	async function makeUser(data: { feideId: string }) {
		const user = await services.users.create({
			email: faker.internet.exampleEmail({ firstName: faker.string.uuid() }),
			feideId: data.feideId,
			firstName: faker.person.firstName(),
			lastName: faker.person.lastName(),
			phoneNumber: "40000000",
			allergies: faker.lorem.sentence(),
			graduationYear: faker.date.future().getFullYear(),
			username: faker.string.uuid(),
		});
		return user;
	}

	async function performLogin({ userFeideId }: { userFeideId: string }) {
		await makeUser({
			feideId: userFeideId,
		});
		makeUserinfo({ sub: userFeideId });
		// login
		const loginResponse = await serverInstance.inject({
			method: "GET",
			url: "/auth/login",
		});
		const loginSessionCookie = loginResponse.cookies.find(
			(cookie) => cookie.name === env.SESSION_COOKIE_NAME,
		);
		assert(loginSessionCookie, "Session cookie not found");
		// callback
		const loginCallbackResponse = await serverInstance.inject({
			method: "GET",
			url: "/auth/login/callback?code=code",
			cookies: { [env.SESSION_COOKIE_NAME]: loginSessionCookie.value },
		});
		const authenticatedSessionCookie = loginCallbackResponse.cookies.find(
			(cookie) => cookie.name === env.SESSION_COOKIE_NAME,
		);
		assert(
			authenticatedSessionCookie,
			"Authenticated session cookie not found",
		);

		return {
			cookies: { [env.SESSION_COOKIE_NAME]: authenticatedSessionCookie.value },
			authenticatedSessionCookie,
		};
	}
	return {
		serverInstance,
		services,
		makeUser,
		makeUserinfo,
		makeStudyProgram,
		performLogin,
	};
}
