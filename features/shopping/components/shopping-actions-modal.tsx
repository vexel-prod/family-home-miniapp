import { AppButton } from '@/components/ui/app-button'
import { ModalPanel } from '@/components/ui/app-modal'
import type { ShoppingItem } from '@/shared/types/family'

type ShoppingActionsModalProps = {
  item: ShoppingItem
  busyKey: string | null
  onClose: () => void
  onPurchase: () => void
  onReplace: () => void
  onDelete: () => void
}

export function ShoppingActionsModal({
  item,
  busyKey,
  onClose,
  onPurchase,
  onReplace,
  onDelete,
}: ShoppingActionsModalProps) {
  return (
    <ModalPanel>
      <div className='modal-body'>
        <div className='space-y-2'>
          <div className='eyebrow eyebrow--inverse'>ПОКУПКИ</div>
          <h2 className='heading-modal'>{item.title}</h2>
          {item.quantityLabel ? (
            <div className='text-sm text-white/80'>Количество: {item.quantityLabel}</div>
          ) : null}
          {item.note ? <div className='text-sm leading-6 text-white/65'>{item.note}</div> : null}
          <div className='text-sm text-white/60'>Выбери действие для этой позиции.</div>
        </div>

        <div className='mt-5 stack-sm'>
          <AppButton
            tone='shopping'
            onClick={onPurchase}
            disabled={busyKey === `product-${item.id}`}
          >
            {busyKey === `product-${item.id}` ? 'Обновляю...' : 'Отметить купленным'}
          </AppButton>

          <AppButton
            tone='home'
            onClick={onReplace}
          >
            Заменить
          </AppButton>

          <AppButton
            tone='danger'
            onClick={onDelete}
            disabled={busyKey === `delete-${item.id}`}
          >
            {busyKey === `delete-${item.id}` ? 'Удаляю...' : 'Удалить'}
          </AppButton>

          <AppButton
            tone='secondary'
            onClick={onClose}
          >
            Закрыть
          </AppButton>
        </div>
      </div>
    </ModalPanel>
  )
}
