import { AppButton } from '@shared/ui/app-button'
import { ModalBody, ModalFooter, ModalHeader, ModalPanel } from '@shared/ui/app-modal'
import { TextAreaField, TextInput } from '@shared/ui/form-field'
import { StatusMessage } from '@shared/ui/status-message'

type TaskFormModalProps = {
  mode: 'create' | 'replace'
  title: string
  note: string
  deadlineAt: string
  assigneeMemberId: string
  rewardPoints: string
  status: string
  loading: boolean
  submitLabel: string
  busyLabel: string
  members: Array<{
    id: string
    displayName: string
  }>
  onTitleChange: (value: string) => void
  onNoteChange: (value: string) => void
  onDeadlineAtChange: (value: string) => void
  onAssigneeMemberIdChange: (value: string) => void
  onRewardPointsChange: (value: string) => void
  onSubmit: () => void
  onBack: () => void
}

export function TaskFormModal({
  mode,
  title,
  note,
  deadlineAt,
  assigneeMemberId,
  rewardPoints,
  status,
  loading,
  submitLabel,
  busyLabel,
  members,
  onTitleChange,
  onNoteChange,
  onDeadlineAtChange,
  onAssigneeMemberIdChange,
  onRewardPointsChange,
  onSubmit,
  onBack,
}: TaskFormModalProps) {
  return (
    <ModalPanel>
      <ModalHeader>
        <div className='space-y-2'>
          <h2 className='font-(--font-family-heading) text-3xl leading-(--line-height-snug)'>
            {mode === 'create' ? 'Новая задача' : 'Редактирование задачи'}
          </h2>
        </div>
      </ModalHeader>

      <ModalBody>
        <div className='space-y-4'>
          {status ? <StatusMessage text={status} /> : null}

          <TextInput
            placeholder={mode === 'create' ? 'Например: разобрать сушилку' : 'Новое название'}
            value={title}
            onChange={event => onTitleChange(event.target.value)}
          />

          <div className='space-y-2'>
            <div className='text-xs uppercase tracking-[0.22em] text-white/45'>Сделать до</div>
            <TextInput
              type='datetime-local'
              value={deadlineAt}
              onChange={event => onDeadlineAtChange(event.target.value)}
            />
            <div className='text-xs text-white/45'>
              Дедлайн можно ставить только в пределах текущего месяца.
            </div>
          </div>

          <div className='grid gap-4 sm:grid-cols-2'>
            <label className='space-y-2'>
              <div className='text-xs uppercase tracking-[0.22em] text-white/45'>Адресат</div>
              <select
                value={assigneeMemberId}
                onChange={event => onAssigneeMemberIdChange(event.target.value)}
                className='w-full rounded-xl border border-white/10 bg-(--color-panel-field) px-4 py-4 text-base text-(--color-panel-text) outline-none transition-colors duration-150 hover:border-white/20 focus:border-white/30'
              >
                <option value=''>Без адресата</option>
                {members.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.displayName}
                  </option>
                ))}
              </select>
            </label>

            <label className='space-y-2'>
              <div className='text-xs uppercase tracking-[0.22em] text-white/45'>
                Награда, house-coin
              </div>
              <TextInput
                type='text'
                inputMode='numeric'
                placeholder='По умолчанию'
                value={rewardPoints}
                onChange={event => onRewardPointsChange(event.target.value)}
              />
            </label>
          </div>

          <TextAreaField
            placeholder={mode === 'create' ? 'Комментарий или детали' : 'Комментарий'}
            value={note}
            onChange={event => onNoteChange(event.target.value)}
          />
        </div>
      </ModalBody>

      <ModalFooter>
        <div className='space-y-3'>
          <AppButton
            tone={mode === 'create' ? 'home' : 'success'}
            onClick={onSubmit}
            disabled={loading}
          >
            {loading ? busyLabel : submitLabel}
          </AppButton>

          <AppButton
            tone='secondary'
            onClick={onBack}
          >
            Назад
          </AppButton>
        </div>
      </ModalFooter>
    </ModalPanel>
  )
}
