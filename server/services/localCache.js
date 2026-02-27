// Initiating Cache Store
const CacheStore = require('./cache.store.js');
const localCacheStore = new CacheStore();

// Initiate Cache - V2
localCacheStore.init();

module.exports = localCacheStore;