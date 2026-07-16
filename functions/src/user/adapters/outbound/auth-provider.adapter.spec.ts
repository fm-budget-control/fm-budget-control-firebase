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
      const mockSetCustomUserClaims = jest.fn().mockResolvedValue(undefined);
      mockGetAuth.mockReturnValue({
        createUser: mockCreateUser,
        setCustomUserClaims: mockSetCustomUserClaims,
      });

      const result = await adapter.createAccount(params);

      expect(result).toBe("created");
      expect(mockCreateUser).toHaveBeenCalledWith({
        uid: "user-id",
        email: "john@example.com",
        password: "password123",
        displayName: "John Doe",
      });
    });

    it("assigns the default user role as a custom claim on the new account", async () => {
      const mockSetCustomUserClaims = jest.fn().mockResolvedValue(undefined);
      mockGetAuth.mockReturnValue({
        createUser: jest.fn().mockResolvedValue(undefined),
        setCustomUserClaims: mockSetCustomUserClaims,
      });

      await adapter.createAccount(params);

      expect(mockSetCustomUserClaims).toHaveBeenCalledWith("user-id", { role: "user" });
    });

    it("returns email-already-exists when the email is already registered", async () => {
      mockGetAuth.mockReturnValue({
        createUser: jest.fn().mockRejectedValue({ code: "auth/email-already-exists" }),
        getUser: jest.fn().mockResolvedValue({ customClaims: { role: "user" } }),
      });

      expect(await adapter.createAccount(params)).toBe("email-already-exists");
    });

    it("returns email-already-exists when the uid is already registered", async () => {
      mockGetAuth.mockReturnValue({
        createUser: jest.fn().mockRejectedValue({ code: "auth/uid-already-exists" }),
        getUser: jest.fn().mockResolvedValue({ customClaims: { role: "user" } }),
      });

      expect(await adapter.createAccount(params)).toBe("email-already-exists");
    });

    it("assigns the default role when resuming an account that is missing the claim", async () => {
      const mockSetCustomUserClaims = jest.fn().mockResolvedValue(undefined);
      mockGetAuth.mockReturnValue({
        createUser: jest.fn().mockRejectedValue({ code: "auth/email-already-exists" }),
        getUser: jest.fn().mockResolvedValue({ customClaims: undefined }),
        setCustomUserClaims: mockSetCustomUserClaims,
      });

      expect(await adapter.createAccount(params)).toBe("email-already-exists");
      expect(mockSetCustomUserClaims).toHaveBeenCalledWith("user-id", { role: "user" });
    });

    it("preserves unrelated claims when filling in a missing role", async () => {
      const mockSetCustomUserClaims = jest.fn().mockResolvedValue(undefined);
      mockGetAuth.mockReturnValue({
        createUser: jest.fn().mockRejectedValue({ code: "auth/email-already-exists" }),
        getUser: jest.fn().mockResolvedValue({ customClaims: { tenant: "acme" } }),
        setCustomUserClaims: mockSetCustomUserClaims,
      });

      await adapter.createAccount(params);

      expect(mockSetCustomUserClaims).toHaveBeenCalledWith("user-id", {
        tenant: "acme",
        role: "user",
      });
    });

    it("does not overwrite an existing role when resuming", async () => {
      const mockSetCustomUserClaims = jest.fn();
      mockGetAuth.mockReturnValue({
        createUser: jest.fn().mockRejectedValue({ code: "auth/email-already-exists" }),
        getUser: jest.fn().mockResolvedValue({ customClaims: { role: "admin" } }),
        setCustomUserClaims: mockSetCustomUserClaims,
      });

      expect(await adapter.createAccount(params)).toBe("email-already-exists");
      expect(mockSetCustomUserClaims).not.toHaveBeenCalled();
    });

    it("propagates failures from the role reconciliation", async () => {
      mockGetAuth.mockReturnValue({
        createUser: jest.fn().mockRejectedValue({ code: "auth/email-already-exists" }),
        getUser: jest.fn().mockRejectedValue(new Error("Auth service unavailable")),
      });

      await expect(adapter.createAccount(params)).rejects.toThrow("Auth service unavailable");
    });

    it("rethrows unexpected errors", async () => {
      const error = new Error("Auth service unavailable");
      mockGetAuth.mockReturnValue({ createUser: jest.fn().mockRejectedValue(error) });

      await expect(adapter.createAccount(params)).rejects.toThrow("Auth service unavailable");
    });
  });
});
