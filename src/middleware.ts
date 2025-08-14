import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  const isAuthPage = pathname.includes('/login');
  const isAdminPage = pathname.includes('/admin');
  const isApiUserRoute = pathname.includes('/api/users');

  // Se o usuário não estiver logado
  if (!token) {
    if (isAuthPage) {
      return NextResponse.next();
    }
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Se o usuário estiver logado
  // @ts-ignore
  const userRole = token.role;

  if (isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  if ((isAdminPage || isApiUserRoute) && userRole !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};

