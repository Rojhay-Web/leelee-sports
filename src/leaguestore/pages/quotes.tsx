import { CSSProperties, useEffect, useRef, useState } from "react";
import { Column, ColumnDef, flexRender, getCoreRowModel, SortingState, useReactTable } from "@tanstack/react-table";
import { gql, useLazyQuery } from '@apollo/client';

import { PurchaseOrderType } from "../../datatypes/customDT";
import TablePaginationComponent from "../../toolbox/leagueStore/components/tablePaginationComponent";

import { log } from "../../utils/log";
import { formatDateStr } from "../../utils";

const PAGE_SIZE = 10;
const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

// GQL
const GET_QUOTES_QUERY = gql`
query GetQuotes($page:Int, $pageSize: Int){
    leagueStoreQuotes(status: "", page: $page, pageSize: $pageSize){
        totalResults
        pagesLeft
        results {
            _id
            type
            status
            invoice_number
            total
            status_date
            creation_date
            line_items {
                item_count
                store_item { 
                    store_id
                    title
                    minimum
                    price_per_item
                    additional_set_price

                    addons {
                        title
                        price
                    }
                }
                add_on_list { 
                    title
                    count
                }
            }
        }
    }
}`;

export default function Quotes(){
    const [page, setPage] = useState(1);
    const [loadDelay, setLoadDelay] = useState(false);

    const [tableData, setTableData] = useState<PurchaseOrderType[]>([]);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columns] = useState<ColumnDef<PurchaseOrderType>[]>([
        { 
            id:"invoice_number", enableSorting: false,
            header: 'Quote #', accessorKey: 'invoice_number', 
            cell: ({ row }: { row: any }) => { 
                return <div className="usrmgt_cell ctr_cell">{row.original.invoice_number}</div>
            }
        },
        { 
            id:"status", enableSorting: false,
            header: 'Status', accessorKey: 'status', 
            cell: ({ row }: { row: any }) => { 
                return <div className={`usrmgt_cell ctr_cell cell_status ${row?.original?.status?.toLowerCase() ?? ''}`}>{row.original.status}</div>
            }
        },
        { 
            id:"total", enableSorting: false,
            header: 'Total Price', accessorKey: 'total', 
            cell: ({ row }: { row: any }) => { 
                return <div className="usrmgt_cell ctr_cell">{getPrice(row.original.total)}</div>
            }
        },
        { 
            id:"status_date", enableSorting: false,
            header: 'Update Date', accessorKey: 'status_date', 
            cell: ({ row }: { row: any }) => { 
                return <div className="usrmgt_cell ctr_cell">{formatDateStr(row.original.creation_date, `MM-dd-yyyy hh:mm aaa`)}</div>
            }
        },
        { 
            id:"type", enableSorting: false,
            header: 'Quote Type', accessorKey: 'type', 
            cell: ({ row }: { row: any }) => { 
                return <div className="usrmgt_cell ctr_cell capitalize">{row.original.type}</div>
            }
        },
    ]);
    
    const [getQueryItems, { loading, data }] = useLazyQuery(GET_QUOTES_QUERY, { fetchPolicy: 'no-cache' });

    const table = useReactTable({
        data: tableData,
        columns,
        initialState: {}, state: {},
        getCoreRowModel: getCoreRowModel(),
        debugTable: false, debugHeaders: false, debugColumns: false,
        columnResizeMode: "onChange",
        onSortingChange: setSorting,
    });

    const getCommonPinningStyles = (column: Column<PurchaseOrderType>): CSSProperties => {
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

    const queryData = () => {
        setLoadDelay(true);
        getQueryItems({ variables:{ page: page, pageSize: PAGE_SIZE } });
    }

    const getPrice = (val?:number) => {
        let ret = '$$';
        try {
            if(val){
                ret = formatter.format(val);
            }
        } catch(ex){
            log.error(`Getting Price: ${ex}`);
        }

        return ret;
    }

    useEffect(() => { queryData(); },[page]);

    useEffect(()=>{
        let delayLoadTimeoutId:NodeJS.Timeout;

        if(loading === false) {
            delayLoadTimeoutId = setTimeout(() => { setLoadDelay(false); }, 500);

            if(data?.leagueStoreQuotes){
                setTableData(data.leagueStoreQuotes?.results ?? []);
            } else {
                setTableData([]);
            }
        }

        return () => clearTimeout(delayLoadTimeoutId);
    },[loading]);

    useEffect(()=>{ window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); },[]);

    return (
        <div className="ls-page ls-quote-page">
            <div className="gradient-background-container"><div className="gradient-background" /></div>
            <section className="content-section">
                <h1>Your <span>Finalized Quotes</span></h1>

                {/* Table */}
                <div className="user-management-table-container ls-table-container">
                    {loading || loadDelay ?
                        <div className='table-loading'>
                            <div className='loader'>
                                <l-spiral size="100" speed="0.9" color="rgba(186,142,35,1)" />
                            </div>
                            <h1>Loading...</h1>
                        </div> : 
                        <table className="ls-table" style={{ width: table.getTotalSize() }}>
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
                                                    <span className="material-symbols-outlined">cloud_download</span>
                                                </button>

                                                <button className='update-user-btn' onClick={()=> { }}>
                                                    <span className="material-symbols-outlined">upload_file</span>
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    }
                </div>
                
                <TablePaginationComponent loading={loading} totalItems={data?.leagueStoreQuotes?.totalResults} pageSize={PAGE_SIZE} pagesLeft={data?.leagueStoreQuotes?.pagesLeft} page={page} setPage={setPage} />
            </section>
        </div>
    );
}
