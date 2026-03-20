import { AppButton } from '@shared/ui/app-button'
import { ModalBody, ModalFooter, ModalHeader, ModalPanel } from '@shared/ui/app-modal'

type TaskCompletionConfirmModalProps = {
  mode: 'confirm' | 'select'
  taskTitle: string
  assigneeName: string
  loading: boolean
  members: Array<{
    id: string
    displayName: string
  }>
  onConfirmAssignee: () => void
  onSelectMember: (memberId: string) => void
  onBack: () => void
}

export function TaskCompletionConfirmModal({
  mode,
  taskTitle,
  assigneeName,
  loading,
  members,
  onConfirmAssignee,
  onSelectMember,
  onBack,
}: TaskCompletionConfirmModalProps) {
  return (
    <ModalPanel className='max-w-xl'>
      <ModalHeader>
        <div className='space-y-2'>
          <div className='text-xs uppercase tracking-(--letter-spacing-wide) text-(--color-panel-text-faint)'>
            Подтверждение
          </div>
          <h2 className='font-(--font-family-heading) text-3xl leading-(--line-height-snug)'>
            {mode === 'confirm' ? `Выполнила ${assigneeName}?` : 'Кто выполнил задачу?'}
          </h2>
          <div className='text-sm leading-6 text-white/65'>
            Задача: {taskTitle}
          </div>
        </div>
      </ModalHeader>

      <ModalBody>
        {mode === 'confirm' ? (
          <div className='space-y-4'>
            <div className='rounded-3xl border border-white/10 bg-white/6 px-5 py-4 text-sm leading-6 text-white/70'>
              Если подтвердить, награда уйдёт адресату задачи: {assigneeName}.
            </div>

            <AppButton tone='home' onClick={onConfirmAssignee} disabled={loading}>
              {loading ? 'Подтверждаю...' : `Да, выполнила ${assigneeName}`}
            </AppButton>

            <AppButton tone='secondary' onClick={onBack} disabled={loading}>
              Нет, выбрать другого
            </AppButton>
          </div>
        ) : (
          <div className='space-y-3'>
            {members.map(member => (
              <button
                key={member.id}
                type='button'
                onClick={() => onSelectMember(member.id)}
                disabled={loading}
                className='w-full rounded-3xl border border-white/10 bg-white/6 px-5 py-4 text-left text-base text-white/85 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60'
              >
                {member.displayName}
              </button>
            ))}
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        <AppButton tone='ghost' onClick={onBack} disabled={loading}>
          Назад
        </AppButton>
      </ModalFooter>
    </ModalPanel>
  )
}
