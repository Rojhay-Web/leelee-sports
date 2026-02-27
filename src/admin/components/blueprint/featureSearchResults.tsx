import { useEffect, useRef, useState } from 'react';
import { gql, useLazyQuery } from '@apollo/client';
import Slider from "react-slick";
import { spiral } from 'ldrs';
import parse from 'html-react-parser';

import { SiteEvent } from '../../../datatypes';
import { handleGQLError, formatDateStr } from '../../../utils';

// Import css files
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { log } from '../../../utils/log';

const QUERY_EVENTS_QUERY = gql`
query searchEvents($query:String, $hasForms:Boolean, $page:Int, $pageSize:Int){
	queryEvents(query:$query, hasForms:$hasForms, page:$page, pageSize:$pageSize){
        pagesLeft
        results {
            google_event_id
            title
            description
            location
            images
            start
            end
        }
    }
}`,
QUERY_ANNOUNCEMENTS_QUERY = gql`
query searchAnnouncements($query:String, $hasForms:Boolean, $page:Int, $pageSize:Int){
	announcements(query:$query, hasForms:$hasForms, page:$page, pageSize:$pageSize){
        pagesLeft
        results {
            _id
            title
            description
            images
        }
    }
}`;

const DEFAULT_PAGE_SIZE = 16;

type FeatureSearchResultsType = {
    type: string, hasForms?:boolean, query?: string,
    mini?:boolean, handleSelect: (id?: string) => void
};

function FeatureSearchResults({ type, hasForms=false, mini=false, query="", handleSelect }: FeatureSearchResultsType){
    const [page, setPage] = useState(1);
    const [slide, setSlide] = useState(0);
    const [display, setDisplay] = useState<SiteEvent[]>([]);

    const results_settings = {
        className: "center",
        infinite: false,
        centerPadding: "60px",
        slidesToShow: 2,
        slidesToScroll: 1,
        speed: 500,
        rows: 2,
        slidesPerRow: 2,
        responsive: [
            {
                breakpoint: 770,
                settings: {
                    slidesToShow: 1,
                    infinite: false
                }
            }
        ],
        afterChange: (current: number) => { log.error('Slide Change', current); setSlide(current); }
    },
    type_title: { [key: string]: string } = { 
        "event": 'Upcoming Events',
        "announcement": "Announcements"
    };

    const hasPagesLeft = useRef(true);
    const sliderRef = useRef(null);
    const totalSlides = useRef(0);
    const pageRender = useRef(false);

    // GQL Queries
    const [searchEvents,{ loading: event_loading, data: event_data }] = useLazyQuery(QUERY_EVENTS_QUERY, {fetchPolicy: 'no-cache', onError: handleGQLError});
    const [searchAnnoucements,{ loading: announcement_loading, data: announcement_data }] = useLazyQuery(QUERY_ANNOUNCEMENTS_QUERY, {fetchPolicy: 'no-cache', onError: handleGQLError});    

    const queryFeatureData = () => {
        try {
            if(!!hasPagesLeft?.current){
                if(!event_loading && type === "event"){
                    searchEvents({ variables: { query: query, hasForms: hasForms, page: page, pageSize: DEFAULT_PAGE_SIZE}});
                }
                else if(!announcement_loading && type === "announcement"){
                    searchAnnoucements({ variables: { query: query, hasForms: hasForms, page: page, pageSize: DEFAULT_PAGE_SIZE}})
                }
            }
        }
        catch(ex){
            log.error(`Quering Feature Data: ${ex}`);
        }
    }

    const selectFeatureItem = (id?: string) => {
        if(handleSelect && id){
            handleSelect(id);
        }
    }

    const renderFeatureItem = (item: SiteEvent, key: number) => {
        try {
            const hasForms = item?.forms && item?.forms?.length > 0;

            switch(type){
                case "event":
                    const startDt = (item?.start ? (new Date(item?.start)).toISOString() : '');
                    const monthClass = formatDateStr(startDt,'MMM').toLowerCase();
                    

                    return(
                        <div className={`feature-item-container ${!!mini ? 'mini-item' : ''}`} onClick={()=> selectFeatureItem(item?.google_event_id)} key={key}>
                            <div className='out-arrow'>
                                <span className="material-symbols-outlined">arrow_outward</span>
                            </div>
                            <div className='feature-item event'>
                                <div className='feature-item-img'>
                                    {(item?.images && item.images.length > 0) && <img src={item.images[0]} alt={`${item.title} cover`} /> }
                                </div>
                                <div className='feature-item-content split'>
                                    <div className='feature-event-date'>
                                        <div className='event-time'>{formatDateStr(startDt,'h:mm bbb')}</div>
                                        <div className={`event-month ${monthClass}`}>{formatDateStr(startDt,'MMM')}</div>
                                        <div className='event-day'>{formatDateStr(startDt,'dd')}</div>
                                    </div>
                                    <div className='feature-event-info'>
                                        <h3>{item.title}</h3>
                                        {(!mini) && <div className='description'>{parse(item.description)}</div>}
                                    </div>
                                </div>
                                {hasForms && <div className='feature-item-form'>Attached Form(s)</div> }
                            </div>
                        </div>
                    );
                default:
                    return(<></>);
            }
        }
        catch(ex){
            log.error(`Rendering Feature Item: ${ex}`);
        }
    }

    useEffect(()=>{
        hasPagesLeft.current = true;
        pageRender.current = false;
        setDisplay([]);

        if(page === 1){
            queryFeatureData();
        }
        else {
            setPage(1);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[type, query]);

    useEffect(()=>{ 
        queryFeatureData(); 
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[page]);

    useEffect(()=>{
        if(!event_loading && event_data){
            hasPagesLeft.current = event_data?.queryEvents?.pagesLeft === true;

            setDisplay((d)=> {
                let data_ret = event_data?.queryEvents?.results;
                let ret = (page === 1 ? [...data_ret ] : [...d, ...data_ret]);

                return ret;
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[event_loading, event_data]);

    useEffect(()=>{
        if(!announcement_loading && announcement_data){
            hasPagesLeft.current = announcement_data?.announcements?.pagesLeft === true;

            setDisplay((d)=> {
                let data_ret = announcement_data?.announcements?.results;
                const ret = (page === 1 ? [...data_ret] : [...d, ...data_ret]);

                return ret;
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[announcement_loading, announcement_data]);

    useEffect(()=>{
        totalSlides.current = Math.ceil(display.length / 8);
    },[display])

    useEffect(()=>{
        if(pageRender.current && hasPagesLeft.current && slide >= (totalSlides.current - 1)) {
            setPage((p) => { return p + 1; });
        }

        pageRender.current = true;
    },[slide]);

    useEffect(()=> { spiral.register(); },[]);

    return (
        <div className="feature-search-container">
            {(!mini) && <h2 className='query-string-text'>Searching {type_title[type]} "{query}"</h2>}
            <div className="feature-search-results">
                {(page === 1 && (event_loading || announcement_loading)) ?
                    <div className="feature-loading">
                        <l-spiral size="300" speed="0.9" color="rgba(170,170,170,1)"/>
                    </div> : 
                    <>
                        {display?.length > 0 ?
                            <Slider {...results_settings} ref={sliderRef}>
                                {display.map((item,i)=> renderFeatureItem(item, i) )}
                            </Slider> :
                            <div className='no-feature-data'>Sorry No Events For This Query</div>
                        }
                    </>
                }
            </div>
        </div>
    );
}

export default FeatureSearchResults;