require('dotenv').config();
const { ObjectId } = require('mongodb');
const fns = require('date-fns');
const _ = require('lodash');

// REMOVE
const fs = require('fs');
const path = require('path');

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
            "active": [
                { active: true },
                { 'details.end_dt': { $gt: Date.now() } }
            ],
            "inactive": [
                { active: { $ne: true }},
                { 'details.end_dt': { $lte: Date.now() } }
            ]
        },
        "param_validations": function(item) {
            return [
                { type:"number", data: item?.minimum, title: "minimum" },
                { type:"number", data: item?.additional_set_price, title: "additional_set_price" }
            ];
        }
    },
    "apparel":{
        "default_sort": {
            "active":{ "active": 1 },
            "inactive":{ "active": -1 }
        },
        "search_subquery":{ 
            "active":[{ active: true }],
            "inactive":[{ active: { $ne: true }}]
        },
        "param_validations": function(item) { 
            return [
                { type:"number", data: item?.minimum, title: "minimum" },
            ]; 
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
                    ...(store_key ? { "store_id": store_key } : {}),
                    $or: [
                        { title: {'$regex': safeQuery, '$options' : 'i'} },
                        { description: {'$regex': safeQuery, '$options' : 'i'} },
                    ],
                    ...(active ? 
                        {
                            $and:[ ...(store_key in league_store_config ? 
                                league_store_config[store_key].search_subquery.active : 
                                [{ active: true }]) 
                            ]
                        } : 
                        {
                            $or: [ ...(store_key in league_store_config ? 
                                league_store_config[store_key].search_subquery.inactive : 
                                [{ active: { $ne: true } }]) 
                            ]
                        }
                    )
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
        upsert: async function(store_key= null, id=null, item) {
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
                    // Additional Store Validations based on individual store
                    ...(store_key ? (league_store_config[store_key]?.param_validations(item) ?? []) : [])
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
    },

    // Organizations
    organizations: {
        search: async function(query=null, sortType=null, sortAsc=null, page=1, pageSize=15){
            try {
                const collection = await dbCollection("ls_organizations");
                if(collection == null){
                    return { "error": "Unable to connect to DB [Please contact site admin]"};
                }

                let safeQuery = _.escapeRegExp(query);
                const offset = (page < 1 ? 0 : ((page - 1) * pageSize));
                const sort = sortType && sortAsc != null ? { [sortType]: sortAsc ? 1 : -1 } : null;

                const colQuery = {
                    name: {'$regex': safeQuery, '$options' : 'i'}
                };

                const aggList = [
                    { $match: colQuery },
                    // Skips the first N documents
                    { $skip: offset }
                ];

                // Limits the remaining documents to M
                if(page > 0) {
                    aggList.push({ $limit: pageSize });
                }

                // Sort Document By Field
                if(sort){
                    aggList.push({ $sort: { ...sort } });
                }

                const queryItems = await collection.aggregate(aggList).toArray();

                const queryCount = await collection.countDocuments(colQuery);

                return { 
                    results: queryItems, totalResults: queryCount,
                    pagesLeft: util.hasPagesLeft(page, pageSize, queryCount) 
                };
            } catch(ex){
                log.error(`Searching League Organizations: ${ex}`);
                return { "error": `Searching League Organizations`};
            }
        },
        upsert: async function(id=null, item) {
            try {
                const collection = await dbCollection("ls_organizations");
                if(collection == null){
                    return { "error": "Unable to connect to DB [Please contact site admin]"};
                }

                // Validate Data 
                let param_validation = util.validateValue([
                    { type:"text", data: item?.name, title: "name" }, 
                    { type:"text", data: item?.address, title: "address" },
                    { type:"text", data: item?.city, title: "city" }, 
                    { type:"text", data: item?.state, title: "state" },
                    { type:"text", data: item?.zip, title: "zip" } 
                ]);

                if(param_validation.length > 0){
                    return { error: `Missing Required Field(s): ${param_validation.join(', ')}` };
                }

                // UPDATE Existing League Store Organization
                if(id){               
                    if("_id" in item) delete item._id;

                    const result = await collection.updateOne({ _id: new ObjectId(id) }, { $set: item});
                    return { results: (result.matchedCount ? id : null) };
                }
                
                // CREATE New League Store Organization
                const result = await collection.insertOne(item);

                return { results: (result?.insertedId ?? null) }; 
            } catch(ex){
                log.error(`Upserting League Store Organization: ${ex}`);
                return { "error": `Upserting League Store Organization`};
            }
        }
    },
    users: {
        search: async function(query=null, sortType=null, sortAsc=null, page=1, pageSize=15){
            try {
                const collection = await dbCollection("ls_users");
                if(collection == null){
                    return { "error": "Unable to connect to DB [Please contact site admin]"};
                }

                let safeQuery = _.escapeRegExp(query);
                const offset = (page < 1 ? 0 : ((page - 1) * pageSize));
                const sort = sortType && sortAsc != null ? { [sortType]: sortAsc ? 1 : -1 } : null;

                const colQuery = {
                    $or: [
                        { "blueprint_user.name": {'$regex': safeQuery, '$options' : 'i'} },
                        { "blueprint_user.email": {'$regex': safeQuery, '$options' : 'i'} },
                    ]
                };

                const queryItems = await collection.aggregate([
                    // Join with league_sports table to get icon by sportid
                    { $addFields: { "full_blueprint_id": { "$toObjectId": "$blueprint_id" }}},
                    { 
                        $lookup: {  
                            from: "users", 
                            localField: "full_blueprint_id", 
                            foreignField: "_id", 
                            as: "blueprint_user_list" 
                        }
                    },
                    // Replace the array with just the first element
                    { 
                        $addFields: {
                            'blueprint_user': { $arrayElemAt: ['$blueprint_user_list', 0] }
                        }
                    },
                    // Remove the lookup fields
                    { $project: { 'blueprint_user_list': 0, 'full_blueprint_id': 0 } },

                    // Search Users if Query exists
                    { $match: colQuery },
                    // Skips the first N documents
                    { $skip: offset }, 
                    // Limits the remaining documents to M          
                    ...((page > 0) && { $limit: pageSize }),
                    // Sort Document By Field
                    ...(sort && { $sort: { ...sort } }),
                ]).toArray();

                const queryCount = await collection.countDocuments(colQuery);

                return { 
                    results: queryItems, totalResults: queryCount,
                    pagesLeft: util.hasPagesLeft(page, pageSize, queryCount) 
                };
            } catch(ex){
                log.error(`Searching League Users: ${ex}`);
                return { "error": `Searching League Users`};
            }
        },
        getById: async function(_id){
            try {
                const collection = await dbCollection("ls_users");
                if(collection == null){
                    return { "error": "Unable to connect to DB [Please contact site admin]"};
                }

                const findUser = await collection.aggregate([
                    { $match: { blueprint_id: _id } },
                    // Join with Users Table
                    { $addFields: { "blueprint_user_id": { "$toObjectId": "$blueprint_id" }}},
                    { 
                        $lookup: {  
                            from: "users", 
                            localField: "blueprint_user_id", 
                            foreignField: "_id", 
                            as: "blueprint_user_list" 
                        }
                    },
                    // Replace the array with just the first element
                    { 
                        $addFields: {
                            'blueprint_user': { $arrayElemAt: ['$blueprint_user_list', 0] }
                        }
                    },
                    // Remove additional fields
                    { 
                        $project: { 
                            'blueprint_user_id':0,
                            'blueprint_user_list': 0,
                            // Blue Print User Protected Data
                            'blueprint_user.verified_email':0,
                            'blueprint_user.registration_date':0,
                            'blueprint_user.id':0,
                            'blueprint_user.roles':0,
                            'blueprint_user.scopes':0,
                        } 
                    },  
                    // Limit to a single result
                    { $limit: 1 }          
                ]).toArray();

                return { results: findUser?.length > 0 ? findUser[0] : null };
            } catch(ex){
                log.error(`Getting League User By Id: ${ex}`);
                return { "error": `Getting League User By Id`};
            }
        },
        upsert: async function(blueprint_id=null, item) {
            try {
                const collection = await dbCollection("ls_users");
                if(collection == null){
                    return { "error": "Unable to connect to DB [Please contact site admin]"};
                }

                // Validate Data 
                let param_validation = util.validateValue([
                    { type:"text", data: item?.blueprint_id, title: "blueprint_id" }
                ]);

                if(param_validation.length > 0){
                    return { error: `Missing Required Field(s): ${param_validation.join(', ')}` };
                }

                // Check if user exists
                const userQuery = { blueprint_id: blueprint_id };
                const findUser = await collection.findOne(userQuery);

                // Standardize Data
                let setDict = cleanStoreUser(item);

                // UPDATE Existing League Store User
                if(findUser){               
                    if("_id" in setDict) delete setDict._id;

                    const result = await collection.updateOne(userQuery, { $set: setDict});
                    return { results: (result.matchedCount ? result?.upsertedId : null) };
                }
                
                // CREATE New League Store User
                const result = await collection.insertOne(setDict);

                return { results: (result?.insertedId ?? null) }; 
            } catch(ex){
                log.error(`Upserting League Store User: ${ex}`);
                return { "error": `Upserting League Store User`};
            }
        }
    },

    // Purchase Order
    purchaseOrder: {
        submit: async function(user_id, purchase_order){
            try {
                // Get League Store User Id
                const collection = await dbCollection("ls_users");
                if(collection == null){
                    return { "error": "Unable to connect to DB [Please contact site admin]"};
                }

                user_id = user_id ? user_id.toString() : user_id;
                const findUser = await collection.findOne({ blueprint_id: user_id });

                if(!findUser){
                    return { "error": "Invalid League User"};
                }

                // Current User
                const current_user = findUser;

                // Get Quote DB
                const quote_collection = await dbCollection("ls_quotes");
                if(quote_collection == null){
                    return { "error": "Unable to connect to DB [Please contact site admin]"};
                }

                // TODO: Validate purchase_order object

                // Build Object Values
                purchase_order.status = 'NEW';
                purchase_order.ls_user_id = current_user._id.toString();
                purchase_order.invoice_number = await getNextInvoiceNum();
                purchase_order.status_date = (new Date()).getTime();
                purchase_order.creation_date = (new Date()).getTime();

                // Insert New Purchase Order Quote
                const result = await quote_collection.insertOne(purchase_order);

                if(result.insertedId){
                    // TODO: Send Email About New Quote
                    return { results: result.insertedId };
                } 

                log.error(`Submitting Purchase Order [E01]`);
                return { "error": `Unable to submit quote please contact system admin`};
            } catch(ex){
                log.error(`Submitting Purchase Order: ${ex}`);
                return { "error": `Submitting Purchase Order`};
            }
        },
        download: async function(current_user, invoice_id, is_invoice=false, line_item_filter=[]){
            try {
                // Get Quote 
                const collection = await dbCollection("ls_quotes");
                if(collection == null){
                    return { "error": "Unable to connect to DB [Please contact site admin]"};
                }

                // Find Quote
                const user_id = current_user?._id ? current_user?._id.toString() : null;

                const findQuote = await collection.aggregate([
                    // Join with Users Table
                    { $addFields: { "ls_user_obj_id": { "$toObjectId": "$ls_user_id" }}},
                    { 
                        $lookup: {  
                            from: "ls_users", 
                            localField: "ls_user_obj_id", 
                            foreignField: "_id", 
                            as: "ls_user_list" 
                        }
                    },
                    // Replace the array with just the first element
                    { 
                        $addFields: {
                            'ls_user': { $arrayElemAt: ['$ls_user_list', 0] }
                        }
                    },
                    // Join with User with Organization Table
                    { $addFields: { "ls_user.organization_obj_id": { "$toObjectId": "$ls_user.organization_id" }}},
                    { 
                        $lookup: {  
                            from: "ls_organizations", 
                            localField: "ls_user.organization_obj_id", 
                            foreignField: "_id", 
                            as: "ls_user.organizations" 
                        }
                    },

                    // Find Invoice
                    { $match: { _id: new ObjectId(invoice_id), 'ls_user.blueprint_id': user_id  } },
                ]).toArray();

                if(!(findQuote?.length > 0)){
                    return { "error": "Unable to find quote"};
                }

                return _buildInvoice(current_user, findQuote[0], is_invoice, line_item_filter);
            } catch(ex){
                log.error(`Downloading Invoice: ${ex}`);
                return { error:"Downloading Invoice: Please contact system admin [E-GP00]" };
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

async function getNextInvoiceNum(){
    let default_num = 6000;
    try {

        // Get Collection
        const collection = await dbCollection("ls_quotes");
        if(collection == null){
            return default_num;
        }

        // Get Largest Invoice Number
        const result = await collection.find({}).sort({ invoice_number: -1}).limit(1).toArray();
        
        if(result.length > 0){
            return result[0].invoice_number + 1;
        } else {
            return default_num;
        }
    }
    catch(ex){
        log.error(`Getting Next Invoice Number: ${ex}`);
        return default_num;
    }
    //finally { await client.close(); }
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

function cleanStoreUser(item) {
    let ret = { ...item };
    try {
        delete ret?.blueprint_user;
        delete ret?.blueprint_user_list;
        delete ret?.full_blueprint_id;
    } catch(ex){
        log.error(`Cleaning Store User: ${ex}`);
    }

    return ret;
}

function _buildInvoice(current_user, quote, is_invoice, line_item_filter=[]) {
    try {
        /* Styles */
        let pdf_styles = [
            "html { -webkit-print-color-adjust: exact; } body { margin:0; }",
            ".invoice-container { display: flex; flex-direction: column; color: #000; } .invoice-container .invoice-header { display: flex; flex-direction: row; justify-content: space-between; border-top: 10px solid #000; background: #c8c8c8; padding: 10px 2%; } .invoice-container .invoice-header .header-section { display: flex; flex-direction: row; } .invoice-container .invoice-header .header-section img { width: 75px; height: 75px; border-radius: 50%; margin: auto 20px auto 0; } .invoice-container .invoice-header .header-section .no-logo { width: 75px; height: 75px; border-radius: 8px; margin-right: 10px; background: rgba(50,50,50,1); position: relative; } .invoice-container .invoice-header .header-section .sender-details { display: flex; flex-direction: column; } .invoice-container .invoice-header .header-section h1 { color: #646464; margin: 0; font-size: 24px; } .invoice-container .invoice-header .header-section h2 { color: #323232; margin: 0; } .invoice-container .invoice-body { display: flex; flex-direction: column; padding: 10px 2%; } .invoice-container .invoice-body .billing-info { display: flex; flex-direction: column; } .invoice-container .invoice-body .billing-info h3 { font-size: 1.3rem; margin: 0; border-bottom: 1px solid #000; padding: 5px 0; }",
            ".invoice-container .invoice-body .billing-info span { margin-left: 5px; } .invoice-container .invoice-body .invoice-data-container { width: 100%; margin-top: 10px; } .invoice-container .invoice-body .invoice-data-container table { width: 100%; border: 1px solid #202020; border-collapse: collapse; } .invoice-container .invoice-body .invoice-data-container table thead tr { background: #000; color: #fff; } .invoice-container .invoice-body .invoice-data-container table thead tr th { padding: 5px; text-align: center; background: #c8c8c8; } .invoice-container .invoice-body .invoice-data-container table tbody tr td { padding: 5px; border-top: 1px solid #000; } .invoice-container .invoice-body .invoice-data-container table tbody tr td p { margin: 0; font-weight: bold; } .invoice-container .invoice-body .invoice-data-container table tbody tr td .item-details { padding-left: 5px; } .invoice-container .invoice-body .invoice-data-container table tbody tr td .item-details .item-line { display: flex; flex-direction: row; font-size: 0.8rem; } .invoice-container .invoice-body .invoice-data-container table tbody tr td .item-details .item-line span { color: #323232; margin-right: 4px; } .invoice-container .invoice-body .invoice-data-container table tbody tr td .item-details .item-line .spacer { margin-left: 8px; }",
            ".invoice-container .invoice-body .invoice-data-container table tbody tr td .line-note { font-size: 0.8rem; color: #323232; justify-content: center; display: flex; flex-direction: row; background: rgba(147, 36, 50, 0.3); padding: 4px; border-radius: 8px; margin-top: 4px; } .invoice-container .invoice-body .invoice-data-container table tbody tr td .line-note span { width: 1rem; height: 1rem; background: rgba(147, 36, 50, 1); border-radius: 50%; color: #fff; text-align: center; display: flex; flex-direction: column; justify-content: center; margin-left: 10px; } .invoice-container .invoice-body .invoice-data-container table tbody tr td.ctr { text-align: center; } .invoice-container .invoice-body .invoice-data-container table tbody tr td.right { text-align: right; } .invoice-container .invoice-body .invoice-data-container table tbody tr td + td { border-left: 1px solid #202020; } .invoice-container .invoice-body .invoice-data-container table tbody tr:nth-child(even) { background: rgba(226, 224, 229, 0.7) !important; } .invoice-container .invoice-body .invoice-data-container table tbody tr + .empty-row { background: #fff; border-top: 1px solid #202020; border-bottom: 1px solid #202020; }",
            ".invoice-container .invoice-body .invoice-data-container table tbody tr + .total-row { background: rgba(147, 36, 50, 0.3) !important; color: #000; font-weight: bold; } .invoice-container .invoice-body .invoice-data-container table tbody tr + .total-row td { border: none; } .invoice-container .invoice-details { margin: 50px 0; padding: 0 2%; } .invoice-container .invoice-details .section-title { padding: 10px 2%; margin-bottom: 10px; background: #c8c8c8; color: #646464; border: 1px solid #000; border-top: 10px solid #000; } .invoice-container .invoice-details .section-title h2, .invoice-container .invoice-details .section-title p { margin: 0; } .invoice-container .invoice-details .detail-container { display: flex; flex-direction: column; } .invoice-container .invoice-details .detail-container .detail-line { display: flex; flex-direction: row; padding: 5px 0; border-top: 1px solid #202020; } .invoice-container .invoice-details .detail-container .detail-line .item-num { height: 2rem; width: 2rem; font-size: 1.3rem; border-radius: 50%; text-align: center; display: flex; flex-direction: column; justify-content: center; background: rgba(147, 36, 50, 0.5); color: #fff; margin: auto 10px auto 0; }",
            ".invoice-container .invoice-details .detail-container .detail-line .img-container { height: 100px; overflow: hidden; display: flex; flex-direction: column; justify-content: center; } .invoice-container .invoice-details .detail-container .detail-line .img-container img { height: 100%; border-radius: 5px; } .invoice-container .invoice-details .detail-container .detail-line .img-container span { color: #ccc; font-size: 1.5rem; } .invoice-container .invoice-details .detail-container .detail-line .item-details { padding-left: 10px; display: flex; flex-direction: column; justify-content: center; } .invoice-container .invoice-details .detail-container .detail-line .item-details .item-line { display: flex; flex-direction: row; font-size: 0.8rem; } .invoice-container .invoice-details .detail-container .detail-line .item-details .item-line span { color: #323232; margin-right: 4px; } .invoice-container .invoice-details .detail-container .personalization-list table { min-width: 50%; } .invoice-container .invoice-details .detail-container .personalization-list table .table-header { background: rgba(147, 36, 50, 1); color: #fff; }",
            ".invoice-container .invoice-details .detail-container .personalization-list table th, .invoice-container .invoice-details .detail-container .personalization-list table td { padding: 5px 10px; text-align: center; } .invoice-container .invoice-details .detail-container .personalization-list table tbody tr:nth-child(even) { background: rgba(226, 224, 229, 0.7) !important; } .invoice-container .invoice-header .header-section .sender-details .quote-date { margin-top: auto; font-weight: bold; } .invoice-container .invoice-details .detail-container .personalization-list table tbody tr .table-idx { color: rgba(200,200,200,1); font-weight: bold; width: 20px; } .invoice-container .invoice-details .detail-container .personalization-list { padding-left: calc(2rem + 10px); }",
            ".invoice-container .invoice-body .invoice-data-container table tbody tr + .sub-total-row { background: rgba(147, 36, 50, 0.1) !important; color: #000; font-weight: bold; } .invoice-container .invoice-body .invoice-data-container table tbody tr + .sub-total-row td { border-color: #fff; white-space: nowrap; } .invoice-container .invoice-body .invoice-data-container table tbody tr .init-cell { border-left: 1px solid #202020; }",
            ".invoice-container .invoice-body .invoice-data-container table tbody tr td .multi-container { display: flex; flex-direction: column; } .invoice-container .invoice-body .invoice-data-container table tbody tr td .multi-container .row-sub-title { font-weight: bold; padding: 0 4px; } .invoice-container .invoice-body .invoice-data-container table tbody .discount td { color: rgba(147, 36, 50, 1); } .invoice-container .invoice-body .invoice-data-container table tbody tr td .item-details .detail-item-line { font-size: 0.8rem; font-style: italic; max-width: 500px; }"
        ];

        // TODO: Build Filtered Invoice if line_items passed
        let filter_invoice = {
            line_items: quote?.line_items,
            core_sub_total: quote.core_sub_total,
            addon_sub_total: quote?.addon_sub_total,
            total: quote.total,
            discount: quote?.discount
        };

        if(line_item_filter.length > 0){
            let tmp_item_list = [], 
                tmp_core_sub_total = 0, 
                tmp_addon_sub_total = 0,
                tmp_discount_total = 0;
            
            // Build Filtered Invoice List
            for(let i=0; i < line_item_filter.length; i++){
                let item_number = parseInt(line_item_filter[i]);

                if(item_number < quote?.line_items.length) {
                    tmp_item_list.push(quote.line_items[item_number]);

                    // Increment Sub-Totals
                    const tmp_sub_details = _calcLineItemRow(quote.line_items[item_number]);
                    
                    tmp_core_sub_total += tmp_sub_details.core_total;
                    tmp_addon_sub_total += tmp_sub_details.addon_total;
                }
            }

            // Set Filter Invoice Details
            filter_invoice.line_items = tmp_item_list;

            // Build Filter Discount Total
            if(quote?.discount?.total && quote?.discount?.percentage) {
                tmp_discount_total = -(tmp_core_sub_total * (quote.discount.percentage / 100));
                filter_invoice.discount.total = tmp_discount_total;
            }

            filter_invoice.core_sub_total = tmp_core_sub_total;
            filter_invoice.addon_sub_total = tmp_addon_sub_total;

            filter_invoice.total = (tmp_core_sub_total + tmp_discount_total) + tmp_addon_sub_total;
        }

        // Build Header - Meta Data
        const merchant_info = quote?.ls_user?.organizations?.length > 0 ?
            quote?.ls_user?.organizations[0].merchantInfo.find((m) => m.store_id === quote.type) :
            null;

        const invoice_sub_title = merchant_info && merchant_info?.subText ?
            merchant_info.subText.split(new RegExp(/(?:\r\n|\r|\n)/g)) : null;
        
        const invoice_img = merchant_info && merchant_info?.defaultLogo === true ?
            '<img src="https://www.leeleeff.com/imgs/logo/leeleekiddz_logo.jpg" />' :
            '<img class="no-logo"/>';
        let show_details = false;

        // Build Header - HTML
        const invoice_header = `
            <div class='invoice-header' style='background: #c8c8c8;'>
                <div class='header-section'>
                    ${invoice_img}
                    <div className="sender-details">
                        <h2>${merchant_info?.title ?? 'Lee Lee Kiddz.'}</h2>
                        ${invoice_sub_title.map(function(item){ return `<div>${item}</div>`; }).join("")}
                    </div>
                </div>

                <div class='header-section'>
                    <div class='sender-details'>
                        <h1>${is_invoice == true || quote.status === "COMPLETED" ? "INVOICE":"QUOTE"}</h1>
                        <span>${is_invoice == true || quote.status === "COMPLETED" ? "Invoice":"Quote"} Number: ${(line_item_filter?.length > 0 ? `0${line_item_filter.join('')}` : '')}${quote.invoice_number}</span>
                        ${quote.status === "COMPLETED" ?
                            `<span class='quote-date'>${fns.format(new Date(quote.status_date),'MM/dd/yyyy')}</span>` :
                            `<span class='quote-date'>${fns.format(new Date(quote.creation_date),'MM/dd/yyyy')}</span>`
                        }    
                    </div>
                </div>
            </div>
        `;

        // Build Body - Meta Data
        let table_data = [];
        filter_invoice.line_items.forEach(function(item,i){
            const start_dt = item?.store_item?.details?.start_dt ? fns.format(new Date(item?.store_item?.details?.start_dt),'MM/dd/yyyy') : '';
            const end_dt = item?.store_item?.details?.end_dt ? fns.format(new Date(item?.store_item?.details?.end_dt ),'MM/dd/yyyy') : '';
            const row_sub_details = _calcLineItemRow(item);

            if(item?.store_item?.details?.customDesign) { show_details = true; }

            let tmp_tr = `
                <tr>
                    <td class='ctr' rowspan="${(row_sub_details?.addondetails?.length > 0) ? '2' : '1'}">${i+1}</td>
                    <td class='item-cell info left'>
                        <p>${item?.store_item?.title}</p>
                        <div class='item-details'>
                            ${item?.store_item?.store_id === 'leagues' ?
                                `<div class='item-line'>
                                    <span>Start Date:</span>
                                    ${start_dt}
                                    <span class='spacer'>End Date:</span>
                                    ${end_dt}
                                </div>` : ''
                            }
                            ${item?.item_additional_details?.length > 0 ?
                                `<div class='detail-item-line'>
                                    <span>${item.item_additional_details}</span>
                                </div>` : ''
                            }

                            ${item?.design_name ?
                                `<div class='item-line'>
                                    <span>Team Name:</span>
                                    ${item.design_name}
                                </div>` : ''
                            }

                            ${item?.design_description ?
                                `<div class='item-line'>
                                    <span>Notes:</span>
                                    ${item.design_description}
                                </div>` : ''
                            }
                            
                            ${item?.store_item?.details?.customDesign ?
                                `<div class='line-note'>
                                    See Custom Details Below
                                    <span>${(i+1)}</span>
                                </div>` : ''
                            }
                        </div>
                    </td>
                    <!-- Quantity -->
                    <td class='right'>
                        <div class="multi-container">
                            ${row_sub_details?.subdetails?.map((sd) => {
                                return `<div>${sd.count}</div>`;
                            }).join(" ")}
                        </div>
                    </td>
                    <!-- Per Price -->
                    <td class='right'>
                        <div class="multi-container">
                            ${row_sub_details?.subdetails?.map((sd) =>{
                                return `<div>${currencyFormat(sd.price)}</div>`;
                            }).join(" ")}
                        </div>
                    </td>
                    <!-- Line Price -->
                    <td class='right'>${currencyFormat(row_sub_details.core_total)}</td>
                </tr>
            `;
            table_data.push(tmp_tr);

            if(row_sub_details?.addondetails?.length > 0){
                let tmp_ad_tr = `
                    <tr>
                        <!-- Empty TD cause of rowspan -->
                        <td class='item-cell info left init-cell'>
                            <div class="multi-container">
                                ${row_sub_details?.addondetails?.map((sd) =>{
                                    return `<div class="row-sub-title">${sd.title}</div>`;
                                }).join(" ")}
                            </div>
                        </td>

                        <!-- Quantity -->
                        <td class='right'>
                            <div class="multi-container">
                                ${row_sub_details?.addondetails?.map((sd) =>{
                                    return `<div>${sd.count}</div>`;
                                }).join(" ")}
                            </div>
                        </td>

                        <!-- Per Price -->
                        <td class='right'>
                            <div class="multi-container">
                                ${row_sub_details?.addondetails?.map((sd) =>{
                                    return `<div>${currencyFormat(sd.price)}</div>`;
                                }).join(" ")}
                            </div>
                        </td>

                        <!-- Line Price -->
                        <td class='right'>${currencyFormat(row_sub_details.addon_total)}</td>
                    </tr>
                `;
                table_data.push(tmp_ad_tr);
            }
        });

        // Build Body - HTML
        const invoice_body = `
            <div class='invoice-body'>
                <div class='billing-info'>
                    <h3>Bill To</h3>
                    ${(quote?.ls_user) ?
                        `<span>${current_user?.name}</span>
                         <span>${quote?.ls_user?.sub_org_name}</span>` : ''
                    }

                    ${(quote?.ls_user?.organizations?.length > 0) ?
                        `<span>${quote.ls_user.organizations[0].address}</span>
                        <span>${quote.ls_user.organizations[0].city}, ${quote.ls_user.organizations[0].state} ${quote.ls_user.organizations[0].zip}</span>` :
                        ''
                    }
                </div>
                <div class='invoice-data-container'>
                    <table>
                        <thead>
                            <tr>
                                <th style="background: #000;">Item #</th>
                                <th style="background: #000;" class='item-cell'>Item</th>
                                <th style="background: #000;">Quantity</th>
                                <th style="background: #000;">Price</th>
                                <th style="background: #000;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${table_data.join(" ")}
                            <tr class='empty-row'><td colspan="5" /></tr>

                            <!-- Sub Total -->
                            <tr class='sub-total-row'>
                                <td colspan="3" />
                                <td class='right'>Sub-Total</td>
                                <td class='right'>${currencyFormat(filter_invoice?.core_sub_total)}</td>
                            </tr>

                            <!-- Discounts -->
                            ${(filter_invoice?.discount && filter_invoice?.discount?.percentage) ?
                                `<tr class='sub-total-row discount'>
                                    <td colspan="3" />
                                    <td class='right'>Discount</td>
                                    <td class='right'>-${currencyFormat(filter_invoice?.discount?.total)} (${filter_invoice?.discount?.percentage}%)</td>
                                </tr>` : ''
                            }

                            <!-- Addon Sub Total -->
                            ${(filter_invoice?.addon_sub_total > 0) ?
                                `<tr class='sub-total-row'>
                                    <td colspan="3" />
                                    <td class='right'>Addon Item(s) Sub-Total:</td>
                                    <td class='right'>${currencyFormat(filter_invoice?.addon_sub_total)}</td>
                                </tr>` : ''
                            }

                            <!-- Total -->
                            <tr class='total-row'>
                                <td colspan="3" />
                                <td class='right'>Total</td>
                                <td class='right'>${currencyFormat(filter_invoice.total)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        // Build Details - HTML
        const invoice_details = `
            <div class='invoice-details'>
                <div class='section-title'>
                    <h2>Item Details</h2>
                    <p>The following details are assumed to be correct for spelling, size, details, and quantity.  Please contact us immediatly if anything is incorrect.</p>
                </div>

                <div class='detail-container'>
                    ${filter_invoice?.line_items.map((item, idx) => {
                        if(!item?.store_item?.details?.customDesign) return '';

                        return `
                            <div class='detail-line-container'>
                                <div class='detail-line'>
                                    <div class='item-num'>${(idx + 1)}</div>
                                    <div class='img-container'>
                                        ${item?.design_img ?
                                            `<img src="${item.design_img}" />` :
                                            `<span>No Image</span>`
                                        }
                                    </div>
                                    <div class='item-details'>
                                        ${item?.design_name ? 
                                            `<div class='item-line'>
                                                <span>Team Name:</span>
                                                ${item?.design_name}
                                            </div>`
                                            : ''
                                        }

                                        ${item?.design_description ? 
                                            `<div class='item-line'>
                                                <span>Notes:</span>
                                                ${item?.design_description}
                                            </div>` 
                                            : ''
                                        }
                                    </div>
                                </div>

                                <div class='personalization-list'>
                                    <table>
                                        <thead>
                                            <tr class='table-header'>
                                                <th></th>
                                                <th>#</th>
                                                <th>Name</th>
                                                <th>${item?.store_item?.category}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${item?.custom_item_list?.map(function (detail, i){
                                                return(`
                                                    <tr>
                                                        <td class="table-idx">${i+1}</td>
                                                        <td>${detail?.item_number}</td>
                                                        <td>${detail?.item_title}</td>
                                                        <td>${detail?.item_category_sel}</td>
                                                    </tr>
                                                `);
                                            }).join("")}
                                        </tbody>
                                    </table>
                                <div>
                            </div>
                        `;
                    }).join("")}
                </div>
            </div>
        `;

        /* Final Temmplate*/
        let html_template = `
            <style>${pdf_styles.join(" ")}</style>
            <div class='invoice-container'>
                ${invoice_header}
                ${invoice_body}
                ${show_details ? invoice_details : ''}
            </div>
        `;

        // REMOVE Test Build
        const outPath = path.resolve('./docs/invoice', 'template.html');
        fs.writeFileSync(outPath, html_template, 'utf8');

        return { results: true };
    } catch(ex){
        log.error(`Building Invoice: ${ex}`);
        return { error: 'Building Invoice' };
    }
}

function _calcLineItemRow(lineItem){
    const tmpDetails = { core_total: 0, addon_total: 0, subdetails: [], addondetails:[] };

    try {    
        if(lineItem?.store_item?.store_id === "leagues") {
            // Min Price
            const item_min = lineItem?.store_item?.minimum ?? 0,
                to_min_price = lineItem?.store_item?.price_per_item ?? 0;

            tmpDetails.subdetails.push({
                title:"Minimum Participants",
                count: item_min,
                price: to_min_price
            });

            tmpDetails.core_total = item_min * to_min_price;

            // Post Min Price
            const post_min_price = lineItem?.store_item?.additional_set_price ?? 0,
                post_min_count = (lineItem?.item_count ?? 0) - item_min;

            if(post_min_count > 0) {
                tmpDetails.core_total += (post_min_count * post_min_price);

                tmpDetails.subdetails.push({
                    title:"Additional Participants",
                    count: post_min_count,
                    price: post_min_price
                });
            }

            // Include AddOns
            if(lineItem?.add_on_list && lineItem?.add_on_list?.length > 0){
                lineItem?.add_on_list.forEach((ad) => {
                    const add_on_store_item = lineItem?.store_item?.addons ? 
                        lineItem?.store_item?.addons.find((ad2) => ad2.title === ad.title) :
                        null;
                    
                    if(add_on_store_item && ad?.count && add_on_store_item?.price) {
                        tmpDetails.addon_total += (ad.count * add_on_store_item.price);
                    }

                    tmpDetails.addondetails.push({
                        title: ad?.title,
                        count: ad?.count,
                        price: add_on_store_item?.price
                    });
                });
            }
        } else if(lineItem?.store_item?.store_id === "apparel"){
            const item_price = lineItem?.store_item?.price_per_item ?? 0;

            tmpDetails.subdetails.push({
                title:"Items",
                count: lineItem?.item_count ?? 0,
                price: item_price ?? 0
            });

            tmpDetails.core_total = item_price * (lineItem?.item_count ?? 0);
        }
    } catch(ex){
        log.error(`Calculating Row Info: ${ex}`);
    }

    return tmpDetails;
}

const currencyFormat = (price) => {
    let ret = "";
    try {
        if(price) {
            let USDollar = new Intl.NumberFormat('en-US', {
                style: 'currency', currency: 'USD',
            });

            ret = USDollar.format(price);
        }
    }
    catch(ex){
        console.log(`Error Formatting Value: ${ex}`);
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