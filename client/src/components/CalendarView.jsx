import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Card from './ui/Card'
import Badge from './ui/Badge'

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function CalendarView({ events = [], children = [], view = 'week' }) {
  const [currentDate, setCurrentDate] = useState(new Date(2024, 4, 28)) // May 28, 2024
  const [viewMode, setViewMode] = useState(view)
  const [selectedEvent, setSelectedEvent] = useState(null)

  // Get start of week (Monday)
  const getWeekStart = (date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(d.setDate(diff))
  }

  // Get all days in month
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  // Get events for a specific date
  const getEventsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0]
    return events.filter(e => e.date === dateStr)
  }

  // Get child color
  const getChildColor = (childId) => {
    const child = children.find(c => c.id === childId)
    return child?.color || '#2D1B8E'
  }

  const renderWeekView = () => {
    const weekStart = getWeekStart(currentDate)
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart)
      date.setDate(date.getDate() + i)
      return date
    })

    return (
      <div className="space-y-4">
        {/* Week header */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - 7)))} className="p-2 hover:bg-muted rounded-lg">
            <ChevronLeft size={20} />
          </button>
          <h3 className="text-h3 font-semibold">
            {MONTHS[weekStart.getMonth()]} {weekStart.getDate()} - {MONTHS[weekDays[6].getMonth()]} {weekDays[6].getDate()}
          </h3>
          <button onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + 7)))} className="p-2 hover:bg-muted rounded-lg">
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Day columns */}
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((date, idx) => {
            const dayEvents = getEventsForDate(date)
            const isToday = new Date().toDateString() === date.toDateString()

            return (
              <div
                key={idx}
                className={`p-3 rounded-lg border-2 min-h-[150px] ${
                  isToday ? 'border-primary bg-primary-light' : 'border-border bg-white'
                }`}
              >
                <div className={`text-h3 font-semibold mb-2 ${isToday ? 'text-primary' : 'text-foreground'}`}>
                  <div className="text-xs text-text-secondary">{DAYS_OF_WEEK[date.getDay()]}</div>
                  <div>{date.getDate()}</div>
                </div>

                {/* Events for this day */}
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <button
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className="w-full text-left text-xs p-1 rounded bg-opacity-20 hover:bg-opacity-40 transition-colors text-white truncate"
                      style={{ backgroundColor: getChildColor(event.child) }}
                    >
                      {event.title}
                    </button>
                  ))}
                  {dayEvents.length > 3 && (
                    <p className="text-xs text-text-secondary">+{dayEvents.length - 3} more</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderMonthView = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const daysInMonth = getDaysInMonth(currentDate)
    const firstDay = getFirstDayOfMonth(currentDate)

    const days = []
    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }

    return (
      <div className="space-y-4">
        {/* Month header */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setCurrentDate(new Date(year, month - 1))} className="p-2 hover:bg-muted rounded-lg">
            <ChevronLeft size={20} />
          </button>
          <h3 className="text-h3 font-semibold">
            {MONTHS[month]} {year}
          </h3>
          <button onClick={() => setCurrentDate(new Date(year, month + 1))} className="p-2 hover:bg-muted rounded-lg">
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Day names */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAYS_OF_WEEK.map(day => (
            <div key={day} className="text-center text-xs font-semibold text-text-secondary py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((date, idx) => {
            if (!date) return <div key={`empty-${idx}`} className="aspect-square" />

            const dayEvents = getEventsForDate(date)
            const isToday = new Date().toDateString() === date.toDateString()

            return (
              <button
                key={date.getTime()}
                onClick={() => setSelectedEvent(dayEvents[0])}
                className={`aspect-square p-2 rounded-lg border-2 hover:shadow-md transition-shadow ${
                  isToday ? 'border-primary bg-primary-light' : 'border-border bg-white'
                }`}
              >
                <div className={`text-xs font-semibold mb-1 ${isToday ? 'text-primary' : 'text-foreground'}`}>
                  {date.getDate()}
                </div>
                <div className="flex flex-wrap gap-0.5">
                  {dayEvents.slice(0, 2).map((event) => (
                    <div
                      key={event.id}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: getChildColor(event.child) }}
                    />
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-xs text-text-secondary">+{dayEvents.length - 2}</div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* View toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode('week')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            viewMode === 'week' ? 'bg-primary text-white' : 'bg-muted text-foreground'
          }`}
        >
          Week
        </button>
        <button
          onClick={() => setViewMode('month')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            viewMode === 'month' ? 'bg-primary text-white' : 'bg-muted text-foreground'
          }`}
        >
          Month
        </button>
      </div>

      {/* Calendar */}
      {viewMode === 'week' ? renderWeekView() : renderMonthView()}

      {/* Event detail overlay */}
      {selectedEvent && (
        <Card className="border-l-4 bg-primary-light" style={{ borderLeftColor: getChildColor(selectedEvent.child) }}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-h3 font-semibold text-primary">{selectedEvent.title}</h3>
              <p className="text-caption text-text-secondary">{selectedEvent.date} at {selectedEvent.time}</p>
              <p className="text-body text-text-secondary mt-2">{selectedEvent.location}</p>
              <Badge variant="primary" className="mt-3">{selectedEvent.type}</Badge>
            </div>
            <button
              onClick={() => setSelectedEvent(null)}
              className="text-text-secondary hover:text-foreground"
            >
              ✕
            </button>
          </div>
        </Card>
      )}
    </div>
  )
}
