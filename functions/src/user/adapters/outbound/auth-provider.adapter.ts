import type {
  AuthProviderPort,
  CreateAccountResult,
} from "@fm-budget-control/fm-budget-control-core/user/ports";
import { getAuth } from "../../../kernel/firebase-admin.js";
import { DEFAULT_ROLE } from "../../../kernel/roles.js";

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
      await getAuth().setCustomUserClaims(params.id, { role: DEFAULT_ROLE });
      return "created";
    } catch (error: unknown) {
      if (isAlreadyExistsError(error)) {
        // A previous attempt may have created the account but died before
        // assigning the role claim — heal it so the resumed registration
        // does not produce a user that every guarded endpoint rejects.
        await this.ensureRoleClaim(params.id);
        return "email-already-exists";
      }
      throw error;
    }
  }

  // Only fills in a missing role; never overwrites an existing one, so a
  // re-registration attempt cannot demote an elevated account.
  private async ensureRoleClaim(uid: string): Promise<void> {
    const existing = await getAuth().getUser(uid);
    if (existing.customClaims?.role === undefined) {
      await getAuth().setCustomUserClaims(uid, {
        ...existing.customClaims,
        role: DEFAULT_ROLE,
      });
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
