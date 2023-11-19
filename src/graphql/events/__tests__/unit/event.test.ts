import { faker } from "@faker-js/faker";
import { Event } from "@prisma/client";
import { mock } from "jest-mock-extended";

import { createMockApolloServer } from "@/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "@/graphql/test-clients/unit/gql.js";

describe("Event queries", () => {
  describe("event", () => {
    it("should return an event", async () => {
      const { client, eventService } = createMockApolloServer(console);
      eventService.get.mockResolvedValue(mock<Event>({ id: faker.string.uuid() }));

      const { errors } = await client.query({
        query: graphql(`
          query event($data: EventInput!) {
            event(data: $data) {
              event {
                id
              }
            }
          }
        `),
        variables: {
          data: { id: faker.string.uuid() },
        },
      });

      expect(errors).toBeUndefined();
      expect(eventService.get).toHaveBeenCalledWith(expect.any(String));
    });
  });
});
