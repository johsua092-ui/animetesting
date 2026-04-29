# Implementation Plan: OXNIME Anime Streaming Platform

## Overview

Implementasi dilakukan secara incremental — dimulai dari setup konfigurasi dan schema, lalu sync service, kemudian halaman-halaman utama, fitur realtime, bookmark, dan diakhiri dengan property-based tests. Setiap task membangun di atas task sebelumnya. Auth (login/register) tidak diimplementasikan ulang — sistem auth yang sudah ada dipertahankan.

## Tasks

- [x] 1. Setup & Konfigurasi Awal
  - Hapus `output: 'export'` dan `trailingSlash: true` dari `next.config.ts`, pertahankan `distDir` dan `images` config (tambah hostname `cdn.myanimelist.net` dan `img1.ak.crunchyroll.com` ke `remotePatterns`)
  - Tambah field `malId Int? @unique` ke model `Anime` di `prisma/schema.prisma`, tambah index `@@index([malId])`, `@@index([featured])`, `@@index([type])`, `@@index([year])`, `@@index([rating])`
  - Install dependencies baru yang belum ada: `fast-check`, `jest`, `ts-jest`, `@types/jest` (devDependencies), tambahkan script `"test": "jest --runInBand"` ke `package.json`
  - Buat file konfigurasi Jest `jest.config.ts` di root dengan preset `ts-jest` dan environment `node`
  - Jalankan `npx prisma generate` dan `npx prisma db push` untuk apply schema changes
  - _Requirements: 1.4_

- [x] 2. Jikan API Sync Service
  - [x] 2.1 Buat `src/lib/jikan-sync.ts` dengan interface `JikanAnimeResponse` dan `SyncResult`, fungsi `delay(ms)`, `fetchWithRateLimit(url)` (handle HTTP 429 dengan wait 1000ms + single retry), dan `mapJikanToAnime(data)` yang memetakan semua field Jikan ke Prisma `AnimeUpsertArgs`
    - `mapJikanToAnime` harus handle null/undefined dengan nilai default: `rating: 0`, `year: 0`, `episodes: 0`, `description: ''`
    - `malId` diambil dari `data.mal_id`
    - `image` diambil dari `data.images.jpg.large_image_url`
    - `genres` diambil sebagai `data.genres.map(g => g.name)`
    - `studio` diambil dari `data.studios[0]?.name ?? null`
    - `slug` di-generate dari `title.toLowerCase().replace(/[^a-z0-9]+/g, '-')`
    - _Requirements: 1.2, 1.4_

  - [ ]* 2.2 Tulis property test untuk `mapJikanToAnime` (P1: Mapping Completeness)
    - **Property 1: Jikan API Response Mapping Completeness**
    - Gunakan `fc.record({ mal_id: fc.integer({min:1}), title: fc.string({minLength:1}), images: fc.constant({jpg:{image_url:'x',large_image_url:'x'}}), score: fc.option(fc.float({min:0,max:10})), year: fc.option(fc.integer({min:1900,max:2030})), episodes: fc.option(fc.integer({min:0})), duration: fc.option(fc.string()), status: fc.constantFrom('Airing','Finished Airing','Not yet aired'), studios: fc.array(fc.record({name:fc.string()})), synopsis: fc.option(fc.string()), genres: fc.array(fc.record({name:fc.string()})), type: fc.option(fc.constantFrom('TV','Movie','OVA','Special','ONA')) })`
    - Assert bahwa output selalu memiliki field: `malId`, `title`, `image`, `rating`, `year`, `episodes`, `status`, `description`, `genres`, `type`
    - **Validates: Requirements 1.2, 1.4**
    - _Test file: `__tests__/jikan-sync.test.ts`_

  - [x] 2.3 Implementasi fungsi `syncTopAnime()`, `syncSeasonalAnime()`, dan `syncAll()` di `src/lib/jikan-sync.ts`
    - `syncTopAnime` fetch dari `/top/anime?limit=25`, loop tiap item, upsert ke DB via `prisma.anime.upsert({ where: { malId }, update: {...}, create: {...} })`
    - `syncSeasonalAnime` fetch dari `/seasons/now?limit=25`
    - `syncAll` panggil keduanya, aggregate `SyncResult`, catch error per-item (log + increment `errors`, lanjut ke item berikutnya)
    - Delay 400ms antar request normal
    - _Requirements: 1.1, 1.3, 1.5, 1.6, 1.8, 1.9_

  - [ ]* 2.4 Tulis property test untuk Sync Error Resilience (P3)
    - **Property 3: Sync Error Resilience**
    - Mock `prisma.anime.upsert` agar throw error secara random untuk subset item
    - Assert bahwa `SyncResult.synced + SyncResult.errors === SyncResult.total` dan proses tidak berhenti di tengah
    - **Validates: Requirements 1.6, 1.8**
    - _Test file: `__tests__/jikan-sync.test.ts`_

  - [x] 2.5 Buat API route `POST /api/admin/sync` di `src/app/api/admin/sync/route.ts`
    - Panggil `syncAll()`, return `{ synced, errors, total }` sebagai JSON
    - Gunakan pola async params yang sudah ada di codebase
    - _Requirements: 1.7, 1.8_

