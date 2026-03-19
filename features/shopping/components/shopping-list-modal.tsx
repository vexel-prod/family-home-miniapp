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

export function ShoppingListModal({ items, onClose, onAdd, onSelectItem }: ShoppingListModalProps) {
  return (
    <ModalPanel
      wide
      tall
    >
      <div className='border-b border-white/10 p-4 sm:p-6'>
        <div className='flex items-center justify-center gap-4'>
          {items.length > 0 && (
            <h2 className='font-(--font-family-heading) text-xl uppercase leading-(--line-height-snug)'>
              Всего: {items.length}
            </h2>
          )}
        </div>
      </div>

      <div className='min-h-0 flex-1 overflow-y-auto p-4 sm:p-6'>
        {items.length ? (
          <div className='space-y-4 max-h-[45dvh]'>
            {items.map(item => (
              <button
                key={item.id}
                type='button'
                className='w-full rounded-xl border border-white/10 bg-white/6 p-5 text-left transition-colors duration-150 hover:bg-white/10'
                onClick={() => onSelectItem(item)}
              >
                <div className='space-y-2'>
                  <StatusPill tone={item.urgency}>
                    {item.urgency === 'out'
                      ? 'Закончилось'
                      : item.urgency === 'without'
                        ? 'не срочно'
                        : 'Заканчивается'}
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
          <div className='rounded-md border border-dashed border-white/12 bg-white/6 px-4 py-10 text-center text-white/60'>
            Список пуст
          </div>
        )}
      </div>

      <div className='space-y-4 border-t border-white/10 p-4 sm:p-6'>
        <AppButton
          tone='shopping'
          onClick={onAdd}
        >
          Добавить
        </AppButton>
        <AppButton
          tone='ghost'
          onClick={onClose}
        >
          Закрыть
        </AppButton>
      </div>
    </ModalPanel>
  )
}
