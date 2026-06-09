import { cn } from '../../lib/utils'

export default function SectionHeader({ title, action, border = false, className, ...props }) {
  return (
    <div
      className={cn(
        'flex items-center justify-between',
        border && 'pb-4 border-b border-border',
        className,
      )}
      {...props}
    >
      <h2 className="text-h1 font-serif">{title}</h2>
      {action && <div>{action}</div>}
    </div>
  )
}
