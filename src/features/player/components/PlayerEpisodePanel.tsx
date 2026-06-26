import { ArrowDownUp, ArrowUpDown } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import type { EpisodeItem } from '@/features/player/hooks'

interface PlayerEpisodePanelProps {
  totalEpisodes: number
  selectedEpisode: number
  isReversed: boolean
  onToggleOrder: () => void
  episodes: EpisodeItem[]
  onEpisodeSelect: (actualIndex: number) => void
  compact?: boolean
  hideHeader?: boolean
  className?: string
  /** 集数播放进度映射：episodeIndex → 进度百分比(0-100)，null 或 undefined 表示不显示 */
  episodeProgressMap?: Map<number, number> | null
}

export function PlayerEpisodePanel({
  totalEpisodes,
  selectedEpisode,
  isReversed,
  onToggleOrder,
  episodes,
  onEpisodeSelect,
  compact = false,
  hideHeader = false,
  className,
  episodeProgressMap,
}: PlayerEpisodePanelProps) {
  const listClassName = compact
    ? 'grid grid-cols-2 gap-2'
    : 'grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8'

  return (
    <section className={cn('flex flex-col gap-3 rounded-lg border border-border/60 bg-card/50 p-3 md:p-4', className)}>
      {!hideHeader && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">选集</h2>
            <Badge variant="secondary" className="rounded-full text-xs">
              第 {selectedEpisode + 1} 集 / 共 {totalEpisodes} 集
            </Badge>
          </div>

          <Button size="sm" variant="secondary" className="rounded-full" onClick={onToggleOrder}>
            {isReversed ? <ArrowUpDown className="size-4" /> : <ArrowDownUp className="size-4" />}
            {isReversed ? '正序' : '倒序'}
          </Button>
        </div>
      )}

      {hideHeader && (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" className="rounded-full" onClick={onToggleOrder}>
            {isReversed ? <ArrowUpDown className="size-4" /> : <ArrowDownUp className="size-4" />}
            {isReversed ? '正序' : '倒序'}
          </Button>
        </div>
      )}

      <div className={cn(listClassName, 'max-h-[40vh] content-start overflow-y-auto xl:max-h-none xl:flex-1 xl:min-h-0')}>
        {episodes.map(episode => {
          const active = selectedEpisode === episode.actualIndex
          const progress = episodeProgressMap?.get(episode.actualIndex)
          const hasProgress = progress !== undefined && progress > 0

          return (
            <Button
              key={`${episode.actualIndex}-${episode.name}`}
              variant={active ? 'default' : 'secondary'}
              className="relative justify-start overflow-hidden rounded-md"
              aria-current={active ? 'true' : undefined}
              aria-label={`切换到${episode.name || `第 ${episode.actualIndex + 1} 集`}`}
              onClick={() => onEpisodeSelect(episode.actualIndex)}
            >
              <span className="line-clamp-1 text-left text-xs sm:text-sm">
                {episode.name || `第 ${episode.actualIndex + 1} 集`}
              </span>
              {hasProgress && !active && (
                <span
                  className="absolute inset-x-0 bottom-0 h-0.5 bg-primary/60"
                  style={{ width: `${Math.min(100, progress)}%` }}
                />
              )}
            </Button>
          )
        })}
      </div>
    </section>
  )
}
