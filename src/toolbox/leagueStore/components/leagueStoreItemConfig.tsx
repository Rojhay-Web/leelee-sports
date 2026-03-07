import { CSSProperties, Dispatch, SetStateAction, useEffect, useState } from "react";
import { Column, ColumnDef, flexRender, getCoreRowModel, SortingState, useReactTable } from "@tanstack/react-table";
import { gql, useLazyQuery, useMutation, useQuery } from '@apollo/client';
import Rodal from "rodal";
import { spiral } from 'ldrs';
import * as _ from 'lodash';
import { toast } from "react-toastify";

import { LeagueStoreConfigType, LeagueStoreItemType } from "../../../datatypes/customDT";
import { DEBOUNCE_TIME } from "../../../utils";
import { log } from "../../../utils/log";

import { UserRegDateCell } from "../../../admin/components/blueprint/userManagementTable";
import { adminSideModalStyle } from "../../../utils/_customUtils";
import TableManagementModalRow from "./tableManagementRow";

type LeagueStoreItemManagerType = {
    type?:string,
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
}`;

const storeConfig: {[key:string]: any} = {
    "leagues":{
        "title":"League",
        "columns":[
            { 
                id:"photo",
                header: 'Photo', accessorKey: 'photo', 
                cell: ({ row }: { row: any}) => { 
                    return <div className="usrmgt_cell"></div>
                }
            },
            { 
                id:"title",
                header: 'League Name', accessorKey: 'title', 
                cell: ({ row }: { row: any }) => { 
                    return <div className="usrmgt_cell">{row.original.title}</div>
                }
            },
            { 
                id:"active",
                header: 'Is Active?', accessorKey: 'active', 
                cell: ({ row }: { row: any}) => { 
                    return <div className="usrmgt_cell"></div>
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

                    return <div className="usrmgt_cell">{priceStr}</div>
                }
            },
            { 
                id:"sport",
                header: 'Sport', accessorKey: 'details', 
                cell: ({ row }: { row: any}) => { 
                    return <div className="usrmgt_cell"></div>
                }
            },

            { 
                id:"start_dt",
                header: 'League Start', accessorKey: 'details', 
                cell: ({ row }: { row: any}) => { 
                    return <UserRegDateCell registration_date={row.original.details?.start_dt}/>;
                }
            },
            { 
                id:"end_dt",
                header: 'League End', accessorKey: 'details', 
                cell: ({ row }: { row: any}) => { 
                    return <UserRegDateCell registration_date={row.original.details?.end_dt}/>;
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
                { icon:'attach_money', title: 'Price Past Minimum', key:'additional_set_price', type: 'dollar', net_new_active: false },

                { icon:'type_specimen', title: 'League Type', key:'category', type: 'text', net_new_active: false, title_vert_set: true },
                { icon:'tv_options_edit_channels', title: 'League Type Options', key:'categorySet', type: 'category_list_options', net_new_active: false, title_vert_set: true },

                { icon:'info', title: 'League Details', key:'details', type: '', net_new_active: false, title_vert_set: true },
                { icon:'event_list', title: 'Addons', key:'addons', type: 'addons_list_options', net_new_active: false, title_vert_set: true },
            ]
        }
    },
    "apparel": { 
        "title":"Apparel",
        "columns":[],
        "detailsConfig":{
            fields:[]
        }
    }
};

function LeagueStoreItemManagerModal({ type, modalStatus, setModalStatus, selLeagueStoreItem, setSelLeagueStoreItem }:LeagueStoreItemManagerModalType){
    const [editStoreItem, setEditStoreItem] = useState<LeagueStoreItemType|undefined>();
    const [inProgress, setInProgress] = useState(false);

    const pageTitle = `${(selLeagueStoreItem?._id !== undefined ? `Update` : 'Add')} ${(type && type in storeConfig) ? storeConfig[type].title : 'Store'}`;
    const { loading, data }= useQuery(GET_STORE_CONFIG_QUERY, { variables:{ type: type }, fetchPolicy: 'no-cache' });

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

    return(
        <Rodal className="user-management-editor-modal" 
            customStyles={adminSideModalStyle} visible={modalStatus} 
            onClose={closeModal} animation={'slideRight'}
        >
            <div className='user-management-editor-container'>
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
                    {type && storeConfig[type].detailsConfig.fields?.map((field:any, i: number) => {
                        return(
                            <TableManagementModalRow<LeagueStoreItemType> key={i} field={field} item={editStoreItem} setItem={setEditStoreItem} storeConfig={data?.storeConfigs} />
                        );
                    })}
                </div>
            </div>
        </Rodal>
    );
}

export default function LeagueStoreItemManager({ type, selLeagueStoreItem, setSelLeagueStoreItem }: LeagueStoreItemManagerType){
    const [displaySearch, setDisplaySearch] = useState("");
    const [query, setQuery] = useState("");
    const [active, setActive] = useState(true);
    
    const [columns, setColumns] = useState<ColumnDef<LeagueStoreItemType>[]>([]);
    const [sorting, setSorting] = useState<SortingState>([]);

    const [tableData, setTableData] = useState<LeagueStoreItemType[]>([]);

    const [loadDelay, setLoadDelay] = useState(false);
    const [modalStatus, setModalStatus] = useState(false);

    const [getStoreItems, { loading, data }] = useLazyQuery(GET_STORE_ITEM_QUERY, { fetchPolicy: 'no-cache' });
    
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
        // getStoreItems({ variables:{ store_key: type, query: query, active: active, page: 1, pageSize: 15 } });
    },[]);

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

    useEffect(()=> { spiral.register(); },[]);

    return(
        <>
            <div className="league-store-table-cell">
                <div className="table-ctrl-container">
                    <div className="table-title">
                        <h3>{(type && type in storeConfig) ? `${storeConfig[type].title} ` : ''}Store Manager</h3>
                    </div>

                    <div className="ctrl-actions">
                        <div className="action-input-container">
                            <span className="material-symbols-outlined">search</span>
                            <input type="text" name="query" placeholder='Search Users' value={displaySearch} onChange={searchQuery} />
                        </div>

                        <button className='table-action-btn' onClick={()=>{ setSelLeagueStoreItem(new LeagueStoreItemType()) }}>
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
                                <l-spiral size="150" speed="0.9" color="rgba(0,41,95,1)" />
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
                                                <button className='update-user-btn' onClick={()=> { }}>
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
            </div>

            <LeagueStoreItemManagerModal type={type} modalStatus={modalStatus} setModalStatus={setModalStatus} selLeagueStoreItem={selLeagueStoreItem} setSelLeagueStoreItem={setSelLeagueStoreItem} />
        </>
    )
}