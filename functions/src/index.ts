import { onCall } from "firebase-functions/v2/https";

export { registerUser } from "./user/adapters/inbound/register-user.function.js";

export function testHandler() {
  return { message: "Test from index 3" };
}

export const test = onCall(testHandler);
