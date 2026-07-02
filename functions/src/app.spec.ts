import request from "supertest";
import { app } from "./app.js";

describe("GET /test", () => {
  it("returns 200 with expected message", async () => {
    const response = await request(app).get("/test");

    expect(response.status).toBe(200);
    expect(response.text).toBe("Test from index");
  });
});
