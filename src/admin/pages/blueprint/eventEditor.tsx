import { useEffect, useRef, useState } from 'react';
import { gql, useLazyQuery } from '@apollo/client';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';

import { spiral } from 'ldrs';

import FeatureSearchResults from '../../components/blueprint/featureSearchResults';
import AddEditFeatureItem from '../../components/blueprint/addEditFeatureItem';

import { handleGQLError } from '../../../utils';
import { log } from '../../../utils/log';

type EventCalendarType = {
    hasForms?:boolean,
    handleEventClick: (eventClickInfo:any) => void
}

const GET_EVENTS_QUERY = gql`
query getEvents($start:String!, $end:String!, $hasForms: Boolean){
	events(start: $start, end: $end, hasForms: $hasForms){
      google_event_id
      title
      description
      location
      images
      start
      end
    }
}`;

export function EventCalendar({ hasForms=false, handleEventClick }: EventCalendarType) {
    const calendarRef = useRef(null);
    // GQL Queries
    const [retrieveEvents,{ loading, data }] = useLazyQuery(GET_EVENTS_QUERY, {fetchPolicy: 'no-cache', onError: handleGQLError});
    
    const handleDateSet = (dateInfo:any) => {
        try {
            retrieveEvents({ variables: { 
                start: dateInfo?.start, end: dateInfo?.end, 
                hasForms: hasForms 
            }});
        }
        catch(ex){
            log.error(`Handle Date Set: ${ex}`);
        }
    }

    useEffect(()=> { spiral.register(); },[]);

    return(
        <div className={`event-calendar-container admin-cal-container ${hasForms ? 'form-events' : ''}`}>
            {loading &&
                <div className="cal-loading">
                    <l-spiral size="300" speed="0.9" color="rgba(170,170,170,1)"/>
                </div>
            }
            <FullCalendar ref={calendarRef} plugins={[ dayGridPlugin ]} 
                contentHeight="auto" events={data?.events}
                datesSet={handleDateSet} eventClick={handleEventClick}/>
        </div>
    );
}

export function EventEditor(){
    const [query, setQuery] = useState("");
    const [selEvent, setSelEvent] = useState<string|undefined>();

    const handleEventClick = (eventClickInfo:any) => {
        try {
            // https://fullcalendar.io/docs/eventClick
            log.debug(`[EC]: ${eventClickInfo?.event?.title} | ${eventClickInfo?.event?.extendedProps?.google_event_id}`);
            toggleEventSelect(eventClickInfo?.event?.extendedProps?.google_event_id);
        }
        catch(ex){
            log.error(`Handle Date Click Set: ${ex}`);
        }
    }

    const toggleEventSelect = (id?:string) => {
        try {
            setSelEvent(id);
        }
        catch(ex){
            log.error(`Handle Date Click Set: ${ex}`);
        }
    }

    const searchQuery = (e:any) => {
        try {
            setQuery(e.target.value);
        }
        catch(ex){
            log.error(`Searching: ${ex}`);
        }
    }

    useEffect(()=> { 
        spiral.register(); 
        document.title = "Event Editor";
    },[]);

    return (
        <div className="admin-component event-editor">
            {selEvent !== undefined ?
                <AddEditFeatureItem featureId={selEvent} featureType="event" toggleSelFeature={toggleEventSelect} /> :
                <>
                    <div className="table-action-container t-row">
                        <div className="action-input-container sz-4xx">
                            <span className="material-symbols-outlined">search</span>
                            <input type="text" name="query" placeholder='Search Events' value={query} onChange={searchQuery} />
                        </div>

                        <div className='table-action-btn' onClick={()=> { setSelEvent('~') }}>
                            <span className="material-symbols-outlined">calendar_add_on</span>
                            <span className="btn-title">Add Event</span>
                        </div>
                    </div>
                    {query?.length <= 0 ?
                        <EventCalendar hasForms={false} handleEventClick={handleEventClick} /> :
                        <FeatureSearchResults type="event" query={query} handleSelect={toggleEventSelect}/>
                    }
                </>
            }
        </div>
    );
}
