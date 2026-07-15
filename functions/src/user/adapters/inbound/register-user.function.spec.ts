import type { CallableRequest } from "firebase-functions/v2/https";
import {
  RegisterUserUseCase,
  EmailAlreadyRegisteredError,
  InvalidEmailError,
} from "@fm-budget-control/fm-budget-control-core/user/application";
import { registerUserHandler } from "./register-user.function.js";

jest.mock("../../../kernel/firebase-admin.js", () => ({
  getAuth: jest.fn(),
  getFirestore: jest.fn(),
}));

function requestWith(data: unknown): CallableRequest {
  return { data } as CallableRequest;
}

function useCaseWith(execute: jest.Mock): RegisterUserUseCase {
  return { execute } as unknown as RegisterUserUseCase;
}

const formData = {
  fullName: "John Doe",
  email: "john@example.com",
  password: "password123",
  birthDate: "1990-01-01",
};

describe("registerUserHandler", () => {
  it("executes the use case with the command built from the request data and returns the user id", async () => {
    const execute = jest.fn().mockResolvedValue("user-id");
    const handler = registerUserHandler(useCaseWith(execute));

    const response = await handler(requestWith(formData));

    expect(execute).toHaveBeenCalledWith(formData);
    expect(response).toEqual({ userId: "user-id" });
  });

  it("coerces missing fields to empty strings so the use case rejects them", async () => {
    const execute = jest.fn().mockResolvedValue("user-id");
    const handler = registerUserHandler(useCaseWith(execute));

    await handler(requestWith(undefined));

    expect(execute).toHaveBeenCalledWith({
      fullName: "",
      email: "",
      password: "",
      birthDate: "",
    });
  });

  it("maps EmailAlreadyRegisteredError to an already-exists HttpsError", async () => {
    const execute = jest.fn().mockRejectedValue(new EmailAlreadyRegisteredError());
    const handler = registerUserHandler(useCaseWith(execute));

    await expect(handler(requestWith(formData))).rejects.toMatchObject({
      code: "already-exists",
    });
  });

  it("maps domain validation errors to an invalid-argument HttpsError", async () => {
    const execute = jest.fn().mockRejectedValue(new InvalidEmailError("not-an-email"));
    const handler = registerUserHandler(useCaseWith(execute));

    await expect(handler(requestWith(formData))).rejects.toMatchObject({
      code: "invalid-argument",
    });
  });

  it("maps unexpected errors to an internal HttpsError without leaking details", async () => {
    const execute = jest.fn().mockRejectedValue(new Error("Firestore unavailable"));
    const handler = registerUserHandler(useCaseWith(execute));

    await expect(handler(requestWith(formData))).rejects.toMatchObject({
      code: "internal",
      message: expect.not.stringContaining("Firestore unavailable"),
    });
  });
});
