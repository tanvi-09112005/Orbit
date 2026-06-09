import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

const COLORS = [
  '#2D1B8E', '#534AB7', '#0F6E56', '#993C1D', '#854F0B',
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
]

const getColorFromName = (name) => {
  if (!name) return COLORS[0]
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return COLORS[hash % COLORS.length]
}

const getInitials = (name) => {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const Avatar = forwardRef(
  ({ src, name = '', size = 'md', className, ...props }, ref) => {
    const sizes = {
      sm: 'w-7 h-7 text-xs',
      md: 'w-9 h-9 text-sm',
      lg: 'w-12 h-12 text-base',
      xl: 'w-16 h-16 text-lg',
    }

    const bgColor = getColorFromName(name)

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-center rounded-full flex-shrink-0',
          sizes[size],
          className,
        )}
        style={{
          backgroundColor: src ? undefined : bgColor,
        }}
        {...props}
      >
        {src ? (
          <img src={src} alt={name} className="w-full h-full rounded-full object-cover" />
        ) : (
          <span className="font-semibold text-white">{getInitials(name)}</span>
        )}
      </div>
    )
  },
)

Avatar.displayName = 'Avatar'

export default Avatar
