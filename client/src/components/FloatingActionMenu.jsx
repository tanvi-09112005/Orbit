import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, X, Calendar, CheckSquare2, Smile, Upload } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import AddTaskSheet from './AddTaskSheet'
import GlobalUploadSheet from './GlobalUploadSheet'
import { useFamilyStore } from '../stores/familyStore'

export default function FloatingActionMenu({ role }) {
  const navigate = useNavigate()
  const { children } = useFamilyStore()
  const [isOpen, setIsOpen] = useState(false)
  const [taskSheet, setTaskSheet] = useState(false)
  const [uploadSheet, setUploadSheet] = useState(false)

  const canAddEvents = role === 'parent'

  const actions = [
    canAddEvents && {
      icon: Calendar,
      label: 'Event',
      color: 'bg-primary',
      action: () => { navigate('/family/events/new'); setIsOpen(false) },
    },
    {
      icon: CheckSquare2,
      label: 'Task',
      color: 'bg-teal',
      action: () => { setIsOpen(false); setTaskSheet(true) },
    },
    {
      icon: Smile,
      label: 'Mood',
      color: 'bg-amber',
      action: () => {
        setIsOpen(false)
        const firstChild = children[0]
        if (firstChild) navigate(`/children/${firstChild.id}/wellbeing`)
      },
    },
    {
      icon: Upload,
      label: 'Upload',
      color: 'bg-coral',
      action: () => { setIsOpen(false); setUploadSheet(true) },
    },
  ].filter(Boolean)

  return (
    <>
      <div className="fixed bottom-24 right-4 z-40">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-20 right-0 flex flex-col gap-3 items-end"
            >
              {actions.map((action, idx) => {
                const Icon = action.icon
                return (
                  <motion.button
                    key={action.label}
                    initial={{ scale: 0, y: 20, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0, y: 20, opacity: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={action.action}
                    className={`${action.color} px-4 py-2.5 rounded-full text-white shadow-lg hover:shadow-xl transition-shadow flex items-center gap-2`}
                  >
                    <Icon size={18} />
                    <span className="text-sm font-medium">{action.label}</span>
                  </motion.button>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="bg-primary text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center"
          aria-label={isOpen ? 'Close menu' : 'Open quick actions'}
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div key="close" initial={{ rotate: 0 }} animate={{ rotate: 90 }} exit={{ rotate: 0 }}>
                <X size={24} />
              </motion.div>
            ) : (
              <motion.div key="plus" initial={{ rotate: 90 }} animate={{ rotate: 0 }} exit={{ rotate: 90 }}>
                <Plus size={24} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      <AddTaskSheet open={taskSheet} onClose={() => setTaskSheet(false)} />
      <GlobalUploadSheet open={uploadSheet} onClose={() => setUploadSheet(false)} />
    </>
  )
}