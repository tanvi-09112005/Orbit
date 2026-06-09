import { cn } from '../../lib/utils'

export default function Badge({ variant = 'gray', children, className, ...props }) {
  const variants = {
    primary: 'bg-primary text-white',
    teal: 'bg-teal text-white',
    coral: 'bg-coral text-white',
    amber: 'bg-amber text-white',
    gray: 'bg-muted text-foreground',
  }

  return (
    <span
      className={cn(
        'text-label rounded-full px-3 py-1 inline-flex items-center gap-1',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
