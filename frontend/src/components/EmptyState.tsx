import type { ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

export function EmptyState({ icon = 'box', title, children }: { icon?: IconName; title: string; children?: ReactNode }) {
  return (
    <div className="space-y-3 py-8 text-center">
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-line text-soga">
        <Icon name={icon} size={28} />
      </span>
      <p className="text-lg font-bold">{title}</p>
      {children && <div className="space-y-3 text-base text-ink/80">{children}</div>}
    </div>
  )
}
