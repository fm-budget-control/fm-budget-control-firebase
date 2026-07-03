import { onCall } from "firebase-functions/v2/https";

export function testHandler() {
  return { message: "Test from index 2" };
}

export const test = onCall(testHandler);
