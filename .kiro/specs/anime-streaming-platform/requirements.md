# Requirements Document

## Introduction

OXNIME adalah platform streaming anime berbasis Next.js 16 yang memungkinkan pengguna menonton anime secara online dengan fitur realtime (live viewer count, komentar realtime), integrasi data otomatis dari Jikan API (MyAnimeList), video player dengan embed dari sumber gratis, sistem autentikasi lengkap, bookmark/watchlist, dan halaman browse/katalog anime. Proyek ini melanjutkan codebase yang sudah ada dengan Prisma + PostgreSQL, Socket.io + Pusher, dan next-auth.

---

## Glossary

- **System**: Platform OXNIME secara keseluruhan
- **Jikan_API**: MyAnimeList unofficial REST API (gratis, tanpa API key) untuk mengambil data anime
- **Sync_Service**: Modul yang bertanggung jawab mengambil dan menyinkronkan data dari Jikan_API ke database
- **Video_Player**: Komponen embed video yang menampilkan episode anime dari sumber streaming gratis
- **Pusher_Service**: Layanan realtime berbasis Pusher untuk live viewer count dan komentar realtime
- **Auth_System**: Sistem autentikasi berbasis next-auth v4 dengan credential provider
- **Catalog_Page**: Halaman browse/katalog yang menampilkan daftar anime dengan filter dan pencarian
- **Watch_Page**: Halaman menonton episode anime dengan video player dan fitur realtime
- **Anime_Detail_Page**: Halaman detail anime yang menampilkan informasi lengkap dan daftar episode
- **Bookmark_Service**: Modul pengelolaan watchlist/bookmark anime per user
- **Database**: PostgreSQL yang diakses via Prisma ORM (Neon/Supabase free tier)
- **Episode_Embed**: URL embed video episode dari sumber streaming gratis (gogoanime/zoro)
- **Live_Viewer**: Pengguna yang sedang aktif menonton episode yang sama secara bersamaan
- **Watch_History**: Riwayat episode yang sudah ditonton oleh user beserta progress-nya

---

## Requirements

### Requirement 1: Integrasi Jikan API dan Sinkronisasi Data Anime

**User Story:** Sebagai admin/sistem, saya ingin data anime diambil otomatis dari Jikan API dan disimpan ke database, sehingga katalog anime selalu lengkap dan up-to-date tanpa input manual.

#### Acceptance Criteria

1. THE Sync_Service SHALL mengambil data anime dari endpoint Jikan API (`https://api.jikan.moe/v4/`) menggunakan HTTP GET request.
2. WHEN Sync_Service menerima response dari Jikan API, THE Sync_Service SHALL memetakan field `mal_id`, `title`, `images`, `score`, `year`, `episodes`, `duration`, `status`, `studios`, `synopsis`, `genres`, `type` ke model Anime di Database.
3. WHEN data anime dari Jikan API sudah ada di Database (berdasarkan field `malId`), THE Sync_Service SHALL memperbarui record yang ada (upsert) tanpa membuat duplikat.
4. THE Sync_Service SHALL menyimpan field `malId` (MyAnimeList ID) di model Anime sebagai identifier unik dari Jikan API.
5. WHEN Jikan API mengembalikan status rate limit (HTTP 429), THE Sync_Service SHALL menunggu minimal 1000ms sebelum melakukan request berikutnya.
6. IF Jikan API tidak dapat dijangkau atau mengembalikan error HTTP 5xx, THEN THE Sync_Service SHALL mencatat error ke console log dan melanjutkan proses sync untuk item berikutnya.
7. THE System SHALL menyediakan API route `POST /api/admin/sync` yang memicu Sync_Service untuk mengambil data anime terbaru dari Jikan API.
8. WHEN Sync_Service selesai berjalan, THE System SHALL mengembalikan jumlah anime yang berhasil disinkronkan dalam response JSON.
9. THE Sync_Service SHALL mengambil minimal data dari endpoint top anime (`/top/anime`), seasonal anime (`/seasons/now`), dan anime berdasarkan genre populer untuk memastikan katalog yang lengkap.
10. WHEN episode baru tersedia di Jikan API untuk anime berstatus "Ongoing", THE Sync_Service SHALL memperbarui jumlah episode di record Anime yang bersangkutan.

---

### Requirement 2: Halaman Katalog / Browse Anime

**User Story:** Sebagai pengguna, saya ingin menjelajahi katalog anime dengan filter dan pencarian, sehingga saya dapat menemukan anime yang ingin saya tonton.

