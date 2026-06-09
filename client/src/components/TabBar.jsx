import { useLocation, useNavigate } from 'react-router-dom'
import { Home, Users, Baby, BarChart3, Search } from 'lucide-react'

const TABS = [
  { id: 'home',     label: 'Home',     path: '/home',     icon: Home     },
  { id: 'family',   label: 'Family',   path: '/family',   icon: Users    },
  { id: 'children', label: 'Children', path: '/children', icon: Baby     },
  { id: 'insights', label: 'Insights', path: '/insights', icon: BarChart3 },
  { id: 'search',   label: 'Search',   path: '/search',   icon: Search   },
]

export default function TabBar() {
  const location = useLocation()
  const navigate = useNavigate()

  const getActiveTab = () => {
    for (const tab of TABS) {
      if (location.pathname.startsWith(tab.path)) return tab.id
    }
    return 'home'
  }

  const activeTab = getActiveTab()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-border safe-bottom z-30">
      <div className="flex items-center justify-around max-w-md mx-auto md:max-w-full">
        {TABS.map(({ id, label, path, icon: Icon }) => (
          <button
            key={id}
            onClick={() => navigate(path)}
            className="flex-1 flex flex-col items-center justify-center py-3 px-2 text-center transition-colors min-h-[56px]"
            aria-label={label}
            aria-current={activeTab === id ? 'page' : undefined}
          >
            <Icon
              size={22}
              strokeWidth={activeTab === id ? 2.5 : 1.8}
              className={activeTab === id ? 'text-primary' : 'text-text-secondary'}
            />
            <span className={`text-xs mt-1 ${activeTab === id ? 'text-primary font-semibold' : 'text-text-secondary'}`}>
              {label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  )
}