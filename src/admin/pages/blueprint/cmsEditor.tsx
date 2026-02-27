import { useContext, useEffect, useRef, useState } from "react";
import { gql, useLazyQuery, useMutation } from '@apollo/client';
import { toast } from 'react-toastify';
import * as _ from 'lodash';
import { spiral } from 'ldrs';

import userContext from "../../../context/user.context";

import AdminTable from "../../components/blueprint/adminTable";

import { AdminTableColType, SitePage, UserContextType } from "../../../datatypes";
import { handleGQLError } from "../../../utils";
import { log } from "../../../utils/log";

const MAX_NEW_ROWS = 1, NEW_PAGE_KEY=".~.";
const tableSetup: AdminTableColType[] = [
    { title: "Title", key:"title", type: "text", default: "", required: true },
    { 
        title: "Type", key:"type", type: "select", default: "", 
        options:[ "title", "description","list","images", "custom_list"], required: true 
    },
    { 
        title: "", key:"metaData", type: "select_metadata",
        selectKey: "type", 
        dictionary:{ 
            "list":[{ key: "max", type: "number", default: 0 }],
            "images":[
                { key: "max", type: "number", default: 0 }, 
                { key: "tag", type: "text", default: "", required: true }
            ],
            "custom_list":[{ key: "fields", type: "field_list", custom: true, default: []}]
        }, default: {}, required: false 
    }
];

const GET_SITE_PAGES_QUERY = gql`
    query GetSitePages{
        sitePages{
            _id
            title
            key
        }
    }`,
GET_IND_SITE_PAGE_QUERY = gql`
    query GetSitePage($key: String!) { 
        sitePage(key: $key) {
            _id
            title
            key
            pageKeys {
                _id
                title
                type
                metaData
                value
            }
        }
    }`,
UPSERT_PAGE_MUTATION = gql`
    mutation UpsertSitePage($title: String!, $_id:String){
        upsertSitePage(title: $title, _id: $_id)
    }`,
REMOVE_PAGE_MUTATION = gql`
    mutation RemoveSitePage($_id:String!){
        removeSitePage(_id: $_id)
    }`,
UPSERT_PAGEKEY_MUTATION = gql`
    mutation UpsertPageKey($_id: String!, $key_id: String, $title: String, $type: String, $meta:JSONObj, $value:JSONObj){
        upsertPageKey(_id: $_id, key_id: $key_id, title: $title, type: $type, meta: $meta, value: $value)
    }`,
REMOVE_PAGEKEY_MUTATION = gql`
    mutation RemovePageKey($_id: String!, $key_id: String!){
        removePageKey(_id: $_id, key_id: $key_id)
    }`;