#### Acceptance Criteria

1. THE System SHALL menyediakan halaman `/browse` yang menampilkan daftar anime dari Database dalam format grid.
2. WHEN pengguna mengakses `/browse`, THE Catalog_Page SHALL menampilkan minimal 20 anime per halaman dengan pagination.
3. WHEN pengguna memilih filter genre, THE Catalog_Page SHALL menampilkan hanya anime yang memiliki genre tersebut dalam array `genres`.
4. WHEN pengguna memilih filter status ("Ongoing", "Completed", "Upcoming"), THE Catalog_Page SHALL menampilkan hanya anime dengan status yang dipilih.
5. WHEN pengguna memilih filter tipe ("TV", "Movie", "OVA"), THE Catalog_Page SHALL menampilkan hanya anime dengan tipe yang dipilih.
6. WHEN pengguna memilih filter tahun, THE Catalog_Page SHALL menampilkan hanya anime yang dirilis pada tahun tersebut.
7. THE Catalog_Page SHALL mendukung kombinasi beberapa filter secara bersamaan.
8. WHEN pengguna mengklik tombol "Next" atau "Previous" pada pagination, THE Catalog_Page SHALL memuat halaman berikutnya/sebelumnya tanpa full page reload.
9. THE System SHALL menyediakan API route `GET /api/anime` dengan query parameter `genre`, `status`, `type`, `year`, `page`, dan `limit` untuk mendukung filter dan pagination.
10. WHEN tidak ada anime yang cocok dengan filter yang dipilih, THE Catalog_Page SHALL menampilkan pesan "Tidak ada anime yang ditemukan".

---

### Requirement 3: Fitur Pencarian Anime

**User Story:** Sebagai pengguna, saya ingin mencari anime berdasarkan judul, sehingga saya dapat dengan cepat menemukan anime yang saya cari.

#### Acceptance Criteria

1. THE System SHALL menyediakan input pencarian di Navbar yang dapat diakses dari semua halaman.
2. WHEN pengguna mengetik minimal 2 karakter di input pencarian, THE System SHALL menampilkan hasil pencarian dalam dropdown dalam waktu maksimal 500ms setelah pengguna berhenti mengetik (debounce).
3. THE System SHALL menyediakan API route `GET /api/anime/search?q={query}` yang melakukan pencarian case-insensitive pada field `title` di Database.
4. WHEN API pencarian dipanggil, THE System SHALL mengembalikan maksimal 10 hasil pencarian yang paling relevan.
5. WHEN pengguna mengklik salah satu hasil pencarian di dropdown, THE System SHALL mengarahkan pengguna ke halaman `/anime/{id}` dari anime yang dipilih.
6. WHEN pengguna menekan Enter di input pencarian, THE System SHALL mengarahkan pengguna ke halaman `/browse?q={query}` yang menampilkan semua hasil pencarian.
7. IF query pencarian menghasilkan 0 hasil, THEN THE System SHALL menampilkan pesan "Anime tidak ditemukan" di dropdown.
8. WHEN pengguna mengosongkan input pencarian, THE System SHALL menyembunyikan dropdown hasil pencarian.

---

### Requirement 4: Halaman Detail Anime

**User Story:** Sebagai pengguna, saya ingin melihat informasi lengkap tentang sebuah anime beserta daftar episodenya, sehingga saya dapat memutuskan apakah ingin menontonnya.

#### Acceptance Criteria

1. THE System SHALL menyediakan halaman `/anime/{id}` yang menampilkan detail anime berdasarkan `id` dari Database.
2. WHEN pengguna mengakses `/anime/{id}`, THE Anime_Detail_Page SHALL menampilkan judul, gambar cover, rating, tahun, jumlah episode, durasi, status, studio, deskripsi, genre, dan tipe anime.
3. THE Anime_Detail_Page SHALL menampilkan daftar episode yang diambil dari Database, diurutkan berdasarkan nomor episode secara ascending.
4. WHEN pengguna mengklik salah satu episode di daftar, THE System SHALL mengarahkan pengguna ke halaman `/watch/{animeId}/{episodeNumber}`.
5. IF anime dengan `id` yang diminta tidak ditemukan di Database, THEN THE System SHALL mengembalikan halaman 404.
6. THE System SHALL menyediakan API route `GET /api/anime/{id}/episodes` yang mengembalikan daftar episode dari anime tersebut.
7. WHEN pengguna sudah login dan memiliki riwayat menonton anime tersebut, THE Anime_Detail_Page SHALL menampilkan indikator progress pada episode yang sudah ditonton.