- [ ] 3. Checkpoint — Pastikan semua tests pass, tanya user jika ada pertanyaan.

- [x] 4. Pusher Server SDK Setup
  - Buat `src/lib/pusher.ts` dengan export `pusherServer` (instance `new Pusher({...})` menggunakan env vars `PUSHER_APP_ID`, `NEXT_PUBLIC_PUSHER_KEY`, `PUSHER_SECRET`, `NEXT_PUBLIC_PUSHER_CLUSTER`, `useTLS: true`)
  - Dokumentasikan channel naming convention sebagai komentar: `episode-{animeId}-{episodeNumber}`
  - Dokumentasikan events: `viewer-count: { count: number }`, `new-comment: { id, content, username, createdAt, likes }`, `user-typing: { username: string }`
  - _Requirements: 6.1, 6.2, 7.3_

- [x] 5. Update API Route `/api/anime` dengan Filter, Pagination, dan Search
  - [x] 5.1 Update `src/app/api/anime/route.ts` — GET handler menerima query params `genre`, `status`, `type`, `year`, `page` (default 1), `limit` (default 20), `q`
    - Build `where` clause secara kondisional: `genres: { has: genre }`, `status`, `type`, `year: parseInt(year)`, `title: { contains: q, mode: 'insensitive' }`
    - Return `{ data: anime[], total, page, totalPages }`
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.9_

  - [ ]* 5.2 Tulis property test untuk Browse Filter Correctness (P4)
    - **Property 4: Browse Filter Correctness**
    - Gunakan `fc.record({ genre: fc.option(fc.string()), status: fc.option(fc.constantFrom('Ongoing','Completed','Upcoming')), type: fc.option(fc.constantFrom('TV','Movie','OVA')), year: fc.option(fc.integer({min:1990,max:2030})) })`
    - Mock Prisma, assert bahwa setiap item dalam hasil memenuhi SEMUA filter yang aktif
    - **Validates: Requirements 2.3, 2.4, 2.5, 2.6, 2.7**
    - _Test file: `__tests__/api-anime.test.ts`_

  - [x] 5.3 Buat API route `GET /api/anime/search` di `src/app/api/anime/search/route.ts`
    - Query param `q` (required), return max 10 hasil dengan `select: { id, title, image, type, year }`
    - Pencarian case-insensitive pada field `title`
    - _Requirements: 3.3, 3.4_

  - [ ]* 5.4 Tulis property test untuk Search Case-Insensitivity dan Result Bound (P5)
    - **Property 5: Search Case-Insensitivity and Result Bound**
    - Gunakan `fc.string({ minLength: 1, maxLength: 50 })` sebagai query
    - Mock Prisma, assert bahwa hasil dengan `q`, `q.toUpperCase()`, `q.toLowerCase()` identik, dan `result.length <= 10`
    - **Validates: Requirements 3.3, 3.4**
    - _Test file: `__tests__/api-search.test.ts`_

