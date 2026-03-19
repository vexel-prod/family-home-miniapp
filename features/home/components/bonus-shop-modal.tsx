import { AppButton } from '@/components/ui/app-button'
import { SelectField, TextAreaField, TextInput } from '@/components/ui/form-field'
import { ModalPanel } from '@/components/ui/app-modal'
import { formatPoints, getBonusRewardAccentClassName } from '@/shared/lib/bonus-shop'
import { formatRelativeDate } from '@/shared/lib/format'
import type { BonusPurchase, BonusReward, FamilyGoal, MonthlyReport } from '@/shared/types/family'

type BonusShopModalProps = {
  balanceUnits: number
  rewards: BonusReward[]
  familyGoal: FamilyGoal | null
  purchases: BonusPurchase[]
  reports: MonthlyReport[]
  busyRewardKey: string | null
  rewardTitle: string
  rewardDescription: string
  rewardCost: string
  goalKind: 'spiritual' | 'material'
  goalTitle: string
  goalDescription: string
  goalTargetValue: string
  goalCurrentValue: string
  goalUnitLabel: string
  onBuy: (rewardKey: string) => void
  onRewardTitleChange: (value: string) => void
  onRewardDescriptionChange: (value: string) => void
  onRewardCostChange: (value: string) => void
  onCreateReward: () => void
  onDeleteReward: (rewardId: string) => void
  onGoalKindChange: (value: 'spiritual' | 'material') => void
  onGoalTitleChange: (value: string) => void
  onGoalDescriptionChange: (value: string) => void
  onGoalTargetValueChange: (value: string) => void
  onGoalCurrentValueChange: (value: string) => void
  onGoalUnitLabelChange: (value: string) => void
  onSaveGoal: () => void
  onClearGoal: () => void
  onClose: () => void
}

