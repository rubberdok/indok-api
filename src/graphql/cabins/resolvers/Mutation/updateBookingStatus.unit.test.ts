import { faker } from "@faker-js/faker";
import { mock } from "jest-mock-extended";
import type { BookingType } from "~/domain/cabins.js";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";

describe("Cabin mutations", () => {
	describe("updateBookingStatus", () => {
		it("calls updateBookingStatus with parameters", async () => {
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
							feedback: "feedback",
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
				{
					bookingId: id,
					status: "PENDING",
					feedback: "feedback",
				},
			);
		});
	});
});