- [x] 6. Halaman Utama Dinamis dari Database
  - Ubah `src/app/page.tsx` menjadi async Server Component — hapus import dari `src/lib/data.ts`
  - Tambah 4 Prisma queries langsung di server component:
    - `trendingAnime`: `where: { trending: true }, orderBy: { views: 'desc' }, take: 12`
    - `latestEpisodes`: `orderBy: { updatedAt: 'desc' }, take: 12`
    - `popularAnime`: `orderBy: { rating: 'desc' }, take: 12`
    - `movieAnime`: `where: { type: 'Movie' }, orderBy: { rating: 'desc' }, take: 12`
  - Tambah fallback UI (skeleton atau pesan "Sedang memuat data anime...") jika array kosong
  - Update `next.config.ts` untuk tambah hostname MAL CDN ke `remotePatterns`
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_

- [ ]* 6.1 Tulis property test untuk Home Page Section Ordering Invariants (P17)
  - **Property 17: Home Page Section Ordering Invariants**
  - Gunakan `fc.array(fc.record({ trending: fc.boolean(), views: fc.integer({min:0}), rating: fc.float({min:0,max:10}), type: fc.constantFrom('TV','Movie','OVA'), updatedAt: fc.date() }), { minLength: 1 })`
  - Assert: trending section hanya berisi `trending=true` diurutkan `views` desc; popular section diurutkan `rating` desc; movie section hanya `type='Movie'`
  - **Validates: Requirements 10.2, 10.3, 10.4, 10.5**
  - _Test file: `__tests__/home-page.test.ts`_

- [x] 7. Halaman `/browse` dengan Filter dan Pagination
  - Buat `src/app/browse/page.tsx` sebagai hybrid: Server Component untuk initial data fetch, Client Component untuk filter state
  - Buat `src/app/browse/browse-client.tsx` sebagai Client Component dengan state untuk `genre`, `status`, `type`, `year`, `page`, `q`
  - Filter UI: dropdown/select untuk genre (dari list genres), status, type, year; input search
  - Pagination: tombol Previous/Next, update URL search params tanpa full reload menggunakan `useRouter` dan `useSearchParams`
  - Fetch data dari `/api/anime` dengan query params sesuai filter aktif
  - Tampilkan pesan "Tidak ada anime yang ditemukan" jika hasil kosong
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.10_

- [x] 8. Halaman `/anime/[id]` Detail + Episode List
  - Ubah `src/app/anime/[id]/page.tsx` menjadi async Server Component — hapus `generateStaticParams` (tidak kompatibel dengan dynamic server-side), await params sesuai pola Next.js 16: `const { id } = await params`
  - Fetch anime dari `prisma.anime.findUnique({ where: { id }, include: { episodeList: { orderBy: { number: 'asc' } } } })`
  - Return `notFound()` dari `next/navigation` jika anime tidak ditemukan
  - Hapus `anime-detail-client.tsx` yang hardcoded, ganti dengan render langsung di server component atau buat client component baru yang menerima data sebagai props
  - Tampilkan semua field: title, image, coverImage, rating, year, episodes, duration, status, studio, description, genres, type
  - Episode list diurutkan ascending by `number`, setiap episode link ke `/watch/{animeId}/{episode.number}`
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [ ]* 8.1 Tulis property test untuk Episode List Ordering Invariant (P8)
  - **Property 8: Episode List Ordering Invariant**
  - Gunakan `fc.array(fc.record({ id: fc.string(), number: fc.integer({min:1,max:9999}), title: fc.string() }), { minLength: 1 })`
  - Shuffle array, sort dengan logika yang sama dengan query Prisma, assert bahwa `result[i].number <= result[i+1].number` untuk semua i
  - **Validates: Requirements 4.3**
  - _Test file: `__tests__/episode-list.test.ts`_

