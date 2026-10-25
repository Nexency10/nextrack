export function toCents(value: string | number | null | undefined): bigint {
  const raw = value === null || value === undefined ? "0" : typeof value === "number" ? value.toFixed(2) : value;
  const match = raw.match(/^(-?)(\d+)(?:\.(\d{0,2}))?$/);
  if (!match) return 0n;
  const cents = BigInt(match[2]) * 100n + BigInt((match[3] ?? "").padEnd(2, "0"));
  return match[1] === "-" ? -cents : cents;
}

export function formatCents(cents: bigint): string {
  const negative = cents < 0n;
  const absolute = negative ? -cents : cents;
  const whole = (absolute / 100n).toLocaleString("en-US");
  const fraction = (absolute % 100n).toString().padStart(2, "0");
  return `${negative ? "-" : ""}$${whole}.${fraction}`;
}
