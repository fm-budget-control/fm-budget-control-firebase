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

      expect(result).toEqual({ status: "created", uid: "user-id" });
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
        getUserByEmail: jest
          .fn()
          .mockResolvedValue({ uid: "user-id", customClaims: { role: "user" } }),
      });

      expect(await adapter.createAccount(params)).toEqual({
        status: "email-already-exists",
        uid: "user-id",
      });
    });

    it("returns email-already-exists when the uid is already registered", async () => {
      mockGetAuth.mockReturnValue({
        createUser: jest.fn().mockRejectedValue({ code: "auth/uid-already-exists" }),
        getUserByEmail: jest
          .fn()
          .mockResolvedValue({ uid: "user-id", customClaims: { role: "user" } }),
      });

      expect(await adapter.createAccount(params)).toEqual({
        status: "email-already-exists",
        uid: "user-id",
      });
    });

    it("assigns the default role when resuming an account that is missing the claim", async () => {
      const mockGetUserByEmail = jest
        .fn()
        .mockResolvedValue({ uid: "user-id", customClaims: undefined });
      const mockSetCustomUserClaims = jest.fn().mockResolvedValue(undefined);
      mockGetAuth.mockReturnValue({
        createUser: jest.fn().mockRejectedValue({ code: "auth/email-already-exists" }),
        getUserByEmail: mockGetUserByEmail,
        setCustomUserClaims: mockSetCustomUserClaims,
      });

      expect(await adapter.createAccount(params)).toEqual({
        status: "email-already-exists",
        uid: "user-id",
      });
      expect(mockGetUserByEmail).toHaveBeenCalledWith("john@example.com");
      expect(mockSetCustomUserClaims).toHaveBeenCalledWith("user-id", { role: "user" });
    });

    it("heals the role on the account that owns the email when its uid differs from the derived one", async () => {
      const mockSetCustomUserClaims = jest.fn().mockResolvedValue(undefined);
      mockGetAuth.mockReturnValue({
        createUser: jest.fn().mockRejectedValue({ code: "auth/email-already-exists" }),
        getUserByEmail: jest
          .fn()
          .mockResolvedValue({ uid: "legacy-uid", customClaims: undefined }),
        setCustomUserClaims: mockSetCustomUserClaims,
      });

      expect(await adapter.createAccount(params)).toEqual({
        status: "email-already-exists",
        uid: "legacy-uid",
      });
      expect(mockSetCustomUserClaims).toHaveBeenCalledWith("legacy-uid", { role: "user" });
    });

    it("preserves unrelated claims when filling in a missing role", async () => {
      const mockSetCustomUserClaims = jest.fn().mockResolvedValue(undefined);
      mockGetAuth.mockReturnValue({
        createUser: jest.fn().mockRejectedValue({ code: "auth/email-already-exists" }),
        getUserByEmail: jest
          .fn()
          .mockResolvedValue({ uid: "user-id", customClaims: { tenant: "acme" } }),
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
        getUserByEmail: jest
          .fn()
          .mockResolvedValue({ uid: "user-id", customClaims: { role: "admin" } }),
        setCustomUserClaims: mockSetCustomUserClaims,
      });

      expect(await adapter.createAccount(params)).toEqual({
        status: "email-already-exists",
        uid: "user-id",
      });
      expect(mockSetCustomUserClaims).not.toHaveBeenCalled();
    });

    it("propagates failures from the role reconciliation", async () => {
      mockGetAuth.mockReturnValue({
        createUser: jest.fn().mockRejectedValue({ code: "auth/email-already-exists" }),
        getUserByEmail: jest.fn().mockRejectedValue(new Error("Auth service unavailable")),
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
