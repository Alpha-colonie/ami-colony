import { NextRequest, NextResponse } from 'next/server'

const LAB_COOKIE  = 'ami_lab_access'
const COOKIE_DAYS = 30

export async function POST(req: NextRequest) {
  const { password } = await req.json()

  if (!password || password !== process.env.LAB_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(LAB_COOKIE, password, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   60 * 60 * 24 * COOKIE_DAYS,
    path:     '/',
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete(LAB_COOKIE)
  return res
}
