import { AppButton } from '@shared/ui/app-button'
import { TextInput } from '@shared/ui/form-field'
import { StatusMessage } from '@shared/ui/status-message'

type HouseholdOnboardingProps = {
  actorName: string
  createHouseholdName: string
  joinCode: string
  statusMessage: string
  busyAction: 'create' | 'join' | null
  onCreateHouseholdNameChange: (value: string) => void
  onJoinCodeChange: (value: string) => void
  onCreateHousehold: () => void
  onJoinHousehold: () => void
}

export function HouseholdOnboarding({
  actorName,
  createHouseholdName,
  joinCode,
  statusMessage,
  busyAction,
  onCreateHouseholdNameChange,
  onJoinCodeChange,
  onCreateHousehold,
  onJoinHousehold,
}: HouseholdOnboardingProps) {
  return (
    <div className='mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center gap-4 p-4 sm:p-6'>
      <section className='rounded-3xl border border-white/10 bg-(--dashboard-panel) px-5 py-5 text-white shadow-(--shadow-panel) backdrop-blur-xl sm:px-6'>
        <div className='text-xs uppercase tracking-[0.24em] text-white/42'>Household</div>
        <h1 className='mt-3 font-(--font-family-heading) text-3xl leading-none text-white sm:text-4xl'>
          {actorName}, выбери вход
        </h1>
      </section>

      {statusMessage ? <StatusMessage text={statusMessage} /> : null}

      <div className='grid gap-4 lg:grid-cols-2'>
        <section className='relative overflow-hidden rounded-3xl border border-white/10 bg-linear-to-br from-white/12 via-white/8 to-white/4 p-5 text-white shadow-(--shadow-panel) backdrop-blur-xl sm:p-6'>
          <div className='absolute inset-x-0 top-0 h-1 bg-(--color-brand-home)/80' />
          <div className='flex items-start justify-between gap-4'>
            <div>
              <div className='text-xs uppercase tracking-[0.24em] text-white/42'>Создать семью</div>
              <div className='mt-3 text-2xl font-(--font-family-heading) sm:text-3xl'>
                Своя семья
              </div>
            </div>
            <div className='rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/55'>
              Head
            </div>
          </div>
          <p className='mt-4 max-w-md text-sm leading-6 text-white/68'>
            Создай семью и получи код для остальных.
          </p>
          <div className='mt-4 rounded-[1.1rem] border border-white/8 bg-black/16 px-3 py-2.5 text-sm text-white/60'>
            Подходит для нового старта.
          </div>
          <div className='mt-5'>
            <TextInput
              value={createHouseholdName}
              placeholder='Название семьи '
              onChange={event => onCreateHouseholdNameChange(event.target.value)}
            />
          </div>
          <div className='mt-5'>
            <AppButton
              tone='light'
              disabled={busyAction !== null}
              onClick={onCreateHousehold}
            >
              {busyAction === 'create' ? 'Создаю семью...' : 'Создать семью'}
            </AppButton>
          </div>
        </section>

        <section className='relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-linear-to-br from-[#132432]/95 via-[#101a24]/95 to-[#0d141c]/95 p-5 text-white shadow-(--shadow-panel) backdrop-blur-xl sm:p-6'>
          <div className='absolute inset-x-0 top-0 h-1 bg-white/35' />
          <div className='flex items-start justify-between gap-4'>
            <div>
              <div className='text-xs uppercase tracking-[0.24em] text-white/42'>Войти по коду</div>
              <div className='mt-3 text-2xl font-(--font-family-heading) sm:text-3xl'>
                Уже есть семья
              </div>
            </div>
            <div className='rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/55'>
              Invite
            </div>
          </div>
          <p className='mt-4 max-w-md text-sm leading-6 text-white/68'>
            Введи код и сразу подключись к семье.
          </p>
          <div className='mt-4 rounded-[1.1rem] border border-white/8 bg-white/6 px-3 py-2.5 text-sm text-white/60'>
            Нужен только актуальный invite.
          </div>
          <div className='mt-5'>
            <TextInput
              value={joinCode}
              placeholder='Например, H8K2Q9PL'
              onChange={event => onJoinCodeChange(event.target.value.toUpperCase())}
            />
          </div>
          <div className='mt-5'>
            <AppButton
              tone='secondary'
              disabled={busyAction !== null}
              onClick={onJoinHousehold}
            >
              {busyAction === 'join' ? 'Подключаю...' : 'Войти по коду'}
            </AppButton>
          </div>
        </section>
      </div>
    </div>
  )
}
