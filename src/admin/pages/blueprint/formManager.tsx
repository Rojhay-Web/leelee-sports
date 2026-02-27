import { useEffect, useState } from "react";
import { gql, useLazyQuery } from '@apollo/client';

import { DEBOUNCE_TIME, handleGQLError } from "../../../utils";
import { Form } from "../../../datatypes";

import { EventCalendar } from "./eventEditor";
import FormDataTable from "../../components/blueprint/formDataTable";
import FeatureSearchResults from "../../components/blueprint/featureSearchResults";
import { log } from "../../../utils/log";

type FmConfigType = {
    type: string, title: string, form_type: string,
    searchComponent: string, hasSearch: boolean
};

const FM_CONFIG: {[key:string]: FmConfigType } = {
    site_forms:{
        type: 'site', title: 'Site Forms', form_type: 'site_forms',
        searchComponent: 'site_search', hasSearch: false
    },
    event_forms: {
        type: 'event', title: 'Events', form_type: 'events',
        searchComponent: 'event_calendar', hasSearch: false
    },
    announcement_forms: { 
        type: 'announcement', title: 'Announcement', form_type: 'announcements',
        searchComponent: 'feature_search', hasSearch: true
    }
},
DEFAULT_PAGE_SIZE = 8;

const QUERY_SITE_FORMS = gql`
query searchSiteForms($query:String, $page:Int, $pageSize:Int){
    querySiteForms(query:$query, page:$page, pageSize:$pageSize){
        pagesLeft
        results {
            id
            title
        }
    }
}`;

function FormSearch({ handleSelect }: {query?: string, handleSelect: (id?:string) => void }) {
    const [searchForms,{ loading, data }] = useLazyQuery(QUERY_SITE_FORMS, {fetchPolicy: 'no-cache', onError: handleGQLError});

    useEffect(()=>{
        document.title = "Form Data Manager";
        searchForms({ variables: { query: '', page: 1, pageSize: DEFAULT_PAGE_SIZE }});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[]);

    return(
        <div className="form-list">
            {loading ?
                <>Loading....</>:
                <>
                    {data?.querySiteForms?.results?.length > 0 ?
                        <>
                            {data?.querySiteForms.results.map((form: Form, i: number) =>
                                <div className="form-item" key={i} onClick={() => handleSelect(form.id) }>
                                    <span className="item-id">{form.id}</span>
                                    <span className="title">{form.title}</span>
                                </div>
                            )}
                        </> :
                        <div className="empty-list">Sorry Unable To Retrieve List</div>
                    }
                </>
            }
        </div>
    );
}

function FormManager(){
    const [activeTab, setActiveTab] = useState('site_forms');
    const [featureId, setFeatureId] = useState<string|null>(null);

    const [displaySearch, setDisplaySearch] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    const toggleActiveTab = (tab: string) => {
        try {
            if(tab !== activeTab){
                setFeatureId(null);
                setActiveTab(tab);
            }
        }
        catch(ex){
            log.error(`Toggling Active Tab: ${ex}`);
        }
    }

    const debounceSearch = (e:any) => { 
        setDisplaySearch(e.target.value);
    }

    const toggleFeatureSelect = (id?:string | null) => {
        try {
            if(id) setFeatureId(id);
        }
        catch(ex){
            log.error(`Handle Date Click Set: ${ex}`);
        }
    }

    const handleEventClick = (eventClickInfo:any) => {
        try {
            toggleFeatureSelect(eventClickInfo?.event?.extendedProps?.google_event_id);
        }
        catch(ex){
            log.error(`Handle Date Click Set: ${ex}`);
        }
    }

    // Effect Hooks
    useEffect(() => {
        const delayInputTimeoutId = setTimeout(() => {
            setSearchQuery(displaySearch);
        }, DEBOUNCE_TIME);

        return () => clearTimeout(delayInputTimeoutId);
    }, [displaySearch]);

    return (
        <div className="admin-component form-manager">
            <div className="feature-tab-row">
                <div className={`feature-tab ${(activeTab === 'site_forms' ? 'active' : 'inactive')}`} onClick={()=> toggleActiveTab('site_forms')}>
                    <div className="tab-content">
                        <span className="material-symbols-outlined">language</span>
                        <span className="tab-title">Site Forms</span>
                    </div>
                </div>

                <div className={`feature-tab ${(activeTab === 'event_forms' ? 'active' : 'inactive')}`} onClick={()=> toggleActiveTab('event_forms')}>
                    <div className="tab-content">
                        <span className="material-symbols-outlined">event_note</span>
                        <span className="tab-title">Event Forms</span>
                    </div>
                </div>

                <div className={`feature-tab ${(activeTab === 'announcement_forms' ? 'active' : 'inactive')}`} onClick={()=> toggleActiveTab('announcement_forms')}>
                    <div className="tab-content">
                        <span className="material-symbols-outlined">assignment</span>
                        <span className="tab-title">Announcement Forms</span>
                    </div>
                </div>
            </div>

            <div className="form-manager-container">
                {!featureId ? 
                    <>
                        {FM_CONFIG[activeTab].hasSearch &&
                            <div className="table-action-container t-row">
                                <div className="action-input-container sz-4xx">
                                    <span className="material-symbols-outlined">search</span>
                                    <input type="text" name="query" placeholder={`Search ${FM_CONFIG[activeTab].title}`} value={displaySearch} onChange={debounceSearch} />
                                </div>
                            </div>
                        }

                        {FM_CONFIG[activeTab].searchComponent === "event_calendar" &&
                            <EventCalendar hasForms={true} handleEventClick={handleEventClick} />
                        }

                        {FM_CONFIG[activeTab].searchComponent === "feature_search" &&
                            <FeatureSearchResults type={FM_CONFIG[activeTab].type} hasForms={true} 
                                mini={true} query={searchQuery} handleSelect={toggleFeatureSelect}/>
                        }

                        {FM_CONFIG[activeTab].searchComponent === "site_search" && 
                            <FormSearch handleSelect={toggleFeatureSelect} />
                        }
                    </> :
                    <FormDataTable formType={FM_CONFIG[activeTab].form_type} featureId={featureId} toggleFeatureSelect={() => setFeatureId(null)} />
                }
            </div>
        </div>
    );
}

export default FormManager;