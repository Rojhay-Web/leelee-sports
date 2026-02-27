const { gql } = require('apollo-server-express');

module.exports = gql`
    scalar Date
    scalar JSONObj
    type Query { 
        users:[User]
        user(_id: String!):User
        searchUsers(query:String, role: String, sortType: String, sortAsc: Boolean, page:Int, pageSize: Int): PagedUsers

        registerUser(email: String!, password: String!, firstName: String!, lastName: String):User
        loginUser(email: String!, password: String!):User

        loginGUser(token: String!):User

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
`;