- [ ] 9. Checkpoint — Pastikan semua tests pass, tanya user jika ada pertanyaan.

- [x] 10. Video Player dengan Iframe Embed di Watch Page
  - Ubah `src/app/watch/[animeId]/[episodeId]/page.tsx` menjadi async Server Component — hapus `generateStaticParams`, await params: `const { animeId, episodeId } = await params`
  - Fetch episode dari DB: `prisma.episode.findFirst({ where: { animeId, number: parseInt(episodeId) }, include: { anime: { include: { episodeList: { orderBy: { number: 'asc' } } } } } })`
  - Pass data ke `WatchClient` sebagai props (bukan hardcoded)
  - Update `src/app/watch/[animeId]/[episodeId]/watch-client.tsx`:
    - Ganti placeholder video player dengan `<iframe src={episode.videoUrl} allowFullScreen className="w-full aspect-video" />`
    - Jika `videoUrl` null/empty, tampilkan placeholder "Video tidak tersedia"
    - Ganti hardcoded `episodes` array dengan data dari props
    - Tombol Previous/Next episode: disabled jika episode pertama/terakhir, navigate ke `/watch/{animeId}/{prevNumber}` atau `/watch/{animeId}/{nextNumber}`
    - Tampilkan judul anime dan nomor episode dari data DB
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

- [ ]* 10.1 Tulis property test untuk Video Player URL Binding (P9)
  - **Property 9: Video Player URL Binding**
  - Gunakan `fc.webUrl()` sebagai `videoUrl`
  - Render komponen video player dengan React Testing Library, assert bahwa `iframe[src]` === `videoUrl`
  - **Validates: Requirements 5.2**
  - _Test file: `__tests__/video-player.test.ts`_

- [ ]* 10.2 Tulis property test untuk Episode Navigation Correctness (P10)
  - **Property 10: Episode Navigation Correctness**
  - Gunakan `fc.integer({ min: 2 })` sebagai `currentEpisode` dan `fc.integer({ min: 1 })` sebagai `totalEpisodes` (dengan constraint `currentEpisode <= totalEpisodes`)
  - Assert: prev episode = `currentEpisode - 1`, next episode = `currentEpisode + 1`
  - Assert: tombol prev disabled jika `currentEpisode === 1`, tombol next disabled jika `currentEpisode === totalEpisodes`
  - **Validates: Requirements 5.4, 5.5, 5.6, 5.7**
  - _Test file: `__tests__/episode-nav.test.ts`_

