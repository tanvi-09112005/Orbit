import Card from './ui/Card'
import Badge from './ui/Badge'
import { Calendar, CheckSquare2, AlertCircle } from 'lucide-react'

export default function DailySummaryCard({ events = 3, tasks = 5, alerts = 0 }) {
  return (
    <Card className="bg-gradient-to-br from-primary-light to-white border-2 border-primary">
      <div className="space-y-3">
        <h3 className="text-h2 font-serif text-primary">Today's Summary</h3>
        
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-3 rounded-lg bg-white border border-border">
            <Calendar size={20} className="text-primary mx-auto mb-1" />
            <p className="text-display text-primary font-serif">{events}</p>
            <p className="text-xs text-text-secondary">Events</p>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-white border border-border">
            <CheckSquare2 size={20} className="text-teal mx-auto mb-1" />
            <p className="text-display text-teal font-serif">{tasks}</p>
            <p className="text-xs text-text-secondary">Tasks Due</p>
          </div>
          
          {alerts > 0 ? (
            <div className="text-center p-3 rounded-lg bg-coral-light border border-coral">
              <AlertCircle size={20} className="text-coral mx-auto mb-1" />
              <p className="text-display text-coral font-serif">{alerts}</p>
              <p className="text-xs text-coral">Alerts</p>
            </div>
          ) : (
            <div className="text-center p-3 rounded-lg bg-teal-light border border-teal">
              <div className="text-2xl mx-auto mb-1">✓</div>
              <p className="text-h3 text-teal font-serif">All</p>
              <p className="text-xs text-text-secondary">Clear</p>
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-border">
          <p className="text-xs text-text-secondary">
            Good morning! You have {events} events and {tasks} tasks today. {alerts === 0 ? 'Everything looks great!' : `${alerts} items need attention.`}
          </p>
        </div>
      </div>
    </Card>
  )
}
