import { ResultOf, VariablesOf } from "@graphql-typed-document-node/core";
import { FastifyInstance, InjectOptions, LightMyRequestResponse } from "fastify";
import { GraphQLError } from "graphql";

import { TypedDocumentString } from "./integration/graphql.js";

/**
 * A test client for integration testing GraphQL resolvers.
 *
 * This class can be used to test GraphQL resolvers by using the `query` and `mutate` methods.
 *
 * Example
 *
 * ```ts
 * import { GraphQLTestClient } from "@/graphql/test-clients/graphqlTestClient.js";
 * import { graphql } from "@/graphql/test-clients/gql.js"
 * import { initServer } from "@/server.js";
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
  constructor(public app: FastifyInstance) {}

  /**
   * Perform a GraphQL mutation.
   *
   * If there are any errors in the response, they will be returned in the `errors` property,
   * otherwise, `errors` is `undefined`.
   *
   * If there are any errors in the response, the `data` property will be `undefined`,
   * otherwise, `data` is the result of the mutation.
   *
   * @param options.mutation - The GraphQL mutation
   * @param options.varaibles - The variables to pass to the mutation
   * @param request.request - The request options to pass to Fastify
   */
  public async mutate<T extends TypedDocumentString<TResult, TVars>, TResult = any, TVars = any>(
    options: {
      mutation: T;
      variables?: VariablesOf<T>;
    },
    request?: InjectOptions
  ): Promise<{ data?: ResultOf<T>; errors?: GraphQLError[]; response: LightMyRequestResponse }> {
    return this.query(
      {
        query: options.mutation,
        variables: options.variables,
      },
      request
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
   * @param options.query - The GraphQL query
   * @param options.varaibles - The variables to pass to the mutation
   * @param request.request - The request options to pass to Fastify
   */
  public async query<T>(
    options: {
      query: T;
      variables?: VariablesOf<T>;
    },
    request?: InjectOptions
  ): Promise<{ data?: ResultOf<T>; errors?: GraphQLError[]; response: LightMyRequestResponse }> {
    const { query, variables } = options;
    const response = await this.app.inject({
      method: "POST",
      url: "/graphql",
      payload: {
        query,
        variables,
      },
      ...request,
    });

    let errors: GraphQLError[] | undefined;

    const parsedBody = JSON.parse(response.body);
    if ("errors" in parsedBody) {
      errors = parsedBody.errors.map(
        (err: { message: string; path?: string[]; extensions?: { code?: string } }) =>
          new GraphQLError(err.message, { ...err })
      );
    }

    const { data } = response.json<{ data: ResultOf<T> }>();
    return { errors, data, response };
  }
}
