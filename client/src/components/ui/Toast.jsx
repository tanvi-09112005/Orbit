import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
}

const bgColors = {
  success: 'bg-teal-light border-teal',
  error: 'bg-coral-light border-coral',
  info: 'bg-primary-light border-primary',
}

const textColors = {
  success: 'text-teal',
  error: 'text-coral',
  info: 'text-primary',
}

export default function Toast({ message, variant = 'info', onDismiss, duration = 3000 }) {
  const Icon = icons[variant]

  useEffect(() => {
    const timer = setTimeout(onDismiss, duration)
    return () => clearTimeout(timer)
  }, [onDismiss, duration])

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -20, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`fixed top-4 left-4 right-4 max-w-md mx-auto rounded-xl border shadow-lg px-4 py-3 flex items-start gap-3 ${bgColors[variant]}`}
      role="alert"
    >
      <Icon size={20} className={`flex-shrink-0 mt-0.5 ${textColors[variant]}`} />
      <p className={`text-body flex-1 ${textColors[variant]}`}>{message}</p>
      <button onClick={onDismiss} className="flex-shrink-0" aria-label="Dismiss">
        <X size={18} className={textColors[variant]} />
      </button>
    </motion.div>
  )
}
