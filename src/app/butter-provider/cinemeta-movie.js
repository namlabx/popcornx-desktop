'use strict';

const CinemetaBase = require('./cinemeta-base');
const sanitize = require('butter-sanitize');

class MovieApi extends CinemetaBase {
  constructor(args) {
    super(args);
  }

  async fetch(filters) {
    let extra = [];
    if (filters.keywords) {
      extra.push(`search=${encodeURIComponent(filters.keywords.trim())}`);
    }
    if (filters.genre && filters.genre !== 'All') {
      extra.push(`genre=${encodeURIComponent(filters.genre)}`);
    }
    if (filters.page > 1) {
      const skip = (filters.page - 1) * 50;
      extra.push(`skip=${skip}`);
    }

    let baseUrl = this.getSetting('cinemetaUrl').replace(/\/$/, '');
    let url = `${baseUrl}/catalog/movie/top`;
    if (extra.length > 0) {
      url += '/' + extra.join('&');
    }
    url += '.json';

    try {
      const response = await fetch(url);
      const data = await response.json();
      const results = [];
      if (data.metas) {
        data.metas.forEach(movie => {
          results.push({
            type: 'movie',
            imdb_id: movie.imdb_id || movie.id,
            tmdb_id: movie.moviedb_id || 0,
            title: movie.name,
            year: (movie.year || '').toString(),
            genre: movie.genres || [],
            rating: parseFloat(movie.imdbRating) || 0,
            runtime: movie.runtime ? movie.runtime.replace(' min', '') : '0',
            image: movie.poster,
            cover: movie.poster,
            backdrop: movie.background,
            poster: movie.poster,
            poster_medium: movie.poster,
            synopsis: movie.description || '',
            trailer: (movie.trailers && movie.trailers.length > 0) ? movie.trailers[0].source : false,
            torrents: {}
          });
        });
      }
      return {
        results: sanitize(results),
        hasMore: data.metas && data.metas.length > 0
      };
    } catch (err) {
      console.error('Cinemeta Movie fetch error:', err);
      return { results: [], hasMore: false };
    }
  }

  async detail(imdb_id, old_data, debug) {
    try {
      const torrentsArray = await this.torrents(imdb_id, this.language);
      const torrentsObj = {};
      torrentsArray.forEach(t => {
        // Keep the best quality if multiple exist (Torrentio returns them sorted by seeders, so first is best)
        if (!torrentsObj[t.quality]) {
          torrentsObj[t.quality] = Object.assign({}, t);
        }
      });
      const lang = this.language || 'en';
      return Object.assign({}, old_data, {
        torrents: torrentsObj,
        langs: { [lang]: torrentsObj },
        defaultAudio: lang
      });
    } catch (err) {
      console.error('Cinemeta Movie detail error:', err);
      return Object.assign({}, old_data, { torrents: {} });
    }
  }

  async torrents(imdb_id, lang, altShowAll) {
    let baseUrl = this.getSetting('torrentioUrl').replace(/\/$/, '');
    if (!baseUrl) {
      return [];
    }
    const url = `${baseUrl}/stream/movie/${imdb_id}.json`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      return this.parseStreams(data, 'Torrentio');
    } catch (err) {
      console.error('Torrentio movie stream error:', err);
      return [];
    }
  }

  filters() {
    return Promise.resolve({
      genres: {
        'All': 'All',
        'Action': 'Action',
        'Adventure': 'Adventure',
        'Animation': 'Animation',
        'Comedy': 'Comedy',
        'Crime': 'Crime',
        'Documentary': 'Documentary',
        'Drama': 'Drama',
        'Family': 'Family',
        'Fantasy': 'Fantasy',
        'History': 'History',
        'Horror': 'Horror',
        'Mystery': 'Mystery',
        'Romance': 'Romance',
        'Sci-Fi': 'Sci-Fi',
        'Thriller': 'Thriller'
      },
      sorters: {
        'popularity': 'Popularity'
      }
    });
  }
}

MovieApi.prototype.config = {
  name: 'MovieApi',
  uniqueId: 'imdb_id',
  tabName: 'Movies',
  type: 'movie',
  metadata: 'trakttv:movie-metadata'
};

module.exports = MovieApi;
