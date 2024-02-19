import { faker } from "@faker-js/faker";
import { mock } from "jest-mock-extended";
import type { BookingType } from "~/domain/cabins.js";
import { errorCodes } from "~/domain/errors.js";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";

describe("Cabin mutations", () => {
	describe("updateBookingStatus", () => {
		it("should raise PermissionDeniedError if the user is not authenticated", async () => {
			const { client } = createMockApolloServer();

			const { errors } = await client.mutate({
				mutation: graphql(`
          mutation UpdateBookingStatus($data: UpdateBookingStatusInput!) {
            updateBookingStatus(data: $data) {
              booking {
                id
              }
            }
          }
        `),
				variables: {
					data: {
						id: faker.string.uuid(),
						status: "PENDING",
					},
				},
			});
			expect(errors).toBeDefined();
			expect(
				errors?.some(
					(err) => err.extensions?.code === errorCodes.ERR_PERMISSION_DENIED,
				),
			).toBe(true);
		});

		it("should call updateBookingStatus with the correct arugments if authenticated", async () => {
			const { client, cabinService, createMockContext } =
				createMockApolloServer();

			const id = faker.string.uuid();
			const userId = faker.string.uuid();
			const authenticatedContext = createMockContext({ user: { id: userId } });
			cabinService.updateBookingStatus.mockResolvedValueOnce({
				ok: true,
				data: {
					booking: mock<BookingType>({ id }),
				},
			});

			const { errors } = await client.mutate(
				{
					mutation: graphql(`
            mutation UpdateBookingStatus($data: UpdateBookingStatusInput!) {
              updateBookingStatus(data: $data) {
                booking {
                  id
                }
              }
            }
          `),
					variables: {
						data: {
							id,
							status: "PENDING",
						},
					},
				},
				{
					contextValue: authenticatedContext,
				},
			);

			expect(errors).toBeUndefined();
			expect(cabinService.updateBookingStatus).toHaveBeenCalledWith(
				expect.anything(),
				id,
				"PENDING",
			);
		});
	});
});
