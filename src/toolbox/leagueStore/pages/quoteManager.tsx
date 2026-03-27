import { CSSProperties, useContext, useEffect, useRef, useState } from "react";
import { gql, useLazyQuery, useMutation } from '@apollo/client';
import { Column, ColumnDef, flexRender, getCoreRowModel, SortingState, useReactTable } from "@tanstack/react-table";
import { toast } from "react-toastify";
import { spiral, ring } from 'ldrs';

import { PurchaseOrderType } from "../../../datatypes/customDT";
import { downloadBlobURL, getPrice } from "../../../utils/_customUtils";
import { formatDateStr, LS_API_URL } from "../../../utils";
import TablePaginationComponent from "../components/tablePaginationComponent";
import { log } from "../../../utils/log";
import { UserContextType } from "../../../datatypes";

import userContext from '../../../context/user.context';

// GQL
const GET_QUOTES_QUERY = gql`
query GetQuotes($status: String, $page:Int, $pageSize: Int){
    leagueStoreQuotes(status: $status, pullAll: true, page: $page, pageSize: $pageSize){
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
            }

            ls_user {
                sub_org_name
                blueprint_user {
                    email
                }
            }
        }
    }
}`,
UPSERT_QUOTE_MUTATION = gql`
mutation UpdateQuote($id:String!, $status: String!){
    updateQuoteStatus(id: $id, status: $status)
}`;

const PAGE_SIZE = 10;
const QUOTE_STATUS_LIST = [
    { value: "NEW", title: "New"},
    { value: "PO_SUBMITTED", title: "In Progress"},
    { value: "COMPLETED", title: "Completed"},
];

