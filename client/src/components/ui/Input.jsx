import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

const Input = forwardRef(
  ({ className, label, error, helper, id, type = 'text', ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).slice(2)}`

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-body font-semibold mb-2">
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          className={cn(
            'w-full px-4 py-3 border border-border rounded-xl text-body transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white',
            error && 'border-coral focus:ring-coral focus:border-coral',
            className,
          )}
          ref={ref}
          aria-describedby={error ? `${inputId}-error` : helper ? `${inputId}-helper` : undefined}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-caption text-coral mt-1">
            {error}
          </p>
        )}
        {helper && !error && (
          <p id={`${inputId}-helper`} className="text-caption text-text-secondary mt-1">
            {helper}
          </p>
        )}
      </div>
    )
  },
)

Input.displayName = 'Input'

export default Input
