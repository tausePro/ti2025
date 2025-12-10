import { redirect } from 'next/navigation'

// Página índice de Informes
// Por ahora redirige a la lista de Informes Quincenales
export default function ReportsIndexPage() {
  redirect('/reports/biweekly')
}
