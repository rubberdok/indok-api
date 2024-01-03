import { faker } from "@faker-js/faker";
import { ResultOf, VariablesOf } from "@graphql-typed-document-node/core";
import { PrismaClient } from "@prisma/client";
import {
	FastifyInstance,
	InjectOptions,
	LightMyRequestResponse,
} from "fastify";
import { GraphQLError } from "graphql";
import { defaultTestDependenciesFactory } from "~/__tests__/dependencies-factory.js";
import {
	MockOpenIdClient,
	newMockOpenIdClient,
} from "~/__tests__/mocks/openIdClient.js";
import { env } from "~/config.js";
import { ApolloServerDependencies } from "~/lib/apollo-server.js";
import { createServer } from "~/server.js";

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
	public dependencies: ReturnType<typeof defaultTestDependenciesFactory>;
	public app: FastifyInstance;

	constructor(options: {
		app: FastifyInstance;
		dependencies: ReturnType<typeof defaultTestDependenciesFactory>;
		mockOpenIdClient: MockOpenIdClient;
	}) {
		this.app = options.app;
		this.dependencies = options.dependencies;
		this.mockOpenIdClient = options.mockOpenIdClient;
	}

	public async performMockedLogin(
		data:
			| { userId: string }
			| { feideId: string; email?: string; name?: string },
	): Promise<{ cookies: Record<string, string>; userId: string }> {
		if ("userId" in data) {
			const user =
				await this.dependencies?.apolloServerDependencies.userService.get(
					data.userId,
				);
			this.mockOpenIdClient.updateUserResponseMock({
				id: user.feideId,
				email: user.email,
				name: `${user.firstName} ${user.lastName}`,
			});
			return await this.performLogin();
		}
		this.mockOpenIdClient.updateUserResponseMock({
			id: data.feideId,
			email: data.email ?? faker.internet.email(),
			name: data.name ?? faker.person.fullName(),
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
		queryData: {
			mutation: T;
			variables?: VariablesOf<T>;
		},
		options?: {
			request?: InjectOptions;
			userId?: string;
		},
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
		queryData: {
			query: T;
			variables?: VariablesOf<T>;
		},
		options?: {
			userId?: string;
			user?: { feideId: string; email?: string; name?: string };
			request?: InjectOptions;
		},
	): Promise<{
		data?: ResultOf<T>;
		errors?: GraphQLError[];
		response: LightMyRequestResponse;
	}> {
		const { query, variables } = queryData;
		const { request, userId, user } = options ?? {};
		let cookies: Record<string, string> | undefined;
		if (userId) {
			const res = await this.performMockedLogin({ userId });
			cookies = res.cookies;
			this.app.log.info({ userId }, "Logged in as user");
		} else if (user) {
			const res = await this.performMockedLogin(user);
			cookies = res.cookies;
			this.app.log.info({ userId: user.feideId }, "Logged in as user");
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
		const redirectUrl = await this.app.inject({
			method: "GET",
			url: "/auth/login",
		});
		const sessionCookie = redirectUrl.cookies[0]?.value ?? "";

		const authenticateResponse = await this.app.inject({
			method: "GET",
			url: "/auth/authenticate",
			query: {
				code: "code",
			},
			cookies: {
				[env.SESSION_COOKIE_NAME]: sessionCookie,
			},
		});
		const authenticatedCookie = authenticateResponse.cookies[0]?.value ?? "";

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
	overrideDependencies: Partial<{
		apolloServerDependencies: Partial<ApolloServerDependencies>;
		openIdClient: MockOpenIdClient;
		prismaClient: PrismaClient;
	}> = {},
): Promise<GraphQLTestClient> {
	const mockOpenIdClient = newMockOpenIdClient();
	const dependencies = defaultTestDependenciesFactory({
		openIdClient: mockOpenIdClient,
		...overrideDependencies,
	});

	const app = await createServer(dependencies);
	return new GraphQLTestClient({ app, dependencies, mockOpenIdClient });
}
