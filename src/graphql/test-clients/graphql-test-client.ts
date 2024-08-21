import assert from "node:assert";
import { faker } from "@faker-js/faker";
import type { ResultOf, VariablesOf } from "@graphql-typed-document-node/core";
import type {
	FastifyInstance,
	InjectOptions,
	LightMyRequestResponse,
} from "fastify";
import { GraphQLError } from "graphql";
import { makeTestServices } from "~/__tests__/dependencies-factory.js";
import {
	type MockOpenIdClient,
	newMockOpenIdClient,
} from "~/__tests__/mocks/openIdClient.js";
import { env } from "~/config.js";
import { fastifyServer } from "~/lib/fastify/fastify.js";
import fastifyService from "~/lib/fastify/service.js";
import type { Services } from "~/lib/server.js";
import { AuthService } from "~/services/auth/index.js";

/**
 * A test client for integration testing GraphQL resolvers.
 *
 * This class can be used to test GraphQL resolvers by using the `query` and `mutate` methods.
 *
 * ### Example
 *
 * ```ts
 * import { GraphQLTestClient } from "~/graphql/test-clients/graphqlTestClient.js";
 * import { graphql } from "~/graphql/test-clients/gql.js"
 * import { initServer } from "~/server.js";
 *
 * describe("GraphQL", () => {
 *  let server: Awaited<ReturnType<typeof initServer>>;
 *  let graphqlClient: GraphQLTestClient;
 *
 *  beforeAll(async () => {
 *      // Initialize the dependencies you want to inject into the server
 *      server = await initServer(deps, { port: 4000, host: "0.0.0.0"})
 *      graphqlClient = new GraphQLTestClient(server);
 *  });
 *
 *  it("example test", () => {
 *    const { data, errors, response } = await graphqlClient.query({
 *      query: graphql(`
 *          query example {
 *              __typename
 *          }
 *      `)
 *    })
 *    // Perform assertions
 *  })
 *
 *  afterAll(async () => {
 *     await server.close();
 *  });
 * });
 * ```
 */
export class GraphQLTestClient {
	public mockOpenIdClient: MockOpenIdClient;
	public services: Services;
	public app: FastifyInstance;

	constructor(options: {
		app: FastifyInstance;
		services: Services;
		mockOpenIdClient: MockOpenIdClient;
	}) {
		this.app = options.app;
		this.services = options.services;
		this.mockOpenIdClient = options.mockOpenIdClient;
	}

	public async performMockedLogin(
		user: UserLoginType,
	): Promise<{ cookies: Record<string, string>; userId: string }> {
		if ("id" in user) {
			const currentUser = await this.services?.users.get(user.id);
			this.mockOpenIdClient.updateUserResponseMock({
				id: currentUser.feideId,
				email: currentUser.email,
				name: `${currentUser.firstName} ${currentUser.lastName}`,
			});
			return await this.performLogin();
		}
		this.mockOpenIdClient.updateUserResponseMock({
			id: user.feideId,
			email: user.email ?? faker.internet.email(),
			name: user.name ?? faker.person.fullName(),
		});
		return await this.performLogin();
	}

	public async close(): Promise<void> {
		await this.app.close();
	}

	/**
	 * Perform a GraphQL mutation.
	 *
	 * If there are any errors in the response, they will be returned in the `errors` property,
	 * otherwise, `errors` is `undefined`.
	 *
	 * If there are any errors in the response, the `data` property will be `undefined`,
	 * otherwise, `data` is the result of the mutation.
	 *
	 * @param queryData.mutation - The GraphQL mutation
	 * @param queryData.varaibles - The variables to pass to the mutation
	 * @param options.request - The request options to pass to Fastify
	 * @param options.userId - The ID of the user to perform the mutation as
	 */
	public mutate<T>(
		queryData: MutationData<T>,
		options?: MutationOptions,
	): Promise<{
		data?: ResultOf<T>;
		errors?: GraphQLError[];
		response: LightMyRequestResponse;
	}> {
		const { mutation: query, variables } = queryData;
		return this.query(
			{
				query,
				variables,
			},
			options,
		);
	}