function CmsSiteEditor(){
    const [selPage, setSelPage] = useState("");
    const [selPageData, setSelPageData] = useState<SitePage | null>(null);

    const pillScrollRef = useRef<HTMLDivElement>(null);
    const localNewPage = useRef<SitePage | null>(null);

    const { user } = useContext(userContext.UserContext) as UserContextType;

    // GQL Queries
    const authHeader = {context: { headers: { "Authorization": user?._id }}};
    const [retrievePages,{ loading: site_pages_loading, data: site_pages_data }] = useLazyQuery(GET_SITE_PAGES_QUERY, {fetchPolicy: 'no-cache', ...authHeader, onError: handleGQLError});
    const [retrievePage,{ loading: site_page_loading, data: site_page_data, refetch: site_page_refetch }] = useLazyQuery(GET_IND_SITE_PAGE_QUERY, {fetchPolicy: 'no-cache', ...authHeader, onError: handleGQLError});

    // Mutations
    const [upsertPage,{ loading: upsert_pg_loading, data: upsert_pg_data }] = useMutation(UPSERT_PAGE_MUTATION, {fetchPolicy: 'no-cache', ...authHeader, onError: handleGQLError });
    const [removePage,{ loading: remove_pg_loading, data: remove_pg_data }] = useMutation(REMOVE_PAGE_MUTATION, {fetchPolicy: 'no-cache', ...authHeader, onError: handleGQLError });
    const [upsertPageKey,{ loading: upsert_key_loading, data: upsert_key_data }] = useMutation(UPSERT_PAGEKEY_MUTATION, {fetchPolicy: 'no-cache', ...authHeader, onError: handleGQLError });
    const [removePageKey,{ loading: remove_key_loading, data: remove_key_data }] = useMutation(REMOVE_PAGEKEY_MUTATION, {fetchPolicy: 'no-cache', ...authHeader, onError: handleGQLError });
    
    /* Application Functions*/
    const controlSlider = (ref:any, dir:string) => {
        try {
            let offsetWidth = ref.current.offsetWidth,
                scrollWidth = ref.current.scrollWidth;

            if(scrollWidth > offsetWidth){
                let scrollSz = (offsetWidth <= 770 ? 220 : ((scrollWidth - offsetWidth) / 2)),
                    newScrollLeft = ref.current.scrollLeft;

                if(dir === "prev"){
                    newScrollLeft = ref.current.scrollLeft - scrollSz;
                }
                else if(dir === "next"){
                    newScrollLeft = ref.current.scrollLeft + scrollSz;
                }

                ref.current.scrollLeft = newScrollLeft;
            }
        }
        catch(ex){
            log.error(`Error Controlling Slider: ${ex}`);
        }
    }

    const toggleNewPage = () => {
        setSelPage(NEW_PAGE_KEY);
    }

    const handlePageChange = (e:any) => {
        try {
            let { name, value } = e.target;

            setSelPageData((d: any)=> {
                let tmp = _.cloneDeep(d);
                return {...tmp, [name]:value };
            });
        }
        catch(ex){
            log.error(`Updating Page: ${ex}`);
        }
    }

    const addKeyRow = () => {
        try {
            let newRow = selPageData?.pageKeys.filter((p) => { return !p._id; });
            if(newRow && newRow?.length >= MAX_NEW_ROWS){
                toast.warning(`You have ${MAX_NEW_ROWS} pending new page key, please save the pending key before adding any more.`, { position: "top-right",
                    autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                    draggable: true, progress: undefined, theme: "light" });
            }
            else if(!selPageData?._id){
                toast.warning(`Please save your page before adding keys.`, { position: "top-right",
                    autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                    draggable: true, progress: undefined, theme: "light" });
            }
            else {
                setSelPageData((d: any)=>{
                    let tmp = _.cloneDeep(d);
                    tmp.pageKeys.unshift({ title: "", type:"", metaData:{}, value:{ data: ""}});

                    return tmp;
                });
            }
        }
        catch(ex){
            log.error(`Adding Key Row: ${ex}`);
        }
    }

    /* Data Functions */
    const savePage = () => {
        try {
            if(!selPageData?.title){
                toast.warning(`Please make sure the page has a title`, { position: "top-right",
                    autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                    draggable: true, progress: undefined, theme: "light" });
            }
            else {
                upsertPage({ variables: { 
                    title: selPageData.title, 
                    ...(selPageData?._id ?  {_id: selPageData._id} : {})
                }});
            }
        }
        catch(ex){
            log.error(`Saving Site Page: ${ex}`);
        }
    }

    const deletePage = () => {
        try {
            if(window.confirm('Are you sure you want to remove this page and all of its data?')){
                if(!selPageData?._id){
                    localNewPage.current = null;
                    setSelPageData(null);
                }
                else {
                    removePage({ variables: { _id: selPageData._id }});
                }
            }
        }
        catch(ex){
            log.error(`Removing Site Page: ${ex}`);
        }
    }
    
    const saveKeyRow = (row: any) => {
        try {
            if(!selPageData?._id){
                toast.error(`Please save your page prior to adding page key.`, { position: "top-right",
                    autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                    draggable: true, progress: undefined, theme: "light" });
            }
            else {
                let isValid = true;
                tableSetup.forEach((s)=> {
                    if(s.required && _.isEmpty(row[s.key])){
                        isValid = false;
                    }
                });

                if(!isValid) {
                    toast.error(`Unable to Save Row: Please make sure you don't leave any fields empty.`, { position: "top-right",
                        autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                        draggable: true, progress: undefined, theme: "light" });
                }
                else {
                    if(selPageData && !selPageData?._id) {
                        localNewPage.current = null;
                    }

                    // Upsert Page Key
                    upsertPageKey({ variables: {
                        _id: selPageData._id, key_id: row._id, title: row.title, 
                        type: row.type, meta: row.metaData, value: row.value
                    }});
                }
            }
        }
        catch(ex){
            log.error(`Saving Row: ${ex}`);
        }
    }

    const deleteKeyRow = (_id: string | undefined, newIdx: number) => {
        try {
            if(_id) {
                if(!selPageData?._id){
                    toast.warning(`Make sure the page has been saved.`, { position: "top-right",
                        autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                        draggable: true, progress: undefined, theme: "light" });
                }
                else {
                    removePageKey({ variables: { _id: selPageData?._id, key_id: _id }})
                }
            }
            else if(newIdx >= 0){
                setSelPageData((d: any)=>{
                    let tmp = _.cloneDeep(d);
                    tmp.pageKeys.splice(newIdx,1);
                    return tmp;
                });
            }
        }
        catch(ex){
            log.error(`Deleting Row: ${ex}`);
        }
    }

    useEffect(()=>{ spiral.register(); document.title = "CMS Editor"; },[]);

    useEffect(()=> {
        if(selPage === NEW_PAGE_KEY){
            if(localNewPage?.current){
                setSelPageData(localNewPage.current);
            }
            else {
                localNewPage.current = { title:"", pageKeys:[] };
                setSelPageData({ title:"", pageKeys:[] });
            }
        }
        else {
            if(selPage) {
                if(selPageData && !selPageData?._id) {
                    localNewPage.current = _.cloneDeep(selPageData);
                }
                retrievePage({ variables: { key: selPage }});
            }
            else if(selPageData){
                setSelPageData(null);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[selPage]);

    useEffect(()=>{
        if(site_page_data?.sitePage){
            setSelPageData(site_page_data.sitePage);
        }
    },[site_page_data]);

    // Refresh Page Data On Completion of action
    useEffect(()=>{ 
        if(!site_pages_loading && !remove_pg_loading && !upsert_pg_loading){
            retrievePages({});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[upsert_pg_loading, remove_pg_loading]);

    useEffect(()=>{ 
        if(!site_pages_loading && !remove_pg_loading && remove_pg_data?.removeSitePage){
            toast.success(`Removed Site Page.`, { position: "top-right",
                autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                draggable: true, progress: undefined, theme: "light" });

            setSelPageData(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[remove_pg_data]);

    useEffect(()=>{ 
        if(!site_pages_loading && !upsert_pg_loading && upsert_pg_data?.upsertSitePage){
            toast.success(`Upserted Site Page.`, { position: "top-right",
                autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                draggable: true, progress: undefined, theme: "light" });

            if(selPage === upsert_pg_data.upsertSitePage){
                site_page_refetch();
            }
            else {
                setSelPage(upsert_pg_data.upsertSitePage);
                localNewPage.current = null;
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[upsert_pg_data]);

    // Refresh on key changes
    useEffect(()=>{ 
        if(!upsert_key_loading && !remove_key_loading && selPage &&
            (upsert_key_data?.upsertPageKey || remove_key_data?.removePageKey)
        ){
            site_page_refetch();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[upsert_key_loading, remove_key_loading]);

    return(
        <div className="admin-component cms-site-editor">
            <div className="table-action-container">
                <div className="pill-list-container">
                    <span className="material-symbols-outlined ctrl" onClick={()=> controlSlider(pillScrollRef, "prev")}>chevron_left</span>
                    <div className="scroll-pill-list" ref={pillScrollRef}>
                        <div className={`pill-add-btn ${!selPageData || selPageData?._id ? "" : "text"}`} onClick={toggleNewPage}>
                            <span className="material-symbols-outlined">add</span>
                            <span className="new-page-title">New Page</span>
                        </div>
                        {site_pages_data?.sitePages.map((pg: SitePage, i: number)=>
                            <div className={`pill-item ${pg.key === selPage ? 'sel' : ''}`} key={i} onClick={()=> { if(pg.key) setSelPage(pg.key); }}>{pg.title}</div>
                        )}
                    </div>
                    <span className="material-symbols-outlined ctrl" onClick={()=> controlSlider(pillScrollRef, "next")}>chevron_right</span>
                </div>
            </div>

            {/* CMS Info */}
            {site_page_loading ?
                <div><l-spiral size="150" speed="0.9" color="rgba(0,41,95,1)"></l-spiral></div> :
                <>
                    {!selPageData ?
                        <div className="admin-loading">
                            <p>Please select a site page to begin making changes</p>
                        </div>: 
                        <>
                            <div className="page-title-container">
                                <input className='title-input' type="text" name="title" placeholder="Enter Page Title..." value={selPageData?.title} onChange={handlePageChange} />

                                <div className="title-btn-container bookend">
                                    <div className="add-key-btn" onClick={addKeyRow}>
                                        <span className="material-symbols-outlined">library_add</span>
                                        <span>Add Page Key</span>
                                    </div>
                                    <span className={`material-symbols-outlined icon-btn`} onClick={savePage}>save</span>
                                    <span className="material-symbols-outlined icon-btn remove" onClick={deletePage}>remove_selection</span>
                                </div>
                            </div>

                            <AdminTable data={selPageData?.pageKeys} cols={tableSetup} loading={site_pages_loading} saveRow={saveKeyRow} deleteRow={deleteKeyRow}/>
                        </>
                    }   
                </>
            }
        </div>
    );
}

export default CmsSiteEditor;