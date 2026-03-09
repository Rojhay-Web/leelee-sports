require('dotenv').config();
const { ObjectId } = require('mongodb');

const _ = require('lodash');

const log = require('../log.service');
const util = require('../../utils/util');

const { dbClient: client } = require('../blueprint/db.service');
const gIconList = require('../../utils/google_icon_list.json');

const { DatabaseName } = process.env;

const appTables = {
    "league_sports":true, "ls_locations":true
};

const appRemoveTables = {
    "ls_store_items":true, "ls_locations":true,
    "ls_organizations":true, "ls_users":true,
    "ls_quotes":true
};

const league_store_config = {
    "leagues":{
        "default_sort": {
            "active":{ "details.end_dt": 1 },
            "inactive":{ "details.end_dt": -1 }
        },
        "search_subquery": {
            "active": { 
                // $gt: [{ $dateFromString: { dateString: '$details.end_dt' } }, new Date()]
                $gt: ['$details.end_dt', Date.now()]
            },
            "inactive": {
                // $lte: [{ $dateFromString: { dateString: '$details.end_dt' } }, new Date()]
                $lte: ['$details.end_dt', Date.now()]
            }
        }
    },
    "apparel":{
        "default_sort": {
            "active":{},
            "inactive":{}
        },
        "search_subquery":{ 
            "active":{},
            "inactive":{}
        }
    }
}

