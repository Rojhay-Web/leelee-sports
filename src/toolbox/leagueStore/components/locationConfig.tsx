import { CSSProperties, Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { gql, useQuery, useMutation } from '@apollo/client';
import { spiral } from 'ldrs';
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
}`;

import { LeagueLocationsType } from "../../../datatypes/customDT";
type LocationManagerType = {
    selLocation?: LeagueLocationsType,
    setSelectedLocation: Dispatch<SetStateAction<LeagueLocationsType | undefined>>,
}

// Sports Editor Tool
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

                return <div className="usrmgt_cell roles">
                        {merchantInfoList && merchantInfoList?.length > 0 &&
                            <div className='additional-roles-container'>
                                <div className={`additional-roles`}>{merchantInfoList?.length}</div>
                            </div>
                        }
                    </div>;
            }
        },
    ]);

    const pageRender = useRef(false); 

    const { loading, data, refetch }= useQuery(GET_LEAGUE_QUERY, { fetchPolicy: 'no-cache' });

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
       if(!modalStatus && pageRender?.current) {
           refetch();
       }
       pageRender.current = true;
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
                        <h2>Locations Manager</h2>
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
        </>
    );
}
