// ─── Fallback Purstream directement depuis le navigateur ──
const [purstreamLoading, setPurstreamLoading] = useState(!initialVideoUrl && !!tmdbId)

useEffect(() => {
  if (videoUrl || !tmdbId) return
  setPurstreamLoading(true)

  const PURSTREAM = 'https://api.purstream.ac/api/v1'
  const contentTitle = seriesName || title

  async function fetchFromPurstream() {
    try {
      console.log(`[Client Purstream] Recherche: "${contentTitle}"`)

      const searchRes = await fetch(
        `${PURSTREAM}/search-bar/search/${encodeURIComponent(contentTitle)}`,
        { headers: { Accept: 'application/json' } }
      )

      if (!searchRes.ok) return

      const responseData = await searchRes.json()

      // === Extraction de la structure imbriquée ===
      let results: any[] = []

      if (responseData?.data?.items?.movies?.items) {
        results = responseData.data.items.movies.items
      } else if (responseData?.data?.items?.series?.items) {
        results = responseData.data.items.series.items
      } else if (responseData?.data?.items) {
        results = Array.isArray(responseData.data.items) ? responseData.data.items : []
      } else if (Array.isArray(responseData)) {
        results = responseData
      }

      if (results.length === 0) {
        console.log('[Client Purstream] Aucun résultat')
        return
      }

      console.log(`[Client Purstream] ${results.length} résultats trouvés`)

      const isMovie = type === 'movie'

      // 1. Match TMDB ID
      let match = results.find(r => String(r.tmdb_id) === String(tmdbId))

      // 2. Match par titre
      if (!match) {
        const norm = contentTitle.toLowerCase().trim().replace(/[:]/g, '')
        match = results.find(r => {
          const rTitle = (r.title || r.name || '').toLowerCase().trim()
          const rType = (r.type || r.media_type || '').toLowerCase()
          const typeOk = isMovie
            ? ['movie', 'film'].includes(rType)
            : ['series', 'tv', 'show', 'série', 'serie'].includes(rType)

          return typeOk && (
            rTitle === norm ||
            rTitle.includes(norm) ||
            norm.includes(rTitle)
          )
        })
      }

      // 3. Fallback premier résultat
      if (!match) match = results[0]
      if (!match?.id) return

      console.log(`[Client Purstream] ID trouvé: ${match.id}`)

      // 4. Récupérer la fiche
      const sheetRes = await fetch(
        `${PURSTREAM}/media/${match.id}/sheet`,
        { headers: { Accept: 'application/json' } }
      )

      if (!sheetRes.ok) return

      const sheet: any = await sheetRes.json()

      // 5. Extraire l'URL
      let url: string | null = null

      if (isMovie) {
        if (sheet.sources?.length) {
          const mp4 = sheet.sources.find((s: any) => s.url?.includes('.mp4'))
          const m3u8 = sheet.sources.find((s: any) => s.url?.includes('.m3u8'))
          url = mp4?.url || m3u8?.url || sheet.sources[0]?.url || null
        }
        url = url || sheet.stream_url || sheet.video_url || sheet.url || null
      } else {
        const s = currentSeason, e = currentEpisode
        const ep = sheet.episodes?.find((x: any) => x.season === s && x.episode === e)
        if (ep) {
          if (ep.sources?.length) {
            const mp4 = ep.sources.find((s: any) => s.url?.includes('.mp4'))
            const m3u8 = ep.sources.find((s: any) => s.url?.includes('.m3u8'))
            url = mp4?.url || m3u8?.url || ep.sources[0]?.url || null
          }
          url = url || ep.video_url || null
        }
        if (!url && sheet.sources?.length) {
          const mp4 = sheet.sources.find((s: any) => s.url?.includes('.mp4'))
          const m3u8 = sheet.sources.find((s: any) => s.url?.includes('.m3u8'))
          url = mp4?.url || m3u8?.url || sheet.sources[0]?.url || null
        }
      }

      if (url) {
        console.log('[Client Purstream] ✅ URL trouvée')
        setVideoUrl(url)
      }
    } catch (err) {
      console.error('[Client Purstream Error]', err)
    } finally {
      setPurstreamLoading(false)
    }
  }

  fetchFromPurstream()
}, [tmdbId, type, title, seriesName, currentSeason, currentEpisode]) // ← Ajout des dépendances
