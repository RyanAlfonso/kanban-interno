import { NextResponse } from 'next/server';
import type { NextMiddleware, NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export function withAuthMiddleware(middleware: NextMiddleware) {
  return async (req: NextRequest, event: any) => {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const { pathname } = req.nextUrl;

    if (!token && pathname === '/') {
      const loginUrl = new URL('/login', req.url);
      return NextResponse.redirect(loginUrl);
    }

    
    return middleware(req, event);
  };
}


export async function authMiddleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

   if (!token && pathname === '/') {
    const loginUrl = new URL('/login', req.url);
    console.log(`Redirecionando para: ${loginUrl.toString()}`); // Log para debug
    return NextResponse.redirect(loginUrl);
  }

  

  return NextResponse.next(); // Permite continuar
}

