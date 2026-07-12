import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT     = 5;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now   = Date.now();
  for (const [key, e] of rateLimitMap) {
    if (now > e.resetAt) rateLimitMap.delete(key);
  }
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

const FAIL = () => NextResponse.json({ error: 'Something went wrong.' }, { status: 400 });

export async function POST(request: Request) {
  const ip =
    request.headers.get('x-real-ip') ??
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() ??
    'unknown';
  if (!checkRateLimit(ip)) return FAIL();

  const body = await request.json() as { email?: string; password?: string; name?: string; otp?: string };
  const email    = body.email?.trim();
  const password = body.password;
  const name     = body.name?.trim();
  const otp      = body.otp?.trim();

  if (!email || !password || !name || !otp) return FAIL();
  if (password.length < 8) return FAIL();

  const admin = createAdminClient();

  const { data: allowed } = await admin
    .from('allowed_names')
    .select('name')
    .eq('name', name)
    .eq('otp', otp)
    .single();

  if (!allowed) return FAIL();

  const { data: takenName } = await admin
    .from('profiles')
    .select('id')
    .eq('name', allowed.name)
    .single();

  if (takenName) return FAIL();

  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: allowed.name },
  });

  if (createError) return FAIL();

  return NextResponse.json({ success: true });
}
