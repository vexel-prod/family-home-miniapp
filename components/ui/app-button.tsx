import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonTone =
  | 'home'
  | 'shopping'
  | 'success'
  | 'together'
  | 'danger'
  | 'secondary'
  | 'light'
  | 'ghost'

type AppButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: ButtonTone
  children: ReactNode
}

const baseClassName =
  'inline-flex w-full items-center justify-center rounded-xl border border-transparent px-5 py-4 text-base font-semibold leading-[var(--line-height-snug)] transition-all duration-150 disabled:cursor-default disabled:opacity-60'

const toneClassName: Record<ButtonTone, string> = {
  home:
    'bg-[var(--color-brand-home)] text-[#111827] hover:bg-[var(--color-brand-home-hover)]',
  shopping:
    'bg-[var(--color-brand-shopping)] text-[#111827] hover:bg-[var(--color-brand-shopping-hover)]',
  success:
    'bg-[var(--color-brand-shopping)] text-[#111827] hover:bg-[var(--color-brand-shopping-hover)]',
  together:
    'bg-[var(--color-brand-together)] text-white hover:bg-[var(--color-brand-together-hover)]',
  danger: 'bg-[var(--color-danger-soft)] text-[var(--color-danger-text)] hover:bg-rose-400/25',
  secondary: 'border-white/10 bg-white/6 text-white hover:bg-white/10',
  light: 'bg-white text-[var(--color-page-text)] hover:bg-white/90',
  ghost:
    'w-auto border-white/10 bg-white/6 px-5 py-3 text-sm text-white/80 hover:bg-white/10',
}

export function AppButton({
  tone = 'secondary',
  className = '',
  children,
  ...props
}: AppButtonProps) {
  return (
    <button
      type='button'
      className={`${baseClassName} ${toneClassName[tone]}${className ? ` ${className}` : ''} shadow-(--shadow-card)`}
      {...props}
    >
      {children}
    </button>
  )
}