export function BonusShopModal({
  balanceUnits,
  rewards,
  familyGoal,
  purchases,
  reports,
  busyRewardKey,
  rewardTitle,
  rewardDescription,
  rewardCost,
  goalKind,
  goalTitle,
  goalDescription,
  goalTargetValue,
  goalCurrentValue,
  goalUnitLabel,
  onBuy,
  onRewardTitleChange,
  onRewardDescriptionChange,
  onRewardCostChange,
  onCreateReward,
  onDeleteReward,
  onGoalKindChange,
  onGoalTitleChange,
  onGoalDescriptionChange,
  onGoalTargetValueChange,
  onGoalCurrentValueChange,
  onGoalUnitLabelChange,
  onSaveGoal,
  onClearGoal,
  onClose,
}: BonusShopModalProps) {
  const familyGoalProgress = familyGoal
    ? Math.min(100, Math.round((familyGoal.currentValue / Math.max(familyGoal.targetValue, 1)) * 100))
    : 0

  return (
    <ModalPanel
      wide
      tall
    >
      <div className='border-b border-white/10 p-4 sm:p-6'>
        <div className='flex items-center justify-between gap-4'>
          <div>
            <h2 className='uppercase font-(--font-family-heading) text-xl leading-(--line-height-snug)'>
              Доступный баланс: {formatPoints(balanceUnits)}
            </h2>
          </div>
          <div className='rounded-md bg-white/5 px-4 py-3 text-right text-sm text-white/70'>
            Бонусы действуют только до конца текущего месяца
          </div>
        </div>
      </div>

      <div className='max-h-[45dvh] overflow-auto grid gap-4 p-4 sm:grid-cols-[1.15fr_0.85fr] sm:p-6'>
        <div className='grid gap-4'>
          <div className='rounded-md border border-white/10 bg-white/5 p-4'>
            <div className='text-xs uppercase tracking-[0.24em] text-white/45'>Семейная цель</div>
            {familyGoal ? (
              <div className='mt-3 space-y-3'>
                <div>
                  <div className='text-sm text-white/45'>
                    {familyGoal.kind === 'spiritual' ? 'Духовная цель' : 'Материальная цель'}
                  </div>
                  <div className='mt-2 text-xl font-semibold text-white'>{familyGoal.title}</div>
                  {familyGoal.description ? (
                    <div className='mt-2 text-sm leading-6 text-white/65'>{familyGoal.description}</div>
                  ) : null}
                </div>
                <div>
                  <div className='mb-2 flex items-center justify-between gap-3 text-sm text-white/65'>
                    <span>
                      {familyGoal.currentValue} / {familyGoal.targetValue}{' '}
                      {familyGoal.kind === 'material' ? familyGoal.unitLabel || 'ед.' : 'общих баллов'}
                    </span>
                    <span>{familyGoalProgress}%</span>
                  </div>
                  <div className='h-3 overflow-hidden rounded-full bg-white/10'>
                    <div
                      className='h-full rounded-full bg-white transition-all duration-300'
                      style={{ width: `${familyGoalProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className='mt-3 rounded-md border border-dashed border-white/12 bg-white/4 px-4 py-6 text-sm text-white/60'>
                Пока нет общей цели семьи.
              </div>
            )}

            <div className='mt-4 grid gap-3'>
              <SelectField
                value={goalKind}
                onChange={event => onGoalKindChange(event.target.value === 'material' ? 'material' : 'spiritual')}
              >
                <option value='spiritual'>Духовная цель</option>
                <option value='material'>Материальная цель</option>
              </SelectField>
              <TextInput
                value={goalTitle}
                placeholder='Например, Семейный выходной или Новый автомобиль'
                onChange={event => onGoalTitleChange(event.target.value)}
              />
              <TextAreaField
                value={goalDescription}
                placeholder='Коротко опиши, к чему идет семья'
                onChange={event => onGoalDescriptionChange(event.target.value)}
              />
              <TextInput
                value={goalTargetValue}
                inputMode='numeric'
                placeholder={goalKind === 'spiritual' ? 'Сколько общих баллов нужно' : 'Целевое значение'}
                onChange={event => onGoalTargetValueChange(event.target.value.replace(/[^\d]/g, ''))}
              />
              {goalKind === 'material' ? (
                <>
                  <TextInput
                    value={goalCurrentValue}
                    inputMode='numeric'
                    placeholder='Текущий прогресс'
                    onChange={event => onGoalCurrentValueChange(event.target.value.replace(/[^\d]/g, ''))}
                  />
                  <TextInput
                    value={goalUnitLabel}
                    placeholder='Единица, например ₽'
                    onChange={event => onGoalUnitLabelChange(event.target.value)}
                  />
                </>
              ) : null}
              <div className='flex flex-wrap gap-3'>
                <AppButton
                  tone='secondary'
                  className='w-auto'
                  onClick={onSaveGoal}
                >
                  Сохранить цель
                </AppButton>
                {familyGoal ? (
                  <AppButton
                    tone='ghost'
                    onClick={onClearGoal}
                  >
                    Убрать цель
                  </AppButton>
                ) : null}
              </div>
            </div>
          </div>

          <div className='rounded-md border border-white/10 bg-white/5 p-4'>
            <div className='text-xs uppercase tracking-[0.24em] text-white/45'>Добавить ништяк</div>
            <div className='mt-4 grid gap-3'>
              <TextInput
                value={rewardTitle}
                placeholder='Название награды'
                onChange={event => onRewardTitleChange(event.target.value)}
              />
              <TextAreaField
                value={rewardDescription}
                placeholder='Короткое описание'
                onChange={event => onRewardDescriptionChange(event.target.value)}
              />
              <TextInput
                value={rewardCost}
                inputMode='numeric'
                placeholder='Стоимость в баллах'
                onChange={event => onRewardCostChange(event.target.value.replace(/[^\d]/g, ''))}
              />
              <AppButton
                tone='secondary'
                className='w-auto'
                onClick={onCreateReward}
              >
                Добавить в магазин
              </AppButton>
            </div>
          </div>

          {rewards.length ? rewards.map(reward => {
            const canBuy = balanceUnits >= reward.costUnits && !busyRewardKey

            return (
              <div
                key={reward.id}
                className='overflow-hidden rounded-md border border-white/10 bg-white/5'
              >
                <div
                  className={`bg-linear-to-r ${getBonusRewardAccentClassName(reward.id)} p-5 text-(--color-page-text)`}
                >
                  <div className='text-xs uppercase tracking-[0.24em] text-black/55'>
                    Семейный ништяк
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
                    onClick={() => onBuy(reward.id)}
                  >
                    {busyRewardKey === reward.id
                      ? 'Покупаю...'
                      : canBuy
                        ? 'Купить'
                        : 'Недостаточно баллов'}
                  </AppButton>
                  <AppButton
                    tone='ghost'
                    onClick={() => onDeleteReward(reward.id)}
                  >
                    Удалить
                  </AppButton>
                </div>
              </div>
            )
          }) : (
            <div className='rounded-md border border-dashed border-white/12 bg-white/4 px-4 py-8 text-center text-sm text-white/60'>
              Магазин пока пуст. Добавь первый семейный ништяк через форму выше.
            </div>
          )}
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
