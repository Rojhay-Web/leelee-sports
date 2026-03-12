import { CSSProperties, Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { Column, ColumnDef, flexRender, getCoreRowModel, SortingState, useReactTable } from "@tanstack/react-table";
import { gql, useLazyQuery, useMutation } from "@apollo/client";
import Rodal from "rodal";
import { spiral } from 'ldrs';
import * as _ from 'lodash';
import { toast } from "react-toastify";

import { log } from "../../../utils/log";
import { DEBOUNCE_TIME, handleGQLError } from "../../../utils";

// Types
import { OrganizationType } from "../../../datatypes/customDT";
import { adminSideModalStyle } from "../../../utils/_customUtils";
import TableManagementModalRow from "./tableManagementRow";

type OrganizationManagerType = {
    selOrganization?: OrganizationType,
    setSelectedOrganization: Dispatch<SetStateAction<OrganizationType | undefined>>,
}

type OrganizationManagerModalType = {
    selOrganization?: OrganizationType,
    setSelectedOrganization: Dispatch<SetStateAction<OrganizationType | undefined>>,
    modalStatus: boolean,
    setModalStatus: Dispatch<SetStateAction<boolean>>,
}

const PAGE_SIZE = 15;
// GQL
const GET_ORGANIZATIONS_QUERY = gql`
query GetOrganizations($query:String, $page:Int, $pageSize: Int){
    leagueStoreOrganizations(query: $query, page: $page, pageSize: $pageSize){
        totalResults
        pagesLeft
        results {
            _id
            name
            address
            city
            state
            zip
            billing_area_id

            merchantInfo {
                title
                subText
                defaultLogo
                store_id
            }
        }
    }
}`,
UPSERT_ORGANIZATION_MUTATION = gql`
mutation UpdateOrganization($id:String, $item: JSONObj){
    upsertLeagueStoreOrganization(id: $id, item: $item)
}`,
REMOVE_FEATURE_ITEM_MUTATION = gql`
mutation RemoveLeagueStoreFeatureItem($id:String!, $type: String!){
    deleteLeagueStoreFeatureItem(id: $id, type: $type)
}`;

function OrganizationManagerModal({ modalStatus, setModalStatus, selOrganization, setSelectedOrganization }:OrganizationManagerModalType){
    const [key, setKey] = useState(0);
    const [editOrganization, setEditOrganization] = useState<OrganizationType|undefined>();
    const [inProgress, setInProgress] = useState(false);

    const pageTitle = (selOrganization?._id !== undefined ? `Update Organization` : 'Add Organization');
    const detailsConfig = {
        fields:[
            { icon:'title', title: 'Organization Name', key:'name', type: 'text', net_new_active: false },
            { icon:'home_pin', title: 'Address', key:'address', type: 'text', net_new_active: false },
            { icon:'home_pin', title: 'City', key:'city', type: 'text', net_new_active: false },
            { icon:'home_pin', title: 'State', key:'state', type: 'text', net_new_active: false },
            { icon:'home_pin', title: 'Zip', key:'zip', type: 'text', net_new_active: false },

            { icon:'location_chip', title: 'Billing Area', key:'billing_area_id', type: 'location_merchant_select', net_new_active: false, overflow_field_content: true },
            { icon:'receipt', title: 'Merchant Invoice Details', key:'merchantInfo', type: 'merchant_details', net_new_active: false }
        ]
    };

    const [upsertOrganization,{ loading: upsert_loading, data: upsert_data, error: upsert_error }] = useMutation(UPSERT_ORGANIZATION_MUTATION, {fetchPolicy: 'no-cache', onError: handleGQLError});
    const [removeFeatureItem,{ loading: remove_loading, data: remove_data, error: remove_error }] = useMutation(REMOVE_FEATURE_ITEM_MUTATION, {fetchPolicy: 'no-cache', onError: handleGQLError});
    
    const closeModal = () => {
        setModalStatus(false); 
        setSelectedOrganization(undefined);
    }

    const validateLoc = () => {
        let ret = [];
        try {
            if(!editOrganization?.name){
                ret.push('Add Name');
            }

            if(editOrganization?.merchantInfo){                
                editOrganization.merchantInfo.forEach((mi) => {
                    if(!(mi?.title && mi?.title?.length > 0)){
                        ret.push(`Add ${mi?.store_id} Invoice Title`);
                    }

                    if(!(mi?.subText && mi?.subText?.length > 0)){
                        ret.push(`Add ${mi?.store_id} Invoice Address Line`);
                    }
                });
            }
        } catch(ex){
            log.error(`Validating Config: ${ex}`);
            ret.push('[EC 001]');
        }

        return ret;
    }

    const saveOrganization = () => {
        // Validate Data
        const validations = validateLoc();
        if(validations?.length > 0){
            toast.warning(`Please Check the following: ${validations?.join(', ')}`, { position: "top-right",
                autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                draggable: true, progress: undefined, theme: "light" });
        } else {
            upsertOrganization({ variables:{
                id: editOrganization?._id ?? undefined,
                item: editOrganization
            }});
        }
    }

    const deleteOrganization = () => {
        if(selOrganization?._id && window.confirm(`Are you sure you want to delete this organization?`)){
            removeFeatureItem({ variables: { id: selOrganization._id, type: 'ls_organizations' }})
        }
    }

    useEffect(()=>{ 
        if(selOrganization){
            setModalStatus(true);
            setEditOrganization(_.cloneDeep(selOrganization));
        }
    },[selOrganization]);

    useEffect(()=>{
        try {
            const areEqual = _.isEqual(selOrganization, editOrganization);
            setInProgress(!areEqual);
        } catch(ex){
            log.error(`Checking Edit Progress: ${ex}`);
        }
    }, [editOrganization]);

    useEffect(()=>{ 
        if(!upsert_loading ){
            if(upsert_error){
                const errorMsg = JSON.stringify(upsert_error, null, 2);
                console.log(errorMsg);

                toast.error(`Error Adding/Updating This Orgaization: ${upsert_error.message}`, { position: "top-right",
                    autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                    draggable: true, progress: undefined, theme: "light" });
            } else if(upsert_data?.upsertLeagueStoreOrganization){
                closeModal();
                toast.success(`Adding/Updating This Orgaization`, { position: "top-right",
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

                toast.error(`Error Removing Orgaization: ${remove_error.message}`, { position: "top-right",
                    autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                    draggable: true, progress: undefined, theme: "light" });
            } else if(remove_data?.deleteLeagueStoreFeatureItem){
                closeModal();
                toast.success(`Removed Orgaization`, { position: "top-right",
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
                    <span>Manage Store Config</span>
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
                    {detailsConfig.fields?.map((field:any, i: number) => {
                        return(
                            <TableManagementModalRow<OrganizationType> key={i} field={field} item={editOrganization} setItem={setEditOrganization} />
                        );
                    })}
                </div>

                <div className='editor-actions-container'>
                    <div className='button-list'>
                        <button className='list-btn save' disabled={upsert_loading || !inProgress} onClick={saveOrganization}>
                            {upsert_loading ? 
                                <div className='btn-icon loader'>
                                    <l-spiral size="14" speed="0.9" color="#fff" />
                                </div> :
                                <span className="btn-icon material-symbols-outlined">save</span>
                            }
                            <span className='btn-text'>Save</span>
                        </button>

                        {(selOrganization?._id !== undefined ) &&
                            <button className='list-btn delete' onClick={deleteOrganization}>
                                <span className="btn-icon material-symbols-outlined">delete_forever</span>
                                <span className='btn-text'>Delete Organization</span>
                            </button>
                        }
                    </div>
                </div>
            </div>
        </Rodal>
    )
}

// League Store Manager
export default function OrganizationConfig({ selOrganization, setSelectedOrganization }:OrganizationManagerType){
    const [displaySearch, setDisplaySearch] = useState("");
    const [query, setQuery] = useState("");

    const [page, setPage] = useState(1);

    const [columns] = useState<ColumnDef<OrganizationType>[]>([
        { 
            id:"name",
            header: 'Organization Name', accessorKey: 'name', 
            cell: ({ row }: { row: any }) => { 
                return <div className="usrmgt_cell ctr_cell">{row.original.name}</div>
            }
        },
        { 
            id:"address",
            header: 'Address', accessorKey: 'address', 
            cell: ({ row }: { row: any }) => { 
                return <div className="usrmgt_cell ctr_cell">{row.original.address}</div>
            }
        },
        { 
            id:"city",
            header: 'City', accessorKey: 'city', 
            cell: ({ row }: { row: any }) => { 
                return <div className="usrmgt_cell ctr_cell">{row.original.city}</div>
            }
        },
        { 
            id:"state",
            header: 'State', accessorKey: 'state', 
            cell: ({ row }: { row: any }) => { 
                return <div className="usrmgt_cell ctr_cell">{row.original.state}</div>
            }
        },
        { 
            id:"zip",
            header: 'Zip', accessorKey: 'zip', 
            cell: ({ row }: { row: any }) => { 
                return <div className="usrmgt_cell ctr_cell">{row.original.zip}</div>
            }
        },
        { 
            id:"merchantInfo",
            header: 'Merchant Count', accessorKey: 'merchantInfo', 
            cell: ({ row }) => { 
                const merchantInfoList = row.original.merchantInfo;

                return <div className="usrmgt_cell roles ctr_cell">
                        {merchantInfoList && merchantInfoList?.length > 0 &&
                            <div className='additional-roles-container'>
                                <div className={`additional-roles`}>{merchantInfoList?.length}</div>
                            </div>
                        }
                    </div>;
            }
        },
    ]);
    const [sorting, setSorting] = useState<SortingState>([]);
    
    const [tableData, setTableData] = useState<OrganizationType[]>([]);

    const [loadDelay, setLoadDelay] = useState(false);
    const [modalStatus, setModalStatus] = useState(false);

    const pageRender = useRef({ page: false, modalStatus: false });

    const [getOrganizations, { loading, data }] = useLazyQuery(GET_ORGANIZATIONS_QUERY, { fetchPolicy: 'no-cache' });
    
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
    
    const getCommonPinningStyles = (column: Column<OrganizationType>): CSSProperties => {
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
        getOrganizations({ variables:{ query: query, page: page, pageSize: PAGE_SIZE } });
    }

    const cloneOrganizationItem = (item: OrganizationType) => {
        try {
            let tmpItem = new OrganizationType();
            tmpItem.generateClone(item);
            
            setSelectedOrganization(tmpItem);
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

            if(data?.leagueStoreOrganizations){
                setTableData(data.leagueStoreOrganizations?.results ?? []);
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
                        <h3>Organizations Manager</h3>
                    </div>

                    <div className="ctrl-actions">
                        <div className="action-input-container">
                            <span className="material-symbols-outlined">search</span>
                            <input type="text" name="query" placeholder='Search Organizations' value={displaySearch} onChange={searchQuery} />
                        </div>

                        <button className='table-action-btn' onClick={()=>{ setSelectedOrganization(new OrganizationType()) }}>
                            <span className="material-symbols-outlined">add_circle</span>
                            <span className="btn-title">Add Organization</span>
                        </button>
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
                                                <button className='update-user-btn' onClick={()=> { cloneOrganizationItem(row.original) }}>
                                                    <span className="material-symbols-outlined">copy_all</span>
                                                </button>

                                                <button className='update-user-btn' onClick={()=> { setSelectedOrganization(row.original) }}>
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

            <OrganizationManagerModal modalStatus={modalStatus} setModalStatus={setModalStatus} selOrganization={selOrganization} setSelectedOrganization={setSelectedOrganization} />
        </>
    );
}
