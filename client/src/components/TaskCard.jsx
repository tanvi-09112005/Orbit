import { useState } from 'react'
import { Pencil, Trash2, Check } from 'lucide-react'
import { format } from 'date-fns'
import Badge from './ui/Badge'

export default function TaskCard({
  task,
  linkedChild,
  isOwn,
  canEdit,
  onComplete,
  onEdit,
  onDelete,
}) {
  const [confirming, setConfirming] = useState(false)
  const isOverdue = task.due_date && new Date(task.due_date) < new Date()

  const handleDelete = () => {
    if (confirming) {
      onDelete(task.id)
      setConfirming(false)
    } else {
      setConfirming(true)
      // Auto-cancel confirm after 3 seconds
      setTimeout(() => setConfirming(false), 3000)
    }
  }

  return (
    <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 bg-white transition-colors ${
      isOverdue ? 'border-coral' : 'border-border'
    }`}>
      {/* Complete checkbox — only for own tasks */}
      {isOwn ? (
        <button
          onClick={() => onComplete(task.id)}
          className="w-5 h-5 rounded border-2 border-primary flex items-center justify-center flex-shrink-0 hover:bg-primary/10 transition-colors"
          aria-label="Complete task"
        >
          <Check size={12} className="text-primary opacity-0 hover:opacity-100" />
        </button>
      ) : (
        <div className="w-5 h-5 rounded border-2 border-border flex-shrink-0" />
      )}

      {/* Task content */}
      <div className="flex-1 min-w-0">
        <p className="text-body font-semibold">{task.title}</p>
        <div className="flex items-center gap-2 flex-wrap mt-0.5">
          {task.due_date && (
            <p className={`text-caption ${isOverdue ? 'text-coral font-semibold' : 'text-text-secondary'}`}>
              {isOverdue ? 'Overdue · ' : 'Due '}
              {format(new Date(task.due_date), 'd MMM')}
            </p>
          )}
          {linkedChild && (
            <span
              className="text-caption font-medium px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: linkedChild.color_hex || '#6B7280' }}
            >
              {linkedChild.name}
            </span>
          )}
        </div>
      </div>

      {/* Action buttons — only shown if canEdit */}
      {canEdit && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onEdit(task)}
            className="p-1.5 rounded-lg text-text-secondary hover:text-primary hover:bg-primary/10 transition-colors"
            aria-label="Edit task"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={handleDelete}
            className={`p-1.5 rounded-lg transition-colors ${
              confirming
                ? 'bg-coral text-white'
                : 'text-text-secondary hover:text-coral hover:bg-coral/10'
            }`}
            aria-label={confirming ? 'Tap again to confirm delete' : 'Delete task'}
            title={confirming ? 'Tap again to confirm' : 'Delete'}
          >
            <Trash2 size={15} />
          </button>
        </div>
      )}
    </div>
  )
}