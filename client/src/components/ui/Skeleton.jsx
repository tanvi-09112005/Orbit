import { cn } from '../../lib/utils'

export default function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn('bg-muted animate-shimmer rounded', className)}
      {...props}
    />
  )
}
