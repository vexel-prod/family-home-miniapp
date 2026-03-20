import { formatPoints, getBonusRewardAccentClassName } from '@entities/bonus'
import type { BonusReward } from '@entities/family'
import { ModalBody, ModalFooter, ModalPanel } from '@shared/ui/app-modal'
import { AppButton } from '@/shared/ui/app-button'

type BonusRewardDetailsModalProps = {
  reward: BonusReward
  balanceUnits: number
  busyRewardKey: string | null
  onBuy: (rewardId: string) => void
  onEdit: (reward: BonusReward) => void
  onDelete: (rewardId: string) => void
  onBack: () => void
}

export function BonusRewardDetailsModal({
  reward,
  balanceUnits,
  busyRewardKey,
  onBuy,
  onEdit,
  onDelete,
  onBack,
}: BonusRewardDetailsModalProps) {
  const enoughBalance = balanceUnits >= reward.costUnits
  const canBuy = enoughBalance && !busyRewardKey
  const balanceAfterPurchase = balanceUnits - reward.costUnits
  const missingUnits = Math.max(reward.costUnits - balanceUnits, 0)

  return (
    <ModalPanel className='max-w-xl'>
      <ModalBody className='px-4 py-4 sm:px-5 sm:py-5'>
        <div className='space-y-4'>
          <section
            className={`relative overflow-hidden rounded-4xl bg-linear-to-br ${getBonusRewardAccentClassName(reward.id)} p-4 text-[#201a12] shadow-[0_24px_60px_rgba(0,0,0,0.24)] sm:p-6`}
          >
            <div className='pointer-events-none absolute inset-x-0 top-0 h-24 bg-linear-to-b from-white/18 to-transparent' />
            <div className='pointer-events-none absolute -right-10 top-8 h-32 w-32 rounded-full border border-white/20 bg-white/10 blur-2xl' />
            <div className='pointer-events-none absolute -bottom-12 left-8 h-28 w-28 rounded-full bg-black/10 blur-3xl' />

            <div>
              <div className='grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:gap-6'>
                <div className='min-w-0'>
                  <div className='rounded-full border border-black/10 bg-black/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.28em] text-black/55 w-fit'>
                    Bonus reward
                  </div>

                  <h3 className='mt-4 text-xl font-black uppercase leading-[0.9] tracking-[-0.04em] text-black/85 sm:text-[3.5rem]'>
                    {reward.title}
                  </h3>
                </div>

                <div className='shrink-0 rounded-[1.2rem] border border-black/10 bg-black/14 px-3.5 py-2.5 text-right backdrop-blur-md sm:rounded-[1.4rem] sm:px-4 sm:py-3'>
                  <div className='text-[9px] font-bold uppercase tracking-[0.24em] text-black/50 sm:text-[10px]'>
                    Цена
                  </div>
                  <div className='mt-1 text-2xl font-black leading-none text-black/85 sm:text-4xl'>
                    {formatPoints(reward.costUnits)}
                  </div>
                  <div className='mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-black/52 sm:text-[11px] sm:tracking-[0.24em]'>
                    house coin
                  </div>
                </div>
              </div>

              <p className='max-w-md text-sm leading-6 text-black/66 sm:text-[15px]'>
                {reward.description || 'Короткое описание ещё не добавлено для этой награды.'}
              </p>
            </div>
          </section>

          <section className='overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/6'>
            <div className='grid divide-y divide-white/10 sm:grid-cols-[1.1fr_0.9fr] sm:divide-x sm:divide-y-0'>
              <div className='space-y-4 p-5 sm:p-6'>
                <div>
                  <div className='text-[10px] font-bold uppercase tracking-[0.28em] text-white/38'>
                    Покупка
                  </div>
                  <div className='mt-2 text-xl font-semibold text-white'>
                    {enoughBalance ? 'Можно брать прямо сейчас' : 'Пока не хватает баланса'}
                  </div>
                </div>

                <p className='text-sm leading-6 text-white/58'>
                  {enoughBalance
                    ? `После покупки у тебя останется ${formatPoints(balanceAfterPurchase)} HC.`
                    : `До покупки не хватает ${formatPoints(missingUnits)} HC.`}
                </p>
              </div>

              <div className='grid grid-cols-2 gap-px bg-white/10'>
                <div className='bg-[rgba(13,16,26,0.92)] p-5 sm:p-6'>
                  <div className='text-[10px] font-bold uppercase tracking-[0.24em] text-white/36'>
                    У тебя
                  </div>
                  <div className='mt-2 text-2xl font-black text-white'>
                    {formatPoints(balanceUnits)} HC
                  </div>
                </div>

                <div className='bg-[rgba(13,16,26,0.92)] p-5 sm:p-6'>
                  <div className='text-[10px] font-bold uppercase tracking-[0.24em] text-white/36'>
                    После
                  </div>
                  <div className='mt-2 text-2xl font-black text-white'>
                    {enoughBalance
                      ? `${formatPoints(balanceAfterPurchase)} HC`
                      : `-${formatPoints(missingUnits)} HC`}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </ModalBody>

      <ModalFooter className='space-y-3'>
        <AppButton
          type='button'
          tone='home'
          disabled={!canBuy}
          onClick={() => onBuy(reward.id)}
          className='rounded-[1.35rem] py-4 text-base font-black uppercase tracking-[0.04em] sm:text-lg'
        >
          {busyRewardKey === reward.id ? 'Покупаю...' : canBuy ? 'Купить товар' : 'Недостаточно HC'}
        </AppButton>

        <div className='grid grid-cols-2 gap-2'>
          <AppButton
            type='button'
            tone='secondary'
            onClick={() => onEdit(reward)}
            className='rounded-[1.35rem] py-4 text-sm font-semibold uppercase tracking-[0.08em]'
          >
            Изменить
          </AppButton>

          <AppButton
            type='button'
            tone='danger'
            onClick={() => onDelete(reward.id)}
            className='rounded-[1.35rem] py-4 text-sm font-semibold uppercase tracking-[0.08em]'
          >
            Удалить
          </AppButton>
        </div>

        <AppButton
          type='button'
          tone='ghost'
          onClick={onBack}
          className='w-full rounded-[1.35rem] justify-center py-4 text-sm font-semibold uppercase tracking-[0.08em] text-white/72'
        >
          Назад в магазин
        </AppButton>
      </ModalFooter>
    </ModalPanel>
  )
}
