import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { differenceInYears } from 'date-fns'
import { useFamilyStore } from '../stores/familyStore'
import Avatar from '../components/ui/Avatar'
import Card from '../components/ui/Card'
import ChildChip from '../components/ChildChip'
import EmptyState from '../components/ui/EmptyState'
import Button from '../components/ui/Button'
import { Baby } from 'lucide-react'

export default function ChildrenPage() {
  const navigate = useNavigate()
  const { children } = useFamilyStore()

  // If only one child, redirect straight to their overview
  useEffect(() => {
    if (children.length === 1) {
      navigate(`/children/${children[0].id}`, { replace: true })
    }
  }, [children])

  if (children.length === 0) {
    return (
      <div className="pt-4">
        <EmptyState
          icon={Baby}
          title="No children added yet"
          description="Add a child from Family Settings to get started."
          action={
            <Button onClick={() => navigate('/profile/family-settings')}>
              Go to Family Settings
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-6 pt-4">
      <h1 className="text-h1 text-primary">Children</h1>
      <div className="space-y-3">
        {children.map((child) => {
          const age = child.dob
            ? differenceInYears(new Date(), new Date(child.dob))
            : null
          return (
            <Card
              key={child.id}
              className="flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/children/${child.id}`)}
            >
              <Avatar name={child.name} size="lg" src={child.photo_url} />
              <div className="flex-1">
                <p className="text-body font-semibold">{child.name}</p>
                <p className="text-caption text-text-secondary">
                  {age !== null ? `Age ${age}` : ''}
                  {age !== null && child.school_name ? ' • ' : ''}
                  {child.school_name || ''}
                </p>
              </div>
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: child.color_hex }}
              />
            </Card>
          )
        })}
      </div>
    </div>
  )
}