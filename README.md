<h1 align="center">
  <br>
  <img src="src/app/images/icon.png" alt="Popcorn Time" width="128">
  <br>
  Popcorn Time
  <br>
</h1>

<h4 align="center">A multi-platform, free software media streaming client with an integrated player.</h4>

<p align="center">
  <a href="LICENSE.txt"><img src="https://img.shields.io/badge/license-GPL%20v3-blue.svg" alt="License"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg" alt="Node.js"></a>
  <a href="https://yarnpkg.com"><img src="https://img.shields.io/badge/yarn-%3E%3D1.22.0-blue.svg" alt="Yarn"></a>
</p>

---

> [!NOTE]
> This project is a modern fork derived from [popcorn-time-ru/popcorn-desktop (v0.5.1)](https://github.com/popcorn-time-ru/popcorn-desktop/blob/v0.5.1/README.md), featuring modular Stremio Stream Protocol integrations and decentralized, user-configurable API providers.

---

## Features

- 🎬 **Movies & TV Series**: Powered by Cinemeta metadata API.
- ⛩️ **Anime**: Powered by Kitsu anime catalog and metadata.
- ⚡ **Decentralized Streams**: Full support for any custom stream addon following the Stremio Stream Protocol.
- 📺 **Integrated Player**: Native media player with subtitle support (OpenSubtitles), multiple audio tracks, quality selection, and hardware acceleration.
- 🔖 **Bookmarks & History**: Save your favorites and track watched episodes with local database persistence.

---

## Configuration & Custom Stream Providers

Popcorn Time does not bundle any built-in scrapers or hardcoded torrent sources. Users can configure their preferred metadata and stream provider endpoints in Settings.

### API Server Settings
Open **Settings** ➔ **API Server(s)**:

| Option | Description | Default |
| --- | --- | --- |
| **Movies & Series** | Cinemeta metadata endpoint | `https://v3-cinemeta.strem.io` |
| **Anime** | Kitsu anime metadata endpoint | `https://anime-kitsu.strem.fun` |
| **Streams Provider** | Stremio-compatible stream addon endpoint | *(User configured)* |

### Stream Provider Protocol Specification
The Streams Provider endpoint must comply with the Stremio Stream Protocol:
- **Movies:** `GET <server-url>/stream/movie/{imdb_id}.json`
- **Series:** `GET <server-url>/stream/series/{imdb_id}:{season}:{episode}.json`
- **Anime:** `GET <server-url>/stream/anime/{kitsu_id}:{episode}.json`

#### Expected JSON Response Format:
```json
{
  "streams": [
    {
      "name": "1080p",
      "title": "Movie.Title.1080p.BluRay\n💾 2.1 GB 👥 120",
      "infoHash": "4a5b6c7d8e9f0123456789abcdef0123456789ab",
      "fileIdx": 0
    }
  ]
}
```

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org) (v14 or later)
- [Yarn](https://yarnpkg.com) (`npm install -g yarn`)
- [Gulp CLI](https://gulpjs.com) (`npm install -g gulp-cli`)

### Installation & Run

1. **Clone the repository:**
   ```bash
   git clone https://github.com/namlabx/popcornx-desktop.git
   cd popcornx-desktop
   ```

2. **Install dependencies:**
   ```bash
   yarn install --ignore-engines
   ```

3. **Build assets & run:**
   ```bash
   yarn build
   yarn start
   ```

---

## Building Packages

To package redistributable binaries for your platform:

```bash
yarn dist --platforms=<platform>
```

Supported platforms (comma-separated):
- `win64`, `win32` (Windows 64-bit / 32-bit)
- `linux64`, `linux32` (Linux 64-bit / 32-bit)
- `osx64` (macOS Intel), `osxarm64` (macOS Apple Silicon)
- `all` (Build all target platforms)

Built installers and archives will be output to the `build/` directory.

---

## Attribution & Credits

This project builds upon the tremendous work of the open-source community and previous contributors:

- **Original Project**: Created and maintained by the [Popcorn Time Community](https://github.com/popcorn-official) and the [Butter Project](https://github.com/butterproject/butter).
- **Direct Predecessor**: Forked and modernized from [popcorn-time-ru/popcorn-desktop (v0.5.1)](https://github.com/popcorn-time-ru/popcorn-desktop/blob/v0.5.1/README.md).
- **Special Thanks**: To all community members and contributors who have maintained and kept open-source desktop streaming alive over the years.

---

## License & Legal Disclaimer

- **License**: This program is free software: you can redistribute it and/or modify it under the terms of the **GNU General Public License v3 (GPL v3)** as published by the Free Software Foundation. See [LICENSE.txt](LICENSE.txt) for the full license text.
- **Source Code Availability**: In full compliance with GPL v3, the complete source code of this project is openly published and freely accessible.
- **Content Disclaimer**: Popcorn Time is an open-source BitTorrent/media player client. It does not host, index, or scrape any media content. All metadata and stream endpoints are configured independently by the end user.
