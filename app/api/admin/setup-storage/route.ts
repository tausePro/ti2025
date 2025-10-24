import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * API Route para configurar políticas de Storage
 * Solo accesible por super_admin
 * 
 * POST /api/admin/setup-storage
 */
export async function POST(request: Request) {
  try {
    // Verificar autenticación y permisos
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Verificar que sea super_admin
    const { data: profile } = await (supabase
      .from('profiles') as any)
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'No autorizado. Solo super_admin puede ejecutar esta acción.' },
        { status: 403 }
      )
    }

    // Crear cliente con service_role key
    const { createClient: createServiceClient } = await import('@supabase/supabase-js')
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!serviceKey) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no configurada' },
        { status: 500 }
      )
    }

    const adminClient = createServiceClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const results = {
      bucket: { success: false, message: '' },
      policies: [] as any[]
    }

    // 1. Verificar/crear bucket
    const { data: buckets } = await adminClient.storage.listBuckets()
    const bucketExists = buckets?.some(b => b.id === 'reports')

    if (!bucketExists) {
      const { data: newBucket, error: bucketError } = await adminClient.storage.createBucket('reports', {
        public: false,
        fileSizeLimit: 52428800, // 50MB
        allowedMimeTypes: ['application/pdf']
      })

      if (bucketError) {
        results.bucket = { success: false, message: bucketError.message }
      } else {
        results.bucket = { success: true, message: 'Bucket creado' }
      }
    } else {
      results.bucket = { success: true, message: 'Bucket ya existe' }
    }

    // 2. Crear políticas usando SQL directo
    // NOTA: Los reportes se GENERAN automáticamente, no los suben usuarios
    const policies = [
      {
        name: 'System can upload generated reports',
        sql: `
          DROP POLICY IF EXISTS "Project members can upload reports" ON storage.objects;
          DROP POLICY IF EXISTS "System can upload generated reports" ON storage.objects;
          CREATE POLICY "System can upload generated reports"
          ON storage.objects FOR INSERT
          TO authenticated
          WITH CHECK (
            bucket_id = 'reports' AND
            -- Solo admins (cuando el sistema genera el PDF en su nombre)
            EXISTS (
              SELECT 1 FROM profiles
              WHERE id = auth.uid()
              AND role IN ('super_admin', 'admin')
            )
          );
        `
      },
      {
        name: 'Project members can view reports',
        sql: `
          DROP POLICY IF EXISTS "Project members can view reports" ON storage.objects;
          CREATE POLICY "Project members can view reports"
          ON storage.objects FOR SELECT
          TO authenticated
          USING (
            bucket_id = 'reports' AND (
              EXISTS (
                SELECT 1 FROM project_members pm
                WHERE pm.user_id = auth.uid() 
                AND pm.is_active = true
              )
              OR
              EXISTS (
                SELECT 1 FROM profiles
                WHERE id = auth.uid()
                AND role IN ('super_admin', 'admin')
              )
            )
          );
        `
      },
      {
        name: 'Admins can delete reports',
        sql: `
          DROP POLICY IF EXISTS "Admins can delete reports" ON storage.objects;
          CREATE POLICY "Admins can delete reports"
          ON storage.objects FOR DELETE
          TO authenticated
          USING (
            bucket_id = 'reports' AND EXISTS (
              SELECT 1 FROM profiles
              WHERE id = auth.uid()
              AND role IN ('super_admin', 'admin')
            )
          );
        `
      }
    ]

    for (const policy of policies) {
      try {
        const { error } = await adminClient.rpc('exec_sql', { sql: policy.sql })
        
        if (error) {
          results.policies.push({
            name: policy.name,
            success: false,
            error: error.message
          })
        } else {
          results.policies.push({
            name: policy.name,
            success: true
          })
        }
      } catch (err: any) {
        results.policies.push({
          name: policy.name,
          success: false,
          error: err.message
        })
      }
    }

    const allSuccess = results.bucket.success && results.policies.every(p => p.success)

    return NextResponse.json({
      success: allSuccess,
      results
    })

  } catch (error: any) {
    console.error('Error en setup-storage:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