- [x] 11. Realtime: Pusher Presence (Viewer Count) + Realtime Comments
  - [x] 11.1 Buat/update API route `POST /api/pusher/presence` di `src/app/api/pusher/presence/route.ts`
    - Terima `{ animeId, episodeId, action: 'join' | 'leave', socketId }`
    - Jika `join`: upsert `LiveViewer` record, hitung total viewer untuk channel, trigger Pusher event `viewer-count` ke channel `episode-{animeId}-{episodeId}`
    - Jika `leave`: delete `LiveViewer` by `socketId`, hitung ulang total, trigger event yang sama
    - _Requirements: 6.1, 6.2, 6.5, 6.6_

  - [ ]* 11.2 Tulis property test untuk LiveViewer State Consistency (P18)
    - **Property 18: LiveViewer State Consistency**
    - Gunakan `fc.record({ socketId: fc.uuid(), animeId: fc.string(), episodeId: fc.string() })`
    - Mock Prisma, assert: setelah join → record exists; setelah leave dengan socketId yang sama → record tidak ada
    - **Validates: Requirements 6.6**
    - _Test file: `__tests__/live-viewer.test.ts`_

  - [x] 11.3 Update `src/app/api/comments/route.ts` — GET handler menerima query param `episodeId`, return max 50 komentar terbaru (`orderBy: { createdAt: 'desc' }, take: 50`); POST handler simpan komentar ke DB
    - _Requirements: 7.2, 7.9_

  - [x] 11.4 Buat/update API route `POST /api/comments/realtime` di `src/app/api/comments/realtime/route.ts`
    - Simpan komentar ke DB via `prisma.comment.create`
    - Trigger Pusher event `new-comment` ke channel `episode-{animeId}-{episodeNumber}` menggunakan `pusherServer` dari `src/lib/pusher.ts`
    - Tambah endpoint untuk typing indicator: trigger event `user-typing` ke channel yang sama
    - _Requirements: 7.2, 7.3, 7.6, 7.7_

  - [x] 11.5 Update `src/app/watch/[animeId]/[episodeId]/watch-client.tsx` untuk realtime:
    - Pusher subscribe ke channel `episode-{animeId}-{episodeId}` (gunakan `episodeId` sebagai episode number)
    - Bind event `viewer-count` → update state `onlineUsers`
    - Bind event `new-comment` → prepend ke state `comments`
    - Bind event `user-typing` → set `isTyping = true`, auto-reset setelah 2000ms
    - Pada mount: POST ke `/api/pusher/presence` dengan `action: 'join'`
    - Pada unmount (cleanup): POST ke `/api/pusher/presence` dengan `action: 'leave'`
    - Tampilkan indikator "Offline" jika Pusher disconnected (`pusher.connection.bind('disconnected', ...)`)
    - Tampilkan `onlineUsers` count di UI
    - Jika user belum login dan coba kirim komentar, tampilkan prompt login (bukan redirect)
    - Kirim typing indicator saat user mengetik di comment input
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.7, 7.1, 7.4, 7.5, 7.7, 7.8_

  - [ ]* 11.6 Tulis property test untuk Comment Load Bound (P13) dan Comment Persistence (P12)
    - **Property 12: Comment Persistence** — `fc.record({ content: fc.string({minLength:1}), userId: fc.string(), animeId: fc.string(), episodeId: fc.string() })` — mock Prisma, assert record tersimpan dengan nilai yang sama
    - **Property 13: Comment Load Bound** — `fc.integer({ min: 51, max: 200 })` sebagai jumlah komentar di DB — mock Prisma, assert response length <= 50
    - **Validates: Requirements 7.2, 7.9**
    - _Test file: `__tests__/comments.test.ts`_

  - [ ]* 11.7 Tulis property test untuk Comment Like Increment (P14)
    - **Property 14: Comment Like Increment**
    - Gunakan `fc.integer({ min: 0, max: 10000 })` sebagai initial `likes`
    - Mock `prisma.comment.update`, assert bahwa `likes` setelah increment === `initialLikes + 1`
    - **Validates: Requirements 7.10**
    - _Test file: `__tests__/comments.test.ts`_

- [ ] 12. Checkpoint — Pastikan semua tests pass, tanya user jika ada pertanyaan.

