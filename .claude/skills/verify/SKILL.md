---
name: verify
description: Build, launch, and drive this repo's Cloud Functions against the Firebase emulators to verify changes end-to-end.
---

# Verifying fm-budget-control-firebase functions

## Build & launch

```bash
cd functions && npm run build
# Secrets for the emulator (gitignored): functions/.secret.local
#   USER_ID_HMAC_SECRET=<any value>
npx firebase-tools emulators:start --project demo-fm-budget-control --only auth,firestore,functions
```

- Use the `demo-` project prefix so the emulators never touch prod.
- Wait for `Loaded functions definitions from source: ...` — a codebase load
  failure (e.g. ESM/CJS resolution) still prints "All emulators ready".
- Ports: functions 5001, firestore 8080, auth 9099, UI 4000.

## Drive

Callable functions via plain HTTP (note the `data` envelope):

```bash
curl -s http://127.0.0.1:5001/demo-fm-budget-control/us-central1/<fn> \
  -H "Content-Type: application/json" -d '{"data":{...}}'
```

Inspect state:

```bash
# Firestore doc (also DELETE to simulate partial failure)
curl -s "http://127.0.0.1:8080/v1/projects/demo-fm-budget-control/databases/(default)/documents/users/<id>"
# Auth account (Bearer owner = emulator admin)
curl -s -H "Authorization: Bearer owner" \
  http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/demo-fm-budget-control/accounts:lookup \
  -d '{"localId":["<id>"]}' -H "Content-Type: application/json"
# Sign-in check (any key works on the emulator)
curl -s "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key" \
  -H "Content-Type: application/json" -d '{"email":"...","password":"...","returnSecureToken":true}'
```

## Gotchas

- The core package (`@fm-budget-control/fm-budget-control-core`) is ESM-only;
  the functions package must stay `"type": "module"`. Unit tests passing does
  NOT prove the emulator can load the codebase — always check the load line.
- `UID` is readonly in zsh; don't use it as a shell variable name.
- Core `Password` VO enforces 5–16 chars — pick test passwords accordingly.
