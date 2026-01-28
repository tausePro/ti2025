'use client'

import { useMemo, useState } from 'react'
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameDay,
  isSameMonth
} from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface DailyLogsCalendarProps {
  datesWithLogs: string[]
  selectedDate?: string | null
  onSelectDate: (date: string | null) => void
}

const weekdayLabels = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

export function DailyLogsCalendar({
  datesWithLogs,
  selectedDate,
  onSelectDate
}: DailyLogsCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const selected = selectedDate ? new Date(`${selectedDate}T00:00:00`) : null
  const datesSet = useMemo(() => new Set(datesWithLogs), [datesWithLogs])

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const startWeekday = (monthStart.getDay() + 6) % 7
  const emptySlots = Array.from({ length: startWeekday })

  const handleDayClick = (day: Date) => {
    const formatted = format(day, 'yyyy-MM-dd')
    if (!datesSet.has(formatted)) return
    onSelectDate(formatted === selectedDate ? null : formatted)
  }

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 rounded hover:bg-gray-100"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-sm font-semibold text-gray-900">
          {format(currentMonth, 'MMMM yyyy', { locale: es })}
        </div>
        <button
          type="button"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 rounded hover:bg-gray-100"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-xs text-gray-500 mb-2">
        {weekdayLabels.map(label => (
          <div key={label} className="text-center font-medium">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {emptySlots.map((_, idx) => (
          <div key={`empty-${idx}`} className="h-9" />
        ))}

        {daysInMonth.map(day => {
          const formatted = format(day, 'yyyy-MM-dd')
          const hasLogs = datesSet.has(formatted)
          const isSelected = selected && isSameDay(day, selected)
          const isCurrent = isSameMonth(day, currentMonth)

          return (
            <button
              type="button"
              key={formatted}
              onClick={() => handleDayClick(day)}
              className={`h-9 rounded text-xs flex items-center justify-center border transition-colors
                ${isSelected ? 'bg-blue-600 text-white border-blue-600' : 'border-transparent'}
                ${hasLogs && !isSelected ? 'bg-blue-50 text-blue-700 border-blue-100' : ''}
                ${!hasLogs ? 'text-gray-300 cursor-default' : 'hover:border-blue-300'}
                ${!isCurrent ? 'opacity-40' : ''}
              `}
            >
              {format(day, 'd')}
            </button>
          )
        })}
      </div>

      <div className="mt-3 text-xs text-gray-500">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-blue-400" />
          Días con bitácoras
        </span>
      </div>
    </div>
  )
}
