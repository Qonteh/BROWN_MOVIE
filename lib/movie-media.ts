import { getClient } from '@/lib/db'

type DbClient = Awaited<ReturnType<typeof getClient>>

export type MoviePartInput = {
  title: string
  url: string
}

export type SeriesEpisodeInput = {
  title: string
  url: string
  episodeNumber: number
}

export type SeriesSeasonInput = {
  title: string
  seasonNumber: number
  episodes: SeriesEpisodeInput[]
}

function toNonEmptyString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function toPositiveInt(value: unknown, fallback: number): number {
  const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : Number(value)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return Math.floor(parsed)
}

export async function ensureMovieMediaSchema(client: DbClient) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS movie_parts (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
      part_title VARCHAR(255) NOT NULL,
      part_number INTEGER NOT NULL CHECK (part_number >= 1),
      download_url TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(movie_id, part_number)
    );

    CREATE TABLE IF NOT EXISTS movie_seasons (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
      season_title VARCHAR(255) NOT NULL,
      season_number INTEGER NOT NULL CHECK (season_number >= 1),
      sort_order INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(movie_id, season_number)
    );

    CREATE TABLE IF NOT EXISTS movie_episodes (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
      season_id UUID NOT NULL REFERENCES movie_seasons(id) ON DELETE CASCADE,
      episode_title VARCHAR(255) NOT NULL,
      episode_number INTEGER NOT NULL CHECK (episode_number >= 1),
      download_url TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(season_id, episode_number)
    );

    CREATE INDEX IF NOT EXISTS idx_movie_parts_movie_id ON movie_parts(movie_id);
    CREATE INDEX IF NOT EXISTS idx_movie_seasons_movie_id ON movie_seasons(movie_id);
    CREATE INDEX IF NOT EXISTS idx_movie_episodes_movie_id ON movie_episodes(movie_id);
    CREATE INDEX IF NOT EXISTS idx_movie_episodes_season_id ON movie_episodes(season_id);
  `)
}

export function normalizeMovieParts(body: unknown): MoviePartInput[] {
  const payload = body as Record<string, unknown>
  const raw = Array.isArray(payload?.movieParts) ? payload.movieParts : []

  return raw
    .map((item, index) => {
      const row = item as Record<string, unknown>
      const url = toNonEmptyString(row?.url)
      const title = toNonEmptyString(row?.title) || `Part ${index + 1}`
      return { title, url }
    })
    .filter((item) => item.url)
}

export function normalizeSeriesSeasons(body: unknown): SeriesSeasonInput[] {
  const payload = body as Record<string, unknown>
  const rawSeasons = Array.isArray(payload?.seriesSeasons) ? payload.seriesSeasons : []

  return rawSeasons
    .map((seasonItem, seasonIndex) => {
      const seasonRow = seasonItem as Record<string, unknown>
      const seasonNumber = toPositiveInt(seasonRow?.seasonNumber, seasonIndex + 1)
      const seasonTitle = toNonEmptyString(seasonRow?.title) || `Season ${seasonNumber}`
      const rawEpisodes = Array.isArray(seasonRow?.episodes) ? seasonRow.episodes : []

      const episodes = rawEpisodes
        .map((episodeItem, episodeIndex) => {
          const episodeRow = episodeItem as Record<string, unknown>
          const url = toNonEmptyString(episodeRow?.url)
          const episodeNumber = toPositiveInt(episodeRow?.episodeNumber, episodeIndex + 1)
          const title = toNonEmptyString(episodeRow?.title) || `Episode ${episodeNumber}`

          return { title, url, episodeNumber }
        })
        .filter((episode) => episode.url)

      return {
        title: seasonTitle,
        seasonNumber,
        episodes,
      }
    })
    .filter((season) => season.episodes.length > 0)
}

export function resolvePrimaryMediaUrl(
  fallbackDownloadUrl: string,
  movieParts: MoviePartInput[],
  seriesSeasons: SeriesSeasonInput[],
): string {
  if (fallbackDownloadUrl) return fallbackDownloadUrl
  if (movieParts.length > 0) return movieParts[0].url
  if (seriesSeasons.length > 0 && seriesSeasons[0].episodes.length > 0) {
    return seriesSeasons[0].episodes[0].url
  }
  return ''
}

export function computeSeriesCounts(seriesSeasons: SeriesSeasonInput[]) {
  const seasonsCount = seriesSeasons.length
  const episodesCount = seriesSeasons.reduce((sum, season) => sum + season.episodes.length, 0)
  return { seasonsCount, episodesCount }
}

export async function replaceMovieMedia(
  client: DbClient,
  movieId: string,
  movieParts: MoviePartInput[],
  seriesSeasons: SeriesSeasonInput[],
) {
  await client.query('DELETE FROM movie_episodes WHERE movie_id = $1', [movieId])
  await client.query('DELETE FROM movie_seasons WHERE movie_id = $1', [movieId])
  await client.query('DELETE FROM movie_parts WHERE movie_id = $1', [movieId])

  for (let i = 0; i < movieParts.length; i += 1) {
    const part = movieParts[i]
    await client.query(
      `INSERT INTO movie_parts (movie_id, part_title, part_number, download_url, sort_order, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [movieId, part.title, i + 1, part.url, i + 1],
    )
  }

  for (let seasonIndex = 0; seasonIndex < seriesSeasons.length; seasonIndex += 1) {
    const season = seriesSeasons[seasonIndex]
    const seasonInsert = await client.query(
      `INSERT INTO movie_seasons (movie_id, season_title, season_number, sort_order, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING id`,
      [movieId, season.title, season.seasonNumber, seasonIndex + 1],
    )

    const seasonId = seasonInsert.rows[0]?.id as string

    for (let episodeIndex = 0; episodeIndex < season.episodes.length; episodeIndex += 1) {
      const episode = season.episodes[episodeIndex]
      await client.query(
        `INSERT INTO movie_episodes (
           movie_id,
           season_id,
           episode_title,
           episode_number,
           download_url,
           sort_order,
           created_at,
           updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [movieId, seasonId, episode.title, episode.episodeNumber, episode.url, episodeIndex + 1],
      )
    }
  }
}

export async function fetchMovieMedia(client: DbClient, movieId: string) {
  const partsResult = await client.query(
    `SELECT id, part_title, part_number, download_url, sort_order
     FROM movie_parts
     WHERE movie_id = $1
     ORDER BY sort_order ASC, part_number ASC`,
    [movieId],
  )

  const seasonsResult = await client.query(
    `SELECT id, season_title, season_number, sort_order
     FROM movie_seasons
     WHERE movie_id = $1
     ORDER BY sort_order ASC, season_number ASC`,
    [movieId],
  )

  const episodesResult = await client.query(
    `SELECT id, season_id, episode_title, episode_number, download_url, sort_order
     FROM movie_episodes
     WHERE movie_id = $1
     ORDER BY sort_order ASC, episode_number ASC`,
    [movieId],
  )

  const episodesBySeason = new Map<string, Array<Record<string, unknown>>>()
  for (const episode of episodesResult.rows) {
    const seasonId = String(episode.season_id)
    const list = episodesBySeason.get(seasonId) ?? []
    list.push({
      id: episode.id,
      title: episode.episode_title,
      episodeNumber: episode.episode_number,
      url: episode.download_url,
      sortOrder: episode.sort_order,
    })
    episodesBySeason.set(seasonId, list)
  }

  return {
    movieParts: partsResult.rows.map((part: Record<string, unknown>) => ({
      id: part.id,
      title: part.part_title,
      partNumber: part.part_number,
      url: part.download_url,
      sortOrder: part.sort_order,
    })),
    seriesSeasons: seasonsResult.rows.map((season: Record<string, unknown>) => ({
      id: season.id,
      title: season.season_title,
      seasonNumber: season.season_number,
      sortOrder: season.sort_order,
      episodes: episodesBySeason.get(String(season.id)) ?? [],
    })),
  }
}
