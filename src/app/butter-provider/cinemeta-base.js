'use strict';

const Generic = require('./generic');

/**
 * CinemetaBase - Common base class for Cinemeta/Stremio protocol providers
 * (Movie, TV Series, Anime)
 * Extends Generic provider to share settings lookup, stream parsing, tracker handling, and helper methods.
 */
class CinemetaBase extends Generic {
  constructor(args) {
    super(args);
    args = args || {};
    this.language = args.language || 'en';
    this.contentLanguage = args.contentLanguage || this.language;
    this.contentLangOnly = args.contentLangOnly || false;
  }

  /**
   * Safely retrieve a setting value across NW.js node/DOM contexts
   * @param {string} key
   * @returns {string|any}
   */
  getSetting(key) {
    try {
      if (typeof global !== 'undefined' && global.Settings && typeof global.Settings[key] !== 'undefined') {
        return global.Settings[key] || '';
      }
    } catch (e) {}
    try {
      if (typeof App !== 'undefined' && App.settings && typeof App.settings[key] !== 'undefined') {
        return App.settings[key] || '';
      }
    } catch (e) {}
    try {
      if (typeof window !== 'undefined' && window.Settings && typeof window.Settings[key] !== 'undefined') {
        return window.Settings[key] || '';
      }
    } catch (e) {}
    try {
      if (typeof Settings !== 'undefined' && typeof Settings[key] !== 'undefined') {
        return Settings[key] || '';
      }
    } catch (e) {}
    return '';
  }

  /**
   * Builds forced tracker parameters query string for magnet links
   * @returns {string}
   */
  getTrackerParams() {
    const trackerList = (typeof Settings !== 'undefined' && Settings.trackers && Settings.trackers.forced)
      ? Settings.trackers.forced
      : [
        'udp://tracker.opentrackr.org:1337',
        'udp://tracker.openbittorrent.com:6969',
        'wss://tracker.btorrent.xyz',
        'wss://tracker.openwebtorrent.com'
      ];
    return trackerList
      .map(tr => tr.endsWith('/announce') ? tr : tr + '/announce')
      .map(tr => `tr=${encodeURIComponent(tr)}`).join('&');
  }

  /**
   * Parses Stremio/Torrentio stream protocol response into standard Butter torrent objects
   * @param {object} data - JSON response containing { streams: [...] }
   * @param {string} defaultProvider
   * @returns {Array<object>}
   */
  parseStreams(data, defaultProvider = 'Torrentio') {
    if (!data || !Array.isArray(data.streams)) {
      return [];
    }

    const trParams = this.getTrackerParams();

    let sources = data.streams.filter(s => s && s.infoHash).map((stream) => {
      let quality = '720p';
      const name = (stream.name || '').toLowerCase();
      const title = (stream.title || '');
      const lowerTitle = title.toLowerCase();

      if (name.includes('4k') || name.includes('2160p') || lowerTitle.includes('2160p') || title.includes('4K')) {
        quality = '2160p';
      } else if (name.includes('1080p') || lowerTitle.includes('1080p')) {
        quality = '1080p';
      } else if (name.includes('720p') || lowerTitle.includes('720p')) {
        quality = '720p';
      }

      const shortTitle = title.split('\n')[0] || stream.name || 'Stream';
      const seedMatch = title.match(/👤\s*(\d+)/);
      const sizeMatch = title.match(/💾\s*([\d\.]+)\s*(GB|MB|KB)/);

      const seeds = seedMatch ? parseInt(seedMatch[1], 10) : 0;
      let sizeInGB = 0;
      let sizeStr = '0 GB';
      let sizeBytes = 0;
      if (sizeMatch) {
        sizeStr = `${sizeMatch[1]} ${sizeMatch[2]}`;
        sizeInGB = parseFloat(sizeMatch[1]);
        if (sizeMatch[2] === 'MB') {
          sizeInGB /= 1024;
          sizeBytes = parseFloat(sizeMatch[1]) * 1024 * 1024;
        } else if (sizeMatch[2] === 'KB') {
          sizeInGB /= (1024 * 1024);
          sizeBytes = parseFloat(sizeMatch[1]) * 1024;
        } else {
          sizeBytes = parseFloat(sizeMatch[1]) * 1024 * 1024 * 1024;
        }
      }

      let score = Math.min(seeds * 2, 80);
      let sizeScore = 0;
      if (sizeInGB > 0) {
        if (sizeInGB >= 1 && sizeInGB <= 8) sizeScore = 20;
        else if (sizeInGB > 8 && sizeInGB <= 15) sizeScore = 15;
        else if (sizeInGB > 15) sizeScore = 5;
        else if (sizeInGB > 0.2) sizeScore = 10;
        else sizeScore = 5;
      } else {
        sizeScore = 10;
      }
      score += sizeScore;
      if (seeds === 0) score = 0;

      return {
        title: shortTitle,
        provider: defaultProvider,
        size: sizeBytes,
        filesize: sizeStr,
        seed: seeds,
        peer: seeds,
        url: `magnet:?xt=urn:btih:${stream.infoHash}&dn=${encodeURIComponent(shortTitle)}&${trParams}`,
        quality: quality,
        health: seeds > 0 ? 'good' : 'bad',
        score: score,
        fileIdx: stream.fileIdx
      };
    });

    sources.sort((a, b) => b.score - a.score);
    return sources.slice(0, 20);
  }

  async contentOnLang(imdb_id, lang, title1) {
    return this.detail(imdb_id, { contextLocale: lang, title: title1 });
  }

  async extractIds(items) {
    if (!items) return [];
    if (Array.isArray(items)) {
      return items.map(i => i.imdb_id || i.id);
    }
    if (Array.isArray(items.results)) {
      return items.results.map(i => i.imdb_id || i.id);
    }
    return [];
  }

  async getBin() {
    throw new Error('Not implemented');
  }

  feature(name) {
    return name === 'torrents';
  }
}

module.exports = CinemetaBase;
