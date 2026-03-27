const { GraphQLScalarType } = require('graphql');
const { Kind } = require('graphql/language');
const fns = require('date-fns');

const db = require('../services/blueprint/db.service.js'), 
    events = require('../services/blueprint/events.service.js'),
    videos = require('../services/blueprint/videos.service.js'),
    util = require('../utils/util.js');

// League Store Services
const ls_db = require('../services/leagueStore/db.service.js');

module.exports = function (localStore) {
    const resolver = {
        Query:{
            /* Users */
            users: async(_obj, _args, context, _info) => {
                // Validate Active User
                util.activeUserCheck(context);
                
                let ret = await db.getAppTable("users");
                util.checkGQLResults(ret);

                return ret?.results;
            },
            user: async(_obj, args, _context, _info) => {
                util.validateGQLParams(["_id"], args);

                let ret = await db.getFullUser(args._id);
                util.checkGQLResults(ret);

                return ret?.results;
            },
            searchUsers: async(_obj, args, context, _info) => {
                // Validate Active User
                util.activeUserCheck(context);

                let ret = await db.searchUser(args?.query, args?.role, args?.sortType, args?.sortAsc, args?.page, args?.pageSize);
                util.checkGQLResults(ret);

                return ret;
            },

            registerUser: async(_obj, args, _context, _info) => {
                util.validateGQLParams(["email", "password", "firstName"], args);

                let ret = await db.registerUser(args.email, args.password, args.firstName, args?.lastName);
                util.checkGQLResults(ret);

                return ret?.results;
            },
            loginUser: async(_obj, args, _context, _info) => {
                util.validateGQLParams(["email", "password"], args);

                let ret = await db.loginUser(args.email, args.password);
                util.checkGQLResults(ret);

                return ret?.results;
            },
            loginGUser: async(_obj, args, _context, _info) => {
                util.validateGQLParams(["token"], args);

                let ret = await db.loginGUser(args.token);
                util.checkGQLResults(ret);

                return ret?.results;
            },
            /* Site Pages */
            sitePages: async(_obj, _args, context, _info) => {
                // Validate Active User
                util.activeUserCheck(context);
                let ret = await db.getAppTable("site_pages");
                util.checkGQLResults(ret);

                return ret?.results;
            },
            sitePage: async(_obj, args, _context, _info) => {
                util.validateGQLParams(["key"], args);

                let ret = await db.getPageData(args.key);
                util.checkGQLResults(ret);

                return ret?.results;
            },
            searchPageContent: async(_obj, args, _context, _info) => {
                let ret = await db.searchPageContent(args.query, args.page, args.pageSize);
                util.checkGQLResults(ret);

                return ret;
            },
            /* Event */
            event: async(_obj, args, _context, _info) => {
                // Validate Active User
                let ret = await db.getEventById(args?.gid);
                util.checkGQLResults(ret);

                return ret?.results;
            },
            events: async(_obj, args, _context, _info) => {
                util.validateGQLParams(["start","end"], args);

                let ret = await events.getEvents(args.start, args.end, args?.hasForms);
                util.checkGQLResults(ret);

                return ret?.results;
            },
            queryEvents: async(_obj, args, _context, _info) => {
                // Validate Active User
                let ret = await db.searchEvents(args?.query, args?.hasForms, args?.page, args?.pageSize);
                util.checkGQLResults(ret);

                return ret;
            },

            /* Gallery */
            photos: async(_obj, args, context, _info) => {
                // Validate Active User
                util.activeUserCheck(context);
                let ret = await db.photos.search(args?.query, args?.photosets, args?.page, args?.pageSize);
                util.checkGQLResults(ret);

                return ret;
            },
            photosets: async(_obj, args, context, _info) => {
                // Validate Active User
                util.activeUserCheck(context);
                let ret = await db.photosets.search(args?.query, args?.page, args?.pageSize);
                util.checkGQLResults(ret);

                return ret;
            },
            photosetImages: async(_obj, args, context, _info) => {
                // Validate Active User
                util.activeUserCheck(context);                
                util.validateGQLParams(["id"], args);

                let ret = await db.photosets.getImages(args.id, args?.page, args?.pageSize);
                util.checkGQLResults(ret);

                return ret;
            },

            /* Videos */
            videos: async(_obj, args, _context, _info) => {
                let ret = await videos.search(args?.query, args?.pageSize, args?.pageToken);
                util.checkGQLResults(ret);

                return ret;
            },

            /* Forms */
            formDetails: async(_obj, args, _context, _info) => {
                util.validateGQLParams(["type","id"], args);

                let ret = await db.getFormDetails(args?.type, args?.id, args?.parentId);
                util.checkGQLResults(ret);

                return ret?.results;
            },
            querySiteForms: async(_obj, args, _context, _info) => {
                let ret = await db.getSiteForms(args?.query, args?.page, args?.pageSize);
                util.checkGQLResults(ret);

                return ret;
            },
            submittedFormData: async(_obj, args, _context, _info) => {
                util.validateGQLParams(["type","id"], args);

                let ret = await db.getSubmittedFormData(args?.type, args?.id, args?.parentId, args?.page, args?.pageSize);
                util.checkGQLResults(ret);

                return ret;
            },

            /* Google Icon */
            googleIcons: async(_obj, args, _context, _info) => {
                let ret = await ls_db.getGoogleIcons(args?.query);
                util.checkGQLResults(ret);

                return ret?.results;
            },

            /* Leagues */
            sports: async(_obj, _args, _context, _info) => {
                let ret = await ls_db.getAppTable("league_sports");
                util.checkGQLResults(ret);

                return ret?.results;
            },

            /* League Store */
            storeConfigs: async(_obj, args, _context, _info) => {
                let ret = await ls_db.getStoreConfigs(args?.key);
                util.checkGQLResults(ret);

                return ret?.results;
            },
            leagueLocations: async(_obj, _args, _context, _info) => {
                let ret = await ls_db.getAppTable("ls_locations");
                util.checkGQLResults(ret);

                return ret?.results;
            },
            storeItems: async(_obj, args, context, _info) => {
                // Validate Active User
                util.activeUserCheck(context);

                let ret = await ls_db.storeItems.search(args?.location_id, args?.store_key, args?.query, args?.active, null, null, args?.page, args?.pageSize);
                util.checkGQLResults(ret);
                
                return ret;
            },

            /* League Store Org - Users */
            leagueStoreOrganizations: async(_obj, args, context, _info) => {
                // Validate Active User
                util.activeUserCheck(context);
                let ret = await ls_db.organizations.search(args?.query, null, null, args?.page, args?.pageSize);
                util.checkGQLResults(ret);
                
                return ret;
            },
            leagueStoreUsers: async(_obj, args, context, _info) => {
                // Validate Active User
                util.activeUserCheck(context);
                let ret = await ls_db.users.search(args?.query, null, null, args?.page, args?.pageSize);
                util.checkGQLResults(ret);
                
                return ret;
            },
            leagueStoreUser: async(_obj, args, _context, _info) => {
                // Validate Active User
                util.validateGQLParams(["id"], args);

                let ret = await ls_db.users.getById(args.id);
                util.checkGQLResults(ret);
                
                return ret?.results;
            },
            leagueStoreQuotes: async(_obj, args, context, _info) => {
                // Validate Active User
                util.activeUserCheck(context);

                // Pull All Flag for LS Admins
                const admin_all = args?.pullAll && util.checkUserRole(['LEAGUE_STORE_ADMIN'], context?.app_id?.roles);

                let ret = await ls_db.purchaseOrder.getQuotes(context?.app_id?._id, args?.status, admin_all, args?.page, args?.pageSize);
                util.checkGQLResults(ret);
                
                return ret;
            },
        },
        Mutation:{
            upsertUser: async(_obj, args, context, _info) => {
                // Validate Active User
                util.activeUserCheck(context);

                let ret = await db.upsertUserV2(args?._id, args?.email, args?.given_name, args?.family_name, args?.roles, args?.scopes, args?.sendInvite);
                util.checkGQLResults(ret);

                return ret?.results;
            },
            removeUser: async(_obj, args, context, _info) => {
                // Validate Active User
                util.activeUserCheck(context);
                util.validateGQLParams(["_id"], args);

                let ret = await db.removeUser(args._id);
                util.checkGQLResults(ret);

                return ret?.results;
            },

            /* Site Page */
            upsertSitePage: async(_obj, args, context, _info) => {
                // Validate Active User
                util.activeUserCheck(context);
                util.validateGQLParams(["title"], args);

                let ret = await db.upsertPageData(args.title, args?.pageKeys, args?._id);
                util.checkGQLResults(ret);

                return ret?.results;
            },
            removeSitePage: async(_obj, args, context, _info) => {
                // Validate Active User
                util.activeUserCheck(context);
                util.validateGQLParams(["_id"], args);

                let ret = await db.removeAppTableData("site_pages",args._id);
                util.checkGQLResults(ret);

                return ret?.results;
            },
            upsertPageKey: async(_obj, args, context, _info) => {
                // Validate Active User
                util.activeUserCheck(context);
                util.validateGQLParams(["_id"], args);

                let ret = await db.upsertPageKey(args._id, args.key_id, args?.title, args?.type, args?.meta, args?.value);
                util.checkGQLResults(ret);

                return ret?.results;
            },
            removePageKey: async(_obj, args, context, _info) => {
                // Validate Active User
                util.activeUserCheck(context);
                util.validateGQLParams(["_id","key_id"], args);

                let ret = await db.removePageKey(args._id, args.key_id);
                util.checkGQLResults(ret);

                return ret?.results;
            },
            /* Gallery */
            deletePhoto: async(_obj, args, context, _info) => {
                // Validate Active User
                util.activeUserCheck(context);
                util.validateGQLParams(["id"], args);

                let ret = await db.photos.delete(localStore, args.id);
                util.checkGQLResults(ret);

                return ret?.results;
            },
            createPhotoset: async(_obj, args, context, _info) => {
                // Validate Active User
                util.activeUserCheck(context);
                util.validateGQLParams(["title"], args);

                let ret = await db.photosets.create(args.title, args?.description);
                util.checkGQLResults(ret);

                return ret?.results;
            },
            editPhotoset: async(_obj, args, context, _info) => {
                // Validate Active User
                util.activeUserCheck(context);
                util.validateGQLParams(["title", "id"], args);

                let ret = await db.photosets.edit(args.id, args.title, args?.description);
                util.checkGQLResults(ret);

                return ret?.results;
            },
            deletePhotoset: async(_obj, args, context, _info) => {
                // Validate Active User
                util.activeUserCheck(context);
                util.validateGQLParams(["id"], args);

                let ret = await db.photosets.delete(args.id);
                util.checkGQLResults(ret);

                return ret?.results;
            },
            addPhotosetPhotos: async(_obj, args, context, _info) => {
                // Validate Active User
                util.activeUserCheck(context);
                util.validateGQLParams(["id", "photoIds"], args);

                let ret = await db.photosets.addPhotos(args.id, args.photoIds);
                util.checkGQLResults(ret);

                return ret?.results;
            },
            removePhotosetPhotos: async(_obj, args, context, _info) => {
                // Validate Active User
                util.activeUserCheck(context);
                util.validateGQLParams(["id", "photoIds"], args);

                let ret = await db.photosets.removePhotos(args.id, args.photoIds);
                util.checkGQLResults(ret);

                return ret?.results;
            },

            // Events
            upsertEvent: async(_obj, args, context, _info) => {
                // Validate Active User
                util.activeUserCheck(context);
                util.validateGQLParams(["title", "description", "start"], args);

                let ret = await events.upsert(args?.gid, args.title, args.description, args?.location, args?.images, args.start, args?.end, args?.forms, args?.tag);
                util.checkGQLResults(ret);

                return ret?.results;
            },

            // Forms
            upsertFeatureForm: async(_obj, args, context, _info) => {
                // Validate Active User
                util.activeUserCheck(context);
                util.validateGQLParams(["id","title","fields"], args);

                let ret = await db.upsertFeatureForm(args.id, args.title, args?.description, args.fields, args?.alertEmail);
                util.checkGQLResults(ret);

                return ret?.results;
            },
            submitFormData: async(_obj, args, context, _info) => {
                // Validate Active User
                util.activeUserCheck(context);
                util.validateGQLParams(["type","id","formData"], args);

                let ret = await db.submitFormData(args.type, args.id, args?.parentId, args.formData);
                util.checkGQLResults(ret);

                return (ret?.results != null);
            },

            // Remove Feature Item
            removeFeatureItem: async(_obj, args, context, _info) => {
                // Validate Active User
                util.activeUserCheck(context);
                util.validateGQLParams(["featureType", "id"], args);

                let ret = (args.featureType === "event" ? 
                    await events.remove(args.id) :
                    await db.archiveFeatureItem(args.featureType, args?.id)
                );

                util.checkGQLResults(ret);

                return ret?.results;
            },

            // Leagues
            upsertSport: async(_obj, args, context, _info) => {
                // Validate Active User & Roles
                util.activeUserCheck(context, ['LEAGUE_STORE_ADMIN']);

                let ret = await ls_db.upsertLeagueSport(args?.id, args?.title, args?.icon, args?.description, args?.active);
                util.checkGQLResults(ret);

                return ret?.results;
            },

            // League Store
            updateLeagueStoreConfig: async(_obj, args, context, _info) => {
                // Validate Active User & Roles
                util.activeUserCheck(context, ['LEAGUE_STORE_ADMIN']);
                util.validateGQLParams(["id"], args);

                let ret = await ls_db.updateLeagueStoreConfig(args.id, args?.minimum, args?.category, args?.categorySet, args?.addons);
                util.checkGQLResults(ret);

                return ret?.results;
            },
            upsertLeagueLocation: async(_obj, args, context, _info) => {
                // Validate Active User & Roles
                util.activeUserCheck(context, ['LEAGUE_STORE_ADMIN']);

                let ret = await ls_db.upsertLeagueLocation(args?.id, args?.name, args?.merchantInfo);
                util.checkGQLResults(ret);

                return ret?.results;
            },
            upsertStoreItems: async(_obj, args, context, _info) => {
                // Validate Active User & Roles
                util.activeUserCheck(context, ['LEAGUE_STORE_ADMIN']);

                let ret = await ls_db.storeItems.upsert(args?.store_key, args?.id, args?.item);
                util.checkGQLResults(ret);

                return ret?.results;
            },

            /* League Store Org - Users */
            upsertLeagueStoreOrganization: async(_obj, args, context, _info) => {
                // Validate Active User
                util.activeUserCheck(context);

                let ret = await ls_db.organizations.upsert(args?.id, args?.item);
                util.checkGQLResults(ret);

                return ret?.results;
            },
            upsertLeagueStoreUser: async(_obj, args, context, _info) => {
                // Validate Active User & Roles
                util.activeUserCheck(context);

                let ret = await ls_db.users.upsert(args?.id, args?.item);
                util.checkGQLResults(ret);

                return ret?.results;
            },

            updateQuoteStatus: async(_obj, args, context, _info) => {
                // Validate Active User & Roles
                util.activeUserCheck(context);
                util.validateGQLParams(["status", "id"], args);

                let ret = await ls_db.purchaseOrder.updateStatus(args.id, args.status);
                util.checkGQLResults(ret);

                return ret?.results;
            },

            // Delete League Store Item(s)
            deleteLeagueStoreFeatureItem: async(_obj, args, context, _info) => {
                // Validate Active User & Roles
                util.activeUserCheck(context, ['LEAGUE_STORE_ADMIN']);
                util.validateGQLParams(["id","type"], args);

                let ret = await ls_db.deleteLeagueStoreFeatureItem(args.id, args.type, args?.photoSetId);
                util.checkGQLResults(ret);

                return ret?.results;
            },
        },
        /* Scalar Types */
        Date: new GraphQLScalarType({
            name: 'Date',
            description: 'Date custom scalar type',
            parseValue(value) {
                return (value ? fns.parseISO(value) : null); // value from the client
            },
            serialize(value) {
                const dtStr = util.formatDate(value, 'yyyy-MM-dd HH:mm:ss')
                let d = fns.parseISO(dtStr);
                return (value ? fns.getTime(d) : -1);
            },
            parseLiteral(ast) {
                if (ast.kind === Kind.INT) {
                    return parseInt(ast.value, 10); // ast value is always in string format
                }
                return null;
            },
        }),
        JSONObj: new GraphQLScalarType({
            name: 'JSONObj',
            description: 'JSON Object custom scalar type',
            parseValue(value) {
                if(value && value instanceof Object) {
                    return value;
                }

                return (value ? JSON.parse(value) : null); // value from the client
            },
            serialize(value) {
                let d = (value instanceof Object ? value : JSON.parse(value));
                return d;
                //return (value ? JSON.stringify(d) : null); // value sent to the client
            }
        })
    };

    return resolver;
};