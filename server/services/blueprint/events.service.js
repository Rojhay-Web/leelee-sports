require('dotenv').config();
const { google } = require('googleapis');
const fns = require('date-fns');

const log = require('../log.service'),
    db = require('./db.service'),
    util = require('../../utils/util'),
    localStore = require('../localCache');

const { EVENT_PROJECT_NUMBER, CALENDAR_ID } = process.env;

module.exports = {
    upsert: async function(google_event_id=null, title, description, location=null, images=[], start, end=null, forms=[], tag=null) {
        try {
            let googleAuth = localStore.getGoogleAuth('https://www.googleapis.com/auth/calendar')
            if(!googleAuth){
                return { 'error': 'Upserting Event [E01]' };
            }

            start = util.formatDate(new Date(start));
            end = util.formatDate(end ?? fns.addHours(new Date(start), 1));

            let googleEvent = buildEvent(title, description, location, start, end);
            if(googleEvent?.error || !googleEvent?.results){
                log.error(googleEvent?.error ?? 'Event Not Created');
                return { error: googleEvent?.error ?? 'Event Not Created'};
            }

            // Get Event Calendar
            const calendar = google.calendar({
                version: 'v3', auth: googleAuth,
                project: EVENT_PROJECT_NUMBER
            });
            
            // Add Event To Calendar
            let evtres = (!!google_event_id ? 
                await calendar.events.update({
                    calendarId: CALENDAR_ID,
                    eventId: google_event_id,
                    resource: googleEvent.results
                }) :
                await calendar.events.insert({
                    calendarId: CALENDAR_ID,
                    resource: googleEvent.results
                })
            );

            if(evtres?.data?.id){
                const db_event_id = await db.upsertEvent(evtres.data.id, title, description, location, images, start, end, forms, tag);
                if(db_event_id?.error || !db_event_id.results){ 
                    log.error(`Upserting DB Event: ${db_event_id?.error}`);
                } 
                return { results: evtres.data.id };
            }
    
            return { results: null };
        }
        catch(ex) {
            log.error(`Upserting Event: ${ex}`);
            return { error: "Upserting Event [E00]" };
        }
    },
    remove: async function(google_event_id){
        try {
            let googleAuth = localStore.getGoogleAuth('https://www.googleapis.com/auth/calendar')
            if(!googleAuth){
                return { 'error': 'Removing Event [E01]' };
            }

            // Get Event Calendar
            const calendar = google.calendar({
                version: 'v3', auth: googleAuth,
                project: EVENT_PROJECT_NUMBER
            });

            await calendar.events.delete({
                calendarId: CALENDAR_ID,
                eventId: google_event_id
            });

            const db_event_res = await db.archiveFeatureItem("event", google_event_id);
            if(db_event_res?.error || !db_event_res.results){ 
                log.error(`Removing DB Event: ${db_event_res?.error}`);
            } 

            return { results: db_event_res.results };
        }
        catch(ex) {
            log.error(`Removing Event: ${ex}`);
            return { error: "Removing Event [E00]" };
        }
    },
    getEvents: async function(start, end, hasForms=false){
        try {
            let googleAuth = localStore.getGoogleAuth('https://www.googleapis.com/auth/calendar')
            if(!googleAuth){
                return { 'error': 'Creating Event [E01]' };
            }

            if(!!hasForms) {
                return await db.checkEventForms(start,end);
            }
            else {
                // Get Event Calendar
                const calendar = google.calendar({
                    version: 'v3', auth: googleAuth,
                    project: EVENT_PROJECT_NUMBER
                });

                let evtres = await calendar.events.list({
                    calendarId: CALENDAR_ID,
                    timeMin: util.parseDateString(start, true),
                    timeMax: util.parseDateString(end, true),
                    orderBy: "startTime", singleEvents: true
                });

                const processedEvents = evtres?.data?.items?.map((evt)=>{
                    return {
                        google_event_id: evt.id,
                        title: evt.summary,
                        description: evt.description,
                        location: evt.location,
                        start: evt.start?.dateTime,
                        end: evt.end?.dateTime
                    }
                });

                return { results: processedEvents ?? [] };
            }           
        }
        catch(ex) {
            log.error(`Getting Events: ${ex}`);
            return { error: "Getting Events [E00]" };
        }
    }
}

/* Private Events */
function buildEvent(title, description, location=null, start, end){
    try {
        let ret= {}, error = [];
        if(!title || title.length <= 0){ error.push('title'); }
        if(!description || description.length <= 0){ error.push('description'); }
        
        if(!start || !util.validateDate(start)){ error.push('Start Time'); }
        if(!end || !util.validateDate(end)){ error.push('End Time'); }

        if(error?.length > 0) {
            log.warning(`Error Building Event due to following event issues: ${error.join(', ')}`);
            return { 'error': `Please fix the following event issues: ${error.join(', ')}`};
        }

        ret = { 
            summary: title,
            description: description,
            location: location,
            start: {
                'dateTime': util.parseDateString(start,false),
                'timeZone': 'America/New_York',
            },
            end: {
                'dateTime': util.parseDateString(end, false),
                'timeZone': 'America/New_York',
            }
        }; 

        return { results: ret };
    }
    catch(ex){
        log.error(`Building Event: ${ex}`);
        return { 'error':`Building Event: ${ex}` };
    }
}