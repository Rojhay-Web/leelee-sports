import { useContext, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { ring } from 'ldrs';

import userContext from '../../context/user.context';
import leagueStoreContext from '../../context/leaguestore.context';

import { formatDate, LS_API_URL } from "../../utils";
import { log } from "../../utils/log";
import { downloadBlobURL, getPrice } from "../../utils/_customUtils";

import { UserContextType } from "../../datatypes";
import { LeagueStoreContextType, PurchaseOrderDiscountType, PurchaseOrderType, QuoteLineItemType } from "../../datatypes/customDT";
import { SubDetailRowType } from "../pages/storeCart";

type QuoteModalSubType = {
    selectedQuote?:PurchaseOrderType,
    closeModal: () => void
}

type QuoteChoiceLineItemType = {
    lineItem: QuoteLineItemType;
    discount: any;
}

const store_cart_config: any = {
    "leagues":{
        tab_direction:"left",
        discount_title: "League",
        discount_tags: ["league_gt_2", "league_gt_1"],
        showDateRange: true
    },
    "apparel":{
        tab_direction:"right",
        discount_title: "Apparel Store",
        discount_tags: [],
        showDateRange: false
    }
}

function QuoteChoiceLineItem({ lineItem, discount }: QuoteChoiceLineItemType) {
    const [type, setType] = useState("");
    const [subDetailRow, setSubDetailRow] = useState<SubDetailRowType[]>([]);
    const [priceDetails, setPriceDetails] = useState({ "core_total": 0, "addon_total": 0 });

    const { calcLineItemSubTotal } = useContext(leagueStoreContext.LeagueStoreContext) as LeagueStoreContextType;

    const getAddOnPrice = (title?:string) => {
        let ret = '$$';
        try {
            const add_on_store_item = lineItem?.store_item?.addons ? 
                lineItem?.store_item?.addons.find((ad2) => ad2.title === title) :
                null;
                        
            if(add_on_store_item && add_on_store_item?.price) {
                ret = getPrice(add_on_store_item.price);
            }
        } catch(ex){
            log.error(`Getting Price: ${ex}`);
        }

        return ret;
    }

    const getSubDetails = (localType:string) => {
        try {
            const tmpDetails: SubDetailRowType[] = [];

            if(localType === "leagues") {
                const item_min = lineItem?.store_item?.minimum ?? 0,
                    to_min_price = lineItem?.store_item?.price_per_item ?? 0;

                tmpDetails.push({
                    title:"Minimum Participants",
                    count: item_min,
                    price: to_min_price
                });

                const post_min_price = lineItem?.store_item?.additional_set_price ?? 0,
                    post_min_count = (lineItem?.item_count ?? 0) - item_min;

                tmpDetails.push({
                    title:"Additional Participants",
                    count: post_min_count,
                    price: post_min_price
                });

            } else if(localType === "apparel"){
                tmpDetails.push({
                    title:"Items",
                    count: lineItem?.item_count ?? 0,
                    price: lineItem?.store_item?.price_per_item ?? 0
                });
            }

            setSubDetailRow(tmpDetails);
        } catch(ex){
            log.error(`Getting Sub Details: ${ex}`);
        }
    }

    const getDiscountPrice = (price:number) => {
        let ret = '$$';
        try {
            if(discount?.percentage) {
                const discountPrice = price - ((discount?.percentage / 100) * price);
                ret = getPrice(discountPrice);
            }
        } catch(ex){
            log.error(`Getting Discount Price: ${ex}`);
        }
        return ret;
    }

    useEffect(()=>{
        // Set Type
        setType(lineItem?.store_item?.store_id ?? "");

        // Get Line Item Detail Break down
        getSubDetails(lineItem?.store_item?.store_id ?? "");

        // Set Line Item Price
        const { core_total, addon_total } = calcLineItemSubTotal(lineItem);
        setPriceDetails({ core_total, addon_total });
    },[lineItem]);


    return(
        <div className="cart-line-item">
            <div className="cart-img-container">
                <span className="material-symbols-outlined">receipt</span>
            </div>

            <table className="line-item-table">
                <tbody>
                    {/* Core Content Details*/}
                    <tr>
                        <td>
                            <div className="content-details">
                                <div className="title">{lineItem?.store_item?.title}</div>
                                {store_cart_config[type]?.showDateRange &&
                                    <div className="date-row">
                                        {lineItem?.store_item?.details?.start_dt &&
                                            <span>{formatDate(lineItem?.store_item?.details?.start_dt, 'MMM dd, yyyy')}</span>
                                        }
                                        {lineItem?.store_item?.details?.end_dt &&
                                            <>
                                                <span>-</span>
                                                <span>{formatDate(lineItem?.store_item?.details?.end_dt, 'MMM dd, yyyy')}</span>
                                            </>
                                        }
                                    </div>
                                }

                                {(lineItem?.item_additional_details && lineItem?.item_additional_details?.length > 0) &&
                                    <div className="additional-description">{lineItem?.item_additional_details}</div>
                                }
                                <table className="sub-detail-container">
                                    <tbody>
                                        {subDetailRow?.map((sdr, i) =>
                                            <tr className="sdr-row" key={i}>
                                                <td className="sdr-title">{sdr.title}</td>
                                                <td className="count-price">{sdr.count} x {getPrice(sdr.price)}</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </td>
                        <td className="price">
                            <div className="price-breakdown">
                                <span className={`base-price ${discount ? 'discounted' : ''}`}>{getPrice(priceDetails.core_total)}</span>
                                {discount ? <span className="discounted-price">{getDiscountPrice(priceDetails.core_total)}</span> : <></>}
                            </div>
                        </td>
                    </tr>

                    {/* Addon Content Details*/}
                    {(lineItem?.add_on_list && lineItem.add_on_list.length > 0) &&
                        <tr>
                            <td>
                                <div className="content-details">
                                    <div className="title">Addon(s)</div>
                                    <table className="sub-detail-container">
                                        <tbody>
                                            {lineItem.add_on_list.map((ad, i) =>
                                                <tr className="sdr-row" key={i}>
                                                    <td className="sdr-title">{ad.title}</td>
                                                    <td className="count-price">{ad.minimum} x {getAddOnPrice(ad.title)}</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </td>
                            <td className="price">{getPrice(priceDetails.addon_total)}</td>
                        </tr>
                    }
                </tbody>
            </table>
        </div>
    );
}

export function DownloadQuote({ selectedQuote, closeModal }: QuoteModalSubType){
    const [lineItems, setLineItems] = useState<QuoteLineItemType[] | undefined>([]);
    const [discount, setDiscount] = useState<PurchaseOrderDiscountType|undefined>();

    const [downloadedItem, setDownloadedItem] = useState<any>({});
    const [selectedList, setSelectedList] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);

    const { token } = useContext(userContext.UserContext) as UserContextType;

    const toggleSelected = (idx: number) => {
        try {
            setSelectedList((p)=>{
                let tmpList: number[] = [];
                if(p.includes(idx)) {
                    tmpList = p.filter((li) => li != idx);
                } else {
                    tmpList =[...p, idx];
                }

                return tmpList;
            });
        } catch(ex){
            log.error(`Toggling Selected: ${ex}`);
        }
    }

    const downloadInvoice = async (all: boolean = false) => {
        try {
            setLoading(true);

            let invoice_number = `${selectedQuote?.invoice_number ?? 'NA'}`;
            let baseUrl = `${LS_API_URL}/quote/download/${selectedQuote?._id}`;

            if(!all && selectedList?.length > 0) {
                invoice_number = `0${selectedList.join('')}${invoice_number}`;
            
                baseUrl = `${baseUrl}?${selectedList.map((item) => {
                    return `filter_items[]=${item}`;
                }).join('&')}`;
            } else {
                
            }

            setDownloadedItem((p: any)=>{
                if(!all) {
                    selectedList.forEach((sl) => p[sl]=true);
                } else {
                    lineItems?.forEach((sl,i) => p[i]=true);
                }
                
                return p;
            });

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

            let filename = `leeleekiddz_invoice_${invoice_number}.pdf`;

            // Download Invoice
            downloadBlobURL(_url, filename);           

            if(all) { closeModal(); }
        } catch(ex){
            log.error(`Downloading Invoice: ${ex}`);
        }

        setLoading(false);
    }

    useEffect(()=>{
        setLineItems(selectedQuote?.line_items);
        setDiscount(selectedQuote?.discount);

        setDownloadedItem({});
        setSelectedList([]);
    },[selectedQuote]);

    return(
        <div className="upload-container">
            <h1>Invoice Builder</h1>
            <h2>
                Select and download the line items that you need invoice(s) for either separately or all together.  
                <span>Please ensure that each line item is contained within an invoice.</span>
            </h2>

            <div className="cart-line-items-container">
                {lineItems?.map((li,i) =>
                    <div className={`download-li-container ${selectedList.includes(i) || i in downloadedItem ? 'avaliable' : ''}`} key={i}>
                        <div className={`selected-box ${selectedList.includes(i) ? 'sel' : ''}`} onClick={()=>{ toggleSelected(i) }}/>
                        
                        <QuoteChoiceLineItem lineItem={li} discount={discount} />
                        
                        <div className="downloaded-list-sel">
                            {(i in downloadedItem) ?
                                <span className="icon material-symbols-outlined">check_circle</span> :
                                <span className="empty"/>
                            }
                        </div>
                    </div>
                )}
            </div>

            <div className="btn-container">
                <button className="upload-button" disabled={loading || selectedList?.length === 0} onClick={()=> { downloadInvoice() }}>
                    {loading ? 
                        <span><l-ring size="22" stroke="2" speed="2" color="rgba(250,250,250,1)"/></span> :
                        <span className="material-symbols-outlined">stacks</span>
                    }
                    <span>Download Selected</span>
                </button>

                <button className="upload-button all" disabled={loading} onClick={()=> { downloadInvoice(true) }}>
                    {loading ? 
                        <span><l-ring size="22" stroke="2" speed="2" color="rgba(250,250,250,1)"/></span> :
                        <span className="material-symbols-outlined">download</span>
                    }
                    <span>Download All</span>
                </button>
            </div>
        </div>
    )
}

export function UploadQuotePO({ selectedQuote, closeModal }: QuoteModalSubType){
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
