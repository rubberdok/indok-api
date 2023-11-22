import { faker } from "@faker-js/faker";
import { BookingContact } from "@prisma/client";
import { mock } from "jest-mock-extended";

import { createMockApolloServer } from "@/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "@/graphql/test-clients/unit/gql.js";

describe("Cabin queries", () => {
  describe("bookingContact", () => {
    it("should not require authentication", async () => {
      const { client, cabinService } = createMockApolloServer();
      cabinService.getBookingContact.mockResolvedValueOnce(
        mock<BookingContact>({
          id: "booking-contact",
          name: faker.person.fullName(),
          email: faker.internet.email(),
          phoneNumber: faker.phone.number(),
        })
      );

      const { errors } = await client.query({
        query: graphql(`
          query BookingContact {
            bookingContact {
              bookingContact {
                id
                name
                phoneNumber
                email
              }
            }
          }
        `),
      });

      expect(errors).toBeUndefined();
      expect(cabinService.getBookingContact).toHaveBeenCalled();
    });
  });
});
