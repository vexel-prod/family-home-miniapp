import { AppButton } from '@/components/ui/app-button'
import { ModalPanel } from '@/components/ui/app-modal'
import { BONUS_REWARDS, formatPoints } from '@/shared/lib/bonus-shop'
import { formatRelativeDate } from '@/shared/lib/format'
import type { BonusPurchase, MonthlyReport } from '@/shared/types/family'

type BonusShopModalProps = {
  balanceUnits: number
  purchases: BonusPurchase[]
  reports: MonthlyReport[]
  busyRewardKey: string | null
  onBuy: (rewardKey: string) => void
  onClose: () => void
}

export function BonusShopModal({
  balanceUnits,
  purchases,
  reports,
  busyRewardKey,
  onBuy,
  onClose,
}: BonusShopModalProps) {
  return (
    <ModalPanel
      wide
      tall
    >
      <div className='border-b border-white/10 p-4 sm:p-6'>
        <div className='flex items-center justify-between gap-4'>
          <div>
            <h2 className='uppercase font-(--font-family-heading) text-xl leading-(--line-height-snug)'>
              Баланс месяца: {formatPoints(balanceUnits)}
            </h2>
          </div>
          <div className='rounded-md bg-white/5 px-4 py-3 text-right text-sm text-white/70'>
            Бонусы действуют только до конца текущего месяца
          </div>
        </div>
      </div>

      <div className='max-h-[45dvh] overflow-auto grid gap-4 p-4 sm:grid-cols-[1.15fr_0.85fr] sm:p-6'>
        <div className='grid gap-4'>
          {BONUS_REWARDS.map(reward => {
            const canBuy = balanceUnits >= reward.costUnits && !busyRewardKey

            return (
              <div
                key={reward.key}
                className='overflow-hidden rounded-md border border-white/10 bg-white/5'
              >
                <div
                  className={`bg-linear-to-r ${reward.accentClassName} p-5 text-(--color-page-text)`}
                >
                  <div className='text-xs uppercase tracking-[0.24em] text-black/55'>
                    Услуга месяца
                  </div>
                  <div className='mt-3 text-2xl font-semibold'>{reward.title}</div>
                  <div className='mt-2 max-w-xl text-sm text-black/70'>{reward.description}</div>
                </div>

                <div className='flex items-center justify-between gap-4 p-5'>
                  <div>
                    <div className='text-xs uppercase tracking-[0.24em] text-white/45'>
                      Стоимость
                    </div>
                    <div className='mt-2 text-xl font-semibold text-white'>
                      {formatPoints(reward.costUnits)} баллов
                    </div>
                  </div>

                  <AppButton
                    tone={canBuy ? 'home' : 'secondary'}
                    className='w-auto min-w-40'
                    disabled={!canBuy}
                    onClick={() => onBuy(reward.key)}
                  >
                    {busyRewardKey === reward.key
                      ? 'Покупаю...'
                      : canBuy
                        ? 'Купить'
                        : 'Недостаточно баллов'}
                  </AppButton>
                </div>
              </div>
            )
          })}
        </div>

        <div className='grid gap-4'>
          <div className='flex min-h-0 flex-col rounded-md border border-white/10 bg-white/5'>
            <div className='border-b border-white/10 p-4 text-xs uppercase tracking-[0.24em] text-white/45'>
              История покупок
            </div>

            <div className='min-h-0 flex-1 overflow-y-auto p-4'>
              {purchases.length ? (
                <div className='space-y-3'>
                  {purchases.map(purchase => (
                    <div
                      key={purchase.id}
                      className='rounded-md bg-white/6 p-4'
                    >
                      <div className='text-sm font-semibold text-white'>{purchase.rewardTitle}</div>
                      <div className='mt-2 text-sm text-white/65'>
                        Списано {formatPoints(purchase.costUnits)} баллов
                      </div>
                      <div className='mt-2 text-xs text-white/45'>
                        {formatRelativeDate(purchase.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className='rounded-md border border-dashed border-white/12 bg-white/4 px-4 py-8 text-center text-sm text-white/60'>
                  Пока нет покупок в этом месяце.
                </div>
              )}
            </div>
          </div>

          <div className='flex min-h-0 flex-col rounded-md border border-white/10 bg-white/5'>
            <div className='border-b border-white/10 p-4 text-xs uppercase tracking-[0.24em] text-white/45'>
              Месячные отчеты
            </div>

            <div className='min-h-0 flex-1 overflow-y-auto p-4'>
              {reports.length ? (
                <div className='space-y-3'>
                  {reports.map(report => (
                    <div
                      key={report.id}
                      className='rounded-md bg-white/6 p-4'
                    >
                      <div className='text-sm font-semibold text-white'>{report.title}</div>
                      <div className='mt-2 whitespace-pre-line text-sm leading-6 text-white/65'>
                        {report.reportBody}
                      </div>
                      <div className='mt-2 text-xs text-white/45'>
                        {report.sentAt
                          ? `Отправлен: ${formatRelativeDate(report.sentAt)}`
                          : 'Сохранен в базе'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className='rounded-md border border-dashed border-white/12 bg-white/4 px-4 py-8 text-center text-sm text-white/60'>
                  Отчеты появятся после закрытия месяца.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className='border-t border-white/10 p-4 sm:p-6'>
        <AppButton
          tone='ghost'
          onClick={onClose}
        >
          Закрыть магазин
        </AppButton>
      </div>
    </ModalPanel>
  )
}
