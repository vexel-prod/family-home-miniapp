import { AppButton } from '@/components/ui/app-button'
import { TextInput } from '@/components/ui/form-field'
import { StatusMessage } from '@/components/ui/status-message'

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
      <section className='rounded-md border border-white/10 bg-(--dashboard-panel) p-6 text-white shadow-(--shadow-panel) backdrop-blur-xl sm:p-8'>
        <div className='max-w-3xl'>
          <div className='text-xs uppercase tracking-[0.28em] text-white/45'>Household</div>
          <h1 className='mt-4 font-(--font-family-heading) text-4xl leading-none text-white sm:text-5xl'>
            {actorName}, сначала создай семью или войди по коду
          </h1>
          <p className='mt-4 max-w-2xl text-sm leading-6 text-white/70 sm:text-base'>
            Доступ к задачам, покупкам, рейтингу и уровню появляется только после создания семьи
            или входа по инвайт-коду действующего участника.
          </p>
        </div>
      </section>

      {statusMessage ? <StatusMessage text={statusMessage} /> : null}

      <div className='grid gap-4 lg:grid-cols-2'>
        <section className='rounded-md border border-white/10 bg-(--color-surface) p-5 text-white shadow-(--shadow-panel) backdrop-blur-xl sm:p-6'>
          <div className='text-xs uppercase tracking-[0.24em] text-white/45'>Создать семью</div>
          <div className='mt-3 text-2xl font-(--font-family-heading)'>Новый семейный контур</div>
          <p className='mt-3 text-sm leading-6 text-white/65'>
            Ты станешь главой семьи и получишь свой инвайт-код для приглашения остальных.
          </p>
          <div className='mt-5'>
            <TextInput
              value={createHouseholdName}
              placeholder='Название семьи, например Paskin Home'
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

        <section className='rounded-md border border-white/10 bg-(--color-surface) p-5 text-white shadow-(--shadow-panel) backdrop-blur-xl sm:p-6'>
          <div className='text-xs uppercase tracking-[0.24em] text-white/45'>Войти по коду</div>
          <div className='mt-3 text-2xl font-(--font-family-heading)'>Присоединение к семье</div>
          <p className='mt-3 text-sm leading-6 text-white/65'>
            Введи инвайт-код главы семьи. Код действует 24 часа и привязывает тебя к общей
            семье, задачам, покупкам и рейтингу.
          </p>
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
