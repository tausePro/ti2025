interface DailyLogUser {
  id?: string | null
  role?: string | null
}

interface DailyLogAuthor {
  created_by?: string | null
}

/**
 * Indica si la interfaz debe ofrecer "Editar" para una bitácora.
 *
 * Los residentes ven todas las bitácoras de sus proyectos (migración 105),
 * pero RLS solo les permite modificar las propias. Los demás roles
 * conservan el comportamiento que ya tenían.
 */
export function canEditDailyLog(user: DailyLogUser | null | undefined, log: DailyLogAuthor): boolean {
  if (!user?.id) return false
  if (user.role !== 'residente') return true
  return log.created_by === user.id
}
