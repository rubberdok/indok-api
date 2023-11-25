import { faker } from "@faker-js/faker";
import { Event } from "@prisma/client";
import { mock } from "jest-mock-extended";

import { errorCodes } from "@/domain/errors.js";
import { createMockApolloServer } from "@/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "@/graphql/test-clients/unit/gql.js";

describe("Event mutations", () => {
  describe("updateEvent", () => {
    it("should raise PermissionDeniedError if user is not authenticated", async () => {
      const { client } = createMockApolloServer();

      const { errors } = await client.mutate({
        mutation: graphql(`
          mutation UpdateEventWithNoAuth($id: ID!, $data: UpdateEventInput!) {
            updateEvent(id: $id, data: $data) {
              event {
                id
              }
            }
          }
        `),
        variables: {
          id: faker.string.uuid(),
          data: {
            name: faker.lorem.words(3),
            description: faker.lorem.paragraph(),
            startAt: faker.date.future(),
            endAt: faker.date.future(),
            location: faker.location.streetAddress(),
            capacity: faker.number.int({ min: 1, max: 100 }),
          },
        },
      });

      expect(errors).toBeDefined();
      expect(errors?.every((e) => e.extensions?.code === errorCodes.ERR_PERMISSION_DENIED)).toBe(true);
    });

    it("should pass all arugments to update if authenticated", async () => {
      const { client, createMockContext, eventService } = createMockApolloServer();
      const authenticatedContext = createMockContext({ userId: faker.string.uuid(), authenticated: true });
      eventService.update.mockResolvedValueOnce(mock<Event>({ id: faker.string.uuid() }));
      const eventId = faker.string.uuid();

      const { errors } = await client.mutate(
        {
          mutation: graphql(`
            mutation UpdateEventWithAuth($id: ID!, $data: UpdateEventInput!) {
              updateEvent(id: $id, data: $data) {
                event {
                  id
                }
              }
            }
          `),
          variables: {
            id: eventId,
            data: {
              name: faker.lorem.words(3),
              description: faker.lorem.paragraph(),
              startAt: faker.date.future(),
              endAt: faker.date.future(),
              location: faker.location.streetAddress(),
              capacity: faker.number.int({ min: 1, max: 100 }),
            },
          },
        },
        {
          contextValue: authenticatedContext,
        }
      );

      expect(errors).toBeUndefined();
      expect(eventService.update).toHaveBeenCalledWith(authenticatedContext.req.session.userId, eventId, {
        name: expect.any(String),
        description: expect.any(String),
        startAt: expect.any(Date),
        endAt: expect.any(Date),
        location: expect.any(String),
        capacity: expect.any(Number),
      });
    });
  });
});
