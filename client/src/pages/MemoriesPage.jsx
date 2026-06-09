import { ImageIcon, Plus } from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import SectionHeader from '../components/ui/SectionHeader'

export default function MemoriesPage() {
  return (
    <div className="space-y-6 pt-4">
      <SectionHeader title="Family Memories" />

      <Button className="w-full">
        <Plus size={18} />
        Add Memory
      </Button>

      <Card className="text-center py-12">
        <ImageIcon size={48} className="mx-auto mb-4 text-text-secondary opacity-30" />
        <p className="text-body text-text-secondary mb-4">No memories yet</p>
        <p className="text-caption text-text-secondary">
          Add photos and moments to your family timeline
        </p>
      </Card>
    </div>
  )
}