import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  const { pathname } = req.nextUrl;

  // Se não houver token e o usuário não estiver tentando acessar a página de login,
  // redireciona para a página de login.
  if (!token && pathname !== '/login') {
    const loginUrl = new URL('/login', req.url);
    // Preservar parâmetros de busca, como callbackUrl
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Se o usuário estiver logado e tentar acessar a página de login, redireciona para a home ('/')
  if (token && pathname === '/login') {
    const homeUrl = new URL('/', req.url);
    return NextResponse.redirect(homeUrl);
  }

  // Permite o acesso se o usuário estiver logado ou se a rota for pública (neste caso, só /login)
  return NextResponse.next();
}

// Configuração do matcher para aplicar o middleware a todas as rotas,
// exceto as internas do Next.js (_next), arquivos estáticos (favicon.ico) e a própria API.
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|login).*)',
    '/', // Incluir a raiz explicitamente se não coberta pelo padrão acima
  ],
};

