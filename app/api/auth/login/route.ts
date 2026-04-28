import { NextRequest, NextResponse } from 'next/server';
import { signToken } from '@/lib/auth';

const PASSWORD = process.env.POD_STUDIO_PASSWORD || '';

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  
  if (password !== PASSWORD) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const token = signToken({ role: 'admin' });
  
  const response = NextResponse.json({ ok: true });
  response.cookies.set('pod_studio_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  });
  
  return response;
}