// League Store Manager
export default function QuoteManager(){
    const [page, setPage] = useState(1);
    const [loadDelay, setLoadDelay] = useState(false);
    const [loadDownload, setLoadDownload] = useState(false);

    const [quoteStatus, setQuoteStatus] = useState("");
    const [updatedInvoiceNumber, setUpdatedInvoiceNumber] = useState<string|undefined>(); 
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
            id:"type", enableSorting: false,
            header: 'Quote Type', accessorKey: 'type', 
            cell: ({ row }: { row: any }) => { 
                return <div className="usrmgt_cell ctr_cell capitalize">{row.original.type}</div>
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
            id:"schoolName", enableSorting: false,
            header: 'School Name', accessorKey: 'schoolName', 
            cell: ({ row }: { row: any }) => { 
                return <div className={`usrmgt_cell ctr_cell cell_status`}>{row?.original?.ls_user?.sub_org_name}</div>
            }
        },
        { 
            id:"email", enableSorting: false,
            header: 'Email', accessorKey: 'email', 
            cell: ({ row }: { row: any }) => { 
                return <div className={`usrmgt_cell ctr_cell cell_status`}>{row?.original?.ls_user?.blueprint_user?.email ?? 'N/A'}</div>
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
            header: 'Updated Date', accessorKey: 'status_date', 
            cell: ({ row }: { row: any }) => { 
                return <div className="usrmgt_cell ctr_cell">{formatDateStr(row.original.creation_date, `MM-dd-yyyy hh:mm aaa`)}</div>
            }
        },
        
    ]);

    const pageRef = useRef(false);

    const { token } = useContext(userContext.UserContext) as UserContextType;

    const [getQueryItems, { loading, data }] = useLazyQuery(GET_QUOTES_QUERY, { fetchPolicy: 'no-cache' });
    const [updateQuote,{ loading: update_loading, data: update_data, error: update_error }] = useMutation(UPSERT_QUOTE_MUTATION, {fetchPolicy: 'no-cache'});
    
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
        getQueryItems({ variables:{ status: quoteStatus, page: page, pageSize: PAGE_SIZE } });
    }

    const updateStatus = (newStatus: string, invoice_number?: number, id?: string) => {
        try {
            if(id){
                setUpdatedInvoiceNumber(invoice_number?.toString());

                // Set Local Status
                setTableData((p: PurchaseOrderType[]) => {
                    let tmpP = [...p];

                    const updateIdx = tmpP.findIndex((po) => po._id === id);
                    if(updateIdx >= 0){
                        tmpP[updateIdx].status = newStatus;
                    }

                    return tmpP;
                });

                // Update Server Status
                updateQuote({ variables: { id: id, status: newStatus }});
            }
        } catch(ex){
            log.error(`Updating Row Status: ${ex}`)
        }
    }

    const downloadInvoice = async (invoice_id?: string, invoice_number?:number) => {
        try {
            if(invoice_id){
                setUpdatedInvoiceNumber(invoice_number?.toString());
                setLoadDownload(true);

                let file_invoice_number = `${invoice_number ?? 'NA'}`;
                let baseUrl = `${LS_API_URL}/quote/download/${invoice_id}`;

                const response = await fetch(baseUrl, {
                    method: "GET", 
                    headers: {
                        'Content-Type': 'application/json',
                        "Authorization": token ?? "",
                    }
                });

                if (!response.ok) {
                    toast.error(`Downloading Quote`, { position: "top-right",
                        autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                        draggable: true, progress: undefined, theme: "light" });
                }

                const blob = await response.blob();
                // Create an object URL from the blob
                const _url = window.URL.createObjectURL(blob);

                let filename = `leeleekiddz_invoice_${file_invoice_number}.pdf`;

                // Download Invoice
                downloadBlobURL(_url, filename);    
            }
        } catch(ex){
            log.error(`Downloading Invoice: ${ex}`);
        }

        setLoadDownload(false);
    }

    useEffect(() => { 
        if(pageRef?.current) {
            queryData(); 
        }

        pageRef.current = true;
    },[page]);

    useEffect(()=>{
        if(page === 1) {
            queryData();
        } else {
            setPage(1);
        }
    },[quoteStatus]);

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

    useEffect(()=>{ 
        if(!update_loading ){
            if(update_error){
                const errorMsg = JSON.stringify(update_error, null, 2);
                console.log(errorMsg);

                toast.error(`Error Updating Quote Status: ${update_error.message}`, { position: "top-right",
                    autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                    draggable: true, progress: undefined, theme: "light" });
            } else if(update_data?.updateQuoteStatus){
                toast.success(`Error Updating Quote Status`, { position: "top-right",
                    autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                    draggable: true, progress: undefined, theme: "light" });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[update_loading, update_data, update_error]);

    useEffect(()=>{ spiral.register(); ring.register(); },[]);

    return (
        <div className="admin-component league-store-component">
            <div className="league-store-component-section">
                <div className="table-ctrl-container">
                    <div className="ctrl-tabs">
                        <button className={`tab-btn ${quoteStatus === "" ? 'sel-tab' : ''}`} onClick={()=> {setQuoteStatus("")}}>
                            All Quotes
                        </button>

                        <button className={`tab-btn ${quoteStatus === "NEW" ? 'sel-tab' : ''}`} onClick={()=> {setQuoteStatus("NEW")}}>
                            New
                        </button>

                        <button className={`tab-btn ${quoteStatus === "PO_SUBMITTED" ? 'sel-tab' : ''}`} onClick={()=> {setQuoteStatus("PO_SUBMITTED")}}>
                            In Progress
                        </button>

                        <button className={`tab-btn ${quoteStatus === "COMPLETED" ? 'sel-tab' : ''}`} onClick={()=> {setQuoteStatus("COMPLETED")}}>
                            Completed
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
                                        <th className='empty-header'>Change Status</th>
                                        <th className='empty-header' />
                                    </tr>
                                ))}
                            </thead>
                            <tbody>
                                {table.getRowModel().rows.map((row, idx) => {
                                    return (
                                        <tr key={row.id} style={{ zIndex: table.getRowModel().rows.length - idx }} className={`row_status ${row?.original?.status?.toLowerCase() ?? ''}`}>
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
                                                <div className="usrmgt_cell ctr_cell">
                                                    <div className={`table-action-input`}>
                                                        <select name="status" value={row.original?.status} disabled={update_loading} 
                                                            onChange={(e)=>{ updateStatus(e.target.value, row.original.invoice_number, row.original?._id)}}>
                                                            {QUOTE_STATUS_LIST.map((st, i) =>
                                                                <option key={i} value={st.value}>{st.title}</option>
                                                            )}
                                                        </select>

                                                        {/* Loading Mask */}
                                                        <div className={`select-loading ${(update_loading && updatedInvoiceNumber === row.original.invoice_number) ? 'active' : ''}`}>
                                                            <l-ring size="12" stroke="2" speed="2" color="rgba(255,255,255,1)" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td>
                                                {(loadDownload && updatedInvoiceNumber === row.original.invoice_number) ?
                                                    <l-ring size="14" stroke="2" speed="2" color="rgba(50,50,50,1)" /> :
                                                    <button className='update-user-btn' onClick={()=> { downloadInvoice(row.original?._id, row.original?.invoice_number) }}>
                                                        <span className="material-symbols-outlined">cloud_download</span>
                                                    </button>
                                                }
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    }
                </div>

                <TablePaginationComponent loading={loading} totalItems={data?.leagueStoreQuotes?.totalResults} pageSize={PAGE_SIZE} pagesLeft={data?.leagueStoreQuotes?.pagesLeft} page={page} setPage={setPage} />
            </div>
        </div>
    );
}
