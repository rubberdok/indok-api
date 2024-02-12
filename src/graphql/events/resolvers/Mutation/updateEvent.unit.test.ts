import { faker } from "@faker-js/faker";
import { mock } from "jest-mock-extended";
import type { EventType } from "~/domain/events/event.js";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";

describe("Event mutations", () => {
	describe("updateEvent", () => {
		it("should pass all arugments to update", async () => {
			const { client, createMockContext, eventService } =
				createMockApolloServer();
			const authenticatedContext = createMockContext({
				user: { id: faker.string.uuid() },
			});
			eventService.update.mockResolvedValueOnce({
				ok: true,
				data: {
					event: mock<EventType>({ id: faker.string.uuid() }),
					categories: [],
					slots: [],
				},
			});
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
				},
			);

			expect(errors).toBeUndefined();
			expect(eventService.update).toHaveBeenCalledWith(authenticatedContext, {
				event: {
					id: eventId,
					name: expect.any(String),
					description: expect.any(String),
					startAt: expect.any(Date),
					endAt: expect.any(Date),
					location: expect.any(String),
					capacity: expect.any(Number),
				},
			});
		});
	});
});
