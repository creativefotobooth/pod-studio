import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = process.env.POD_STUDIO_JWT_SECRET || '';
const encodedSecret = new TextEncoder().encode(JWT_SECRET);

export async function signToken(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT(payload as Record<string, string>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(encodedSecret);
}

export async function verifyToken(token: string): Promise<Record<string, unknown> | null> {
  try {
    const { payload } = await jwtVerify(token, encodedSecret);
    return payload as unknown as Record<string, unknown>;
  } catch {
    return null;
  }
}
