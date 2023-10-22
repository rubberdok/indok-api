import { initServer } from "../../server.js";

describe("Server", () => {
  let server: Awaited<ReturnType<typeof initServer>> | void;

  beforeAll(async () => {
    server = await initServer();
  });

  test("Get data from server", async () => {
    await server?.inject({ method: "GET", url: "/-/health" }).then((res) => {
      expect(res.statusCode).toBe(200);
    });
  });

  afterAll(() => {
    server?.close();
  });
});
