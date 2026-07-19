import { UserRepositoryAdapter } from "./user-repository.adapter.js";
import { getFirestore } from "../../../kernel/firebase-admin.js";

jest.mock("../../../kernel/firebase-admin.js", () => ({
  getFirestore: jest.fn(),
}));

const mockGetFirestore = getFirestore as jest.Mock;

const record = {
  id: "user-id",
  fullName: "John Doe",
  email: "john@example.com",
  birthDate: "1990-01-01",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function mockFirestoreCreate(mockCreate: jest.Mock) {
  const mockDocFn = jest.fn().mockReturnValue({ create: mockCreate });
  const mockCollectionFn = jest.fn().mockReturnValue({ doc: mockDocFn });
  mockGetFirestore.mockReturnValue({ collection: mockCollectionFn });
  return { mockCollectionFn, mockDocFn };
}

describe("UserRepositoryAdapter", () => {
  let adapter: UserRepositoryAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new UserRepositoryAdapter(1);
  });

  describe("createProfile", () => {
    it("creates the document in the users collection using the record id as the document id", async () => {
      const mockCreate = jest.fn().mockResolvedValue(undefined);
      const { mockCollectionFn, mockDocFn } = mockFirestoreCreate(mockCreate);

      const result = await adapter.createProfile(record);

      expect(result).toBe("created");
      expect(mockCollectionFn).toHaveBeenCalledWith("users");
      expect(mockDocFn).toHaveBeenCalledWith("user-id");
      expect(mockCreate).toHaveBeenCalledWith({ ...record, idDerivation: { version: 1 } });
    });

    it("stamps the document with the id secret version it was constructed with", async () => {
      const mockCreate = jest.fn().mockResolvedValue(undefined);
      mockFirestoreCreate(mockCreate);

      await new UserRepositoryAdapter(2).createProfile(record);

      expect(mockCreate).toHaveBeenCalledWith({ ...record, idDerivation: { version: 2 } });
    });

    it("returns already-exists when the document already exists", async () => {
      mockFirestoreCreate(jest.fn().mockRejectedValue({ code: 6 }));

      expect(await adapter.createProfile(record)).toBe("already-exists");
    });

    it("rethrows unexpected errors", async () => {
      const error = new Error("Firestore unavailable");
      mockFirestoreCreate(jest.fn().mockRejectedValue(error));

      await expect(adapter.createProfile(record)).rejects.toThrow("Firestore unavailable");
    });
  });
});
