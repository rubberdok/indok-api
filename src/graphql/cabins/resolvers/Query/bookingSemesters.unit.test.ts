import { BookingSemester, Semester } from "@prisma/client";
import { mock } from "jest-mock-extended";

import { createMockApolloServer } from "@/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "@/graphql/test-clients/unit/gql.js";

describe("Cabin queries", () => {
  describe("bookingSemesters", () => {
    it("should resolve for FALL and SPRING, respectively", async () => {
      /**
       * Arrange
       *
       * Set up mock responses for getBookingSemester
       */
      const { client, cabinService } = createMockApolloServer();

      cabinService.getBookingSemester.mockImplementation(async (semester: Semester) => {
        return mock<BookingSemester>({ semester });
      });

      const { data, errors } = await client.query({
        query: graphql(`
          query BookingSemesters {
            bookingSemesters {
              fall {
                semester
              }
              spring {
                semester
              }
            }
          }
        `),
      });

      expect(errors).toBeUndefined();
      expect(data?.bookingSemesters).toEqual({
        fall: {
          semester: Semester.FALL,
        },
        spring: {
          semester: Semester.SPRING,
        },
      });
    });
  });
});
