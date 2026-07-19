export type Role = "user" | "admin";

export const DEFAULT_ROLE: Role = "user";

// Higher rank satisfies lower requirements: an admin can call user endpoints.
const ROLE_RANK: Record<Role, number> = {
  user: 1,
  admin: 2,
};

export function roleSatisfies(actual: unknown, required: Role): boolean {
  return (
    typeof actual === "string" &&
    actual in ROLE_RANK &&
    ROLE_RANK[actual as Role] >= ROLE_RANK[required]
  );
}
