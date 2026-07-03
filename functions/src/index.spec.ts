import { testHandler } from "./index.js";

describe("testHandler", () => {
  it("returns expected message", () => {
    expect(testHandler()).toEqual({ message: "Test from index 3" });
  });
});
