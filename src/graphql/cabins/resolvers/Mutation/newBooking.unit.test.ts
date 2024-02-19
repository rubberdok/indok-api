import { faker } from "@faker-js/faker";
import { mock } from "jest-mock-extended";
import type { BookingType } from "~/domain/cabins.js";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";
import type { NewBookingMutationVariables } from "~/graphql/test-clients/unit/graphql.js";

describe("Cabin mutations", () => {
	describe("newBooking", () => {
		it("should create a new booking", async () => {
			const { client, cabinService } = createMockApolloServer();
			cabinService.newBooking.mockResolvedValue({
				ok: true,
				data: {
					booking: mock<BookingType>({ id: faker.string.uuid() }),
				},
			});

			const data: NewBookingMutationVariables["data"] = {
				cabins: [{ id: faker.string.uuid() }],
				startDate: new Date(2020, 0, 1),
				endDate: new Date(2020, 0, 2),
				email: faker.internet.exampleEmail(),
				firstName: faker.person.firstName(),
				lastName: faker.person.lastName(),
				phoneNumber: faker.phone.number(),
			};

			const { errors } = await client.mutate({
				mutation: graphql(`
          mutation newBooking($data: NewBookingInput!) {
            newBooking(data: $data) {
              booking {
                id
              }
            }
          }
        `),
				variables: {
					data,
				},
			});

			expect(errors).toBeUndefined();
			expect(cabinService.newBooking).toHaveBeenCalledWith(expect.any(Object), {
				cabins: data.cabins,
				startDate: data.startDate,
				endDate: data.endDate,
				email: data.email,
				firstName: data.firstName,
				lastName: data.lastName,
				phoneNumber: data.phoneNumber,
			});
		});
	});
});
