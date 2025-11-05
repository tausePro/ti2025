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
          cookiesToSet.forEach(({ name, value, options }) => {
            // Configurar cookies con opciones correctas
            supabaseResponse.cookies.set(name, value, {
              ...options,
              httpOnly: false, // Permitir acceso desde JavaScript
              secure: process.env.NODE_ENV === 'production', // HTTPS en producción
              sameSite: 'lax', // Permitir cookies en navegación
              path: '/',
            })
          })
        },
      },
    }
  )

  const pathname = request.nextUrl.pathname

  // Rutas públicas que no requieren autenticación
  const publicRoutes = ['/login', '/register', '/']
  const isPublicRoute = publicRoutes.includes(pathname)

  try {
    // Usar getSession() en lugar de getUser() - más confiable
    const {
      data: { session },
    } = await supabase.auth.getSession()

    const user = session?.user

    // Si está autenticado y trata de acceder a login/register, redirigir al dashboard
    if (user && (pathname === '/login' || pathname === '/register')) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    // Si no está autenticado y trata de acceder a rutas protegidas
    if (!user && !isPublicRoute && (pathname.startsWith('/admin') || pathname.startsWith('/dashboard') || pathname.startsWith('/projects') || pathname.startsWith('/reports') || pathname.startsWith('/financial') || pathname.startsWith('/quality-control') || pathname.startsWith('/desembolsos'))) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      // Evitar loop: solo redirigir si no estamos ya en login
      if (pathname !== '/login') {
        return NextResponse.redirect(url)
      }
    }

    // Si no está autenticado y accede a la raíz, redirigir a login
    if (!user && pathname === '/') {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

  } catch (error) {
    console.error('Middleware error:', error)
    // En caso de error, NO redirigir - dejar pasar
    // El AuthContext manejará la autenticación en el cliente
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
