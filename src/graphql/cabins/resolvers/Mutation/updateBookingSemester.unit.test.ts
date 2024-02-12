import { faker } from "@faker-js/faker";
import type { BookingSemester } from "@prisma/client";
import { mock } from "jest-mock-extended";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";
import type { UpdateBookingSemesterInput } from "~/graphql/test-clients/unit/graphql.js";

describe("Cabin mutations", () => {
	describe("updateBookingSemester", () => {
		it("should call updateBookingSemester on the cabinService if authenticated", async () => {
			/**
			 * Arrange
			 *
			 * Mock the cabinService and create a context with an authenticated user.
			 */
			const { client, cabinService, createMockContext } =
				createMockApolloServer();
			cabinService.updateBookingSemester.mockResolvedValue(
				mock<BookingSemester>({
					id: faker.string.uuid(),
				}),
			);
			const authenticatedContext = createMockContext({
				user: { id: faker.string.uuid() },
			});
			const data: UpdateBookingSemesterInput = {
				semester: "SPRING",
				startAt: new Date(2020, 0, 1),
				endAt: new Date(2020, 0, 2),
				bookingsEnabled: true,
			};

			// Act
			const { errors } = await client.mutate(
				{
					mutation: graphql(`
            mutation updateBookingSemester($data: UpdateBookingSemesterInput!) {
              updateBookingSemester(data: $data) {
                bookingSemester {
                  id
                }
              }
            }
          `),
					variables: {
						data,
					},
				},
				{ contextValue: authenticatedContext },
			);

			/**
			 * Assert
			 *
			 * Verify that the cabinService was called with the correct arguments, and no errors were raised.
			 */
			expect(errors).toBeUndefined();
			expect(cabinService.updateBookingSemester).toHaveBeenCalledWith(
				authenticatedContext.user?.id,
				{
					semester: data.semester,
					startAt: data.startAt,
					endAt: data.endAt,
					bookingsEnabled: data.bookingsEnabled,
				},
			);
		});
	});
});
