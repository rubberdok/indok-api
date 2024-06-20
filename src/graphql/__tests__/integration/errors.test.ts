import { faker } from "@faker-js/faker";
import { jest } from "@jest/globals";
import * as Sentry from "@sentry/node";
import { GraphQLError } from "graphql";
import { type DeepMockProxy, mockDeep } from "jest-mock-extended";
import { InternalServerError, errorCodes } from "~/domain/errors.js";
import {
	type GraphQLTestClient,
	newGraphQLTestClient,
} from "~/graphql/test-clients/graphql-test-client.js";
import { graphql } from "~/graphql/test-clients/integration/gql.js";
import prisma from "~/lib/prisma.js";
import type { IOrganizationService } from "~/lib/server.js";

describe("GraphQL error handling", () => {
	let client: GraphQLTestClient;
	let mockOrganizationService: DeepMockProxy<IOrganizationService>;

	afterEach(async () => {
		await Sentry.close(0);
	});

	afterAll(async () => {
		await client.close();
	});

	beforeAll(async () => {
		mockOrganizationService = mockDeep<IOrganizationService>();
		client = await newGraphQLTestClient({
			organizations: mockOrganizationService,
		});
	});

	it("should not report bad GraphQL request errors to Sentry", async () => {
		const mockErrorHandler = jest.fn();
		Sentry.init({
			beforeSend(event, hint) {
				mockErrorHandler(hint.originalException);
				return event;
			},
		});

		const { errors } = await client.mutate({
			mutation: graphql(`
        mutation ErrorMutation($data: CreateOrganizationInput!) {
          createOrganization(data: $data) {
            organization {
              id
            }
          }
        }
      `),
			// variables are intentionally omitted to trigger a user-facing error
		});

		expect(errors).toHaveLength(1);
		await Sentry.flush();
		expect(mockErrorHandler).not.toHaveBeenCalled();
	});

	it("should report not permission denied errors to Sentry", async () => {
		const mockErrorHandler = jest.fn();
		Sentry.init({
			beforeSend(event, hint) {
				mockErrorHandler(hint.originalException);
				return event;
			},
		});

		const { errors } = await client.query({
			query: graphql(`
        mutation SuperQuery($id: ID!, $data: SuperUpdateUserInput!) {
          superUpdateUser(id: $id, data: $data) {
            user {
              id
            }
          }
        }
      `),
			variables: {
				id: faker.string.uuid(),
				data: {
					isSuperUser: true,
				},
			},
		});

		expect(errors).toHaveLength(1);
		await Sentry.flush();
		expect(mockErrorHandler).not.toHaveBeenCalled();
	});

	it("should report unexpected errors to sentry", async () => {
		const mockErrorHandler = jest.fn();
		Sentry.init({
			beforeSend(event, hint) {
				mockErrorHandler(hint.originalException);
				return event;
			},
		});

		const userId = faker.string.uuid();
		await prisma.user.create({
			data: {
				id: userId,
				email: faker.internet.email(),
				firstName: faker.person.firstName(),
				lastName: faker.person.lastName(),
				username: faker.string.sample(20),
				feideId: faker.string.uuid(),
			},
		});
		mockOrganizationService.organizations.findMany.mockRejectedValue(
			new InternalServerError("Test Internal Server Error"),
		);

		const { errors } = await client.mutate(
			{
				mutation: graphql(`
          query ErrOrganizations {
            organizations {
              organizations {
                id
              }
            }
          }
        `),
			},
			{
				user: {
					id: userId,
				},
			},
		);

		expect(mockOrganizationService.organizations.findMany).toHaveBeenCalled();
		expect(errors).toHaveLength(1);
		expect(
			errors?.some(
				(error) =>
					error.extensions.code === errorCodes.ERR_INTERNAL_SERVER_ERROR,
			),
		).toBe(true);
		await Sentry.flush();
		expect(mockErrorHandler).toHaveBeenCalledWith(
			new GraphQLError("Test Internal Server Error"),
		);
	});
});
