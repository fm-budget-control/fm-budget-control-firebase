import type {
  UserRepositoryPort,
  UserRecord,
  CreateProfileResult,
} from "@fm-budget-control/fm-budget-control-core/user/ports";
import { getFirestore } from "../../../kernel/firebase-admin.js";

const GRPC_ALREADY_EXISTS = 6;

export class UserRepositoryAdapter implements UserRepositoryPort {
  async createProfile(record: UserRecord): Promise<CreateProfileResult> {
    try {
      await getFirestore().collection("users").doc(record.id).create(record);
      return "created";
    } catch (error: unknown) {
      if (isAlreadyExistsError(error)) return "already-exists";
      throw error;
    }
  }
}

function isAlreadyExistsError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === GRPC_ALREADY_EXISTS
  );
}
