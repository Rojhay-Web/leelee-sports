import { CSSProperties, Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { Column, ColumnDef, flexRender, getCoreRowModel, SortingState, useReactTable } from "@tanstack/react-table";
import { gql, useLazyQuery, useMutation, useQuery } from '@apollo/client';
import Rodal from "rodal";
import { spiral } from 'ldrs';
import * as _ from 'lodash';
import { toast } from "react-toastify";

import { LeagueStoreItemType } from "../../../datatypes/customDT";
import { API_URL, DEBOUNCE_TIME, handleGQLError } from "../../../utils";
import { adminSideModalStyle, expiredDateStr } from "../../../utils/_customUtils";
import { log } from "../../../utils/log";

import { UserRegDateCell } from "../../../admin/components/blueprint/userManagementTable";
import TableManagementModalRow from "./tableManagementRow";
import TablePaginationComponent from "./tablePaginationComponent";
import TagImageEditor from "./tagImageEditorComponent";

type LeagueStoreItemManagerType = {
    type:string,
    selLeagueStoreItem?: LeagueStoreItemType,
    setSelLeagueStoreItem: Dispatch<SetStateAction<LeagueStoreItemType | undefined>>,
}

type LeagueStoreItemManagerModalType = {
    type?:string, 
    selLeagueStoreItem?: LeagueStoreItemType,
    setSelLeagueStoreItem: Dispatch<SetStateAction<LeagueStoreItemType | undefined>>,
    modalStatus: boolean,
    setModalStatus: Dispatch<SetStateAction<boolean>>,
}

// GQL
const GET_STORE_ITEM_QUERY = gql`
query GetStoreItems($store_key: String, $query:String, $active:Boolean, $page:Int, $pageSize: Int){
    storeItems(store_key: $store_key, query: $query, active: $active, page: $page, pageSize: $pageSize){
        totalResults
        pagesLeft
        results {
            _id
            store_id
            store_item_id
            title
            description
            active
            minimum

            price_per_item
            additional_set_price

            category
            categorySet

            details {
                customDesign
                sport_id
                sport_info {
                    icon
                }
                start_dt
                end_dt
                locations {
                    _id
                    name
                }
            }
            addons {
                title
                price
                minimum
            }
            photos {
                _id
            }
        }
    }
}`,
GET_STORE_CONFIG_QUERY = gql`
query GetStoreConfig($key: String){
    storeConfigs(key: $key){
        key
        minimum
        category
        categorySet
        addons {
            id
            title
            price
            minimum
        }
    }
}`,
UPSERT_STORE_ITEM_MUTATION = gql`
mutation UpdateLeagueStoreItem($id:String, $item: JSONObj){
    upsertStoreItems(id: $id, item: $item)
}`,
REMOVE_FEATURE_ITEM_MUTATION = gql`
mutation RemoveLeagueStoreFeatureItem($id:String!, $type: String!, $photoSetId: String){
    deleteLeagueStoreFeatureItem(id: $id, type: $type, photoSetId: $photoSetId)
}`;

const PAGE_SIZE = 15;
const storeConfig: {[key:string]: any} = {
    "leagues":{
        "title":"League",
        "maxPhotoCount":1,
        "columns":[
            { 
                id:"photo",
                header: 'Photo', accessorKey: 'photos', 
                cell: ({ row }: { row: any}) => { 
                    const cover_photo = row.original?.photos?.length > 0 ? row.original?.photos[0] : null;
                    
                    return <div className="usrmgt_cell ctr_cell">
                        {cover_photo ?
                            <div className="img-cover">
                                <img src={`${API_URL}/kaleidoscope/${cover_photo._id}`} alt={`${row.original?.title} Cover`}/>
                            </div> :
                            <div className="img-cover empty"><span className="material-symbols-outlined">no_photography</span></div>
                        }
                    </div>
                }
            },
            { 
                id:"title",
                header: 'League Name', accessorKey: 'title', 
                cell: ({ row }: { row: any }) => { 
                    return <div className="usrmgt_cell ctr_cell">{row.original.title}</div>
                }
            },
            { 
                id:"active",
                header: 'Is Active?', accessorKey: 'active', 
                cell: ({ row }: { row: any}) => { 
                    return <div className="usrmgt_cell ctr_cell">
                        {row.original.active && !expiredDateStr(row.original?.details?.end_dt) ? 
                            <span className="material-symbols-outlined">check</span> : 
                            <></>
                        }
                    </div>
                }
            },
            { 
                id:"price_per_item",
                header: 'Price Per', accessorKey: 'price_per_item', 
                cell: ({ row }: { row: any}) => { 
                    let priceStr = 'No Price Set';

                    const formatter = new Intl.NumberFormat('en-US', {
                      style: 'currency', currency: 'USD'
                    });
                    
                    if(row.original.price_per_item && !isNaN(row.original.price_per_item)){
                        priceStr = formatter.format(Number(row.original.price_per_item));
                    }

                    return <div className="usrmgt_cell ctr_cell">{priceStr}</div>
                }
            },
            { 
                id:"sport",
                header: 'Sport', accessorKey: 'details', 
                cell: ({ row }: { row: any}) => { 
                    return <div className="usrmgt_cell ctr_cell">
                        {row.original?.details?.sport_info?.icon ? 
                            <span className="material-symbols-outlined">{row.original.details.sport_info.icon}</span> : 
                            <></>
                        }
                    </div>
                }
            },

            { 
                id:"start_dt",
                header: 'League Start', accessorKey: 'details', 
                cell: ({ row }: { row: any}) => { 
                    return <UserRegDateCell registration_date={row.original.details?.start_dt} date_format={'MM-dd-yyyy'} />;
                }
            },
            { 
                id:"end_dt",
                header: 'League End', accessorKey: 'details', 
                cell: ({ row }: { row: any}) => { 
                    return <UserRegDateCell registration_date={row.original.details?.end_dt} date_format={'MM-dd-yyyy'} />;
                }
            }
        ],
        "detailsConfig":{
            fields:[
                { icon:'title', title: 'League Title', key:'title', type: 'text', net_new_active: false },                
                { icon:'description', title: 'League Description', key:'description', type: 'description', net_new_active: false },
                { icon:'toggle_on', title: 'League Is Active', key:'active', type: 'toggle', net_new_active: false },
                { icon:'toggle_on', title: 'Minumum Participants', key:'minimum', type: 'number', net_new_active: false },
                { icon:'price_change', title: 'Price Up To Minimum', key:'price_per_item', type: 'dollar', net_new_active: false },
                { icon:'attach_money', title: 'Additional Participants Price', key:'additional_set_price', type: 'dollar', net_new_active: false },

                { icon:'type_specimen', title: 'League Type', key:'category', type: 'text', net_new_active: false, title_vert_set: true },
                { icon:'tv_options_edit_channels', title: 'League Type Options', key:'categorySet', type: 'category_list_options', net_new_active: false, title_vert_set: true },

                { icon:'info', title: 'League Details', key:'details', type: 'league_store_item_details', net_new_active: false, title_vert_set: true, overflow_field_content: true },
                { icon:'event_list', title: 'Addons', key:'addons', type: 'addons_list_options', net_new_active: false, title_vert_set: true },
            ]
        }
    },
    "apparel": { 
        "title":"Apparel",
        "maxPhotoCount":6,
        "columns":[],
        "detailsConfig":{
            fields:[]
        }
    }
};

function LeagueStoreItemManagerModal({ type, modalStatus, setModalStatus, selLeagueStoreItem, setSelLeagueStoreItem }:LeagueStoreItemManagerModalType){
    const [key, setKey] = useState(0);

    const [editStoreItem, setEditStoreItem] = useState<LeagueStoreItemType|undefined>();
    const [inProgress, setInProgress] = useState(false);

    const pageTitle = `${(selLeagueStoreItem?._id !== undefined ? `Update` : 'Add')} ${(type && type in storeConfig) ? storeConfig[type].title : 'Store'}`;
    const { loading, data }= useQuery(GET_STORE_CONFIG_QUERY, { variables:{ type: type }, fetchPolicy: 'no-cache' });

    const [upsertStoreItem,{ loading: upsert_loading, data: upsert_data, error: upsert_error }] = useMutation(UPSERT_STORE_ITEM_MUTATION, {fetchPolicy: 'no-cache', onError: handleGQLError});
    const [removeFeatureItem,{ loading: remove_loading, data: remove_data, error: remove_error }] = useMutation(REMOVE_FEATURE_ITEM_MUTATION, {fetchPolicy: 'no-cache', onError: handleGQLError});

    const closeModal = () => {
        setModalStatus(false); 
        setSelLeagueStoreItem(undefined);
    }

    const castStoreConfigData = (storeItem: LeagueStoreItemType) => {
        let tmpStoreItem = undefined;
        try {
            tmpStoreItem = _.cloneDeep(storeItem);

            if(data?.storeConfigs?.length > 0) {
                const storeConfig = data.storeConfigs[0];

                if(tmpStoreItem && !(tmpStoreItem?.category && tmpStoreItem.category.length > 0)){
                    tmpStoreItem.category = storeConfig?.category;
                }
            }
        } catch(ex){
            log.error(`Casting Store Config Data: ${ex}`);
        }

        return tmpStoreItem;
    }

    const validateStoreItem = () => {
        let ret = [];
        try {
            if(!editStoreItem?.title){
                ret.push('Add Title');
            }

            if(!editStoreItem?.description){
                ret.push('Add Description');
            }

            if(!editStoreItem?.minimum || editStoreItem.minimum <= 0){
                ret.push('Add Minimum Participants');
            }

            if(!editStoreItem?.price_per_item || editStoreItem.price_per_item <= 0){
                ret.push('Add Price Up To Minimum');
            }

            if(!editStoreItem?.additional_set_price || editStoreItem.additional_set_price <= 0){
                ret.push('Add Additional Participants Price');
            }

            if(type === 'leagues'){
                if(!editStoreItem?.details || !editStoreItem.details?.sport_id){
                    ret.push('Add League Sport');                    
                }
            } else if(type === 'apparel'){
                // TODO: Add Apparel Checks
            }
        } catch(ex){
            log.error(`Validating Store Item: ${ex}`);
            ret.push('[EC 001]');
        }

        return ret;
    }

    const castUpsertStoreItem = (storeItem?: LeagueStoreItemType) =>{
        let tmpItem = _.cloneDeep(storeItem);
        
        try {
            delete tmpItem?.photos;
            delete tmpItem?.details?.sport_info;
        } catch(ex){
            log.error(`Casting Store Item: ${ex}`);
        }

        return tmpItem;
    }

    const saveStoreItem = () => { 
        // Validate Data
        const validations = validateStoreItem();
        if(validations?.length > 0){
            toast.warning(`Please Check the following: ${validations?.join(', ')}`, { position: "top-right",
                autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                draggable: true, progress: undefined, theme: "light" });
        } else {
            upsertStoreItem({ variables: {
                id: editStoreItem?._id ?? undefined,
                item: castUpsertStoreItem(editStoreItem)
            }});
        }
    }
    const deleteStoreItem = () => { 
        if(selLeagueStoreItem?._id && window.confirm(`Are you sure you want to delete this league?`)){
            removeFeatureItem({ variables: { id: selLeagueStoreItem._id, type: 'ls_store_items', photoSetId: selLeagueStoreItem?.store_item_id }})
        }
    }

    useEffect(()=>{ 
        if(selLeagueStoreItem && !loading){
            setModalStatus(true);
            setEditStoreItem(castStoreConfigData(selLeagueStoreItem));
        }
    },[selLeagueStoreItem, loading]);

    useEffect(()=>{
        try {
            const areEqual = _.isEqual(selLeagueStoreItem, editStoreItem);
            setInProgress(!areEqual);
        } catch(ex){
            log.error(`Checking Edit Progress: ${ex}`);
        }
    }, [editStoreItem]);

    useEffect(()=>{ 
        if(!upsert_loading ){
            if(upsert_error){
                const errorMsg = JSON.stringify(upsert_error, null, 2);
                // console.log(errorMsg);

                toast.error(`Error Adding/Updating Store Item: ${upsert_error.message}`, { position: "top-right",
                    autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                    draggable: true, progress: undefined, theme: "light" });
            } else if(upsert_data?.upsertStoreItems){
                closeModal();
                toast.success(`Adding/Updating Store Item`, { position: "top-right",
                    autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                    draggable: true, progress: undefined, theme: "light" });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[upsert_loading, upsert_data, upsert_error]);

    useEffect(()=>{ 
        if(!remove_loading ){
            if(remove_error){
                const errorMsg = JSON.stringify(remove_error, null, 2);
                console.log(errorMsg);

                toast.error(`Error Removing This Store Item: ${remove_error.message}`, { position: "top-right",
                    autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                    draggable: true, progress: undefined, theme: "light" });
            } else if(remove_data?.deleteLeagueStoreFeatureItem){
                closeModal();
                toast.success(`Removed This Store Item`, { position: "top-right",
                    autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                    draggable: true, progress: undefined, theme: "light" });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[remove_loading, remove_data, remove_error]);

    useEffect(()=>{
        if(modalStatus) {
            setKey((p) => p+1);
        }
    },[modalStatus]);

    return(
        <Rodal className="user-management-editor-modal" 
            customStyles={adminSideModalStyle} visible={modalStatus} 
            onClose={closeModal} animation={'slideRight'}
        >
            <div className='user-management-editor-container' key={key}>
                <div className='header-row'>
                    <span>{(type && type in storeConfig) ? `${storeConfig[type].title}` : 'Store'} Item</span>
                </div>

                <div className='title-row'>
                    <h1>{pageTitle}</h1>
                    {inProgress && 
                        <div className='edit-in-progress'>
                            <span className="icon material-symbols-outlined">edit_square</span>
                            <span>Edit In Progress</span>
                        </div>
                    }
                </div>

                <div className='field-list-container'>
                    {(type && type in storeConfig) && 
                        <>
                            {(editStoreItem?.store_item_id) &&
                                <TagImageEditor tag={editStoreItem.store_item_id} totalPhotos={storeConfig[type].maxPhotoCount} />
                            }

                            {storeConfig[type].detailsConfig.fields?.map((field:any, i: number) => {
                                return(
                                    <TableManagementModalRow<LeagueStoreItemType> key={i} field={field} item={editStoreItem} setItem={setEditStoreItem} storeConfig={data?.storeConfigs} />
                                );
                            })}
                        </>
                    }
                </div>

                <div className='editor-actions-container'>
                    <div className='button-list'>
                        <button className='list-btn save' disabled={upsert_loading || !inProgress} onClick={saveStoreItem}>
                            {upsert_loading ? 
                                <div className='btn-icon loader'>
                                    <l-spiral size="14" speed="0.9" color="#fff" />
                                </div> :
                                <span className="btn-icon material-symbols-outlined">save</span>
                            }
                            <span className='btn-text'>Save</span>
                        </button>

                        {(selLeagueStoreItem?._id !== undefined ) &&
                            <button className='list-btn delete' onClick={deleteStoreItem}>
                                <span className="btn-icon material-symbols-outlined">delete_forever</span>
                                <span className='btn-text'>Delete Store Item</span>
                            </button>
                        }
                    </div>
                </div>
            </div>
        </Rodal>
    );
}

export default function LeagueStoreItemManager({ type, selLeagueStoreItem, setSelLeagueStoreItem }: LeagueStoreItemManagerType){
    const [displaySearch, setDisplaySearch] = useState("");
    const [query, setQuery] = useState("");
    const [active, setActive] = useState(true);

    const [page, setPage] = useState(1);
    
    const [columns, setColumns] = useState<ColumnDef<LeagueStoreItemType>[]>([]);
    const [sorting, setSorting] = useState<SortingState>([]);

    const [tableData, setTableData] = useState<LeagueStoreItemType[]>([]);

    const [loadDelay, setLoadDelay] = useState(false);
    const [modalStatus, setModalStatus] = useState(false);

    const pageRender = useRef({ page: false, modalStatus: false });

    const [getStoreItems, { loading, error, data }] = useLazyQuery(GET_STORE_ITEM_QUERY, { fetchPolicy: 'no-cache' });
    
    const table = useReactTable({
        data: tableData,
        columns,
        initialState: {},
        state: { sorting },
        getCoreRowModel: getCoreRowModel(),
        debugTable: false, debugHeaders: false, debugColumns: false,
        columnResizeMode: "onChange",
        onSortingChange: setSorting,
    });

    const getCommonPinningStyles = (column: Column<LeagueStoreItemType>): CSSProperties => {
        const isPinned = column.getIsPinned();
        const isLastPinned = isPinned === "left" && column.getIsLastColumn("left");
        const width = column.getSize();

        return {
            width: width <= 150 ? 'initial' : column.getSize(),
            position: isPinned ? "sticky" : "relative",
            left: isPinned === "left" ? `${column.getStart("left")}px` : undefined,
            zIndex: isPinned ? 1 : 0,
            boxShadow: isLastPinned ? "rgba(170, 170, 170, 0.3) 4px 0px 4px -2px" : undefined
        };
    }

    const searchQuery = (e:any) => {
        try {
            setDisplaySearch(e.target.value);
        }
        catch(ex){
            log.error(`Searching User Management: ${ex}`);
        }
    }

    const queryData = () => {
        setLoadDelay(true);
        getStoreItems({ variables:{ store_key: type, query: query, active: active, page: page, pageSize: PAGE_SIZE } });
    }

    const cloneLeagueStoreItem = (item: LeagueStoreItemType) => {
        try {
            let tmpItem = new LeagueStoreItemType("");
            tmpItem.generateClone(item);
            
            setSelLeagueStoreItem(tmpItem);
        } catch(ex){
            log.error(`Cloning League: ${ex}`);
        }
    }

    useEffect(() => {
        const delayInputTimeoutId = setTimeout(() => {
            setQuery(displaySearch);
        }, DEBOUNCE_TIME);

        return () => clearTimeout(delayInputTimeoutId);
    }, [displaySearch]);

    useEffect(()=>{
        if(type && type in storeConfig) {
            setColumns(storeConfig[type]?.columns ?? []);
            
        }
    },[type]);

    useEffect(() => {
        if(pageRender?.current?.page) {
            queryData(); 
        } 

        pageRender.current.page = true;
    },[page]);
    
    useEffect(()=>{
        if(page === 1) {
            queryData();
        } else {
            setPage(1);
        }
    },[query, active]);

    useEffect(()=>{
        let delayLoadTimeoutId:NodeJS.Timeout;

        if(loading === false) {
            delayLoadTimeoutId = setTimeout(() => { setLoadDelay(false); }, 500);

            if(data?.storeItems){
                setTableData(data.storeItems?.results ?? []);
            } else {
                setTableData([]);
            }
        }

        return () => clearTimeout(delayLoadTimeoutId);
    },[loading]);

    useEffect(()=>{ 
       if(!modalStatus && pageRender?.current?.modalStatus) {
            if(page === 1) {
                queryData();
            } else {
                setPage(1);
            }
       }
       pageRender.current.modalStatus = true;
    },[modalStatus]);

    useEffect(()=> { spiral.register(); },[]);

    return(
        <>
            <div className="league-store-table-cell">
                <div className="table-ctrl-container">
                    <div className="table-title">
                        <h3>{(type && type in storeConfig) ? `${storeConfig[type].title} ` : ''}Store Manager</h3>
                    </div>

                    <div className="ctrl-tabs">
                        <button className={`tab-btn ${active ? 'sel-tab' : ''}`} onClick={()=> {setActive(true)}}>
                            Active
                        </button>

                        <button className={`tab-btn ${!active ? 'sel-tab' : ''}`} onClick={()=> {setActive(false)}}>
                            In-Active
                        </button>
                    </div>

                    <div className="ctrl-actions">
                        <div className="action-input-container">
                            <span className="material-symbols-outlined">search</span>
                            <input type="text" name="query" placeholder='Search Users' value={displaySearch} onChange={searchQuery} />
                        </div>

                        <button className='table-action-btn' onClick={()=>{ setSelLeagueStoreItem(new LeagueStoreItemType(type)) }}>
                            <span className="material-symbols-outlined">add_circle</span>
                            <span className="btn-title">Add {(type && type in storeConfig) ? `${storeConfig[type].title}` : 'Store'} Item</span>
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="user-management-table-container ls-management-table-container">
                    {loading || loadDelay ?
                        <div className='table-loading'>
                            <div className='loader'>
                                <l-spiral size="150" speed="0.9" color="rgba(186,142,35,1)" />
                            </div>
                            <h1>Loading...</h1>
                        </div> : 
                        <table className="user-management-table" style={{ width: table.getTotalSize() }}>
                            <thead>
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <tr key={headerGroup.id}>
                                        {headerGroup.headers.map((header) => {
                                            return(
                                                <th key={header.id} colSpan={header.colSpan}
                                                    style={{ ...getCommonPinningStyles(header.column) }}
                                                >
                                                    <div className={`header-container ${header.column.getCanSort() ? 'sortable' : ''}`} onClick={header.column.getToggleSortingHandler()}>
                                                        {flexRender(
                                                            header.column.columnDef.header,
                                                            header.getContext(),
                                                        )}
                                                    </div>
                                                </th>
                                            );
                                        })}
    
                                        {/* Empty Header For Actions*/}
                                        <th className='empty-header'/>
                                    </tr>
                                ))}
                            </thead>
                            <tbody>
                                {table.getRowModel().rows.map((row, idx) => {
                                    return (
                                        <tr key={row.id} style={{ zIndex: table.getRowModel().rows.length - idx }}>
                                            {row.getVisibleCells().map((cell) => {
                                                return (
                                                    <td key={cell.id}
                                                        style={{ ...getCommonPinningStyles(cell.column) }}
                                                    >
                                                        {flexRender(
                                                            cell.column.columnDef.cell,
                                                            cell.getContext(),
                                                        )}
                                                    </td>
                                                )
                                            })}
                                            {/* Column For Actions*/}
                                            <td>
                                                <button className='update-user-btn' onClick={()=> { cloneLeagueStoreItem(row.original) }}>
                                                    <span className="material-symbols-outlined">copy_all</span>
                                                </button>

                                                <button className='update-user-btn' onClick={()=> { setSelLeagueStoreItem(row.original) }}>
                                                    <span className="material-symbols-outlined">more_vert</span>
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    }
                </div>

                <TablePaginationComponent loading={loading} totalItems={data?.storeItems?.totalResults} pageSize={PAGE_SIZE} pagesLeft={data?.storeItems?.pagesLeft} page={page} setPage={setPage} />
            </div>

            <LeagueStoreItemManagerModal type={type} modalStatus={modalStatus} setModalStatus={setModalStatus} selLeagueStoreItem={selLeagueStoreItem} setSelLeagueStoreItem={setSelLeagueStoreItem} />
        </>
    )
}