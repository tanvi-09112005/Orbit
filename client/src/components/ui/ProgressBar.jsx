import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'

export default function ProgressBar({ value = 0, color = 'primary', className, ...props }) {
  const colorClasses = {
    primary: 'bg-primary',
    teal: 'bg-teal',
    coral: 'bg-coral',
    amber: 'bg-amber',
  }

  return (
    <div className={cn('w-full h-2 bg-muted rounded-full overflow-hidden', className)} {...props}>
      <motion.div
        className={cn(colorClasses[color], 'h-full rounded-full')}
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </div>
  )
}
