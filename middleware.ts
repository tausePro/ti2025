import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const pathname = request.nextUrl.pathname

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Si está autenticado y trata de acceder a login/register, redirigir al dashboard
    if (user && (pathname === '/login' || pathname === '/register')) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    // Si no está autenticado y trata de acceder a rutas protegidas
    if (!user && (pathname.startsWith('/admin') || pathname.startsWith('/dashboard') || pathname.startsWith('/projects') || pathname.startsWith('/reports') || pathname.startsWith('/financial'))) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // Si no está autenticado y accede a la raíz, redirigir a login
    if (!user && pathname === '/') {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

  } catch (error) {
    console.error('Middleware error:', error)
  }

  // Agregar headers de seguridad
  supabaseResponse.headers.set('X-Frame-Options', 'DENY')
  supabaseResponse.headers.set('X-Content-Type-Options', 'nosniff')
  supabaseResponse.headers.set('Referrer-Policy', 'origin-when-cross-origin')

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
