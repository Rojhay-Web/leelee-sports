require('dotenv').config();
const { google } = require('googleapis');

const util = require('../../utils/util');
const localStore = require('../localCache');
const log = require('../log.service');

const { YOUTUBE_CHANNEL_ID } = process.env;

module.exports = {
    search: async function(query=undefined, pageSize=8, pageToken=undefined) {
        try {
            // Check Cache First
            const cacheKey = `videos:${query}:${pageSize}:${pageToken}`;
            let cachedData = localStore.searchCacheStore('videos', cacheKey);
            if (cachedData) { return cachedData; }

            // If not in cache, fetch from YouTube API
            const auth = localStore.getGoogleAuth('https://www.googleapis.com/auth/youtube');
            const youtube = google.youtube({ version: 'v3', auth });
            
            const response = await youtube.search.list({
                type: 'video',
                part: 'id,snippet',
                q: query ? query : undefined,
                channelId: YOUTUBE_CHANNEL_ID,
                maxResults: pageSize,
                pageToken: pageToken,
                order: 'date'
            });
            
            const ret = { 
                results: processVideoData(response?.data?.items), 
                nextPageToken: response?.data?.nextPageToken,
                prevPageToken: response?.data?.prevPageToken,
                totalResults: response?.data?.pageInfo?.totalResults
            };

            // Update Cache
            localStore.updateCacheStore('videos', cacheKey, ret);
            return ret;
        } catch (error) {
            log.error(`Searching Youtube Videos: ${error}`);
            return { error: `Error Searching Videos`};
        }
    }
}

/* Private Events */
function processVideoData(items) {
    if (!items || items.length === 0) {
        return [];
    }

    return items.map(item => ({
        id: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        publishedAt: util.validateDate(item?.snippet?.publishedAt) ? new Date(item.snippet.publishedAt) : null
    }));
}