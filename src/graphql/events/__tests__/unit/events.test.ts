import { faker } from "@faker-js/faker";
import { Event } from "@prisma/client";
import { mock } from "jest-mock-extended";

import { createMockApolloServer } from "@/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "@/graphql/test-clients/unit/gql.js";

describe("Event queries", () => {
  describe("events", () => {
    it("should return a list of events", async () => {
      const { client, eventService } = createMockApolloServer();
      eventService.findMany.mockResolvedValue([mock<Event>({ id: faker.string.uuid() })]);

      const { errors, data } = await client.query({
        query: graphql(`
          query events {
            events {
              events {
                id
              }
              total
            }
          }
        `),
      });
      expect(errors).toBeUndefined();
      expect(eventService.findMany).toHaveBeenCalled();
      expect(data?.events.total).toBe(1);
    });
  });
});
