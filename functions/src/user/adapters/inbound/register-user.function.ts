import { onCall, HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import {
  RegisterUserUseCase,
  EmailAlreadyRegisteredError,
  UnderageUserError,
  InvalidFullNameError,
  InvalidEmailError,
  InvalidPasswordError,
  InvalidIsoDateError,
  type RegisterUserCommand,
} from "@fm-budget-control/fm-budget-control-core/user/application";
import { HmacIdAdapter } from "../../../kernel/adapters/outbound/hmac-id.adapter.js";
import { AuthProviderAdapter } from "../outbound/auth-provider.adapter.js";
import { UserRepositoryAdapter } from "../outbound/user-repository.adapter.js";

const userIdHmacSecret = defineSecret("USER_ID_HMAC_SECRET");

// Changing the version invalidates every derived user id; bump only as part
// of a deliberate secret-rotation migration.
const USER_ID_HMAC_SECRET_VERSION = 1;

export type RegisterUserResponse = {
  userId: string;
};

export function registerUserHandler(useCase: RegisterUserUseCase) {
  return async (request: CallableRequest): Promise<RegisterUserResponse> => {
    try {
      const userId = await useCase.execute(toCommand(request.data));
      return { userId };
    } catch (error: unknown) {
      throw toHttpsError(error);
    }
  };
}

export const registerUser = onCall({ secrets: [userIdHmacSecret] }, (request) => {
  const useCase = new RegisterUserUseCase(
    new UserRepositoryAdapter(),
    new AuthProviderAdapter(),
    new HmacIdAdapter(userIdHmacSecret.value(), USER_ID_HMAC_SECRET_VERSION),
  );

  return registerUserHandler(useCase)(request);
});

function toCommand(data: unknown): RegisterUserCommand {
  const form = (data ?? {}) as Record<string, unknown>;

  return {
    fullName: String(form.fullName ?? ""),
    email: String(form.email ?? ""),
    password: String(form.password ?? ""),
    birthDate: String(form.birthDate ?? ""),
  };
}

function toHttpsError(error: unknown): HttpsError {
  if (error instanceof EmailAlreadyRegisteredError) {
    return new HttpsError("already-exists", "This email is already registered.");
  }

  if (
    error instanceof InvalidFullNameError ||
    error instanceof InvalidEmailError ||
    error instanceof InvalidPasswordError ||
    error instanceof InvalidIsoDateError ||
    error instanceof UnderageUserError
  ) {
    return new HttpsError("invalid-argument", error.message);
  }

  logger.error("registerUser failed", error);
  return new HttpsError("internal", "Registration could not be completed. Please try again.");
}
