import assert from "assert";
import { ApolloServer } from "@apollo/server";
import { faker } from "@faker-js/faker";
import type { FastifySessionObject } from "@fastify/session";
import type {
	ResultOf,
	TypedDocumentNode,
	VariablesOf,
} from "@graphql-typed-document-node/core";
import type { FastifyBaseLogger, FastifyReply, FastifyRequest } from "fastify";
import type { GraphQLFormattedError } from "graphql";
import { mock, mockDeep } from "jest-mock-extended";
import type { User } from "~/domain/users.js";
import {
	type ApolloContext,
	getFormatErrorHandler,
} from "~/lib/apollo-server.js";
import { resolvers } from "../resolvers.generated.js";
import { typeDefs } from "../type-defs.generated.js";

interface QueryResult<
	T extends TypedDocumentNode<ResultOf<T>, VariablesOf<T>>,
> {
	data?: ResultOf<T>;
	errors?: readonly GraphQLFormattedError[];
}

class ApolloServerClient {
	constructor(
		public server: ApolloServer<ApolloContext>,
		private createMockContext: (data?: CreateMockContextData) => ApolloContext,
	) {}

	async query<T extends TypedDocumentNode<ResultOf<T>, VariablesOf<T>>>(
		request: { query: T; variables?: VariablesOf<T> },
		options?: { contextValue?: ApolloContext },
	): Promise<QueryResult<T>> {
		const contextValue = options?.contextValue ?? this.createMockContext({});
		// @ts-expect-error We can get more accurate typing for variables by using the `VariablesOf` helper
		// so we ignore the TS error raised here.
		const res = await this.server.executeOperation<ResultOf<T>, VariablesOf<T>>(
			{
				query: request.query,
				variables: request.variables,
			},
			{
				contextValue,
			},
		);

		assert(res.body.kind === "single");

		let errors: readonly GraphQLFormattedError[] | undefined;
		if (res.body.singleResult.errors) {
			errors = res.body.singleResult.errors;
		}

		let data: ResultOf<T> | undefined;
		if (res.body.singleResult.data) {
			data = res.body.singleResult.data;
		}

		return { data, errors };
	}

	public mutate<T extends TypedDocumentNode<ResultOf<T>, VariablesOf<T>>>(
		request: { mutation: T; variables?: VariablesOf<T> },
		options?: { contextValue?: ApolloContext },
	): Promise<QueryResult<T>> {
		const { mutation, variables } = request;
		return this.query({ query: mutation, variables }, options);
	}
}

export const createMockApolloServer = (logger?: Partial<FastifyBaseLogger>) => {
	const server = new ApolloServer<ApolloContext>({
		typeDefs: typeDefs,
		resolvers: resolvers,
		formatError: getFormatErrorHandler(logger),
		includeStacktraceInErrorResponses: true,
	});

	const userService = mockDeep<ApolloContext["userService"]>();
	const organizationService = mockDeep<ApolloContext["organizationService"]>();
	const cabinService = mockDeep<ApolloContext["cabinService"]>();
	const eventService = mockDeep<ApolloContext["eventService"]>();
	const listingService = mockDeep<ApolloContext["listingService"]>();
	const permissionService = mockDeep<ApolloContext["permissionService"]>();

	function createMockContext(data: CreateMockContextData = {}): ApolloContext {
		let session: Partial<FastifySessionObject> = {};
		let user: User | null = null;
		if ("user" in data && data.user) {
			user = { ...mock<User>(), ...data.user };
			session = {
				authenticated: true,
				userId: user.id,
			};
		} else if (("userId" in data && data.userId) || "authenticated" in data) {
			const { userId, authenticated } = data;
			session = {
				authenticated: authenticated ?? false,
				userId,
			};
			user = { ...mock<User>(), id: userId ?? faker.string.uuid() };
		}

		const contextValue = {
			req: mock<FastifyRequest>({
				log: mock<FastifyBaseLogger>(logger),
				session: mock<FastifySessionObject>(session),
			}),
			res: mock<FastifyReply>(),
			userService,
			organizationService,
			cabinService,
			eventService,
			listingService,
			permissionService,
			user,
		};

		return contextValue;
	}

	const client = new ApolloServerClient(server, createMockContext);

	return {
		userService,
		organizationService,
		cabinService,
		eventService,
		listingService,
		createMockContext,
		permissionService,
		server,
		client,
	};
};

type CreateMockContextData =
	| { user?: (Partial<User> & { id: string }) | null }
	| DeprectatedCreateMockContextData;

type DeprectatedCreateMockContextData = Partial<{
	userId: string;
	authenticated: boolean;
}>;
