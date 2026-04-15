import { NextRequest, NextResponse } from 'next/server'

const LAB_COOKIE = 'ami_lab_access'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Seules les routes /lab/* sont protégées
  if (!pathname.startsWith('/lab')) return NextResponse.next()
  // La page login est toujours accessible
  if (pathname === '/lab/login') return NextResponse.next()

  const cookie = req.cookies.get(LAB_COOKIE)
  if (cookie?.value === process.env.LAB_PASSWORD) return NextResponse.next()

  // Rediriger vers login
  const loginUrl = req.nextUrl.clone()
  loginUrl.pathname = '/lab/login'
  loginUrl.searchParams.set('from', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/lab/:path*'],
}