	/**
	 * Perform a GraphQL query.
	 *
	 * If there are any errors in the response, they will be returned in the `errors` property,
	 * otherwise, `errors` is `undefined`.
	 *
	 * If there are any errors in the response, the `data` property will be `undefined`,
	 * otherwise, `data` is the result of the mutation.
	 *
	 * @param queryData.query - The GraphQL query
	 * @param queryData.variables - The variables to pass to the mutation
	 * @param options.request - The request options to pass to Fastify
	 * @param options.userId - The ID of the user to perform the query as
	 */
	public async query<T>(
		queryData: QueryData<T>,
		options?: QueryOptions,
	): Promise<{
		data?: ResultOf<T>;
		errors?: GraphQLError[];
		response: LightMyRequestResponse;
	}> {
		const { query, variables } = queryData;
		const { request, user } = options ?? {};
		let cookies: Record<string, string> | undefined;

		if (user) {
			const res = await this.performMockedLogin(user);
			cookies = res.cookies;
			this.app.log.info({ user: res }, "Logged in as user");
		}

		const response = await this.app.inject({
			method: "POST",
			url: "/graphql",
			payload: {
				query,
				variables,
			},
			cookies,
			...request,
		});

		let errors: GraphQLError[] | undefined;

		const parsedBody = JSON.parse(response.body);
		if ("errors" in parsedBody) {
			errors = parsedBody.errors.map(
				(err: {
					message: string;
					path?: string[];
					extensions?: { code: string };
				}) => new GraphQLError(err.message, { ...err }),
			);
		}

		const { data } = response.json<{ data: ResultOf<T> }>();
		return { errors, data, response };
	}

	async performLogin(): Promise<{
		cookies: Record<string, string>;
		userId: string;
	}> {
		const loginResponse = await this.app.inject({
			method: "GET",
			url: "/auth/login",
		});
		const sessionCookie = loginResponse.cookies.find(
			(cookie) => cookie.name === env.SESSION_COOKIE_NAME,
		)?.value;
		assert(sessionCookie, "Session cookie not found");

		const callbackResponse = await this.app.inject({
			method: "GET",
			url: "/auth/login/callback",
			query: {
				code: "code",
			},
			cookies: {
				[env.SESSION_COOKIE_NAME]: sessionCookie,
			},
		});
		const authenticatedCookie = callbackResponse.cookies.find(
			(cookie) => cookie.name === env.SESSION_COOKIE_NAME,
		)?.value;
		assert(authenticatedCookie, "Authenticated cookie not found");

		const userInfo = await this.app.inject({
			method: "GET",
			url: "/auth/me",
			cookies: {
				[env.SESSION_COOKIE_NAME]: authenticatedCookie,
			},
		});
		const { user } = await userInfo.json();
		return {
			cookies: { [env.SESSION_COOKIE_NAME]: authenticatedCookie },
			userId: user,
		};
	}
}

/**
 * Returns a GraphQLTestClient that allows for simple integration testing of GraphQL resolvers,
 * including session management by relying on mocked authentication towards Feide.
 * @param options.port - The port to run the server on
 *
 * * A test client for integration testing GraphQL resolvers.
 *
 * This class can be used to test GraphQL resolvers by using the `query` and `mutate` methods.
 *
 * ### Example
 *
 * ```ts
 * import { newGraphqlTestClient } from "~/graphql/test-clients/graphqlTestClient.js";
 * import { graphql } from "~/graphql/test-clients/gql.js"
 * import { initServer } from "~/server.js";
 *
 * describe("GraphQL", () => {
 *  let client: GraphQLTestClient;
 *
 *  beforeAll(async () => {
 *      // initialize the test client
 *     client = await newGraphQLTestClient();
 *  });
 *
 *  it("example test", () => {
 *    const { data, errors, response } = await graphqlClient.query({
 *      query: graphql(`
 *          query example {
 *              __typename
 *          }
 *      `)
 *    },
 *    // Optionally, pass the ID of the user to perform the query authenticated as the user.
 *    {
 *      userId: "some-user-id"
 *    }
 *   )
 *    // Perform assertions
 *  })
 *
 *  afterAll(async () => {
 *     await client.close();
 *  });
 * });
 * ```
 */
export async function newGraphQLTestClient(
	overrides?: Partial<Services>,
): Promise<GraphQLTestClient> {
	const mockOpenIdClient = newMockOpenIdClient();
	const defaultServices = makeTestServices(overrides);
	const authService = new AuthService(defaultServices.users, mockOpenIdClient);
	const services = {
		...defaultServices,
		auth: authService,
	};

	const { serverInstance } = await fastifyServer(env);
	await serverInstance.register(fastifyService, { services });

	return new GraphQLTestClient({
		app: serverInstance,
		services,
		mockOpenIdClient,
	});
}

type UserLoginType =
	| { feideId: string; email?: string; name?: string }
	| { id: string };

type QueryOptions = {
	user?: UserLoginType;
	request?: InjectOptions;
};

type MutationOptions = QueryOptions;

type QueryData<T> = {
	query: T;
	variables?: VariablesOf<T>;
};

type MutationData<T> = {
	mutation: T;
	variables?: VariablesOf<T>;
};
