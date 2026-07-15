import { HmacIdAdapter } from "./hmac-id.adapter.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("HmacIdAdapter", () => {
  const adapter = new HmacIdAdapter("test-secret", 1);

  it("returns a valid UUID v5-formatted string", async () => {
    const id = await adapter.derive("user@example.com");
    expect(id).toMatch(UUID_PATTERN);
  });

  it("returns the same ID for the same input (deterministic)", async () => {
    const a = await adapter.derive("user@example.com");
    const b = await adapter.derive("user@example.com");
    expect(a).toBe(b);
  });

  it("returns different IDs for different inputs", async () => {
    const a = await adapter.derive("alice@example.com");
    const b = await adapter.derive("bob@example.com");
    expect(a).not.toBe(b);
  });

  it("normalises input casing", async () => {
    const lower = await adapter.derive("user@example.com");
    const upper = await adapter.derive("USER@EXAMPLE.COM");
    expect(lower).toBe(upper);
  });

  it("normalises surrounding whitespace", async () => {
    const trimmed = await adapter.derive("user@example.com");
    const padded = await adapter.derive("  user@example.com  ");
    expect(trimmed).toBe(padded);
  });

  it("returns different IDs for the same input across secret versions", async () => {
    const v1 = new HmacIdAdapter("test-secret", 1);
    const v2 = new HmacIdAdapter("test-secret", 2);
    const idV1 = await v1.derive("user@example.com");
    const idV2 = await v2.derive("user@example.com");
    expect(idV1).not.toBe(idV2);
  });
});
