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
      <div className='modal-header'>
        <div className='flex items-center justify-between gap-4'>
          <div>
            <div className='eyebrow eyebrow--inverse'>ПОКУПКИ</div>
            <h2 className='mt-2 heading-modal'>Все текущие покупки</h2>
          </div>
          <AppButton
            tone='ghost'
            onClick={onClose}
          >
            Закрыть
          </AppButton>
        </div>
      </div>

      <div className='modal-scroll'>
        {items.length ? (
          <div className='stack-sm'>
            {items.map(item => (
              <button
                key={item.id}
                type='button'
                className='list-card'
                onClick={() => onSelectItem(item)}
              >
                <div className='space-y-2'>
                  <StatusPill tone={item.urgency}>
                    {item.urgency === 'out' ? 'Закончилось' : 'Заканчивается'}
                  </StatusPill>
                  <h3 className='text-xl font-bold'>{item.title}</h3>
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
          <div className='empty-state'>Сейчас список пуст</div>
        )}
      </div>

      <div className='modal-footer stack-sm'>
        <AppButton
          tone='shopping'
          onClick={onAdd}
        >
          Добавить
        </AppButton>
        <AppButton
          tone='light'
          onClick={onClose}
        >
          Ознакомлен
        </AppButton>
      </div>
    </ModalPanel>
  )
}
