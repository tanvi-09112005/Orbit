import { Outlet, useLocation } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const STEPS = ['family', 'partner', 'children', 'guardians', 'done']

export default function OnboardingLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const currentPath = location.pathname.split('/').pop()
  const currentStep = STEPS.indexOf(currentPath) + 1
  const totalSteps = STEPS.length - 1 // Exclude 'done' from progress

  const handleBack = () => {
    if (currentStep > 1) {
      const prevPath = STEPS[currentStep - 2]
      navigate(`/onboarding/${prevPath}`)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header with back button and progress */}
      <div className="px-5 pt-4 pb-6 border-b border-border">
        <div className="flex items-center gap-3 mb-4">
          {currentStep > 1 && (
            <button
              onClick={handleBack}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              aria-label="Go back"
            >
              <ChevronLeft size={24} />
            </button>
          )}
          <div className="flex-1">
            <div className="text-caption text-text-secondary mb-2">
              Step {currentStep} of {totalSteps}
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-5 py-8">
        <div className="max-w-sm mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
