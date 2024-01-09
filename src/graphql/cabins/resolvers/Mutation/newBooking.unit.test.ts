import { faker } from "@faker-js/faker";
import type { Booking } from "@prisma/client";
import { mock } from "jest-mock-extended";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";
import type { NewBookingMutationVariables } from "~/graphql/test-clients/unit/graphql.js";

describe("Cabin mutations", () => {
	describe("newBooking", () => {
		it("should create a new booking", async () => {
			const { client, cabinService } = createMockApolloServer();
			cabinService.newBooking.mockResolvedValue(
				mock<Booking>({ id: faker.string.uuid() }),
			);

			const data: NewBookingMutationVariables["data"] = {
				cabinId: faker.string.uuid(),
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
			expect(cabinService.newBooking).toHaveBeenCalledWith({
				cabinId: data.cabinId,
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
