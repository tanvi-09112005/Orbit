import { useNavigate, useLocation } from 'react-router-dom'
import { Calendar, Dumbbell, CheckSquare, Smile } from 'lucide-react'

const tabs = [
  { id: 'schedule',   label: 'Schedule',   icon: Calendar,    path: '/child/schedule' },
  { id: 'activities', label: 'Activities', icon: Dumbbell,    path: '/child/activities' },
  { id: 'tasks',      label: 'Tasks',      icon: CheckSquare, path: '/child/tasks' },
  { id: 'mood',       label: 'Mood',       icon: Smile,       path: '/child/mood' },
]

export default function ChildTabBar() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-border safe-area-inset-bottom">
      <div className="flex items-stretch">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = location.pathname === tab.path
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 min-h-[56px] transition-colors ${
                isActive ? 'text-primary' : 'text-text-secondary'
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className={`text-[10px] font-semibold leading-none ${isActive ? 'text-primary' : 'text-text-secondary'}`}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}