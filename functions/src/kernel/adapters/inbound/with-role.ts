import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { roleSatisfies, type Role } from "../../roles.js";

export function withRole<T>(
  role: Role,
  handler: (request: CallableRequest) => T,
): (request: CallableRequest) => T {
  return (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    if (!roleSatisfies(request.auth.token.role, role)) {
      throw new HttpsError("permission-denied", "Insufficient permissions.");
    }

    return handler(request);
  };
}
