import { faker } from "@faker-js/faker";
import { Booking } from "@prisma/client";
import { mock } from "jest-mock-extended";

import { createMockApolloServer } from "@/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "@/graphql/test-clients/unit/gql.js";

describe("Cabin mutations", () => {
  describe("newBooking", () => {
    it("should create a new booking", async () => {
      const { client, cabinService } = createMockApolloServer(console);
      cabinService.newBooking.mockResolvedValue(mock<Booking>({ id: faker.string.uuid() }));

      const { errors } = await client.mutate({
        mutation: graphql(`
          mutation newBooking($data: NewBookingInput!) {
            newBooking(data: $data) {
              id
            }
          }
        `),
        variables: {
          data: {
            cabinId: faker.string.uuid(),
            startDate: new Date(2020, 0, 1),
            endDate: new Date(2020, 0, 2),
            email: faker.internet.exampleEmail(),
            firstName: faker.person.firstName(),
            lastName: faker.person.lastName(),
            phoneNumber: faker.phone.number(),
          },
        },
      });

      expect(errors).toBeUndefined();
    });
  });
});
