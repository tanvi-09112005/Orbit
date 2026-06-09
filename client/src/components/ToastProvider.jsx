import { AnimatePresence } from 'framer-motion'
import Toast from './ui/Toast'
import { useUIStore } from '../stores/uiStore'

export default function ToastProvider() {
  const { toasts, removeToast } = useUIStore()

  return (
    <AnimatePresence>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          variant={toast.variant}
          onDismiss={() => removeToast(toast.id)}
        />
      ))}
    </AnimatePresence>
  )
}
