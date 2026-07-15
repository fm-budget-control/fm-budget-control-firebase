import { AuthProviderAdapter } from "./auth-provider.adapter.js";
import { getAuth } from "../../../kernel/firebase-admin.js";

jest.mock("../../../kernel/firebase-admin.js", () => ({
  getAuth: jest.fn(),
}));

const mockGetAuth = getAuth as jest.Mock;

const params = {
  id: "user-id",
  email: "john@example.com",
  password: "password123",
  displayName: "John Doe",
};

describe("AuthProviderAdapter", () => {
  let adapter: AuthProviderAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new AuthProviderAdapter();
  });

  describe("createAccount", () => {
    it("creates a Firebase Auth account with id, email, password and display name", async () => {
      const mockCreateUser = jest.fn().mockResolvedValue(undefined);
      mockGetAuth.mockReturnValue({ createUser: mockCreateUser });

      const result = await adapter.createAccount(params);

      expect(result).toBe("created");
      expect(mockCreateUser).toHaveBeenCalledWith({
        uid: "user-id",
        email: "john@example.com",
        password: "password123",
        displayName: "John Doe",
      });
    });

    it("returns email-already-exists when the email is already registered", async () => {
      mockGetAuth.mockReturnValue({
        createUser: jest.fn().mockRejectedValue({ code: "auth/email-already-exists" }),
      });

      expect(await adapter.createAccount(params)).toBe("email-already-exists");
    });

    it("returns email-already-exists when the uid is already registered", async () => {
      mockGetAuth.mockReturnValue({
        createUser: jest.fn().mockRejectedValue({ code: "auth/uid-already-exists" }),
      });

      expect(await adapter.createAccount(params)).toBe("email-already-exists");
    });

    it("rethrows unexpected errors", async () => {
      const error = new Error("Auth service unavailable");
      mockGetAuth.mockReturnValue({ createUser: jest.fn().mockRejectedValue(error) });

      await expect(adapter.createAccount(params)).rejects.toThrow("Auth service unavailable");
    });
  });
});
