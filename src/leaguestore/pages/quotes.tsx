import { CSSProperties, Dispatch, SetStateAction, useContext, useEffect, useRef, useState } from "react";
import { Column, ColumnDef, flexRender, getCoreRowModel, SortingState, useReactTable } from "@tanstack/react-table";
import { gql, useLazyQuery } from '@apollo/client';
import { toast } from "react-toastify";
import Rodal from "rodal";
import { ring } from 'ldrs';

import { PurchaseOrderType } from "../../datatypes/customDT";
import TablePaginationComponent from "../../toolbox/leagueStore/components/tablePaginationComponent";

import { log } from "../../utils/log";
import { formatDateStr, LS_API_URL } from "../../utils";
import { UserContextType } from "../../datatypes";

import userContext from '../../context/user.context';


const PAGE_SIZE = 10;
const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const modalStyles = {
    height: 'calc(70vh - 70px)',
    width: (window.innerWidth > 770 ? '40%' : 'calc(100% - 45px)'), 
};
type QuoteModalSubType = {
    selectedQuote?:PurchaseOrderType,
    closeModal: () => void
}

type QuoteModalType = {
    modalType: string,
    modalStatus: boolean,
    setModalStatus: Dispatch<SetStateAction<boolean>>,
    selectedQuote?:PurchaseOrderType,
    setSelectedQuote: Dispatch<SetStateAction<PurchaseOrderType | undefined>>,
}

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
function DownloadQuote({ selectedQuote, closeModal }: QuoteModalSubType){
    return(
        <>

        </>
    )
}

function UploadQuotePO({ selectedQuote, closeModal }: QuoteModalSubType){
    const [orderNumber, setOrderNumber] = useState("");
    const [poFile, setPoFile] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const fileRef = useRef<HTMLInputElement>(null);

    const { token } = useContext(userContext.UserContext) as UserContextType;

    const handleFileInput = (e: any) => {
        if(e?.target?.files?.length > 0) {
            setPoFile(e.target.files[0]);
            e.target.value = null;
        }        
    }

    const removePOFile = (e: any) => {
        setPoFile(null);
        e.stopPropagation();
    }

    const submitPO = async () => {
        if(poFile !== null && orderNumber?.length > 0 && selectedQuote?._id){
            setLoading(true);
            const postData = new FormData();
            postData.append("purchaseOrder", poFile);
            postData.append("quoteId", selectedQuote._id);
            postData.append("poNumber", orderNumber);

            const response = await fetch(`${LS_API_URL}/purchase_order/upload`, {
                method: "POST", body: postData,
                headers: {
                    "Authorization": token ?? "",
                    "Accept": "application/json", 
                }
            });

            const res = await response.json();
            if(res?.status){
                toast.success(`Uploaded Purchase Order`, { position: "top-right",
                    autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                    draggable: true, progress: undefined, theme: "light" });

                closeModal();

                // Clean Up
                setPoFile(null);
                setOrderNumber("");
            } else {
                toast.error(`Uploading Purchase Order: ${res?.error}`, { position: "top-right",
                    autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                    draggable: true, progress: undefined, theme: "light" });
            }

            setLoading(false);
        }
    }

    useEffect(()=>{ ring.register(); },[]);

    return(
        <div className="upload-container">
            <h1>Upload Purchase Order</h1>
            <h2>Quote #{selectedQuote?.invoice_number}</h2>
            <div className="content-container">
                <span className="icon material-symbols-outlined">cloud_upload</span>
                <p>Please upload your official Purchase Order file (PDF, PNG, or JPG) to finalize your quote. Ensure the PO number and total amount entered below match the uploaded PO.</p>

                <div className="action-container">
                    <div className="custom-input-container">
                        <span className="input-title">Purchase Order File</span>
                        <div className={`input-container file-selector ${poFile ? '' : 'empty-file'}`} onClick={()=>{ fileRef?.current?.click(); }}>
                            {poFile ?
                                <>
                                    <span className="input-icon material-symbols-outlined">attach_file</span>
                                    <span>{poFile?.name}</span>

                                    <button className="remove-btn" onClick={removePOFile}>
                                        <span className="material-symbols-outlined">delete</span>
                                    </button>
                                </> :
                                <>
                                    <span className="input-icon material-symbols-outlined">draft</span>
                                    <span>No File Uploaded</span>
                                </>
                            }                            

                            <input className='file_selector' type="file" name="poFile"  
                                ref={fileRef} onChange={handleFileInput} />
                        </div>
                    </div>

                    <div className="custom-input-container">
                        <span className="input-title">Purchase Order #</span>
                        <div className="input-container">
                            <input type="text" name="email" value={orderNumber} 
                                placeholder="Please enter your PO#"
                                onChange={(e)=> setOrderNumber(e.target.value)} />
                        </div>
                    </div>

                    <button className="upload-button" disabled={poFile === null || orderNumber?.length === 0 || loading} onClick={submitPO}>
                        {loading ? 
                            <span><l-ring size="22" stroke="2" speed="2" color="rgba(250,250,250,1)"/></span> :
                            <span className="material-symbols-outlined">upload_file</span>
                        }
                        <span>Upload Purchase Order</span>
                    </button>
                </div>
            </div>
        </div>
    )
}

function QuoteModal({ modalType, modalStatus, selectedQuote, setModalStatus, setSelectedQuote }: QuoteModalType){
    const closeModal = () => {
        setModalStatus(false);
        setSelectedQuote(undefined);
    }

    return(
        <Rodal className="quote-editor-modal" 
            visible={modalStatus} onClose={closeModal} 
            customStyles={modalStyles}
        >
            <div className="quote-editor-modal-container">
                {modalType === "upload" && <UploadQuotePO selectedQuote={selectedQuote} closeModal={closeModal} /> }
                {modalType === "download" && <DownloadQuote selectedQuote={selectedQuote} closeModal={closeModal} /> }
            </div>
        </Rodal>
    );
}

export default function Quotes(){
    const [show, setShow] = useState(false);
    const [showType, setShowType] = useState("upload");
    const [selectedQuote, setSelectedQuote] = useState<PurchaseOrderType|undefined>();

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

    const pageRef = useRef(false);

    const table = useReactTable({
        data: tableData,
        columns,
        initialState: {}, state: {},
        getCoreRowModel: getCoreRowModel(),
        debugTable: false, debugHeaders: false, debugColumns: false,
        columnResizeMode: "onChange",
        onSortingChange: setSorting,
    });

    const selectQuote = (quote: PurchaseOrderType, type: string) => {
        try {   
            setSelectedQuote(quote);
            setShowType(type);
            setShow(true);
        } catch(ex){
            log.error(`Selecting Quote: ${ex}`);
        }
    }

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

    useEffect(()=>{
        if(!selectedQuote){
            if(page === 1) {
                queryData();
            } else {
                setPage(1);
            }
        }
    },[selectedQuote])

    useEffect(() => { 
        if(pageRef?.current) {
            queryData(); 
        }

        pageRef.current = true;
    },[page]);

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
                                                <button className='update-user-btn' onClick={()=> { selectQuote(row.original, "download") }}>
                                                    <span className="material-symbols-outlined">cloud_download</span>
                                                </button>

                                                <button className='update-user-btn' onClick={()=> { selectQuote(row.original, "upload") }}>
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

            <QuoteModal selectedQuote={selectedQuote} setSelectedQuote={setSelectedQuote} 
                modalType={showType} modalStatus={show} setModalStatus={setShow} />
        </div>
    );
}