---

### Requirement 5: Video Player dengan Embed

**User Story:** Sebagai pengguna, saya ingin menonton episode anime melalui video player yang berfungsi, sehingga saya dapat menikmati konten anime.

#### Acceptance Criteria

1. THE Video_Player SHALL menampilkan episode anime menggunakan iframe embed dari sumber streaming gratis yang tersedia (seperti gogoanime embed atau zoro embed).
2. WHEN field `videoUrl` pada record Episode di Database berisi URL embed yang valid, THE Video_Player SHALL memuat URL tersebut di dalam iframe.
3. THE Video_Player SHALL memiliki dimensi aspect ratio 16:9 dan responsif terhadap ukuran layar.
4. WHEN pengguna mengklik tombol episode sebelumnya, THE Watch_Page SHALL memuat episode dengan nomor lebih kecil dari episode saat ini.
5. WHEN pengguna mengklik tombol episode berikutnya, THE Watch_Page SHALL memuat episode dengan nomor lebih besar dari episode saat ini.
6. IF episode pertama sedang diputar, THEN THE Watch_Page SHALL menonaktifkan tombol episode sebelumnya.
7. IF episode terakhir sedang diputar, THEN THE Watch_Page SHALL menonaktifkan tombol episode berikutnya.
8. THE Watch_Page SHALL menampilkan judul anime dan nomor episode yang sedang diputar.
9. WHEN pengguna sudah login dan menonton sebuah episode, THE System SHALL menyimpan record WatchHistory ke Database dengan `animeId`, `episodeId`, dan `userId`.
10. THE System SHALL menyediakan API route `GET /api/episodes/{episodeId}/embed` yang mengembalikan URL embed untuk episode tersebut.

---

### Requirement 6: Fitur Realtime — Live Viewer Count

**User Story:** Sebagai pengguna, saya ingin melihat berapa banyak orang yang sedang menonton episode yang sama, sehingga saya merasa menonton bersama komunitas.

#### Acceptance Criteria

1. WHEN pengguna membuka halaman Watch_Page untuk sebuah episode, THE Pusher_Service SHALL menambahkan pengguna tersebut ke channel Pusher `episode-{animeId}-{episodeNumber}`.
2. WHEN jumlah Live_Viewer pada sebuah episode berubah, THE Pusher_Service SHALL mengirimkan event `viewer-count` dengan jumlah terbaru ke semua subscriber channel episode tersebut.
3. THE Watch_Page SHALL menampilkan jumlah Live_Viewer yang sedang menonton episode yang sama secara realtime.
4. WHEN pengguna meninggalkan halaman Watch_Page (unload/navigate away), THE Pusher_Service SHALL mengurangi jumlah Live_Viewer untuk episode tersebut.
5. THE System SHALL menyediakan API route `POST /api/pusher/presence` yang menerima parameter `animeId`, `episodeId`, dan `action` ("join" atau "leave") untuk mengelola Live_Viewer count.
6. WHEN Live_Viewer count diperbarui, THE System SHALL menyimpan data ke tabel LiveViewer di Database dengan `socketId`, `animeId`, dan `episodeId`.
7. IF koneksi Pusher terputus, THEN THE Watch_Page SHALL menampilkan indikator "Offline" dan mencoba reconnect secara otomatis.

---

### Requirement 7: Fitur Realtime — Komentar Realtime

**User Story:** Sebagai pengguna, saya ingin mengirim dan menerima komentar secara realtime saat menonton episode, sehingga saya dapat berinteraksi dengan penonton lain.

#### Acceptance Criteria