- [x] 13. Bookmark / Watchlist Feature
  - [x] 13.1 Buat API route `GET /api/bookmarks` dan `POST /api/bookmarks` di `src/app/api/bookmarks/route.ts`
    - GET: ambil session dari `next-auth`, return semua bookmark milik user dengan include anime data (`select: { anime: { select: { id, title, image, status, episodes, type } } }`)
    - POST: terima `{ animeId }`, cek apakah bookmark sudah ada — jika ada, delete (toggle off); jika tidak, create (toggle on). Return `{ bookmarked: boolean }`
    - Return 401 jika tidak ada session
    - _Requirements: 8.2, 8.4, 8.6, 8.7_

  - [ ]* 13.2 Tulis property test untuk Bookmark Toggle Idempotence (P15)
    - **Property 15: Bookmark Toggle Idempotence**
    - Gunakan `fc.record({ userId: fc.uuid(), animeId: fc.uuid() })`
    - Mock Prisma, simulasi toggle: setelah 1 call → `bookmarked: true`; setelah 2 call → `bookmarked: false`; setelah 3 call → `bookmarked: true`
    - **Validates: Requirements 8.2, 8.4**
    - _Test file: `__tests__/bookmarks.test.ts`_

  - [x] 13.3 Buat komponen `src/components/bookmark-button.tsx` sebagai Client Component
    - Props: `animeId: string`, `initialBookmarked: boolean`
    - State: `isBookmarked`, `isLoading`
    - On click: POST ke `/api/bookmarks`, toggle state, tampilkan filled/outline icon
    - Jika tidak ada session (cek via `useSession`), tampilkan prompt login
    - _Requirements: 8.1, 8.3, 8.8_

  - [x] 13.4 Integrasikan `BookmarkButton` ke `src/app/anime/[id]/page.tsx` (detail page) dan `src/components/anime-card.tsx`
    - Di detail page: fetch bookmark status awal dari DB untuk user yang login, pass sebagai `initialBookmarked` prop
    - _Requirements: 8.1_

  - [x] 13.5 Buat halaman `src/app/watchlist/page.tsx` sebagai async Server Component
    - Ambil session, redirect ke `/` jika tidak login
    - Fetch bookmarks via `prisma.bookmark.findMany({ where: { userId }, include: { anime: true } })`
    - Tampilkan grid anime yang di-bookmark dengan status dan episode count terbaru
    - _Requirements: 8.5, 8.9_

  - [ ]* 13.6 Tulis property test untuk Watchlist Data Completeness (P16)
    - **Property 16: Watchlist Data Completeness**
    - Gunakan `fc.array(fc.record({ status: fc.constantFrom('Ongoing','Completed','Upcoming'), episodes: fc.integer({min:0}) }), { minLength: 1 })`
    - Assert bahwa setiap item di watchlist memiliki field `status` dan `episodes` yang tidak undefined
    - **Validates: Requirements 8.9**
    - _Test file: `__tests__/watchlist.test.ts`_

- [ ] 14. Update Navbar dengan Search Debounce
  - Update `src/components/navbar.tsx`:
    - Tambah state `searchQuery`, `searchResults`, `isSearchLoading`, `showDropdown`
    - Implementasi debounce 500ms menggunakan `useEffect` + `setTimeout`/`clearTimeout` (atau buat utility `src/lib/debounce.ts`)
    - Saat `searchQuery.length >= 2`: fetch `/api/anime/search?q={query}`, tampilkan dropdown hasil
    - Saat `searchQuery` kosong: sembunyikan dropdown
    - Klik hasil dropdown: navigate ke `/anime/{id}`
    - Tekan Enter: navigate ke `/browse?q={query}`
    - Tampilkan "Anime tidak ditemukan" jika hasil kosong
    - Tambah link `/browse` ke nav links
    - _Requirements: 3.1, 3.2, 3.5, 3.6, 3.7, 3.8_

- [ ]* 14.1 Tulis property test untuk Search Debounce (P6)
  - **Property 6: Search Debounce — Single API Call Per Window**
  - Gunakan `fc.array(fc.string(), { minLength: 2, maxLength: 10 })` sebagai sequence keystrokes
  - Mock `fetch`, simulasi keystrokes dalam window 500ms, assert bahwa fetch dipanggil maksimal 1 kali
  - **Validates: Requirements 3.2**
  - _Test file: `__tests__/debounce.test.ts`_

- [ ] 15. Checkpoint Final — Pastikan semua tests pass, tanya user jika ada pertanyaan.

## Notes

- Task bertanda `*` bersifat opsional dan bisa di-skip untuk MVP yang lebih cepat
- Setiap task mereferensikan requirements spesifik untuk traceability
- Pola async params Next.js 16: `const { id } = await params` — ikuti pola yang sudah ada di `src/app/api/anime/[id]/episodes/route.ts`
- Auth menggunakan session dari `next-auth` (sudah ada) — tidak perlu implementasi ulang login/register
- Pusher client-side sudah ada di `watch-client.tsx`, server-side perlu dibuat di `src/lib/pusher.ts`
- Deployment target: Vercel — pastikan tidak ada `output: 'export'` di next.config.ts
- Property tests menggunakan `fast-check` dengan minimum 100 iterasi per property
