import { jwtVerify, SignJWT } from 'jose'
import type { VercelRequest } from '@vercel/node'

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'aeiforo-dev-secret-change-in-prod')

export interface TokenPayload {
  sub: string   // user id
  org: string   // org id
  email: string
}

export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET)
}

export async function verifyToken(req: VercelRequest): Promise<TokenPayload | null> {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return null
  try {
    const { payload } = await jwtVerify(header.slice(7), SECRET)
    return payload as unknown as TokenPayload
  } catch {
    return null
  }
}

export function cors(res: { setHeader: (k: string, v: string) => void }) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
}
