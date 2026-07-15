import { initializeApp, getApps } from "firebase-admin/app";

if (getApps().length === 0) {
  initializeApp();
}

export { getAuth } from "firebase-admin/auth";
export { getFirestore } from "firebase-admin/firestore";
