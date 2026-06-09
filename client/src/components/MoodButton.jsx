import { motion } from 'framer-motion'
import { cn } from '../lib/utils'

const moods = {
  stressed: { emoji: '😟', label: 'Stressed', color: 'text-coral' },
  fine: { emoji: '😐', label: 'Fine', color: 'text-amber' },
  great: { emoji: '😄', label: 'Great', color: 'text-teal' },
}

export default function MoodButton({ mood, selected, onClick, className }) {
  const moodData = moods[mood]

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        'flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all min-h-[100px] min-w-[90px]',
        selected
          ? 'border-primary bg-primary-light ring-2 ring-primary'
          : 'border-border bg-muted hover:border-primary',
        className,
      )}
    >
      <span className="text-4xl">{moodData.emoji}</span>
      <span className={cn('text-body font-semibold', moodData.color)}>
        {moodData.label}
      </span>
    </motion.button>
  )
}
