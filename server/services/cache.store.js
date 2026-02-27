'use strict';
require('dotenv').config();
const fns = require('date-fns');
const { google } = require('googleapis');

const log = require('./log.service');

const { PRIVATE_KEY, CLIENT_EMAIL } = process.env;
const TOKEN_DEFAULT_TIME = 40;

class CacheStore {
    constructor() {
        this.storeExpiration = {
            photos: 8, videos: 1, authScope: 1
        };
        this.store = {
            photos: {}, videos: {}, authScope:{}
        };
    }

    init(){
        try {
            // Initial Cache Tasks
        }
        catch(ex){
            log.error(`Init Cache: ${ex}`);
        }
    }

    /* Get Google Auth */
    getGoogleAuth(scope){
        let ret = null;
        try {
            if(scope in this.store.authScope){ 
                ret = this.store.authScope[scope].data;
                let expDt = fns.addMinutes(ret.lastAccessed, TOKEN_DEFAULT_TIME);
                
                if(this.storeExpiration.authScope > 0 && fns.isFuture(expDt)){
                    return ret;
                }
            } 
            
            const privateKey = PRIVATE_KEY;
            ret = new google.auth.JWT(
                CLIENT_EMAIL,
                null,
                privateKey.replace(/\\n/g, '\n'),
                scope
            );

            // Store Token
            this.store.authScope[scope] = { 
                "key": scope, "lastAccessed": new Date(), "data": ret
            };
        }
        catch(ex){
            log.error(`Authenticating Google Account: ${ex}`);
        }

        return ret;
    }

    /* Search Cache Store For Key */
    searchCacheStore(storeName, key, checkDay=false){
        try {
            key = key.toLowerCase();
            if(!(storeName in this.store)) {
                /* Key is not in store */
                log.debug(`Unable to find ${storeName} in cacheStore`);
                return null;
            }
            
            let ret = this.store[storeName][key];
            if(!ret?.lastAccessed || !ret?.data){
                return null;
            }

            // Check if cache expired
            let expDt = fns.addHours(ret.lastAccessed, this.storeExpiration[storeName]);
            if(this.storeExpiration[storeName] > 0 && fns.isPast(expDt)){
                return null;
            } else if(checkDay && (!ret?.data?._genDate || !fns.isSameDay(ret?.data?._genDate, new Date()))) {
                return null;
            }

            return ret?.data;        
        }
        catch(ex){
            log.error(`Searching Cache [${storeName}]: ${ex}`);
            return null;
        }
    }

    /* Update Cache Store Local & Backup DB */
    updateCacheStore(storeName, key, data){
        let status = true;
        try {
            if(!(storeName in this.store)) {
                /* Key is not in store */
                /*log.error(`Unable to find ${storeName} in cacheStore`);*/
                return false;
            }
            else if(!data){
                /* Key is not in store */
                /*log.error(`No Data To Update/Insert`);*/
                return false;
            }

            key = key.toLowerCase();
            this.store[storeName][key] = { 
                "key": key, "lastAccessed": new Date(), "data": data
            };
            log.debug(`Added [${key}] to [${storeName}] cache`);
        }
        catch(ex){
            log.error(`Updating Cache [${storeName}]: ${ex}`);
            status = false;
        }

        return status;
    }

    removeCacheStoreKey(storeName, key){
        try {
            key = key.toLowerCase();
            if(!(storeName in this.store)) {
                /* Key is not in store */
                log.debug(`Unable to find ${storeName} in cacheStore`);
                return null;
            }
            
            let ret = this.store[storeName][key];
            if(ret){
                delete this.store[storeName][key]
            }

            return true;        
        }
        catch(ex){
            log.error(`Searching Cache [${storeName}]: ${ex}`);
            return false;
        }
    }

    clearCacheStore(){
        try {
            let objKey = Object.keys(this.store), self = this;

            objKey.forEach((obj) => {
                self.store[obj] = {}
            });
        }
        catch(ex){
            log.error(`Clearing Cache: ${ex}`);
        }
    }
}

module.exports = CacheStore;