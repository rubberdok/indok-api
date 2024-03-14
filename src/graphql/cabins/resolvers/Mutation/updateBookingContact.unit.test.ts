import { faker } from "@faker-js/faker";
import { errorCodes } from "~/domain/errors.js";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";

describe("Cabin mutations", () => {
	describe("updateBookingContact", () => {
		it("should raise PermissionDeniedError if the user is not authenticated", async () => {
			const { client } = createMockApolloServer();

			const name = faker.person.fullName();
			const email = faker.internet.email();
			const phoneNumber = faker.phone.number();

			const { errors } = await client.mutate({
				mutation: graphql(`
          mutation UpdateBookingContact($data: UpdateBookingContactInput!) {
            updateBookingContact(data: $data) {
              bookingContact {
                id
              }
            }
          }
        `),
				variables: {
					data: {
						name,
						email,
						phoneNumber,
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

		it("should call updateBookingContact with the correct arugments if authenticated", async () => {
			const { client, cabinService, createMockContext } =
				createMockApolloServer();

			const name = faker.person.fullName();
			const email = faker.internet.email();
			const phoneNumber = faker.phone.number();
			const userId = faker.string.uuid();
			const authenticatedContext = createMockContext({
				user: { id: userId },
			});
			cabinService.updateBookingContact.mockResolvedValueOnce({
				id: "booking-contact",
				name,
				email,
				phoneNumber,
				updatedAt: new Date(),
			});

			const { errors } = await client.mutate(
				{
					mutation: graphql(`
            mutation UpdateBookingContact($data: UpdateBookingContactInput!) {
              updateBookingContact(data: $data) {
                bookingContact {
                  id
                }
              }
            }
          `),
					variables: {
						data: {
							name,
							email,
							phoneNumber,
						},
					},
				},
				{ contextValue: authenticatedContext },
			);

			expect(errors).toBeUndefined();
			expect(cabinService.updateBookingContact).toHaveBeenCalledWith(
				expect.anything(),
				{
					name,
					email,
					phoneNumber,
				},
			);
		});
	});
});
