import { useNavigate } from 'react-router-dom'
import { useOnboardingStore } from '../../stores/onboardingStore'
import { useFamilyStore } from '../../stores/familyStore'
import Button from '../../components/ui/Button'



export default function OnboardingDonePage() {
  const navigate = useNavigate()
  const { familyName, reset } = useOnboardingStore()
   
 
  const { fetchFamily } = useFamilyStore()

  const handleGoToApp = async () => {
    await fetchFamily()
    reset()
    navigate('/home')
  }

 

  return (
    <div className="space-y-6 text-center">
      <div className="text-5xl">🎉</div>
      <div>
        <h1 className="text-h1 text-primary mb-2">You're all set!</h1>
        <p className="text-body text-text-secondary">
          {familyName ? `${familyName} is ready to go.` : 'Your family is ready to go.'}
        </p>
      </div>

      <div className="bg-teal-light rounded-2xl p-6 text-left space-y-2">
        <p className="text-body font-semibold text-teal">What's next:</p>
        <p className="text-body text-text-secondary">• Add events to your family calendar</p>
        <p className="text-body text-text-secondary">• Log your child's mood and activities</p>
        <p className="text-body text-text-secondary">• Invite your partner from Profile → Family Settings</p>
      </div>

      <Button className="w-full" onClick={handleGoToApp}>
        Go to Family OS
      </Button>
    </div>
  )
}