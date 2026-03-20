import { AppButton } from '@shared/ui/app-button'
import { ModalBody, ModalFooter, ModalHeader, ModalPanel } from '@shared/ui/app-modal'
import type { ShoppingItem } from '@entities/family'

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
      <ModalHeader>
        <div className='space-y-2'>
          <div className='text-xs uppercase tracking-(--letter-spacing-wide) text-(--color-panel-text-faint)'>
            ПОКУПКИ
          </div>
          <h2 className='font-(--font-family-heading) text-3xl leading-(--line-height-snug)'>
            {item.title}
          </h2>
          {item.quantityLabel ? (
            <div className='text-sm text-white/80'>Количество: {item.quantityLabel}</div>
          ) : null}
          {item.note ? <div className='text-sm leading-6 text-white/65'>{item.note}</div> : null}
          <div className='text-sm text-white/60'>Выбери действие для этой позиции.</div>
        </div>
      </ModalHeader>

      <ModalBody>
        <div className='space-y-4'>
          <AppButton tone='shopping' onClick={onPurchase} disabled={busyKey === `product-${item.id}`}>
            {busyKey === `product-${item.id}` ? 'Обновляю...' : 'Отметить купленным'}
          </AppButton>

          <AppButton tone='home' onClick={onReplace}>
            Редактировать
          </AppButton>

          <AppButton tone='danger' onClick={onDelete} disabled={busyKey === `delete-${item.id}`}>
            {busyKey === `delete-${item.id}` ? 'Удаляю...' : 'Удалить'}
          </AppButton>
        </div>
      </ModalBody>

      <ModalFooter>
        <AppButton tone='ghost' onClick={onClose}>
          Закрыть
        </AppButton>
      </ModalFooter>
    </ModalPanel>
  )
}
