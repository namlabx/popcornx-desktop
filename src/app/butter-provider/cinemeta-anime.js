'use strict';

const CinemetaBase = require('./cinemeta-base');
const sanitize = require('butter-sanitize');

class AnimeApi extends CinemetaBase {
  constructor(args) {
    super(args);
  }

  async fetch(filters) {
    let catalog = 'kitsu-anime-popular';
    let extra = [];

    if (filters.keywords) {
      catalog = 'kitsu-anime-list';
      extra.push(`search=${encodeURIComponent(filters.keywords.trim())}`);
    } else {
      if (filters.genre && filters.genre !== 'All') {
        extra.push(`genre=${encodeURIComponent(filters.genre)}`);
      }
    }

    if (filters.page > 1) {
      const skip = (filters.page - 1) * 50;
      extra.push(`skip=${skip}`);
    }

    let baseUrl = this.getSetting('kitsuUrl').replace(/\/$/, '');
    let url = `${baseUrl}/catalog/anime/${catalog}`;
    if (extra.length > 0) {
      url += '/' + extra.join('&');
    }
    url += '.json';

    try {
      const response = await fetch(url);
      const data = await response.json();
      const results = [];
      if (data.metas) {
        data.metas.forEach(show => {
          results.push({
            type: 'show',
            imdb_id: show.id, // e.g. kitsu:11
            tvdb_id: 0,
            title: show.name,
            year: (show.year || '').toString(),
            genres: show.genres || ['Anime'],
            rating: parseFloat(show.imdbRating) || 0,
            runtime: show.runtime ? show.runtime.replace(' min', '') : '0',
            image: show.poster,
            cover: show.poster,
            backdrop: show.background,
            poster: show.poster,
            poster_medium: show.poster,
            synopsis: show.description || '',
            status: show.status || 'N/A'
          });
        });
      }
      return {
        results: sanitize(results),
        hasMore: data.metas && data.metas.length > 0
      };
    } catch (err) {
      console.error('Kitsu Anime fetch error:', err);
      return { results: [], hasMore: false };
    }
  }

  async detail(imdb_id, old_data, debug) {
    let baseUrl = this.getSetting('kitsuUrl').replace(/\/$/, '');
    const url = `${baseUrl}/meta/anime/${imdb_id}.json`;
    try {
      const response = await fetch(url);
      const data = await response.json();

      const episodes = [];
      let num_seasons = 1;
      const seasonSet = new Set();

      if (data.meta && data.meta.videos) {
        data.meta.videos.forEach(video => {
          if (typeof video.season === 'number' && video.season > 0) {
            seasonSet.add(video.season);
          }

          episodes.push({
            torrents: {},
            season: video.season,
            episode: video.episode || video.number,
            title: video.title || video.name || `Episode ${video.episode || video.number}`,
            overview: video.overview || video.description || '',
            tvdb_id: 0,
            first_aired: video.released ? Math.floor(new Date(video.released).getTime() / 1000) : 0
          });
        });

        if (seasonSet.size > 0) {
          num_seasons = Math.max(...seasonSet);
        }
      }

      if (data.meta) {
        old_data.synopsis = data.meta.description || old_data.synopsis;
        old_data.backdrop = data.meta.background || old_data.backdrop;
      }

      return Object.assign({}, old_data, { episodes: episodes, num_seasons: num_seasons });
    } catch (err) {
      console.error('Kitsu Anime detail error:', err);
      return Object.assign({}, old_data, { episodes: [], num_seasons: 1 });
    }
  }

  async torrents(imdb_id, lang) {
    return [];
  }

  async episodeTorrents(imdb_id, lang, season, episode) {
    // For anime, Torrentio maps kitsu:id:episode (e.g. kitsu:11:1)
    // Stremio's Kitsu addon returns videos with absolute episode numbers.
    let baseUrl = this.getSetting('torrentioUrl').replace(/\/$/, '');
    if (!baseUrl) {
      return [];
    }
    let url;
    if (imdb_id.startsWith('kitsu:')) {
      url = `${baseUrl}/stream/anime/${imdb_id}:${episode}.json`;
    } else {
      url = `${baseUrl}/stream/anime/${imdb_id}:${season}:${episode}.json`;
    }
    try {
      const response = await fetch(url);
      const data = await response.json();
      return this.parseStreams(data, 'Torrentio');
    } catch (err) {
      console.error('Torrentio Anime stream error:', err);
      return [];
    }
  }

  filters() {
    return Promise.resolve({
      genres: {
        'All': 'Anime'
      },
      sorters: {
        'popularity': 'Popularity'
      }
    });
  }
}

AnimeApi.prototype.config = {
  name: 'AnimeApi',
  uniqueId: 'imdb_id',
  tabName: 'Anime',
  type: 'tvshow',
  metadata: 'trakttv:show-metadata'
};

module.exports = AnimeApi;
