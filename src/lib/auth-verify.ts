import { NextRequest } from 'next/server';

export interface VerifiedUser {
  uid: string;
  email: string;
  name?: string;
}

export async function verifyAuthToken(req: NextRequest): Promise<VerifiedUser | null> {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;

    const token = authHeader.slice(7);
    const response = await fetch(
      `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getAccountInfo?key=AIzaSyAMDlgdSf18NDLjMBxlPhZl6PWgvQWYnLQ`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token }),
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const user = data.users?.[0];
    if (!user) return null;

    return {
      uid: user.localId,
      email: user.email || '',
      name: user.displayName || '',
    };
  } catch {
    return null;
  }
}
