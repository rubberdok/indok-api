import fetch from "node-fetch";

import { initServer } from "../../server.js";

describe("Server", () => {
  let server: Awaited<ReturnType<typeof initServer>>;

  beforeAll(async () => {
    server = await initServer();
  });

  test("Get data from server", async () => {
    const res = await fetch("http://0.0.0.0:4000/-/health");
    expect(res.status).toBe(200);
  });

  afterAll(() => {
    server.close();
  });
});
