import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className='field'
      {...props}
    />
  )
}

export function SelectField(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className='field'
      {...props}
    />
  )
}

export function TextAreaField(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className='field field--textarea'
      {...props}
    />
  )
}
