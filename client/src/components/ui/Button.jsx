import { forwardRef } from 'react'
import { cn } from '../../lib/utils'
import { Loader2 } from 'lucide-react'

const Button = forwardRef(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled = false,
      children,
      ...props
    },
    ref,
  ) => {
    const baseStyles = 'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

    const variants = {
      primary: 'bg-primary text-white hover:bg-primary-mid active:bg-primary',
      secondary: 'bg-primary-light text-primary hover:bg-opacity-80 active:bg-opacity-70',
      ghost: 'text-primary hover:bg-primary-light active:bg-primary-light/50',
      danger: 'bg-coral text-white hover:bg-opacity-90 active:bg-opacity-80',
    }

    const sizes = {
      sm: 'px-3 py-2 text-sm min-h-[36px] min-w-[36px]',
      md: 'px-4 py-3 text-base min-h-[44px] min-w-[44px]',
      lg: 'px-6 py-4 text-lg min-h-[52px] min-w-[52px]',
    }

    return (
      <button
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={loading || disabled}
        ref={ref}
        {...props}
      >
        {loading && <Loader2 size={18} className="animate-spin" />}
        {children}
      </button>
    )
  },
)

Button.displayName = 'Button'

export default Button
