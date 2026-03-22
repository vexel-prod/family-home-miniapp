import { AppButton } from '@shared/ui/app-button'
import { ModalBody, ModalFooter, ModalHeader, ModalPanel } from '@shared/ui/app-modal'
import { StatusPill } from '@shared/ui/status-pill'
import { formatRelativeDate } from '@entities/family'
import type { ShoppingItem } from '@entities/family'

type ShoppingListModalProps = {
  items: ShoppingItem[]
  loading?: boolean
  onClose: () => void
  onAdd: () => void
  onSelectItem: (item: ShoppingItem) => void
}

export function ShoppingListModal({
  items,
  loading = false,
  onClose,
  onAdd,
  onSelectItem,
}: ShoppingListModalProps) {
  return (
    <ModalPanel>
      <ModalHeader>
        <div className='flex items-center justify-center gap-4'>
          <h2 className='font-(--font-family-heading) text-xl uppercase leading-(--line-height-snug)'>
            Предстоящие покупки{!loading && items.length > 0 && `: ${items.length}`}
          </h2>
        </div>
      </ModalHeader>

      <ModalBody>
        {loading ? (
          <div className='space-y-4'>
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className='rounded-xl border border-white/10 bg-white/6 p-5'>
                <div className='skeleton h-6 w-28 rounded-full bg-white/15' />
                <div className='mt-4 skeleton h-8 w-3/5 rounded-full bg-white/15' />
                <div className='mt-4 space-y-2'>
                  <div className='skeleton h-4 w-full rounded-full bg-white/15' />
                  <div className='skeleton h-4 w-9/12 rounded-full bg-white/15' />
                </div>
              </div>
            ))}
          </div>
        ) : items.length ? (
          <div className='space-y-4'>
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
      </ModalBody>

      <ModalFooter className='space-y-3'>
        <AppButton
          tone='shopping'
          disabled={loading}
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
      </ModalFooter>
    </ModalPanel>
  )
}
