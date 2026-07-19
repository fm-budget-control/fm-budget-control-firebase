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
      return { status: "created", uid: params.id };
    } catch (error: unknown) {
      if (isAlreadyExistsError(error)) {
        // The account is resolved by email, not by the derived uid: it may
        // predate the current HMAC secret (imported, or created before a
        // rotation) and live under a different uid. That uid is the
        // canonical one — the caller adopts it for the profile.
        const existing = await getAuth().getUserByEmail(params.email);

        // A previous attempt may have created the account but died before
        // assigning the role claim — heal it so the resumed registration
        // does not produce a user that every guarded endpoint rejects.
        // Only fills in a missing role; never overwrites an existing one,
        // so a re-registration attempt cannot demote an elevated account.
        if (existing.customClaims?.role === undefined) {
          await getAuth().setCustomUserClaims(existing.uid, {
            ...existing.customClaims,
            role: DEFAULT_ROLE,
          });
        }

        return { status: "email-already-exists", uid: existing.uid };
      }
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
