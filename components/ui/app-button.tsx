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

export function AppButton({
  tone = 'secondary',
  className = '',
  children,
  ...props
}: AppButtonProps) {
  return (
    <button
      type='button'
      className={`btn btn--${tone}${className ? ` ${className}` : ''} py-6 rounded-md`}
      {...props}
    >
      {children}
    </button>
  )
}
