import Avatar from './ui/Avatar'
import { cn } from '../lib/utils'

export default function ChildChip({ child, active, onClick, className }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-full transition-all',
        active
          ? 'ring-2 ring-primary bg-primary-light'
          : 'bg-muted hover:bg-muted/70',
        className,
      )}
    >
      <Avatar name={child.name} size="sm" src={child.photo_url} />
      <span className="text-body font-semibold">{child.name}</span>
    </button>
  )
}
