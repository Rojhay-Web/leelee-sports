require('dotenv').config();
const { MongoClient } = require('mongodb');

const client = new MongoClient(process.env.DatabaseConnectionString);
(async () => { await client.connect(); console.log(`Connected Successfully to server`); })();

const DEFAULT_SCOPES = {
    users: true, gallery: true,
    site_content: true, cms_admin: true,
    events: true, form_manager: true
};

async function init() {
    try {
        createCollection('league_sports'); // Sport Categories For Lee Lee Leagues

        createCollection('ls_store_config'); // League Store Config Details
        createCollection('ls_store_items'); // League Store Sellable Item

        createCollection('ls_locations'); // Loactions For League Store Leagues 
        createCollection('ls_organizations'); // Organizations for each users used for invoice config
        createCollection('ls_users'); // League Store User Configurations

        createCollection('ls_quotes'); // Quotes For League Store

        // Create League Store Configs
        const collection = await dbCollection('ls_store_config');
        if(collection == null){ throw "Unable to connect to DB"; }

        const result1 = await collection.insertMany([{ key: 'leagues' }, { key: 'apparel' }]);
        console.log(`Created League Store Configs: ${(result1?.insertedIds ?? null)}`);

        // Finished
        console.log(" Fin >>");
    } catch(ex){
        console.log(`Error with LS init: ${ex}`);
    }
}

/* Start - Main Section */
init();
/* END - Main Section*/


/* PRIVATE METHODS */
async function createCollection(collectionName){
    try {
        const db = client.db(process.env.DatabaseName);
        const collection = await db.createCollection(collectionName);

        if(!collection) {
            throw 'Collection Not Created';
        }
    } catch(ex){
        console.log(`Error Creating Collection ${collectionName}: ${ex}`);
    }
}

async function dbCollection(conn_collection) {
    let collection = null;
    try {
        const db = client.db(process.env.DatabaseName);
        collection = db.collection(conn_collection);
    }
    catch(ex){
        console.log(`Connection to Database: ${ex}`);
    }

    return collection;
}
