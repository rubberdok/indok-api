import { faker } from "@faker-js/faker";
import { InternalServerError } from "~/domain/errors.js";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";

describe("Product mutations", () => {
	describe("#initiatePaymentAttempt", () => {
		it("should initiate a payment attempt", async () => {
			const { productService, client } = createMockApolloServer();
			productService.payments.initiatePaymentAttempt.mockResolvedValueOnce({
				ok: true,
				data: {
					redirectUrl: faker.internet.url(),
				},
			});
			const { data, errors } = await client.mutate({
				mutation: graphql(`
                    mutation initiatePaymentAttempt($data: InitiatePaymentAttemptInput!) {
                        initiatePaymentAttempt(data: $data) {
                            redirectUrl
                        }
                    }
                `),
				variables: {
					data: {
						orderId: faker.string.uuid(),
					},
				},
			});
			expect(errors).toBeUndefined();
			expect(data?.initiatePaymentAttempt).toEqual({
				redirectUrl: expect.any(String),
			});
		});

		it("should throw if ok: false", async () => {
			const { productService, client } = createMockApolloServer();
			productService.payments.initiatePaymentAttempt.mockResolvedValueOnce({
				ok: false,
				error: new InternalServerError("Some error"),
			});
			const { errors } = await client.mutate({
				mutation: graphql(`
                    mutation initiatePaymentAttempt($data: InitiatePaymentAttemptInput!) {
                        initiatePaymentAttempt(data: $data) {
                            redirectUrl
                        }
                    }
                `),
				variables: {
					data: {
						orderId: faker.string.uuid(),
					},
				},
			});
			expect(errors).toBeDefined();
		});
	});
});
