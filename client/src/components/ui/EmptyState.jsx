export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {Icon && <Icon size={48} className="text-text-secondary mb-4" />}
      <h3 className="text-h2 text-foreground mb-2">{title}</h3>
      {description && <p className="text-body text-text-secondary mb-6 max-w-xs">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  )
}