1. THE Watch_Page SHALL menampilkan panel komentar yang berisi daftar komentar untuk episode yang sedang ditonton.
2. WHEN pengguna sudah login dan mengirim komentar, THE System SHALL menyimpan komentar ke tabel Comment di Database dengan `content`, `userId`, `animeId`, dan `episodeId`.
3. WHEN komentar baru berhasil disimpan ke Database, THE Pusher_Service SHALL mengirimkan event `new-comment` ke channel `episode-{animeId}-{episodeNumber}` dengan data komentar tersebut.
4. WHEN Watch_Page menerima event `new-comment` dari Pusher_Service, THE Watch_Page SHALL menampilkan komentar baru di bagian atas daftar komentar tanpa perlu refresh halaman.
5. IF pengguna belum login dan mencoba mengirim komentar, THEN THE Watch_Page SHALL menampilkan prompt untuk login.
6. THE System SHALL menyediakan API route `POST /api/comments/realtime` yang menyimpan komentar ke Database dan memicu Pusher_Service untuk broadcast event `new-comment`.
7. WHEN pengguna sedang mengetik di input komentar, THE Pusher_Service SHALL mengirimkan event `user-typing` ke channel episode tersebut.
8. WHEN Watch_Page menerima event `user-typing`, THE Watch_Page SHALL menampilkan indikator "sedang mengetik..." selama maksimal 2000ms.
9. THE Watch_Page SHALL memuat maksimal 50 komentar terbaru saat halaman pertama kali dibuka, diambil dari API route `GET /api/comments?episodeId={episodeId}`.
10. WHEN pengguna mengklik tombol "Like" pada sebuah komentar, THE System SHALL menambah nilai field `likes` pada record Comment tersebut di Database sebesar 1.

---

### Requirement 8: Fitur Bookmark / Watchlist



**User Story:** Sebagai pengguna yang sudah login, saya ingin menyimpan anime ke watchlist saya, sehingga saya dapat dengan mudah menemukan anime yang ingin saya tonton nanti.

#### Acceptance Criteria

1. THE System SHALL menampilkan tombol bookmark pada Anime_Detail_Page dan AnimeCard untuk pengguna yang sudah login.
2. WHEN pengguna yang sudah login mengklik tombol bookmark pada sebuah anime, THE Bookmark_Service SHALL membuat record Bookmark baru di Database dengan `userId` dan `animeId`.
3. WHEN anime sudah ada di bookmark pengguna, THE Bookmark_Service SHALL menampilkan tombol bookmark dalam keadaan aktif (filled/highlighted).
4. WHEN pengguna mengklik tombol bookmark pada anime yang sudah di-bookmark, THE Bookmark_Service SHALL menghapus record Bookmark dari Database (toggle off).
5. THE System SHALL menyediakan halaman `/watchlist` yang menampilkan semua anime yang sudah di-bookmark oleh pengguna yang sedang login.
6. THE System SHALL menyediakan API route `GET /api/bookmarks` yang mengembalikan daftar bookmark milik pengguna yang sedang login.
7. THE System SHALL menyediakan API route `POST /api/bookmarks` yang menerima `animeId` dan membuat atau menghapus bookmark (toggle) untuk pengguna yang sedang login.
8. IF pengguna yang belum login mengklik tombol bookmark, THEN THE System SHALL menampilkan prompt untuk login.
9. WHEN pengguna mengakses halaman `/watchlist`, THE System SHALL menampilkan anime yang di-bookmark beserta status (Ongoing/Completed) dan jumlah episode terbaru.

---

### Requirement 10: Halaman Utama Dinamis dari Database

**User Story:** Sebagai pengguna, saya ingin melihat halaman utama yang menampilkan anime trending, terbaru, dan populer dari data nyata, sehingga konten yang ditampilkan selalu relevan dan up-to-date.

#### Acceptance Criteria

1. THE System SHALL mengganti data hardcoded di `src/lib/data.ts` dengan data yang diambil dari Database melalui Prisma.
2. WHEN pengguna mengakses halaman utama (`/`), THE System SHALL menampilkan seksi "Trending Now" yang berisi anime dengan field `trending = true` dari Database, diurutkan berdasarkan `views` descending.
3. WHEN pengguna mengakses halaman utama, THE System SHALL menampilkan seksi "Latest Episodes" yang berisi anime dengan episode terbaru, diurutkan berdasarkan `updatedAt` descending.
4. WHEN pengguna mengakses halaman utama, THE System SHALL menampilkan seksi "Popular Anime" yang berisi anime dengan `rating` tertinggi dari Database.
5. WHEN pengguna mengakses halaman utama, THE System SHALL menampilkan seksi "Anime Movies" yang berisi anime dengan `type = "Movie"` dari Database.
6. THE System SHALL menampilkan gambar anime menggunakan URL gambar yang disimpan di Database (dari Jikan API), bukan placeholder dari Unsplash.
7. WHEN Database kosong (belum ada data), THE System SHALL menampilkan pesan "Sedang memuat data anime..." atau skeleton loading state.
8. THE System SHALL menggunakan Next.js server-side data fetching untuk mengambil data halaman utama agar SEO-friendly.
