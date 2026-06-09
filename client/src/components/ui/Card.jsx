import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

const Card = forwardRef(({ className, children, ...props }, ref) => (
  <div
    className={cn('bg-surface rounded-2xl shadow-sm p-4', className)}
    ref={ref}
    {...props}
  >
    {children}
  </div>
))

Card.displayName = 'Card'

export default Card
