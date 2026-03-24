import { CSSProperties, Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { gql, useLazyQuery, useMutation } from "@apollo/client";
import { Column, ColumnDef, flexRender, getCoreRowModel, SortingState, useReactTable } from "@tanstack/react-table";
import Rodal from "rodal";
import { spiral } from 'ldrs';
import * as _ from 'lodash';

import { LeagueStoreUserType } from "../../../datatypes/customDT";
import { log } from "../../../utils/log";
import { DEBOUNCE_TIME } from "../../../utils";
import { adminSideModalStyle } from "../../../utils/_customUtils";
import TableManagementModalRow from "./tableManagementRow";
import { toast } from "react-toastify";


type LeagueStoreUsersConfigType = {
    selUser?: LeagueStoreUserType,
    setSelectedUser: Dispatch<SetStateAction<LeagueStoreUserType | undefined>>,
}

type LeagueStoreUsersModalType = {
    modalStatus: boolean,
    setModalStatus: Dispatch<SetStateAction<boolean>>,
    selUser?: LeagueStoreUserType,
    setSelectedUser: Dispatch<SetStateAction<LeagueStoreUserType | undefined>>,
}

const PAGE_SIZE = 15;
// GQL
const GET_USERS_QUERY = gql`
query GetUsers($query:String, $page:Int, $pageSize: Int){
    leagueStoreUsers(query: $query, page: $page, pageSize: $pageSize){
        totalResults
        pagesLeft
        results {
            _id
            blueprint_id
            sub_org_name
            organization_id

            blueprint_user {
                email
                name
            }

            organization {
                name
                billing_area_id
            }
            
            location {
                name
            }
        }
    }
}`,
UPSERT_LS_USER_MUTATION = gql`
mutation UpsertUser($id:String, $item: JSONObj){
    upsertLeagueStoreUser(id: $id, item: $item)
}`;

function LeagueStoreUsersModal({ modalStatus, setModalStatus, selUser, setSelectedUser }:LeagueStoreUsersModalType){
    const [key, setKey] = useState(0);
    const [inProgress, setInProgress] = useState(false);
    const [editUser, setEditUser] = useState<LeagueStoreUserType|undefined>();

    const [upsertLSUser,{ loading: upsert_loading, data: upsert_data, error: upsert_error }] = useMutation(UPSERT_LS_USER_MUTATION, {fetchPolicy: 'no-cache'});

    const detailsConfig = {
        fields:[
            { icon:'signature', title: 'Name', key:'name', type: 'view_only_text_nested', nested:["blueprint_user", "name"], net_new_active: false },
            { icon:'alternate_email', title: 'Email', key:'email', type: 'view_only_text_nested', nested:["blueprint_user", "email"], net_new_active: false },

            { icon:'edit_location', title: 'School Name', key:'sub_org_name', type: 'text', net_new_active: false },
            { icon:'location_chip', title: 'Organization', key:'organization_id', type: 'organization_select', net_new_active: false, overflow_field_content: true },
        ]
    };

    const closeModal = () => {
        setModalStatus(false); 
        setSelectedUser(undefined);
    }

    const saveUser = () => {
        if(editUser?.blueprint_id) {
            const tmpUser = new LeagueStoreUserType(editUser);

            upsertLSUser({ 
                variables: { id: tmpUser?.blueprint_id, item: tmpUser }
            });
        }
    }

    useEffect(()=>{ 
        if(selUser){
            setModalStatus(true);
            setEditUser(_.cloneDeep(selUser));
        }
    },[selUser]);

    useEffect(()=>{
        try {
            const areEqual = _.isEqual(selUser, editUser);
            setInProgress(!areEqual);
        } catch(ex){
            log.error(`Checking Edit Progress: ${ex}`);
        }
    }, [editUser]);

    useEffect(()=>{
        if(modalStatus) {
            setKey((p) => p+1);
        }
    },[modalStatus]);

    useEffect(()=>{ 
        if(!upsert_loading ){
            if(upsert_error){
                const errorMsg = JSON.stringify(upsert_error, null, 2);
                console.log(errorMsg);

                toast.error(`Error Updating User: ${upsert_error.message}`, { position: "top-right",
                    autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                    draggable: true, progress: undefined, theme: "light" });
            } else if(upsert_data?.upsertLeagueStoreUser){
                closeModal();
                toast.success(`Updated User`, { position: "top-right",
                    autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                    draggable: true, progress: undefined, theme: "light" });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[upsert_loading, upsert_data, upsert_error]);

    return(
        <Rodal className="user-management-editor-modal" 
            customStyles={adminSideModalStyle} visible={modalStatus} 
            onClose={closeModal} animation={'slideRight'}
        >
            <div className='user-management-editor-container' key={key}>
                <div className='header-row'>
                    <span>Manage Store Users</span>
                </div>

                <div className='title-row'>
                    <h1>Update Store User</h1>
                    {inProgress && 
                        <div className='edit-in-progress'>
                            <span className="icon material-symbols-outlined">edit_square</span>
                            <span>Edit In Progress</span>
                        </div>
                    }
                </div>

                <div className='field-list-container'>
                    {detailsConfig.fields?.map((field:any, i: number) => {
                        return(
                            <TableManagementModalRow<LeagueStoreUserType> key={i} field={field} item={editUser} setItem={setEditUser} />
                        );
                    })}
                </div>

                <div className='editor-actions-container'>
                    <div className='button-list'>
                        <button className='list-btn save' disabled={upsert_loading || !inProgress} onClick={saveUser}>
                            {upsert_loading ? 
                                <div className='btn-icon loader'>
                                    <l-spiral size="14" speed="0.9" color="#fff" />
                                </div> :
                                <span className="btn-icon material-symbols-outlined">save</span>
                            }
                            <span className='btn-text'>Save</span>
                        </button>
                    </div>
                </div>
            </div>
        </Rodal>
    );
}

// League Store Users Manager
export default function LeagueStoreUsersConfig({selUser, setSelectedUser}:LeagueStoreUsersConfigType){
    const [displaySearch, setDisplaySearch] = useState("");
    const [query, setQuery] = useState("");
    
    const [page, setPage] = useState(1);

    const [columns] = useState<ColumnDef<LeagueStoreUserType>[]>([
        { 
            id:"name",
            header: 'Name', accessorKey: 'name', 
            cell: ({ row }: { row: any }) => { 
                return <div className="usrmgt_cell ctr_cell">{row.original.blueprint_user?.name ?? 'N/A'}</div>
            }
        },
        { 
            id:"email",
            header: 'Email', accessorKey: 'email', 
            cell: ({ row }: { row: any }) => { 
                return <div className="usrmgt_cell ctr_cell">{row.original.blueprint_user?.email ?? 'N/A'}</div>
            }
        },
        { 
            id:"sub_org_name",
            header: 'School Name', accessorKey: 'sub_org_name', 
            cell: ({ row }: { row: any }) => { 
                return <div className="usrmgt_cell ctr_cell">{row.original.sub_org_name ?? 'N/A'}</div>
            }
        },
        { 
            id:"org_name",
            header: 'Organization Name', accessorKey: 'org_name', 
            cell: ({ row }: { row: any }) => { 
                return <div className="usrmgt_cell ctr_cell">{row.original.organization?.name ?? 'N/A'}</div>
            }
        },
        { 
            id:"location",
            header: 'Location', accessorKey: 'location', 
            cell: ({ row }: { row: any }) => { 
                return <div className="usrmgt_cell ctr_cell">{row.original.location?.name ?? 'N/A'}</div>
            }
        },
    ]);

    const [sorting, setSorting] = useState<SortingState>([]);
        
    const [tableData, setTableData] = useState<LeagueStoreUserType[]>([]);
    
    const [loadDelay, setLoadDelay] = useState(false);
    const [modalStatus, setModalStatus] = useState(false);
    
    const pageRender = useRef({ page: false, modalStatus: false });

    const [getUsers, { loading, data }] = useLazyQuery(GET_USERS_QUERY, { fetchPolicy: 'no-cache' });
    
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

    const getCommonPinningStyles = (column: Column<LeagueStoreUserType>): CSSProperties => {
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
        getUsers({ variables:{ query: query, page: page, pageSize: PAGE_SIZE } });
    }

    useEffect(() => {
        const delayInputTimeoutId = setTimeout(() => {
            setQuery(displaySearch);
        }, DEBOUNCE_TIME);

        return () => clearTimeout(delayInputTimeoutId);
    }, [displaySearch]);

    useEffect(() => {
        if(pageRender?.current?.page) {
            queryData(); 
        } 

        pageRender.current.page = true;
    },[page]);

    useEffect(()=>{
        let delayLoadTimeoutId:NodeJS.Timeout;

        if(loading === false) {
            delayLoadTimeoutId = setTimeout(() => { setLoadDelay(false); }, 500);

            if(data?.leagueStoreUsers){
                setTableData(data.leagueStoreUsers?.results ?? []);
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

    return (
        <>
            <div className="league-store-table-cell">
                <div className="table-ctrl-container">
                    <div className="table-title">
                        <h3>League Store Users Manager</h3>
                    </div>

                    <div className="ctrl-actions">
                        <div className="action-input-container">
                            <span className="material-symbols-outlined">search</span>
                            <input type="text" name="query" placeholder='Search Users' value={displaySearch} onChange={searchQuery} />
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="user-management-table-container ls-management-table-container">
                    {loading || loadDelay ?
                        <div className='table-loading'>
                            <div className='loader'>
                                <l-spiral size="100" speed="0.9" color="rgba(186,142,35,1)" />
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
                                                <button className='update-user-btn' onClick={()=> { setSelectedUser(row.original) }}>
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

            <LeagueStoreUsersModal modalStatus={modalStatus} setModalStatus={setModalStatus} selUser={selUser} setSelectedUser={setSelectedUser} />
        </>
    );
}
