import type { IncomingHttpHeaders } from 'node:http';

export type AuthContext = {
  // null when the request has no usable Authorization header
  userId: string | null;
};

// Reads the Authorization header the router propagates to every subgraph.
// Tokens are fake: "Bearer user-1" means the caller is user-1.
export function authFromHeaders(headers: IncomingHttpHeaders): AuthContext {
  const header = headers.authorization ?? '';
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  return { userId: match?.[1] ?? null };
}
