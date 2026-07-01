import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { cn } from '@/shared/lib'
import type { VideoSource } from '@ouonnki/cms-core'
import VideoSourceCard from './VideoSourceCard'

interface SortableVideoSourceCardProps {
  source: VideoSource
  onEdit: () => void
  isEditMode?: boolean
  isSelected?: boolean
  onToggleSelect?: (id: string) => void
}

export default function SortableVideoSourceCard({
  source,
  onEdit,
  isEditMode = false,
  isSelected = false,
  onToggleSelect,
}: SortableVideoSourceCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: source.id, disabled: isEditMode })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative flex items-center gap-1',
        isDragging && 'z-10 rounded-lg opacity-80 shadow-lg',
      )}
    >
      {!isEditMode && (
        <button
          type="button"
          className={cn(
            'shrink-0 cursor-grab touch-none rounded p-0.5',
            'text-muted-foreground/40 hover:text-muted-foreground',
            'opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100',
            isDragging && 'cursor-grabbing !opacity-100',
          )}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
      )}

      <div className="min-w-0 flex-1">
        <VideoSourceCard
          source={source}
          onEdit={onEdit}
          isEditMode={isEditMode}
          isSelected={isSelected}
          onToggleSelect={onToggleSelect}
        />
      </div>
    </div>
  )
}
