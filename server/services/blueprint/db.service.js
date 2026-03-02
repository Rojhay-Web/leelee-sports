require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const { v4: uuidv4 } = require('uuid');

const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const bcrypt = require('bcrypt');
const _ = require('lodash');

const log = require('../log.service');
const util = require('../../utils/util');

const { DatabaseConnectionString, SALT_ROUNDS, DEFAULT_ADMIN_EMAIL, DatabaseName, IMAGE_STORAGE_FS } = process.env;

const client = new MongoClient(DatabaseConnectionString);
(async () => { await client.connect(); log.debug(`Connected Successfully to server`); })();

const appTables = {
    "users":true, "site_pages":true
},
pageKeyTypes = {
    "title":true, "description":true, "list":true, "images":true, "custom_list":true
},
formTypes = {
    "site_forms":false
};

module.exports = {
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
    removeAppTableData: async function(table, _id){
        try {
            const collection = await dbCollection(table);
            if(collection == null){
                return { "error": "Unable to connect to DB [Please contact site admin]"};
            }

            const result = await collection.deleteOne({ _id: new ObjectId(_id) });
            return { results: (result?.deletedCount ? true : false)};
        }
        catch(ex){
            log.error(`Removing App Table Row: ${ex}`);
            return { "error": `Removing App Table Row`};
        }
    },
    /* Users */
    getFullUser: async function(_id){
        try {
            const collection = await dbCollection("users");
            if(collection == null){
                return { "error": "Unable to connect to DB [Please contact site admin]"};
            }

            /* Check if User Exists with UserId */
            const query = { _id: new ObjectId(_id) };
            const findUser = await collection.findOne(query);
            if(!findUser){
                return { error: `User DNE` };
            }

            return { results: findUser };
        }
        catch(ex){
            log.error(`Getting User Permissions: ${ex}`);
            return { "error": `Getting User Permissions`};
        }
    },
    searchUser: async function(query="", role=null, sortType=null, sortAsc=null, page=1, pageSize=15){
        try {
            const collection = await dbCollection("users");
            if(collection == null){
                return { "error": "Unable to connect to DB [Please contact site admin]"};
            }

            let safeQuery = _.escapeRegExp(query);
            const offset = ((page - 1) * pageSize);
            const sort = sortType && sortAsc != null ? { [sortType]: sortAsc ? 1 : -1 } : {};
            
            const colQuery = {
                $and:[
                    {
                        $or:[
                            { email: {'$regex': safeQuery, '$options' : 'i'} },
                            { name: {'$regex': safeQuery, '$options' : 'i'} },
                            { given_name: {'$regex': safeQuery, '$options' : 'i'} },
                            { family_name: {'$regex': safeQuery, '$options' : 'i'} }
                        ]
                    },
                    ...(role ? [{ roles: { $in: [role] } }] : [{}])
                ]
            };

            const queryUsers = await collection.find(colQuery)
            .sort(sort)
            .limit(pageSize)
            .skip(offset)
            .toArray();

            const queryCount = await collection.countDocuments(colQuery);
            
            return { 
                results: queryUsers, totalCount: queryCount,
                pagesLeft: util.hasPagesLeft(page, pageSize, queryCount) 
            };
        }  catch(ex){
            log.error(`Search User: ${ex}`);
            return { "error": `Search User`};
        }
    },
    upsertUserV2: async function(_id=null, email=null, firstName=null, lastName=null, roles=null, scopes=null, sendInvite=false){
        try {
            const collection = await dbCollection("users");
            if(collection == null){
                return { "error": "Unable to connect to DB [Please contact site admin]"};
            }

            // Normalize Email
            email = email ? email.toLowerCase().trim() : email;

            // UPDATE Existing User
            if(_id){
                /* Check if User Exists */
                const query = { _id: new ObjectId(_id) };
                const findUser = await collection.findOne(query);

                if(!findUser){
                    return { error: `User DNE` };
                }

                // Validate User Data
                let param_validation = util.validateValue([ { type:"email", data: email } ]);
                if(param_validation.length > 0){
                    return { error: `Invalid User Data: ${param_validation.join(', ')}` };
                }

                // Build Full Name
                const full_name = firstName || lastName ? 
                    `${firstName ?? ''}${(firstName && lastName) ? ' ' : ''}${lastName ?? ''}` 
                    : null;

                // Update User                
                let setDict = { 
                    ...(email ? { email: email } : {}), 
                    ...(firstName ? { given_name: firstName } : {}),
                    ...(lastName ? { family_name: lastName } : {}),
                    name: full_name,
                    ...(roles ? { roles: roles } : {}),
                    ...(scopes ? { scopes: scopes } : {})
                };
                const result = await collection.updateOne(query, { $set: setDict});

                return { results: (result.matchedCount ? _id : null) };
            } 
            // CREATE New User
            else if(email){
                /* Check if User Exists */
                const query = { email: email };
                const findUser = await collection.findOne(query);
                if(findUser){
                    return { error: `User Already Exists` };
                }

                // Validate User Data
                let param_validation = util.validateValue([ { type:"email", data: email } ]);
                if(param_validation.length > 0){
                    return { error: `Invalid User Data: ${param_validation.join(', ')}` };
                }

                // Build Full Name
                const full_name = firstName || lastName ? 
                    `${firstName ?? ''}${(firstName && lastName) ? ' ' : ''}${lastName ?? ''}` 
                    : null;

                // Create User
                const result = await collection.insertOne({ 
                    email: email, 
                    ...(firstName ? { given_name: firstName } : {}),
                    ...(lastName ? { family_name: lastName } : {}),
                    name: full_name,
                    ...(roles ? { roles: roles } : {}),
                    ...(scopes ? { scopes: scopes } : {})
                });

                return { results: (result?.insertedId ?? null) }; 
            }
        
            return { error: "Invalid User Data" };
        }
        catch(ex){
            log.error(`Upserting User: ${ex}`);
            return { "error": `Upserting User`};
        }
    },
    removeUser: async function(_id){
        try {
            const collection = await dbCollection("users");
            if(collection == null){
                return { "error": "Unable to connect to DB [Please contact site admin]"};
            }

            if(!_id){
                return { error: "Invalid User Id" };
            }

            const result = await collection.deleteOne({ _id: new ObjectId(_id) });
            if(result?.deletedCount != 1){
                return { error: "Error deleting User [E00]", results: false };
            }
            
            return { results: true };
        } catch(ex){   
            log.error(`Removing User: ${ex}`);
            return { "error": `Removing User`, results: false };
        }
    },

    registerUser: async function(email=null, password=null, firstName=null, lastName=null){
        try {
            const collection = await dbCollection("users");
            if(collection == null){
                return { "error": "Unable to connect to DB [Please contact site admin]"};
            }

            // Normalize Email
            email = email ? email.toLowerCase().trim() : email;

            const query = { email: email };
            const findUser = await collection.findOne(query);
            if(findUser?.registration_type === "blueprint"){
                return { error: 'Email Already Exists' };
            }

            // Validate User Data
            let param_validation = util.validateValue([ { type:"email", data: email } ]);
            if(param_validation.length > 0){
                return { error: `Invalid User Data: ${param_validation.join(', ')}` };
            }

            /* Encrypt Password */
            const hash = await bcrypt.hashSync(password, parseInt(SALT_ROUNDS));

            const upsertUser = { 
                email: email,
                password: hash,
                given_name: firstName,
                family_name: lastName,
                name: `${firstName}${lastName ? ` ${lastName}` : ''}`,
                verified_email: false, picture: null,
                registration_type: "blueprint",
                registration_date: new Date(),
            };

            const result = await collection.updateOne(
                { email: email },  
                {  $set: upsertUser }, { upsert: true }
            );

            return { results: {...upsertUser, _id: result.upsertedId }};
        } catch(ex){
            log.error(`Registering User: ${ex}`);
            return { error: `Registering User`};
        }
    },
    loginUser: async function(email=null, password=null){
        try {
            const collection = await dbCollection("users");
            if(collection == null){
                return { "error": "Unable to connect to DB [Please contact site admin]"};
            }

            
            let query = { email: email.toLowerCase(), registration_type: "blueprint" };
            let findUser = await collection.findOne(query);

            if(!findUser){
                return { error: `User is not registered` };
            }

            // Check Password
            if(!bcrypt.compareSync(password, findUser.password)){
                return { "error": "Invalid Password" };
            }

            return { results: { ...findUser }};
        } catch(ex){
            log.error(`Logging In User: ${ex}`);
            return { error: `Logging In User`};
        }
    },

    loginGUser: async function(token){
        try {
            if(!token){
                return { error: "Invalid Google Token" };
            }

            // Get User Info From G-Suite
            let res = await getGoogleOAuthUserInfo(token);
            if(!res?.error && !res?.email){
                return { error: res?.error };
            }

            const collection = await dbCollection("users");
            if(collection == null){
                return { "error": "Unable to connect to DB [Please contact site admin]"};
            }

            // Get Active User Info
            const query = { email: res.email.toLowerCase() };
            const findUser = await collection.findOne(query);

            let ret;
            if(!findUser || findUser?.registration_type === 'invite'){
                const upsertUser = { 
                    id: res.id,
                    email: res.email.toLowerCase(),
                    given_name: res?.given_name,
                    family_name: res?.family_name,
                    name: res?.name,
                    verified_email: res?.verified_email,
                    picture: res?.picture,
                    registration_type: "google",
                    registration_date: new Date()
                };

                const result = await collection.updateOne(
                    { email: res.email.toLowerCase() },  
                    { $set: upsertUser },
                    { upsert: true }
                );

                ret = { ...upsertUser, ...res, _id: result.upsertedId };
            }
            else {
                ret = { ...findUser, ...res };
            }

            return { results: ret };
        } catch(ex){
            log.error(`G Login User: ${ex}`);
            return { error: `G Login User`};
        }
    },
    /* Site Pages */
    getPageData: async function(key){
        try {
            const collection = await dbCollection("site_pages");
            if(collection == null){
                return { "error": "Unable to connect to DB [Please contact site admin]"};
            }

            /* Check if Page Exists with PageId */
            const findPage = await collection.findOne({ key: key });
            if(!findPage){
                return { error: `Page DNE` };
            }

            return { results: findPage };
        }
        catch(ex){
            log.error(`Getting Page Data: ${ex}`);
            return { 'error': 'Getting Page Data [E00]'};
        }
    },
    upsertPageData: async function(title, pageKeys, _id=null){
        try {
            const collection = await dbCollection("site_pages");
            if(collection == null){
                return { "error": "Unable to connect to DB [Please contact site admin]"};
            }

            let key = `${title.replace(/[^\w\s]/gi, '').replace(/&/gi,'').split(' ').join('_')}`.toLowerCase();

            let validatedKeys = validatePageKeys(pageKeys);
            if(validatedKeys.error){
                return { error: `Invalid Page Keys: ${validatedKeys.error}`};
            }

            let setDict = { key: key, title: title };

            if(_id){
                if(validatedKeys.results){
                    setDict.pageKeys =  validatedKeys.results;
                }
                // Update Page
                const result = await collection.updateOne(
                    { _id: new ObjectId(_id) },  { $set: setDict }
                );

                return { results: (result.matchedCount ? key : null) };
            }
        
            // Add Page
            setDict.pageKeys = (validatedKeys.results ? validatedKeys.results : []);
            const result = await collection.insertOne(setDict);
            return { results: (result?.insertedId ? key : null) };    
        }
        catch(ex){
            log.error(`Upserting Page Data: ${ex}`);
            return { "error": `Upserting Page Data`};
        }
    },
    upsertPageKey: async function(page_id, key_id, title, type, meta, value){
        try {
            const collection = await dbCollection("site_pages");
            if(collection == null){
                return { "error": "Unable to connect to DB [Please contact site admin]"};
            }

            if(!page_id){
                return { error: "Invalid Page or Key Id" };
            }

            // Update Page
            if(key_id){
                const result = await collection.updateOne(
                    { 
                        _id: new ObjectId(page_id),
                        "pageKeys._id": key_id
                    },  { 
                        $set: { 
                            "pageKeys.$.title": title, "pageKeys.$.type":type, 
                            "pageKeys.$.metaData":meta, "pageKeys.$.value":value 
                        } 
                    }
                );
    
                return { results: (result.matchedCount ? page_id : null) };
            }

            const tmpKeyId = uuidv4();
            const result = await collection.updateOne(
                {  _id: new ObjectId(page_id) },  { 
                    $push: { 
                        pageKeys: { 
                            _id: tmpKeyId, title: title, type: type, 
                            metaData: meta, value: value 
                        }
                    } 
                }
            );

            return { results: (result.matchedCount ? tmpKeyId : null) };
        }
        catch(ex){
            log.error(`Upserting Page Key: ${ex}`);
            return { "error": `Upserting Page Key`};
        }
    },
    removePageKey: async function(page_id, key_id){
        try {
            const collection = await dbCollection("site_pages");
            if(collection == null){
                return { "error": "Unable to connect to DB [Please contact site admin]"};
            }

            if(!key_id || !page_id){
                return { error: "Invalid Page or Key Id" };
            }

            const result = await collection.updateOne(
                { _id: new ObjectId(page_id) },  
                { $pull: { pageKeys: { _id: key_id } }}
            );
            return { results: (result?.matchedCount ? true : false)};
        }
        catch(ex){
            log.error(`Removing Page Key: ${ex}`);
            return { "error": `Removing Page Key`};
        }
    },
    searchPageContent: async function(query="", page=1, pageSize=15){
        try {
            const collection = await dbCollection("site_pages");
            if(collection == null){
                return { "error": "Unable to connect to DB [Please contact site admin]"};
            }

            let keyList = await collection.aggregate([
                { $unwind: "$pageKeys" },
                {
                    $match: { 
                        $or: [
                            { "pageKeys.type": "title", "pageKeys.value.data": {'$regex' : query, '$options' : 'i'} },
                            { "pageKeys.type": "description", "pageKeys.value.data": {'$regex' : query, '$options' : 'i'} },
                            { "pageKeys.type": "list", "pageKeys.value.data": {'$regex' : query, '$options' : 'i'} },
                            // Filter custom_list in JS
                            { "pageKeys.type": "custom_list" },
                        ]
                    }
                },
                { $project: { key: "$key", pageKey: "$pageKeys" } }
            ]).toArray();

            // Filter custom list
            let safeQuery = _.escapeRegExp(query);
            const queryPattern = new RegExp(safeQuery, "i");
            keyList = keyList.filter((k) => {
                if(k?.pageKey?.type === "custom_list") {
                    for(let j=0; j < k?.pageKey?.value?.data?.length; j++){
                        let dataObj = k?.pageKey?.value?.data[j];
                        for(let i=0; i < k?.pageKey?.metaData?.fields?.length; i++){
                            let fieldKey = k?.pageKey?.metaData?.fields[i];
                            switch(fieldKey.type){
                                case "title":
                                case "description":
                                    if(queryPattern.test(dataObj[fieldKey.title])) return true;
                                    break;
                                case "list":
                                    let tmpList = dataObj[fieldKey.title].join('|');
                                    if(queryPattern.test(tmpList)) return true;
                                    break;
                                default:
                                    break;
                            }
                        }
                    }

                    return false;
                }

                return true;
            }); 
                       
            // Pagination Results
            const start = (page - 1) * pageSize;
            const pageList = keyList.splice(start, start + pageSize);

            return { pagesLeft: keyList?.length > (start + pageSize), results: pageList }
        }
        catch(ex){
            log.error(`Searching Page Content: ${ex}`);
            return { 'error': 'Searching Page Content [E00]'};
        }
    },

    /* Events */
    upsertEvent: async function(google_event_id, title, description, location=null, images=[], start, end=null, forms=[], tag=null){
        try {
            const collection = await dbCollection("events");
            if(collection == null){
                return { "error": "Unable to connect to DB [Please contact site admin]"};
            }

            start = util.formatDate(new Date(start));
            end = util.formatDate(end ?? fns.addHours(new Date(start), 1));

            // Process Forms
            forms = forms.map((form) => { 
                return {  
                    ...form,
                    ...('id' in form ? {} : { id: uuidv4() })
                };
            });

            const result = await collection.updateOne(
                { google_event_id: google_event_id },  
                { 
                    $set: { 
                        google_event_id: google_event_id,
                        title: title, description: description,
                        images: images, location: location,
                        start: start, end: end, forms: forms,
                        tag: tag
                    }
                },
                { upsert: true }
            );

            return { results: google_event_id ? google_event_id : result?.upsertedId };
        }
        catch(ex){
            log.error(`Upserting Event: ${ex}`);
            return { "error": `Upserting Event` };
        }
    },
    getEventById: async function(google_event_id){
        try {
            const collection = await dbCollection("events");
            if(collection == null){
                return { "error": "Unable to connect to DB [Please contact site admin]"};
            }

            /* Check if User Exists with UserId */
            const findEvent = await collection.findOne({ google_event_id: google_event_id });
            if(!findEvent){
                return { error: `Event DNE` };
            }

            return { results: findEvent };
        }
        catch(ex){
            log.error(`Getting Event By Id: ${ex}`);
            return { "error": `Getting Event By Id` };
        }
    },
    searchEvents: async function(query, hasForms=false, page=1, pageSize=15){
        try {
            const collection = await dbCollection("events");
            if(collection == null){
                return { "error": "Unable to connect to DB [Please contact site admin]"};
            }

            let safeQuery = _.escapeRegExp(query);
            const cutOffDate = new Date();

            const offset = ((page - 1) * pageSize);
            const colQuery = {
                $and: [
                    ...(hasForms  ? 
                        [{
                            $nor:[
                                {forms: {$exists: false}},
                                {forms: {$size: 0}}
                            ]
                        }] :
                        [
                            { $expr: { $gte: [{"$toDate": "$end" }, cutOffDate]}},
                            { archive: {$ne: true } }
                        ]                        
                    ),
                    {
                        $or: [
                            { title: {'$regex' : safeQuery, '$options' : 'i'} },
                            { description: {'$regex' : safeQuery, '$options' : 'i'}}
                        ]
                    }
                ]
            };

            const queryEvents = await collection.find(colQuery)
            .sort({ start: (hasForms ? -1 : 1) })
            .limit(pageSize)
            .skip(offset)
            .toArray();

            const queryCount = await collection.countDocuments(colQuery);
            
            return { results: queryEvents, pagesLeft: util.hasPagesLeft(page, pageSize, queryCount) };
        }
        catch(ex){
            log.error(`Searching Events: ${ex}`);
            return { "error": `Searching Events` };
        }
    },
    checkEventForms: async function(startDt, endDt) {
        try {
            const collection = await dbCollection("events");
            if(collection == null){
                return { "error": "Unable to connect to DB [Please contact site admin]"};
            }

            startDt = new Date(startDt);
            endDt = new Date(endDt);

            const queryEvents = await collection.find({
                $and: [
                    { 
                        $nor:[
                            {forms: {$exists: false}},
                            {forms: {$size: 0}}
                        ]
                    },
                    { $or:[
                        { $and: [
                            { $expr: { $gte: [{"$toDate": "$start" }, startDt]}},
                            { $expr: { $lt: [{"$toDate": "$start" }, endDt]}}
                        ]},
                        { $and: [
                            { $expr: { $gte: [{"$toDate": "$end" }, startDt]}},
                            { $expr: { $lt: [{"$toDate": "$end" }, endDt]}}
                        ]}
                    ]}
                ]
            }).toArray();

            return { results: queryEvents };
        }
        catch(ex){
            log.error(`Checking Event List Form Forms: ${ex}`);
            return { "error": `Checking Event List Form Forms` };
        }
    },

    /* Forms */
    getFormDetails: async function(type, id, parentId){
        try {
            if(!(type in formTypes)){
                return { "error": "Invalid Form Type"};
            }

            const collection = await dbCollection(type);
            if(collection == null){
                return { "error": "Unable to connect to DB [Please contact site admin]"};
            }

            // Has Parent Object
            if(!!formTypes[type]){
                let formParent = null;
                switch(type){
                    case "events":
                        formParent = await collection.findOne({ google_event_id: parentId });
                        break;
                    case "announcements":
                        formParent = await collection.findOne({ _id: new ObjectId(parentId) });
                        break;
                    default:
                        break;
                }

                if(!formParent){
                    return { error: `${type} DNE` };
                }

                // Get Form Obj
                const formObj = formParent?.forms.filter((item)=> { return item.id === id; });

                if(!(formObj?.length > 0)) {
                    return { error: `${type} form DNE` };
                }

                return { results: formObj[0] };
            }
            else {
                const formObj = await collection.findOne({ id: id });
                if(!formObj){
                    return { error: `Site Form DNE` };
                }

                return { results: formObj };
            }
        }
        catch(ex){
            log.error(`Get Form Details: ${ex}`);
            return { "error": `Get Form Details` };
        }
    },
    getSiteForms: async function(query, page=1, pageSize=15) {
         try {
            const collection = await dbCollection("site_forms");
            if(collection == null){
                return { "error": "Unable to connect to DB [Please contact site admin]"};
            }

            const colQuery = {
                $or: [
                    { title: {'$regex' : query, '$options' : 'i'} },
                    { description: {'$regex' : query, '$options' : 'i'}},
                    { id: {'$regex' : query, '$options' : 'i'}}
                ]
            };

            const offset = ((page - 1) * pageSize);
            const queryForms = await collection.find(colQuery)
            .limit(pageSize)
            .skip(offset)
            .toArray();

            const queryCount = await collection.countDocuments(colQuery);
            
            return { results: queryForms, pagesLeft: util.hasPagesLeft(page, pageSize, queryCount) };
        }
        catch(ex){
            log.error(`Getting Site Forms: ${ex}`);
            return { "error": `Getting Site Forms` };
        }
    },
    getSubmittedFormData: async function(type, id, parentId, page=1, pageSize=15){
        try {
            if(!(type in formTypes)){
                return { "error": "Invalid Form Type"};
            }

            const collection = await dbCollection("form_data");
            if(collection == null){
                return { "error": "Unable to connect to DB [Please contact site admin]"};
            }

            const offset = ((page - 1) * pageSize), formQuery = {
                form_type: type,
                form_id: id,
                ...(parentId ? { form_parent_id: parentId } : {})
            }

            const formRes = (page < 0 ? 
                    await collection.find(formQuery).sort({ timestamp: -1 }).toArray() :
                    await collection.find(formQuery).sort({ timestamp: -1 })
                        .limit(pageSize).skip(offset).toArray()
                );

            const queryCount = await collection.countDocuments(formQuery);
            
            return { results: formRes, pagesLeft: util.hasPagesLeft(page, pageSize, queryCount) };
        }
        catch(ex){
            log.error(`Get Submitted Form Data: ${ex}`);
            return { "error": `Get Submitted Form Data` };
        }
    },
    upsertFeatureForm: async function(id, title, description="", fields, alertEmail=""){
        try {
            const collection = await dbCollection("site_forms");
            if(collection == null){
                return { "error": "Unable to connect to DB [Please contact site admin]"};
            }

            const result = await collection.updateOne({ id: id }, 
                { $set: {
                    id: id, title: title, 
                    description: description, 
                    fields: fields, 
                    alertEmail: alertEmail
                } }, { upsert: true }
            );

            return { results: result?.upsertedCount > 0 || result?.matchedCount > 0 };
        }
        catch(ex){
            log.error(`Upserting Feature Forms: ${ex}`);
            return { "error": `Upserting Feature Forms` };
        }
    },
    submitFormData: async function(type, id, parentId=null, formData){
        try {
            if(!(type in formTypes)){
                return { "error": "Invalid Form Type"};
            }

            const collection = await dbCollection("form_data");
            if(collection == null){
                return { "error": "Unable to connect to DB [Please contact site admin]"};
            }

            const result = await collection.insertOne({ 
                form_type: type, form_id: id, form_parent_id: parentId, 
                form_data: formData, timestamp: new Date()
            });

            if(!formTypes[type]){
                const collection = await dbCollection("site_forms");
                if(collection == null){
                    return { "error": "Unable to connect to DB [Please contact site admin]"};
                }

                const formObj = await collection.findOne({ id: id });
                const toEmail = formObj?.alertEmail ?? DEFAULT_ADMIN_EMAIL;
                const sentTime = util.formatDate(new Date());

                const mail_status = await mail.sendEmail(toEmail, `Lee Lee`, { 
                    title: 'A New Website Response Has Been Submitted',
                    lines: [
                        `A new response to our [${id}] form has been submitted at: ${sentTime}`,
                        'Please Access the Lee Lee Admin Tool to see more information',
                        '','Thanks,',
                        'Miles (Your Friendly Neighborhood Web Tool)'
                    ]
                });

                if(!!mail_status.email_status) {
                    log.info(`Successful Website Email Sent: ${sentTime}`)
                }
                else {
                    log.error(`Error Sending Email [${sentTime}]: ${mail_status?.error}`);
                }
            }

            return { results: (result?.insertedId ?? null) }; 
        }
        catch(ex){
            log.error(`Submitting Form Data: ${ex}`);
            return { "error": `Submitting Form Data` };
        }
    },

    /* Feature Item */
    archiveFeatureItem: async function(featureType, id){
        try {
            const featureDict = { "event":false, "announcement":false };

            if(!(featureType.toLowerCase() in featureDict)){
                return { error: `Invalid Feature Type: ${featureType}`};
            }

            let collection = null, upsertId = {};

            switch(featureType) {
                case "event":
                    collection = await dbCollection("events");
                    upsertId = { google_event_id: id };
                    break;
                case "announcement":
                    collection = await dbCollection("announcements");
                    upsertId = { _id: new ObjectId(id) };
                    break;
            }

            const result = await collection.updateOne({...upsertId}, { $set: { archive: true }});

            return { results: result?.matchedCount > 0 };
        }
        catch(ex){
            log.error(`Removing Feature Item: ${ex}`);
            return { "error": `Removing Feature Item` };
        }
    },

    /* Photos */
    photos:{
        upload: async function(filename, imagePath, title=null, photoset=null){
            try {
                const imgFullPath = path.resolve(imagePath);
                if (!fs.existsSync(imgFullPath)) {
                    return { error: "Error uploading photo [E00]" };
                }

                
                // Resize Image + Move file to store gallery
                const newPath = path.resolve(`./store/gallery/${filename}`);
                const actionStatus = await resizeImageSharp(imgFullPath, newPath);
                if(!actionStatus?.status){
                    cleanUpFile([imgFullPath]);
                    return { error: "Error uploading photo [E01]" };
                }

                // Add file metadata to DB
                const collection = await dbCollection("photos");
                if(collection == null){
                    cleanUpFile([imgFullPath, newPath]);
                    return { "error": "Unable to connect to DB [Please contact site admin]"};
                }
                const photoItem = { 
                    filename, 
                    photosets: (photoset ? [photoset] : []),
                    data: actionStatus?.data,
                    title: (title ?? uuidv4()),  
                    created: new Date(),
                    updated: new Date(),
                };

                const res = await collection.insertOne(photoItem);

                if(!res?.insertedId){
                    cleanUpFile([imgFullPath, newPath]);
                    return { error: "Error uploading photo [E02]" };
                }

                // Return file meta-Object
                return { results: {_id: res.insertedId, ...photoItem } };
            } catch(ex){
                log.error(`Uploading Photo: ${ex}`);
                return { error: `Error uploading photo: ${ex}` };
            }
        },
        search: async function(query="", photosets=[], page=1, pageSize=20){
            try {
                const collection = await dbCollection("photos");
                if(collection == null){
                    return { "error": "Unable to connect to DB [Please contact site admin]"};
                }

                const offset = ((page - 1) * pageSize),
                    colQuery = {
                        $and: [
                            {
                                $or: [
                                    { title: {'$regex' : query, '$options' : 'i'} },
                                    { filename: {'$regex' : query, '$options' : 'i'}}
                                ]
                            },
                            ...(photosets?.length > 0 ? [{ photosets: { $in: photosets } }] : [])
                        ]
                    };

                const queryCount = await collection.countDocuments(colQuery);
                const queryPhotos = await collection.find(colQuery)
                    .sort({ created: -1 })
                    .limit(pageSize)
                    .skip(offset)
                    .toArray();

                return { results: queryPhotos, pagesLeft: util.hasPagesLeft(page, pageSize, queryCount) };
            }
            catch(ex){
                log.error(`Searching Photos: ${ex}`);
                return { error: `Error Searching Photos: ${ex}` };
            }
        },
        delete: async function(localStore, id){
            try {
                const collection = await dbCollection("photos");
                if(collection == null){
                    return { "error": "Unable to connect to DB [Please contact site admin]"};
                }

                // Get Photo Info
                const photoItem = await collection.findOne({ _id: new ObjectId(id) });
                if(!photoItem?._id){
                    return { error: "Photo not found" };
                }

                // Delete from DB
                const delRes = await collection.deleteOne({ _id: new ObjectId(id) });
                if(delRes?.deletedCount != 1){
                    return { error: "Error deleting photo [E00]" };
                }

                // Delete from FS
                const imgPath = path.resolve(`./store/gallery/${photoItem.filename}`);
                cleanUpFile([imgPath]);
                localStore.removeCacheStoreKey("photos", id);

                return { results: true };
            }
            catch(ex){
                log.error(`Deleting Photo: ${ex}`);
                return { error: `Error deleting photo: ${ex}` };
            }
        },
        view: async function(image_id, localStore){
            try {
                // Check Local Store first
                const cacheImg = localStore.searchCacheStore("photos", image_id);
                if(cacheImg?.path && (cacheImg?.headerType || fs.existsSync(cacheImg.path))){
                    return { results: cacheImg };
                }

                // Check DB
                const collection = await dbCollection("photos");
                if(collection == null){
                    return { "error": "Unable to connect to DB [Please contact site admin]"};
                }

                // Get Photo Info
                const photoItem = await collection.findOne({ _id: new ObjectId(image_id) });
                if(!photoItem?._id){
                    return { error: "Photo DNE" };
                }

                let ret = {}, imgPath = null;
                if(photoItem?.data){
                    imgPath = Buffer.from(photoItem?.data, 'base64');
                    ret = { path: imgPath, headerType: 'image/jpeg' };
                }
                else {
                    imgPath = path.resolve(`./store/gallery/${photoItem.filename}`);
                    if(!fs.existsSync(imgPath)){
                        return { error: "Photo not found in filesystem" };
                    }
                    ret = { path: imgPath };
                }

                if(IMAGE_STORAGE_FS === "1") {
                    localStore.updateCacheStore("photos", image_id, ret);
                }
                return { results: ret };
            }
            catch(ex){
                log.error(`Viewing Photo: ${ex}`);
                return { error: `Error viewing photo: ${ex}` };
            }
        }
    },
    photosets:{
        search: async function(query="", page=1, pageSize=20){
            try {
                const collection = await dbCollection("photosets");
                if(collection == null){
                    return { "error": "Unable to connect to DB [Please contact site admin]"};
                }

                const offset = ((page - 1) * pageSize),
                    colQuery = (query?.length > 0 ? { title: {'$regex' : query, '$options' : 'i'} } : {});

                const queryCount = await collection.countDocuments(colQuery);
                const queryPhotosets = await collection.find(colQuery)
                    .sort({ created: -1 })
                    .limit(pageSize)
                    .skip(offset)
                    .toArray();
                return { results: queryPhotosets, pagesLeft: util.hasPagesLeft(page, pageSize, queryCount) };
            }
            catch(ex){
                log.error(`Searching Photosets: ${ex}`);
                return { error: `Error Searching Photosets: ${ex}` };
            }
        },
        getImages: async function(id, page=1, page_size=20){
            try {
                // Get Photos in Photoset
                const photoCollection = await dbCollection("photos");
                if(photoCollection == null){
                    return { "error": "Unable to connect to DB [Please contact site admin]"};
                }

                const offset = ((page - 1) * page_size),
                    colQuery = { photosets: { $in: [id] } };

                const queryCount = await photoCollection.countDocuments(colQuery);
                const queryPhotos = await photoCollection.find(colQuery)
                    .sort({ updated: -1 })
                    .limit(page_size)
                    .skip(offset)
                    .toArray();

                return { results: queryPhotos, pagesLeft: util.hasPagesLeft(page, page_size, queryCount) };
            }
            catch(ex){
                log.error(`Getting Photoset Images: ${ex}`);
                return { error: `Error Getting Photoset Images: ${ex}` };
            }
        },
        // Admin Methods
        create: async function(title, description=""){
            try {
                const collection = await dbCollection("photosets");
                if(collection == null){
                    return { "error": "Unable to connect to DB [Please contact site admin]"};
                }

                const photoSet = await collection.findOne({ title: { $regex: title.toLowerCase(), $options: "i" } });
                if(photoSet?._id){
                    return { error: "Title Already Exists" };
                }

                const photosetItem = { 
                    title, description,
                    created: new Date(),
                };

                const res = await collection.insertOne(photosetItem);

                if(!res?.insertedId){
                    return { error: "Error creating photoset [E00]" };
                }

                // Return file meta-Object
                return { results: res.insertedId };
            } catch(ex){
                log.error(`Creating Photoset: ${ex}`);
                return { error: `Error creating photoset: ${ex}` };
            }
        },
        edit: async function(id, title, description=""){
            try {
                const collection = await dbCollection("photosets");

                const photosetItem = await collection.findOne({ _id: new ObjectId(id) });
                if(!photosetItem?._id){
                    return { error: "Photoset not found" };
                }

                const updateObj = {
                    ...(title ? { title } : {}),
                    description,
                };

                const res = await collection.updateOne({ _id: new ObjectId(id) }, { $set: updateObj });
                return { results: (res?.modifiedCount === 1) };
            }
            catch(ex){
                log.error(`Editing Photoset: ${ex}`);
                return { error: `Error editing photoset: ${ex}` };
            }
        },
        delete: async function(id){
            try {
                const collection = await dbCollection("photosets");
                if(collection == null){
                    return { "error": "Unable to connect to DB [Please contact site admin]"};
                }

                const photosetItem = await collection.findOne({ _id: new ObjectId(id) });
                if(!photosetItem?._id){
                    return { error: "Photoset not found" };
                }

                // Delete from DB
                const delRes = await collection.deleteOne({ _id: new ObjectId(id) });
                if(delRes?.deletedCount != 1){
                    return { error: "Error deleting photoset [E00]" };
                }

                // Remove photoset from photos
                const photoCollection = await dbCollection("photos");
                if(photoCollection == null){
                    return { "error": "Unable to connect to DB [Please contact site admin]"};
                }
                await photoCollection.updateMany(
                    { photosets: { $in: [id] } },
                    { $pull: { photosets: id } }
                );

                return { results: true };
            }
            catch(ex){
                log.error(`Deleting Photoset: ${ex}`);
                return { error: `Error deleting photoset: ${ex}` };
            }
        },
        addPhotos:  async function(id, photo_ids) {
            try { 
                const photoCollection = await dbCollection("photos");
                if(photoCollection == null){
                    return { "error": "Unable to connect to DB [Please contact site admin]"};
                }

                const res = await photoCollection.updateMany(
                    { _id: { $in: photo_ids.map(pid => new ObjectId(pid)) } },
                    { 
                        $addToSet: { photosets: id }, 
                        $set: { updated: new Date() }
                    }
                );

                return { results: (res?.modifiedCount > 0) };
            }
            catch(ex){
                log.error(`Adding Photos to Photoset: ${ex}`);
                return { error: `Error adding photos to photoset: ${ex}` };
            }
        },
        removePhotos: async function(id, photo_ids) {
            try { 
                const photoCollection = await dbCollection("photos");
                if(photoCollection == null){
                    return { "error": "Unable to connect to DB [Please contact site admin]"};
                }

                const res = await photoCollection.updateMany(
                    { _id: { $in: photo_ids.map(pid => new ObjectId(pid)) } },
                    { 
                        $pull: { photosets: id },
                        $set: { updated: new Date() }
                    }
                );

                return { results: (res?.modifiedCount > 0) };
            }
            catch(ex){
                log.error(`Removing Photos from Photoset: ${ex}`);
                return { error: `Error removing photos from photoset: ${ex}` };
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

function validatePageKeys(pageKeys){
    try {
        if(!pageKeys){
            return { results: null };
        }

        let ret = pageKeys.map((key)=> {
            if(!(key.type in pageKeyTypes)){
                throw 'Invalid key type';
            }
            let rKey = { ...key, ...("_id" in key ? {} : { _id: uuidv4()}) };

            return rKey;
        });

        return { results: ret };
    }
    catch(ex){
        log.error(`Validating Page Keys: ${ex}`);
        return { error: `Validating Page Keys: ${ex}`};
    }
}

async function cleanUpFile(paths=[]){
    try {
        paths.forEach(p => {
            if(fs.existsSync(p)){
                fs.unlinkSync(p);
            }
        });
    }
    catch(ex){
        log.error(`Error cleaning up files: ${ex}`);
    }
}

async function cleanUpSitePageImages(id) {
    try {
        const site_pages_collection = await dbCollection("site_pages");
        if(site_pages_collection != null) {
            // Remove from Images
            await site_pages_collection.updateMany(
                { 
                    "pageKeys.type":"images",
                    "pageKeys.$[pageKey].value.data": { $type: "array" }
                },
                { $pull: { "pageKeys.$[pageKey].value.data": { "_id": id } } },
                {
                    arrayFilters: [
                        {
                            "pageKey.type":"images",
                        }
                    ]
                }
            );

            // Remove from Custom Lists
            await site_pages_collection.updateMany(
                { 
                    "pageKeys.type":"custom_list",
                },
                { 
                    $set: { 
                        "pageKeys.$[pageKey].value.data.$[dataElm].image": []
                    } 
                },
                {
                    arrayFilters: [
                        { "pageKey.type":"custom_list" },
                        { "dataElm.image._id": id }
                    ]
                }
            );
        }
    }
    catch(ex){
        log.error(`Cleaning Up Site Page Images: ${ex}`);
    }
}

const RESIZE_WIDTH = 800;
async function resizeImageSharp(inputPath, outputPath) {
    try {
        const metadata = await sharp(inputPath).metadata();
        const tmpWidth = metadata.width > RESIZE_WIDTH ? RESIZE_WIDTH : metadata.width;

        let ret = { status: false, data: null };
        
        if(IMAGE_STORAGE_FS === "1") {
            await sharp(inputPath)
                .resize({ width: tmpWidth })
                .toFile(outputPath);

            ret.status = true;
        } else {
            const imgBuffer = await sharp(inputPath)
                .resize({ width: tmpWidth })
                .toFormat('jpeg')
                .toBuffer();

            if(!!imgBuffer){
                const base64String = imgBuffer.toString('base64');

                ret.data = base64String;
                ret.status = !!base64String;
            }
        }

        if(ret.status){ cleanUpFile([inputPath]); }

        return ret;
    } catch (error) {
        console.error('Error resizing image with Sharp:', error);
        return { status: false, data: null};
    }
}

async function getGoogleOAuthUserInfo(token) {
    try {
        // Get User Info From G-Suite
        const url = `https://www.googleapis.com/oauth2/v1/userinfo?access_token=${token}`;
        const ret = await fetch(url, {
            method: "GET", headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json'
            }
        });

        if(ret.status != 200){
            log.error(`Unable to retrieve G-User Data [E00]`);
            return { error: `Unable to retrieve G-User Data [E00]` };
        }

        return await ret.json();
    } catch(ex){
        log.error(`Unable to retrieve G-User Data [E01]: ${ex}`);
        return { error: `Unable to retrieve G-User Data [E01]` };
    }
}

/* Connection Clean Up */
const cleanup = (event) => {
    log.debug(`Closing Connection`);
    client.close(); process.exit(); 
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);