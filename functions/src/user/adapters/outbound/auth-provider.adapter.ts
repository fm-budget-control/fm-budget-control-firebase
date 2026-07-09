import type {
  AuthProviderPort,
  CreateAccountResult,
} from "@fm-budget-control/fm-budget-control-core/user/ports";
import { getAuth } from "../../../kernel/firebase-admin.js";

// The uid is derived deterministically from the email, so a duplicate uid
// and a duplicate email both mean the same thing: a previous attempt
// already provisioned credentials for this email.
const ALREADY_EXISTS_CODES: ReadonlySet<string> = new Set([
  "auth/email-already-exists",
  "auth/uid-already-exists",
]);

export class AuthProviderAdapter implements AuthProviderPort {
  async createAccount(params: {
    id: string;
    email: string;
    password: string;
    displayName: string;
  }): Promise<CreateAccountResult> {
    try {
      await getAuth().createUser({
        uid: params.id,
        email: params.email,
        password: params.password,
        displayName: params.displayName,
      });
      return "created";
    } catch (error: unknown) {
      if (isAlreadyExistsError(error)) return "email-already-exists";
      throw error;
    }
  }
}

function isAlreadyExistsError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string" &&
    ALREADY_EXISTS_CODES.has((error as { code: string }).code)
  );
}
