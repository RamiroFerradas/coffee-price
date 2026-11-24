/** Constant-time comparison used by every cron entry point. */
export function secretsMatch(presented: string, expected: string): boolean {
  if (presented.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < presented.length; i += 1) {
    diff |= presented.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

/** Reads the shared secret from `x-cron-secret` or a bearer token. */
export function presentedSecret(headers: Headers): string | null {
  const headerSecret = headers.get("x-cron-secret");
  if (headerSecret) return headerSecret;
  const authorization = headers.get("authorization");
  if (authorization && /^bearer /i.test(authorization)) {
    return authorization.slice(7).trim();
  }
  return null;
}
