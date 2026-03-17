import { AppButton } from '@/components/ui/app-button'
import { ModalPanel } from '@/components/ui/app-modal'
import { StatusPill } from '@/components/ui/status-pill'
import { formatRelativeDate } from '@/shared/lib/format'
import type { ShoppingItem } from '@/shared/types/family'

type ShoppingListModalProps = {
  items: ShoppingItem[]
  onClose: () => void
  onAdd: () => void
  onSelectItem: (item: ShoppingItem) => void
}

export function ShoppingListModal({
  items,
  onClose,
  onAdd,
  onSelectItem,
}: ShoppingListModalProps) {
  return (
    <ModalPanel wide tall>
      <div className='border-b border-white/10 p-4 sm:p-6'>
        <div className='flex items-center justify-between gap-4'>
          <div>
            <div className='text-xs uppercase tracking-(--letter-spacing-wide) text-(--color-panel-text-faint)'>
              ПОКУПКИ
            </div>
            <h2 className='mt-2 font-(--font-family-heading) text-3xl leading-(--line-height-snug)'>
              Все текущие покупки
            </h2>
          </div>
          <AppButton tone='ghost' onClick={onClose}>
            Закрыть
          </AppButton>
        </div>
      </div>

      <div className='min-h-0 flex-1 overflow-y-auto p-4 sm:p-6'>
        {items.length ? (
          <div className='space-y-4'>
            {items.map(item => (
              <button
                key={item.id}
                type='button'
                className='w-full rounded-lg border border-white/10 bg-(--color-panel-muted) p-4 text-left transition-colors duration-150 hover:bg-white/10'
                onClick={() => onSelectItem(item)}
              >
                <div className='space-y-2'>
                  <StatusPill tone={item.urgency}>
                    {item.urgency === 'out' ? 'Закончилось' : 'Заканчивается'}
                  </StatusPill>
                  <h3 className='font-(--font-family-heading) text-2xl leading-tight'>
                    {item.title}
                  </h3>
                  {item.quantityLabel ? (
                    <div className='text-sm text-white/80'>Количество: {item.quantityLabel}</div>
                  ) : null}
                  {item.note ? (
                    <p className='text-sm leading-6 text-white/70'>{item.note}</p>
                  ) : null}
                  <div className='text-xs text-white/45'>
                    Добавил(а) {item.addedByName} • {formatRelativeDate(item.createdAt)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className='rounded-lg border border-dashed border-white/12 bg-(--color-panel-muted) px-4 py-10 text-center text-white/60'>
            Список пуст
          </div>
        )}
      </div>

      <div className='space-y-4 border-t border-white/10 p-4 sm:p-6'>
        <AppButton tone='shopping' onClick={onAdd}>
          Добавить
        </AppButton>
        <AppButton tone='light' onClick={onClose}>
          Ознакомлен
        </AppButton>
      </div>
    </ModalPanel>
  )
}
