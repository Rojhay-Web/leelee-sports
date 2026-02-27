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
        createCollection('users');
        createCollection('site_pages');
        createCollection('events');
        createCollection('form_data');
        createCollection('site_forms');
        createCollection('photos');
        createCollection('photosets');

        // Create Admin User
        const collection = await dbCollection('users');
        if(collection == null){ throw "Unable to connect to DB"; }

        const result = await collection.insertOne({ 
            email: process.env.SITE_ADMIN, roles: ['ADMIN'], scopes: DEFAULT_SCOPES,
            registration_type: 'invite'
        });

        console.log(`Creating Admin User: ${(result?.insertedId ?? null)}`);
    } catch(ex){
        console.log(`Error with init: ${ex}`);
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