module.exports = {
    getGoogleIcons: async function(query=''){
        try {
            const retList = gIconList.filter((g) => {
                const dynamicRegex = new RegExp(query, 'i');
                return query?.length === 0 || dynamicRegex.test(g.name);
            }).sort((a,b) => b.popularity - a.popularity);

            return { results: retList };
        } catch(ex){
            log.error(`Getting Google Icon List: ${ex}`);
            return { 'error': 'Getting Google Icon List [E00]'};
        }
    },
    getAppTable: async function(table){
        try {
            if(!(table in appTables)){
                return { error: "Invalid Table" };
            }

            const collection = await dbCollection(table);
            if(collection == null){
                return { error: "Unable to connect to DB [Please contact site admin]"};
            }

            const appData = await collection.find({}).toArray();
            return { results: appData};
        }
        catch(ex){
            log.error(`Getting All By Table: ${ex}`);
            return { 'error': 'Getting All By Table [E00]'};
        }
    },
    // League Sports
    upsertLeagueSport: async function(_id=null, title=null, icon=null, description=null, active=null){
        try {
            const collection = await dbCollection("league_sports");
            if(collection == null){
                return { "error": "Unable to connect to DB [Please contact site admin]"};
            }

            
            // UPDATE Existing League Sport
            if(_id){
                /* Check if League Sport Exists By ID */
                const query = { _id: new ObjectId(_id) };
                const findSport = await collection.findOne(query);

                if(!findSport){
                    return { error: `Sport DNE` };
                }

                // Update League Sport                
                let setDict = { 
                    ...(title ? { title: title } : {}), 
                    ...(icon ? { icon: icon } : {}),
                    ...(description ? { description: description } : {}),
                    ...(active != null ? { active: active } : {}),
                };
                const result = await collection.updateOne(query, { $set: setDict});

                return { results: (result.matchedCount ? _id : null) };
            }

                 
            // Validate Sport Data
            let param_validation = util.validateValue([ 
                { type:"text", data: title, title: "title" }, 
            ]);

            if(param_validation.length > 0){
                return { error: `Missing Sport Data: ${param_validation.join(', ')}` };
            }

            // CREATE New League Sport
            const result = await collection.insertOne({ 
                title: title,
                icon: icon,
                description: description, 
                active: active != null ? active : false
            });

            return { results: (result?.insertedId ?? null) };             
        } catch(ex){
            log.error(`Upserting League Sport: ${ex}`);
            return { "error": `Upserting League Sport`};
        }
    },

    // League Store Config
    getStoreConfigs: async function(key=null){
        try {
            const collection = await dbCollection("ls_store_config");
            if(collection == null){
                return { "error": "Unable to connect to DB [Please contact site admin]"};
            }

            const configData = await collection.find({
                ...(key ? { key: key.toLowerCase() } : {})
            }).toArray();

            return { results: configData };
        } catch(ex){
            log.error(`Getting League Store Config: ${ex}`);
            return { "error": `Getting League Store Config`};
        }
    },
    updateLeagueStoreConfig: async function(_id, minimum=null, category=null, categorySet=null, addons=null){
        try {
            const collection = await dbCollection("ls_store_config");
            if(collection == null){
                return { "error": "Unable to connect to DB [Please contact site admin]"};
            }

            /* Check if League Sport Exists By ID */
            const query = { _id: new ObjectId(_id) };
            const findConfig = await collection.findOne(query);

            if(!findConfig){
                return { error: `League Config DNE` };
            }
             
            // Update League Sport                
            let setDict = {  
                ...(minimum ? { minimum: minimum } : {}),
                ...(category ? { category: category } : {}),
                ...(categorySet ? { categorySet: categorySet } : {}),
                ...(addons ? { addons: addons } : {})
            };
            const result = await collection.updateOne(query, { $set: setDict });

            return { results: (result.matchedCount ? _id : null) };
        } catch(ex){
            log.error(`Updating League Store Config: ${ex}`);
            return { "error": `Updating League Store Config`};
        }
    },

    // League Location
    upsertLeagueLocation: async function(_id=null, name=null, merchantInfo=null){
        try {
            const collection = await dbCollection("ls_locations");
            if(collection == null){
                return { "error": "Unable to connect to DB [Please contact site admin]"};
            }
            
            // UPDATE Existing League Location
            if(_id){
                /* Check if League Location Exists By ID */
                const query = { _id: new ObjectId(_id) };
                const findLocation = await collection.findOne(query);

                if(!findLocation){
                    return { error: `League Location DNE` };
                }

                // Update League Location                
                let setDict = { 
                    ...(name ? { name: name } : {}), 
                    ...(merchantInfo ? { merchantInfo: merchantInfo } : {})
                };

                const result = await collection.updateOne(query, { $set: setDict});
                return { results: (result.matchedCount ? _id : null) };
            }
                 
            // Validate Data
            let param_validation = util.validateValue([ 
                { type:"text", data: name, title: "name" }, 
            ]);

            if(param_validation.length > 0){
                return { error: `Missing Location Data: ${param_validation.join(', ')}` };
            }

            // CREATE New League Location
            const result = await collection.insertOne({ 
                name: name,
                ...(merchantInfo ? { merchantInfo: merchantInfo } : {})
            });

            return { results: (result?.insertedId ?? null) };             
        } catch(ex){
            log.error(`Upserting League Location: ${ex}`);
            return { "error": `Upserting League Location`};
        }
    },

    // Remove League Store Item
    deleteLeagueStoreFeatureItem: async function(id, type, photoSetId=null){
        try {
            if(!(type in appRemoveTables)){
                return { error: "Invalid Remove Type" };
            }

            const collection = await dbCollection(type);
            if(collection == null){
                return { "error": "Unable to connect to DB [Please contact site admin]"};
            }
            
            const result = await collection.deleteOne({ _id: new ObjectId(id) });

            // Remove photoset from photos
            if(photoSetId){
                const photoCollection = await dbCollection("photos");
                if(photoCollection !== null){
                    await photoCollection.updateMany(
                        { photosets: { $in: [photoSetId] } },
                        { $pull: { photosets: photoSetId } }
                    );   
                }
            }
            
            return { results: (result?.deletedCount ? true : false)};
        } catch(ex){
            log.error(`Delete League Store Item [${type}]: ${ex}`);
            return { "error": `Delete League Store Item [${type}]`};
        }
    },

    // Store Items
    storeItems: {
        search: async function(store_key=null, query=null, active=true, sortType=null, sortAsc=null, page=1, pageSize=15){
            try {
                const collection = await dbCollection("ls_store_items");
                if(collection == null){
                    return { "error": "Unable to connect to DB [Please contact site admin]"};
                }

                let safeQuery = _.escapeRegExp(query);
                const offset = ((page - 1) * pageSize);
                const sort = sortType && sortAsc != null ? 
                    { [sortType]: sortAsc ? 1 : -1 } : 
                    { ...(!(store_key in league_store_config) ? 
                        {} :
                        (active ? 
                            league_store_config[store_key].default_sort.active : 
                            league_store_config[store_key].default_sort.inactive 
                        )
                    )};
                                
                const colQuery = {
                    $expr: {
                        $and: [
                            {
                                $or: [
                                    { $regexMatch: { input: "$title", regex: safeQuery, options: "i" }},
                                    { $regexMatch: { input: "$description", regex: safeQuery, options: "i" }}
                                ]
                            },
                            {...(store_key ? { store_id: store_key } : {})},
                            {...(active ?
                                {
                                    $and:[
                                        { active: true },
                                        { ...(store_key in league_store_config ? league_store_config[store_key].search_subquery.active : {}) }
                                    ]
                                } :
                                {
                                    $or: [
                                        { $ne: [ '$active', true ]},
                                        { ...(store_key in league_store_config ? league_store_config[store_key].search_subquery.inactive : {}) }
                                    ]
                                }
                            )}
                        ]
                    }
                };
                
                const queryItems = await collection.aggregate([
                    { $match: colQuery},
                    // Join with league_sports table to get icon by sportid
                    { $addFields: { "details.sport_info_id": { "$toObjectId": "$details.sport_id" }}},
                    { 
                        $lookup: {  
                            from: "league_sports", 
                            localField: "details.sport_info_id", 
                            foreignField: "_id", 
                            as: "details.sport_info_list" 
                        }
                    },
                    // Replace the array with just the first element
                    { 
                        $addFields: {
                            'details.sport_info': { $arrayElemAt: ['$details.sport_info_list', 0] }
                        }
                    },
                    // Join with photos table to get photo list
                    { 
                        $lookup: {  
                            from: "photos", 
                            // localField: "store_item_id",
                            let:{ storeItemId: "$store_item_id" }, 
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $in:['$$storeItemId', '$photosets']
                                        }
                                    }
                                }
                            ], 
                            as: "photos" 
                        }
                    },

                    // Remove the original array field
                    { $project: { 'details.sport_info_list': 0 } },
                    // Skips the first N documents
                    { $skip: offset },  
                    // Limits the remaining documents to M          
                    { $limit: pageSize },
                    // Sort Document By Field
                    { $sort: { ...sort } },
                ]).toArray();

                const queryCount = await collection.countDocuments(colQuery);

                return { 
                    results: queryItems, totalResults: queryCount,
                    pagesLeft: util.hasPagesLeft(page, pageSize, queryCount) 
                };
            } catch(ex){
                log.error(`Searching League Store Items: ${ex}`);
                return { "error": `Searching League Store Items`};
            }
        },
        upsert: async function(id=null, item) {
            try {
                const collection = await dbCollection("ls_store_items");
                if(collection == null){
                    return { "error": "Unable to connect to DB [Please contact site admin]"};
                }

                // Validate Data
                let param_validation = util.validateValue([
                    { type:"text", data: item?.store_id, title: "store" }, 
                    { type:"text", data: item?.title, title: "title" },
                    { type:"number", data: item?.price_per_item, title: "price_per_item" }, 
                    { type:"number", data: item?.additional_set_price, title: "additional_set_price" }
                ]);

                if(param_validation.length > 0){
                    return { error: `Missing Required Field(s): ${param_validation.join(', ')}` };
                }

                // Standardize Data
                let setDict = cleanStoreItem(item);

                // UPDATE Existing League Store Item
                if(id){               
                    if("_id" in setDict) delete setDict._id;

                    const result = await collection.updateOne({ _id: new ObjectId(id) }, { $set: setDict});
                    return { results: (result.matchedCount ? id : null) };
                }
                
                // CREATE New League Store Item
                const result = await collection.insertOne(setDict);

                return { results: (result?.insertedId ?? null) }; 
            } catch(ex){
                log.error(`Upserting League Store Item: ${ex}`);
                return { "error": `Upserting League Store Item`};
            }
        }
    }
}

/* Private Functions */
async function dbCollection(conn_collection) {
    let collection = null;
    try {
        //await client.connect(); //log.debug(`Connected Successfully to server`);
        const db = client.db(DatabaseName);
        collection = db.collection(conn_collection);
    }
    catch(ex){
        log.error(`Connection to Database: ${ex}`);
    }

    return collection;
}

function cleanStoreItem(item) {
    let ret = { ...item };
    try {
        if(item?.details){
            if(item.details?.start_dt){
                const date = new Date(item.details.start_dt);
                const isValid = date instanceof Date && !isNaN(date.valueOf());

                item.details.start_dt = (isValid ? date.getTime() : null);
            }

            if(item.details?.end_dt){
                const date = new Date(item.details.end_dt);
                const isValid = date instanceof Date && !isNaN(date.valueOf());

                item.details.end_dt = (isValid ? date.getTime() : null);
            }
        }
    } catch(ex){
        log.error(`Cleaning Store Item: ${ex}`);
    }

    return ret;
}


/* Connection Clean Up */
const cleanup = (event) => {
    log.debug(`Closing Connection`);
    client.close(); process.exit(); 
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);