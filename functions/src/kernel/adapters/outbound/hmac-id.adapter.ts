import { createHmac } from "node:crypto";

export class HmacIdAdapter {
  constructor(
    private readonly secretValue: string,
    private readonly secretVersion: number,
  ) {}

  async derive(input: string): Promise<string> {
    const hash = createHmac("sha256", this.secretValue)
      .update(`v${this.secretVersion}:${input.toLowerCase().trim()}`)
      .digest();

    hash[6] = (hash[6] & 0x0f) | 0x50;
    hash[8] = (hash[8] & 0x3f) | 0x80;

    return [
      hash.subarray(0, 4).toString("hex"),
      hash.subarray(4, 6).toString("hex"),
      hash.subarray(6, 8).toString("hex"),
      hash.subarray(8, 10).toString("hex"),
      hash.subarray(10, 16).toString("hex"),
    ].join("-");
  }
}
