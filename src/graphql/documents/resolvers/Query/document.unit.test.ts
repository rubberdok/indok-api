import { faker } from "@faker-js/faker";
import { Document } from "~/domain/documents.js";
import {
  InternalServerError,
  NotFoundError,
  PermissionDeniedError,
  UnauthorizedError,
} from "~/domain/errors.js";
import { createMockApolloServer } from "~/graphql/test-clients/mock-apollo-server.js";
import { graphql } from "~/graphql/test-clients/unit/gql.js";
import { Result } from "~/lib/result.js";

describe("Document queries", () => {
  describe("{ document }", () => {
    it("returns a document", async () => {
      const { documents, client } = createMockApolloServer();

      const expected = new Document({
        id: faker.string.uuid(),
        createdAt: new Date(),
        fileId: faker.string.uuid(),
        name: faker.word.adjective(),
        updatedAt: new Date(),
        categories: [],
        description: faker.lorem.paragraph(),
      });

      documents.documents.find.mockResolvedValue({
        ok: true,
        data: {
          document: expected,
        },
      });

      const { data, errors } = await client.query({
        query: graphql(`
                    query Document {
                        document(data: { id: "123"}) {
                            document {
                                id
                            }
                        }
                    }
                `),
      });

      expect(errors).toBeUndefined();
      expect(data).toEqual({
        document: {
          document: {
            id: expected.id,
          },
        },
      });
    });

    it("returns null if not found", async () => {
      const { documents, client } = createMockApolloServer();
      documents.documents.find.mockResolvedValue(
        Result.error(new NotFoundError("")),
      );

      const { data, errors } = await client.query({
        query: graphql(`
                    query Document {
                        document(data: { id: "123"}) {
                            document {
                                id
                            }
                        }
                    }
                `),
      });

      expect(errors).toBeUndefined();
      expect(data).toEqual({
        document: {
          document: null,
        },
      });
    });

    it("returns null on unauthorized error", async () => {
      const { documents, client } = createMockApolloServer();
      documents.documents.find.mockResolvedValue(
        Result.error(new UnauthorizedError("")),
      );

      const { data, errors } = await client.query({
        query: graphql(`
                    query Document {
                        document(data: { id: "123"}) {
                            document {
                                id
                            }
                        }
                    }
                `),
      });

      expect(errors).toBeUndefined();
      expect(data).toEqual({
        document: {
          document: null,
        },
      });
    });

    it("returns null on permission denied", async () => {
      const { documents, client } = createMockApolloServer();
      documents.documents.find.mockResolvedValue(
        Result.error(new PermissionDeniedError("")),
      );

      const { data, errors } = await client.query({
        query: graphql(`
                    query Document {
                        document(data: { id: "123"}) {
                            document {
                                id
                            }
                        }
                    }
                `),
      });

      expect(errors).toBeUndefined();
      expect(data).toEqual({
        document: {
          document: null,
        },
      });
    });


    it("throws on internal server error", async () => {
      const { documents, client } = createMockApolloServer();
      documents.documents.find.mockResolvedValue(
        Result.error(new InternalServerError("something went wrong")),
      );

      const { errors } = await client.query({
        query: graphql(`
                    query Document {
                        document(data: { id: "123"}) {
                            document {
                                id
                            }
                        }
                    }
                `),
      });

      expect(errors).toBeDefined();
    });
  });
});
