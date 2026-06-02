import { NextRequest, NextResponse } from 'next/server'

const PURSTREAM_BASE = 'https://api.purstream.ac/api/v1'

const HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Referer': 'https://purstream.ac/',
  'Origin': 'https://purstream.ac',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const title = searchParams.get('title') || '21 Jump Street'
  const purstreamId = searchParams.get('id')
  const season = searchParams.get('season')
  const episode = searchParams.get('episode')

  if (purstreamId) {
    const res = await fetch(`${PURSTREAM_BASE}/media/${purstreamId}/sheet`, {
      headers: HEADERS,
      cache: 'no-store',
    })
    const raw = await res.json()

    const items = raw?.data?.items ?? raw?.data ?? raw
    const debug = {
      topLevelKeys: Object.keys(raw),
      itemsKeys: items ? Object.keys(items) : null,
      seasonsCount: items?.seasons?.length ?? null,
      episodesCount: items?.episodes?.length ?? null,
      urlsCount: items?.urls?.length ?? null,
      firstSeason: items?.seasons?.[0] ? {
        keys: Object.keys(items.seasons[0]),
        number: items.seasons[0].number ?? items.seasons[0].season ?? items.seasons[0].season_number,
        episodesCount: items.seasons[0].episodes?.length,
        firstEpisode: items.seasons[0].episodes?.[0] ? {
          keys: Object.keys(items.seasons[0].episodes[0]),
          number: items.seasons[0].episodes[0].number ?? items.seasons[0].episodes[0].episode,
          season: items.seasons[0].episodes[0].season,
          firstUrl: items.seasons[0].episodes[0].urls?.[0]?.url?.substring(0, 80),
        } : null,
        secondEpisode: items.seasons[0].episodes?.[1] ? {
          number: items.seasons[0].episodes[1].number ?? items.seasons[0].episodes[1].episode,
          firstUrl: items.seasons[0].episodes[1].urls?.[0]?.url?.substring(0, 80),
        } : null,
        fifthEpisode: items.seasons[0].episodes?.[4] ? {
          number: items.seasons[0].episodes[4].number ?? items.seasons[0].episodes[4].episode,
          firstUrl: items.seasons[0].episodes[4].urls?.[0]?.url?.substring(0, 80),
        } : null,
      } : null,
      firstEpisodeFlat: items?.episodes?.[0] ? {
        keys: Object.keys(items.episodes[0]),
        season: items.episodes[0].season ?? items.episodes[0].season_number,
        episode: items.episodes[0].episode ?? items.episodes[0].episode_number ?? items.episodes[0].number,
        firstUrl: items.episodes[0].urls?.[0]?.url?.substring(0, 80),
      } : null,
      ...(season && episode ? {
        searchResult: (() => {
          const s = parseInt(season), e = parseInt(episode)
          const seasonObj = items?.seasons?.find((x: any) =>
            Number(x.number ?? x.season ?? x.season_number) === s
          )
          const epInSeason = seasonObj?.episodes?.find((x: any) =>
            Number(x.number ?? x.episode ?? x.episode_number) === e
          )
          const epFlat = items?.episodes?.find((x: any) =>
            Number(x.season ?? x.season_number) === s &&
            Number(x.episode ?? x.episode_number ?? x.number) === e
          )
          return {
            foundInSeason: !!epInSeason,
            epInSeasonUrl: epInSeason?.urls?.[0]?.url?.substring(0, 80),
            foundFlat: !!epFlat,
            epFlatUrl: epFlat?.urls?.[0]?.url?.substring(0, 80),
          }
        })()
      } : {}),
    }

    return NextResponse.json({ status: res.status, debug })
  }

  const res = await fetch(`${PURSTREAM_BASE}/search-bar/search/${encodeURIComponent(title)}`, {
    headers: HEADERS,
    cache: 'no-store',
  })
  const raw = await res.json()
  return NextResponse.json({ status: res.status, raw })
}
