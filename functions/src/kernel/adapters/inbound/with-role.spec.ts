import type { CallableRequest } from "firebase-functions/v2/https";
import { withRole } from "./with-role.js";

function requestWithRole(role?: unknown): CallableRequest {
  return { auth: { uid: "user-id", token: { role } } } as unknown as CallableRequest;
}

describe("withRole", () => {
  const handler = jest.fn().mockReturnValue("handler-result");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("throws unauthenticated when the request has no auth context", () => {
    const guarded = withRole("user", handler);

    expect(() => guarded({} as CallableRequest)).toThrow(
      expect.objectContaining({ code: "unauthenticated" }),
    );
    expect(handler).not.toHaveBeenCalled();
  });

  it("throws permission-denied when the token has no role claim", () => {
    const guarded = withRole("user", handler);

    expect(() => guarded(requestWithRole(undefined))).toThrow(
      expect.objectContaining({ code: "permission-denied" }),
    );
    expect(handler).not.toHaveBeenCalled();
  });

  it("throws permission-denied when the role is not recognized", () => {
    const guarded = withRole("user", handler);

    expect(() => guarded(requestWithRole("superuser"))).toThrow(
      expect.objectContaining({ code: "permission-denied" }),
    );
  });

  it("throws permission-denied when the role rank is below the required one", () => {
    const guarded = withRole("admin", handler);

    expect(() => guarded(requestWithRole("user"))).toThrow(
      expect.objectContaining({ code: "permission-denied" }),
    );
  });

  it("invokes the handler when the role matches the required one", () => {
    const guarded = withRole("user", handler);
    const request = requestWithRole("user");

    expect(guarded(request)).toBe("handler-result");
    expect(handler).toHaveBeenCalledWith(request);
  });

  it("lets an admin call an endpoint that requires the user role", () => {
    const guarded = withRole("user", handler);

    expect(guarded(requestWithRole("admin"))).toBe("handler-result");
  });
});
