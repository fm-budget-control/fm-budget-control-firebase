// Integration checks for the registerUser callable, run against the Firebase
// emulators via `npm run test:integration` (firebase emulators:exec).
// Exercises the surfaces unit tests cannot: codebase loading, secret wiring,
// and the real Auth + Firestore write semantics.
import assert from "node:assert/strict";

const PROJECT = "demo-fm-budget-control";
const REGISTER_URL = `http://127.0.0.1:5001/${PROJECT}/us-central1/registerUser`;
const FIRESTORE_DOCS = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`;
const AUTH_V1 = "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1";

const form = {
  fullName: "John Doe",
  email: "john.doe@example.com",
  password: "Str0ng!Passw0rd",
  birthDate: "1990-05-15",
};

async function registerUser(data) {
  const res = await fetch(REGISTER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data }),
  });
  return res.json();
}

// Firestore now enforces default-deny security rules; reads/writes issued
// directly against the emulator (as opposed to via the Admin SDK, which
// bypasses rules) need the same admin-bypass header the Auth calls below use.
async function getProfile(id) {
  const res = await fetch(`${FIRESTORE_DOCS}/users/${id}`, {
    headers: { Authorization: "Bearer owner" },
  });
  return res.ok ? res.json() : null;
}

async function deleteProfile(id) {
  const res = await fetch(`${FIRESTORE_DOCS}/users/${id}`, {
    method: "DELETE",
    headers: { Authorization: "Bearer owner" },
  });
  assert.ok(res.ok, `failed to delete profile doc: ${res.status}`);
}

async function lookupAccount(id) {
  const res = await fetch(`${AUTH_V1}/projects/${PROJECT}/accounts:lookup`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer owner" },
    body: JSON.stringify({ localId: [id] }),
  });
  const body = await res.json();
  return body.users?.[0] ?? null;
}

async function signInSucceeds(email, password) {
  const res = await fetch(`${AUTH_V1}/accounts:signInWithPassword?key=emulator`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  return res.ok;
}

function step(name) {
  console.log(`\n▶ ${name}`);
}

step("happy path: registers credentials and profile");
const first = await registerUser(form);
assert.ok(first.result?.userId, `expected a userId, got: ${JSON.stringify(first)}`);
const userId = first.result.userId;

const account = await lookupAccount(userId);
assert.ok(account, "auth account not found");
assert.equal(account.email, form.email);
assert.equal(account.displayName, form.fullName);

const profile = await getProfile(userId);
assert.ok(profile, "profile doc not found");
assert.equal(profile.fields.fullName.stringValue, form.fullName);
assert.equal(profile.fields.email.stringValue, form.email);
assert.equal(profile.fields.birthDate.stringValue, form.birthDate);
assert.ok(profile.fields.createdAt.stringValue, "missing createdAt");
assert.ok(profile.fields.updatedAt.stringValue, "missing updatedAt");
assert.ok(await signInSucceeds(form.email, form.password), "sign-in with registered password failed");

step("duplicate registration: rejected with ALREADY_EXISTS");
const duplicate = await registerUser(form);
assert.equal(duplicate.error?.status, "ALREADY_EXISTS", JSON.stringify(duplicate));

step("resume path: auth exists, profile missing — resubmission completes registration");
await deleteProfile(userId);
const resumePassword = "Different5!";
const resumed = await registerUser({ ...form, password: resumePassword });
assert.equal(resumed.result?.userId, userId, `expected same userId, got: ${JSON.stringify(resumed)}`);
assert.ok(await getProfile(userId), "profile doc was not recreated");
assert.ok(
  await signInSucceeds(form.email, form.password),
  "original password no longer valid after resume",
);
assert.ok(
  !(await signInSucceeds(form.email, resumePassword)),
  "resubmitted password must not replace the original credentials",
);

step("validation: underage birthdate rejected");
const underage = await registerUser({ ...form, email: "kid@example.com", birthDate: "2015-01-01" });
assert.equal(underage.error?.status, "INVALID_ARGUMENT", JSON.stringify(underage));

step("validation: malformed email rejected");
const badEmail = await registerUser({ ...form, email: "not-an-email" });
assert.equal(badEmail.error?.status, "INVALID_ARGUMENT", JSON.stringify(badEmail));

step("validation: empty payload rejected");
const empty = await registerUser({});
assert.equal(empty.error?.status, "INVALID_ARGUMENT", JSON.stringify(empty));

console.log("\n✅ all registration integration checks passed");
