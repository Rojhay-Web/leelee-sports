const { gql } = require('apollo-server-express');

module.exports = gql`
    scalar Date
    scalar JSONObj
    type Query { 
        users:[User]
        user(_id: String!):User
        searchUsers(query:String, role: String, sortType: String, sortAsc: Boolean, page:Int, pageSize: Int): PagedUsers

        registerUser(email: String!, password: String!, firstName: String!, lastName: String):UserAccess
        loginUser(email: String!, password: String!):UserAccess

        loginGUser(token: String!):UserAccess

        sitePages:[SitePage]
        sitePage(key: String!):SitePage
        searchPageContent(query:String, page:Int, pageSize: Int): PagedContentKey

        event(gid:String!):Event
        events(start: String!, end: String!, hasForms: Boolean): [Event]
        queryEvents(query:String, hasForms: Boolean, page:Int, pageSize: Int):PagedEvents

        photos(query:String, photosets:[String], page:Int, pageSize: Int):PagedPhotos
        photosets(query:String, page:Int, pageSize: Int):PagedPhotosets
        photosetImages(id:String!, page:Int, pageSize: Int):PagedPhotos

        videos(query:String, page:Int, pageSize: Int, pageToken: String): PagedVideos

        formDetails(type:String!, id:String!, parentId: String):Form
        querySiteForms(query:String, page:Int, pageSize: Int): PagedForm
        submittedFormData(type: String!, id: String!, parentId: String, page:Int, pageSize: Int):PagedFormData

        googleIcons(query: String): [GoogleIcon]

        sports: [LeagueSports]
        storeConfigs(key: String): [LeagueStoreConfig]
        leagueLocations: [LeagueLocations]
        
        storeItems(location_id: String, store_key: String, query:String, active:Boolean, page:Int, pageSize: Int): PagedLeagueStoreItems

        leagueStoreOrganizations(query:String, page:Int, pageSize: Int): PagedLeagueStoreOrganizations
        leagueStoreUsers(query:String, page:Int, pageSize: Int): PagedLeagueStoreUsers
        leagueStoreUser(id:String!): LeagueStoreUser

        leagueStoreQuotes(status: String, pullAll: Boolean, page:Int, pageSize: Int): PagedLeagueStoreQuote
    }

    type Mutation {
        upsertUser(_id: String, email: String, given_name: String, family_name: String, roles: [String], scopes: JSONObj, sendInvite: Boolean): String
        removeUser(_id: String!): Boolean

        upsertSitePage(title: String!, pageKeys:[PageKeyInput], _id:String):String
        removeSitePage(_id: String!):Boolean

        upsertPageKey(_id: String!, key_id: String, title: String, type: String, meta:JSONObj, value:JSONObj): String
        removePageKey(_id: String!, key_id: String!):Boolean

        deletePhoto(id:String!):Boolean
        createPhotoset(title:String!, description:String):String
        editPhotoset(id:String!, title:String!, description:String):Boolean
        deletePhotoset(id:String!):Boolean
        addPhotosetPhotos(id:String!, photoIds: [String]!):Boolean
        removePhotosetPhotos(id:String!, photoIds: [String]!):Boolean

        upsertEvent(gid:String, title:String!, description:String!, location:String, images:[String], start:Date!, end:Date, forms:[FormInput], tag: String):String
        upsertFeatureForm(id: String!, title: String!, description: String, fields: [FormFieldInput]!, alertEmail: String):Boolean
        submitFormData(type: String!, id: String!, parentId: String, formData: JSONObj!): Boolean

        removeFeatureItem(featureType: String!, id: String!):Boolean

        upsertSport(id:String, title: String, icon: String, description: String, active: Boolean): String
        updateLeagueStoreConfig(id:String!, minimum: Int, category: String, categorySet: [String], addons: [JSONObj]): String
        upsertLeagueLocation(id:String, name: String, merchantInfo: [JSONObj]): String

        upsertStoreItems(store_key: String, id:String, item:JSONObj): String

        upsertLeagueStoreOrganization(id:String, item:JSONObj): String
        upsertLeagueStoreUser(id:String, item:JSONObj): String

        deleteLeagueStoreFeatureItem(id: String!, type: String!, photoSetId: String):Boolean
    }

    input PageKeyInput {
        _id: String
        title: String
        type: String
        metaData: JSONObj
        value: JSONObj
    }

    input FormFieldInput {
        id: String
        title: String!
        type: String!
        required: Boolean
        size: Int

        options: [String]
    }

    input FormInput {
        id: String
        title: String!
        description: String!
        fields: [FormFieldInput]
    }

    type PageKey {
        _id: String
        title: String
        type: String
        metaData: JSONObj
        value: JSONObj
    }

    type ContentKey {
        key: String
        pageKey: PageKey
    }

    type UserAccess {
        user: User
        token: String
    }

    type User {
        _id: String
        email: String
        given_name: String
        family_name: String
        name: String
        picture: String
        verified_email: Boolean

        registration_type: String
        registration_date: Date

        id: String
        roles: [String]
        scopes: JSONObj
    }

    type SitePage {
        _id: String!
        title: String
        key: String
        pageKeys: [PageKey]
    }

    type Photo {
        _id: String
        title: String
        filename: String
        photosets: [String]
        created: Date
        updated: Date
    }
    
    type Photosets {
        _id: String
        title: String
        description: String
        created: Date
    }

    type Video {
        id: String
        title: String
        description: String
        publishedAt: Date
    }

    type PagedPhotosets {
        pagesLeft: Boolean
        results: [Photosets]
    }

    type PagedPhotos {
        pagesLeft: Boolean
        results:[Photo]
    }

    type PagedEvents {
        pagesLeft: Boolean
        results: [Event]
    }

    type PagedFormData {
        pagesLeft: Boolean
        results: [FormData]
    }

    type PagedForm {
        pagesLeft: Boolean
        results: [Form]
    }

    type PagedVideos {
        totalResults: Int
        nextPageToken: String
        prevPageToken: String
        results: [Video]
    }

    type PagedContentKey {
        pagesLeft: Boolean
        results: [ContentKey]
    }

    type PagedUsers {
        pagesLeft: Boolean
        totalCount: Int
        results: [User]
    }

    type Event {
        _id: String
        google_event_id: String
        title: String
        description: String
        location: String
        images: [String]
        start: Date
        end: Date
        tag: String

        forms: [Form]
    }

    type FormField {
        title: String
        type: String
        required: Boolean
        size: Int

        options: [String]
    }

    type Form {
        id: String
        title: String
        description: String
        fields: [FormField]
    }

    type FormData {
        form_type: String
        form_id: String
        form_parent_id: String
        form_data: JSONObj
        timestamp: Date
    }

    type GoogleIcon {
        name: String
        popularity: Int
        categories: [String]
    }

    type LeagueSports {
        _id: String!
        title: String
        icon: String
        description: String
        active: Boolean
    }

    type LeagueStoreAddon {
        id: String
        title: String
        price: Int
        minimum: Int
    }

    type LeagueStoreConfig {
        _id: String!
        key: String
        minimum: Int
        category: String
        categorySet: [String]
        addons:[LeagueStoreAddon]
    }

    type LeagueStoreMerchantInfo {
        title: String
        subText: String
        defaultLogo: Boolean

        store_id: String
    }

    type LeagueLocations {
        _id: String!
        name: String
        merchantInfo: [LeagueStoreMerchantInfo]
    }

    type StoreItemDetails {
        sport_id: String
        sport_info: LeagueSports
        start_dt: Date
        end_dt: Date
        locations: [LeagueLocations]

        customDesign: Boolean
    }

    type LeagueStoreItem {
        _id: String!
        store_item_id: String
        store_id: String
        title: String
        description: String
        active: Boolean
        minimum: Int

        price_per_item: Float 
        additional_set_price: Float 

        category: String
        categorySet: [String]

        details: StoreItemDetails
        addons: [LeagueStoreAddon]
        photos:[Photo]
    }

    type LeagueStoreUser {
        _id: String
        blueprint_id: String
        blueprint_user: User

        sub_org_name: String
        organization_id: String

        organization: LeagueStoreOrganization
        location: LeagueLocations
    }

    type LeagueStoreOrganization {
        _id: String!
        name: String
        address: String
        city: String
        state: String
        zip: String

        billing_area_id: String
        location: LeagueLocations

        merchantInfo: [LeagueStoreMerchantInfo]
    }

    type LeagueStoreQuoteAddOnItem {
        id: Int
        title: String
        count: Int
        minimum: Int
    }

    type LeagueStoreQuoteLineItem {
        _id: String!
        item_count: Int
        overall_category_sel: String
        item_additional_details: String
        
        design_name: String
        design_description: String
        design_img: String

        store_item: LeagueStoreItem

        add_on_list: [LeagueStoreQuoteAddOnItem]
    }

    type LeagueStoreQuoteDiscount {
        percentage: Int
        tag: String
        title: String
        total: Float
    }

    type LeagueStoreQuote {
        _id: String!
        ls_user_id: String
        type: String
        status: String
        invoice_number: String

        core_sub_total: Float
        addon_sub_total: Float
        total: Float

        status_date: Date
        creation_date: Date

        discount: LeagueStoreQuoteDiscount
        line_items: [LeagueStoreQuoteLineItem]
    }

    type PagedLeagueStoreQuote {
        totalResults: Int
        pagesLeft: Boolean
        results: [LeagueStoreQuote]
    }
    
    type PagedLeagueStoreItems {
        totalResults: Int
        pagesLeft: Boolean
        results: [LeagueStoreItem]
    }

    type PagedLeagueStoreUsers {
        totalResults: Int
        pagesLeft: Boolean
        results: [LeagueStoreUser]
    }

    type PagedLeagueStoreOrganizations {
        totalResults: Int
        pagesLeft: Boolean
        results: [LeagueStoreOrganization]
    }
`;