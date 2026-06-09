import Card from './ui/Card'
import Button from './ui/Button'
import { Heart, MessageSquare } from 'lucide-react'

export default function PartnerNudgeCard({ partnerName = 'Raj', daysSinceUpdate = 5 }) {
  if (daysSinceUpdate < 3) return null

  return (
    <Card className="bg-gradient-to-br from-coral-light to-white border-2 border-coral">
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <Heart size={24} className="text-coral flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="text-h3 font-semibold text-coral">Check in with {partnerName}?</h3>
            <p className="text-caption text-text-secondary">
              {partnerName} hasn't updated the app in {daysSinceUpdate} days. Send a gentle reminder!
            </p>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="secondary"
            className="flex-1 gap-2"
          >
            <MessageSquare size={16} />
            Send Message
          </Button>
        </div>
      </div>
    </Card>
  )
}
