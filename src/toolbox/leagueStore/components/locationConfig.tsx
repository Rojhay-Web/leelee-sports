import { CSSProperties, Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { gql, useMutation, useLazyQuery } from '@apollo/client';
import Rodal from "rodal";
import { spiral } from 'ldrs';
import * as _ from 'lodash';
import { toast } from "react-toastify";

import {
    Column,
    ColumnDef,
    flexRender,
    getCoreRowModel,
    SortingState,
    useReactTable,
} from '@tanstack/react-table';

// GQL
const GET_LEAGUE_QUERY = gql`
query GetLocations{
    leagueLocations{
        _id
        name
        merchantInfo {
            store_id
            title
            subText
            defaultLogo
        }
    }
}`, 
UPSERT_LOCATION_MUTATION = gql`
mutation UpdateLeagueLocation($id:String, $name: String, $merchantInfo: [JSONObj]){
    upsertLeagueLocation(id: $id, name: $name, merchantInfo: $merchantInfo)
}`;

import { LeagueLocationsType } from "../../../datatypes/customDT";
import { adminSideModalStyle } from "../../../utils/_customUtils";
import TableManagementModalRow from "./tableManagementRow";
import { log } from "../../../utils/log";
import { handleGQLError } from "../../../utils";
type LocationManagerType = {
    selLocation?: LeagueLocationsType,
    setSelectedLocation: Dispatch<SetStateAction<LeagueLocationsType | undefined>>,
}

type LocationManagerModalType = {
    selLocation?: LeagueLocationsType,
    setSelectedLocation: Dispatch<SetStateAction<LeagueLocationsType | undefined>>,
    modalStatus: boolean,
    setModalStatus: Dispatch<SetStateAction<boolean>>,
}


function LocationManagerModal({ modalStatus, setModalStatus, selLocation, setSelectedLocation }:LocationManagerModalType){
    const [editLocation, setEditLocation] = useState<LeagueLocationsType|undefined>();
    const [inProgress, setInProgress] = useState(false);

    const pageTitle = (selLocation?._id !== undefined ? `Update Location` : 'Add Location');
    const detailsConfig = {
        fields:[
            { icon:'location_on', title: 'Location Name', key:'name', type: 'text', net_new_active: false },
            { icon:'receipt', title: 'Merchant Invoice Details', key:'merchantInfo', type: 'merchant_details', net_new_active: false }
        ]
    };

    const [upsertLocation,{ loading: upsert_loading, data: upsert_data, error: upsert_error }] = useMutation(UPSERT_LOCATION_MUTATION, {fetchPolicy: 'no-cache', onError: handleGQLError});
    
    const closeModal = () => {
        setModalStatus(false); 
        setSelectedLocation(undefined);
    }

    const validateLoc = () => {
        let ret = [];
        try {
            if(!editLocation?.name){
                ret.push('Add Name');
            }

            if(editLocation?.merchantInfo){                
                editLocation.merchantInfo.forEach((mi) => {
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

    const saveLocation = () => {
        // Validate Data
        const validations = validateLoc();
        if(validations?.length > 0){
            toast.warning(`Please Check the following: ${validations?.join(', ')}`, { position: "top-right",
                autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                draggable: true, progress: undefined, theme: "light" });
        } else {
            upsertLocation({ variables:{
                id: editLocation?._id ?? undefined,
                name: editLocation?.name,
                merchantInfo: editLocation?.merchantInfo
            }});
        }
    }

    const deleteLocation = () => {}

    useEffect(()=>{ 
        if(selLocation){
            setModalStatus(true);
            setEditLocation(_.cloneDeep(selLocation));
        }
    },[selLocation]);

    useEffect(()=>{
        try {
            const areEqual = _.isEqual(selLocation, editLocation);
            setInProgress(!areEqual);
        } catch(ex){
            log.error(`Checking Edit Progress: ${ex}`);
        }
    }, [editLocation]);

    useEffect(()=>{ 
        if(!upsert_loading ){
            if(upsert_error){
                const errorMsg = JSON.stringify(upsert_error, null, 2);
                console.log(errorMsg);

                toast.error(`Error Adding/Updating This Location: ${upsert_error.message}`, { position: "top-right",
                    autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                    draggable: true, progress: undefined, theme: "light" });
            } else if(upsert_data?.upsertLeagueLocation){
                closeModal();
                toast.success(`Adding/Updating This Location`, { position: "top-right",
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
            <div className='user-management-editor-container'>
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
                            <TableManagementModalRow<LeagueLocationsType> key={i} field={field} item={editLocation} setItem={setEditLocation} />
                        );
                    })}
                </div>

                <div className='editor-actions-container'>
                    <div className='button-list'>
                        <button className='list-btn save' disabled={upsert_loading || !inProgress} onClick={saveLocation}>
                            {upsert_loading ? 
                                <div className='btn-icon loader'>
                                    <l-spiral size="14" speed="0.9" color="#fff" />
                                </div> :
                                <span className="btn-icon material-symbols-outlined">save</span>
                            }
                            <span className='btn-text'>Save</span>
                        </button>

                        {(selLocation?._id !== undefined ) &&
                            <button className='list-btn delete' onClick={deleteLocation}>
                                <span className="btn-icon material-symbols-outlined">delete_forever</span>
                                <span className='btn-text'>Delete Location</span>
                            </button>
                        }
                    </div>
                </div>
            </div>
        </Rodal>
    )
}

// Location Table Tool
export default function LocationManager({ selLocation, setSelectedLocation }: LocationManagerType){
    const [modalStatus, setModalStatus] = useState(false);
    const [loadDelay, setLoadDelay] = useState(false);

    const [sorting, setSorting] = useState<SortingState>([]);
    const [columns] = useState<ColumnDef<LeagueLocationsType>[]>([
        { 
            id:"name",
            header: 'Location Name', accessorKey: 'name', 
            cell: ({ row }) => { 
                return <div className="usrmgt_cell">{row.original.name}</div>
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

    const [getLocations, { loading, data }] = useLazyQuery(GET_LEAGUE_QUERY, { fetchPolicy: 'no-cache' });

    const table = useReactTable({
        data: data?.leagueLocations ?? [],
        columns,
        initialState: {},
        state: { sorting },
        getCoreRowModel: getCoreRowModel(),
        debugTable: false, debugHeaders: false, debugColumns: false,
        columnResizeMode: "onChange",
        onSortingChange: setSorting,
    });

    const getCommonPinningStyles = (column: Column<LeagueLocationsType>): CSSProperties => {
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

    useEffect(()=>{ 
       if(!modalStatus) {
            setLoadDelay(true);
            getLocations();
       }
    },[modalStatus]);

    useEffect(()=>{
        let delayLoadTimeoutId:NodeJS.Timeout;

        if(loading === false) {
            delayLoadTimeoutId = setTimeout(() => { setLoadDelay(false); }, 500);
        }

        return () => clearTimeout(delayLoadTimeoutId);
    },[loading]);
    
    useEffect(()=> { spiral.register(); },[]);

    return (
        <>
            <div className="league-store-table-cell">
                <div className="table-ctrl-container">
                    <div className="table-title">
                        <h3>Locations Manager</h3>
                    </div>

                    <div className="ctrl-actions">
                        <button className='table-action-btn' onClick={()=>{ setSelectedLocation(new LeagueLocationsType()) }}>
                            <span className="material-symbols-outlined">add_location</span>
                            <span className="btn-title">Add Location</span>
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
                                                <button className='update-user-btn' onClick={()=> { setSelectedLocation(row.original) }}>
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

            <LocationManagerModal modalStatus={modalStatus} setModalStatus={setModalStatus} selLocation={selLocation} setSelectedLocation={setSelectedLocation} />
        </>
    );
}
