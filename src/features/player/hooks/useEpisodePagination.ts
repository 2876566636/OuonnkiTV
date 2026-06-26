import { useMemo, useState } from 'react'

export interface EpisodeItem {
  name: string
  actualIndex: number
}

interface UseEpisodePaginationParams {
  episodes: string[]
  defaultDescOrder: boolean
}

export function useEpisodePagination({
  episodes,
  defaultDescOrder,
}: UseEpisodePaginationParams) {
  const [isReversed, setIsReversed] = useState(defaultDescOrder)

  const orderedEpisodes = useMemo<EpisodeItem[]>(() => {
    if (episodes.length === 0) return []

    if (isReversed) {
      const list: EpisodeItem[] = []
      for (let i = episodes.length - 1; i >= 0; i -= 1) {
        list.push({ name: episodes[i], actualIndex: i })
      }
      return list
    }

    return episodes.map((name, i) => ({ name, actualIndex: i }))
  }, [episodes, isReversed])

  return {
    isReversed,
    setIsReversed,
    orderedEpisodes,
  }
}
