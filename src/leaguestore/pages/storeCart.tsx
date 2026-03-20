import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

import leagueStoreContext from '../../context/leaguestore.context';
import userContext from '../../context/user.context';

import { UserContextType } from "../../datatypes";
import { LeagueStoreContextType, PurchaseOrderType, QuoteLineItemType } from "../../datatypes/customDT";
import { log } from "../../utils/log";
import { API_URL, LS_API_URL, formatDate } from "../../utils";

type InvoiceDetailsType = {
    addon_sub_total: number;
    core_sub_total: number;
    total: number;
    discount: any;
}

type StoreCartLineItemType = {
    lineItem: QuoteLineItemType;
    discount: any;
    type: string;
}

type SubDetailRowType = {
    title:string;
    count: number;
    price: number;
}

const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});
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

import default_img from '../../assets/logo/leeleekiddz_league_store.png';



function StoreCartLineItem({ type, lineItem, discount }: StoreCartLineItemType) {
    const [selImg, setSelImg] = useState<string|undefined>(undefined);
    const [subDetailRow, setSubDetailRow] = useState<SubDetailRowType[]>([]);
    const [priceDetails, setPriceDetails] = useState({ "core_total": 0, "addon_total": 0 });

    const { calcLineItemSubTotal, removeLineItem } = useContext(leagueStoreContext.LeagueStoreContext) as LeagueStoreContextType;

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

    const getSubDetails = () => {
        try {
            const tmpDetails: SubDetailRowType[] = [];
            if(type === "leagues") {
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

            } else if(type === "apparel"){
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

    const removeItem = () => {
        if(lineItem?.quote_item_id && window.confirm('Are you sure you want to remove this line item?')){
            removeLineItem(type, lineItem.quote_item_id);
        }
    }

    useEffect(()=>{
        // Set Default Image
        if(lineItem?.store_item?.photos && lineItem?.store_item?.photos?.length > 0) {
            setSelImg(lineItem.store_item.photos[0]?._id);
        }

        // Get Line Item Detail Break down
        getSubDetails();

        // Set Line Item Price
        const { core_total, addon_total } = calcLineItemSubTotal(lineItem);
        setPriceDetails({ core_total, addon_total });
    },[lineItem]);

    return(
        <div className="cart-line-item">
            <div className="cart-img-container">
                <div className="cart-img">
                    {(selImg && selImg?.length > 0) ?
                        <img src={`${API_URL}/kaleidoscope/${selImg}`} /> :
                        <img src={default_img} className="default"/>                         
                    }
                </div>

                <div className="btn-container">
                    <button className="btn remove" onClick={removeItem}>
                        <span className="btn-icon material-symbols-outlined">close</span>
                        <span className="btn-title">Remove</span>
                    </button>

                    <Link className="btn edit" to={`/leaguestore/${type}?item=${lineItem?.quote_item_id}`}>
                        <span className="btn-icon material-symbols-outlined">edit_note</span>
                        <span className="btn-title">Edit Item</span>
                    </Link>
                </div>
            </div>

            <table className="line-item-table">
                <tbody>
                    {/* Core Content Details*/}
                    <tr>
                        <td>
                            <div className="content-details">
                                <div className="title">{lineItem?.store_item?.title}</div>
                                {store_cart_config[type].showDateRange &&
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

                    {/* Design Details */}
                    {(lineItem?.store_item?.details?.customDesign) &&
                        <tr>
                            <td>
                                <div className="custom-detail-container">
                                    <div className='item-personalize-container'>
                                        <div className='img-container'>
                                            {lineItem?.design_img && <img src={lineItem?.design_img} /> }
                                        </div>
                                        <div className='team-info-container'>
                                            <div className='team-info-item'>
                                                <div className='title'>Team Name</div>
                                                <span>{lineItem?.design_name}</span>
                                            </div>
                                            <div className='team-info-item'>
                                                <div className='title'>Design Notes</div>
                                                <span>{lineItem?.design_description}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className='item-personalize-container'>
                                        <table className="custom-details-list">
                                            <thead>
                                                <tr>
                                                    <th>#</th>
                                                    <th>Name</th>
                                                    <th></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {lineItem?.custom_item_list?.map((cli, i) =>
                                                    <tr key={i}>
                                                        <td>{cli.item_number ?? 'Not Set'}</td>
                                                        <td>{cli.item_title ?? 'Not Set'}</td>
                                                        <td>{cli.item_category_sel ?? 'Not Set'}</td>
                                                    </tr>
                                                )}                                                
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    }                    
                </tbody>
            </table>
        </div>
    );
}

export default function StoreCart(){
    const [loading, setLoading] = useState(false);
    const [cartLineItems, setCartLineItems] = useState<QuoteLineItemType[]>([]);

    // Total | Addon Sub Total | Core Sub Total | [Discount] | 
    const [invoiceValues, setInvoiceValues] = useState<InvoiceDetailsType>({ 
            addon_sub_total: 0,
            core_sub_total: 0,
            total: 0,
            discount: null
        });

    const { storeLineItems, selectedCartTab, setSelectedCartTab, calcLineItemSubTotal, clearingLineItems } = useContext(leagueStoreContext.LeagueStoreContext) as LeagueStoreContextType;
    const { token } = useContext(userContext.UserContext) as UserContextType;

    const generateInvoiceDiscount = (lineItemCount: number, core_sub_total:number) => {
        let ret = null;
        try {
            const discount_tags = store_cart_config[selectedCartTab].discount_tags;

            for(let i=0; i < discount_tags.length; i++){
                if(discount_tags[i] === "league_gt_2" && lineItemCount > 2) {
                    ret = { 
                        percentage: 20, tag:'league_gt_2',
                        title: 'Registering 3 or more of our leagues',
                        total: .2 * core_sub_total
                    }
                    break;
                }

                if(discount_tags[i] === "league_gt_1" && lineItemCount > 1) {
                    ret = { 
                        percentage: 10, tag:'league_gt_1',
                        title: 'Registering 2 of our leagues',
                        total: .1 * core_sub_total
                    }
                    break;
                }
            }
        } catch(ex){
            log.error(`Generating Invoice Discount: ${ex}`);
        }

        return ret;
    }

    const generateInvoice = () => {
        const invoice_values: InvoiceDetailsType = {
            addon_sub_total: 0,
            core_sub_total: 0,
            total: 0,
            discount: null
        };
        
        if(cartLineItems.length > 0){
            // Calculate Core Sub Total | Calculate Addon Subtotal
            cartLineItems.forEach((li) => {
                const { core_total, addon_total } = calcLineItemSubTotal(li);

                invoice_values.core_sub_total += core_total;
                invoice_values.addon_sub_total += addon_total;
            })

            // Determine Discount Amount
            invoice_values.discount = generateInvoiceDiscount(cartLineItems.length, invoice_values.core_sub_total);
        }
        
        // Set Local Total State  
        if(invoice_values.discount) {
            const tmp_discount_amount = (invoice_values.discount.percentage / 100) * invoice_values.core_sub_total;
            invoice_values.discount.amount = tmp_discount_amount;

            invoice_values.total = invoice_values.addon_sub_total + (invoice_values.core_sub_total - tmp_discount_amount);
        } else {
            invoice_values.total = invoice_values.addon_sub_total + invoice_values.core_sub_total; 
        }
        
        // Seet Invoice Values
        setInvoiceValues(invoice_values);
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

    const submitPurchaseOrder = async () => {
        try {
            setLoading(true);
            const new_po = new PurchaseOrderType(
                invoiceValues?.core_sub_total, invoiceValues?.addon_sub_total, 
                invoiceValues?.total, invoiceValues?.discount, cartLineItems,
                selectedCartTab
            );

            const postData = JSON.stringify(new_po);

            const response = await fetch(`${LS_API_URL}/quote/submit`, {
                method: "POST", body: postData,
                headers: {
                    'Content-Type': 'application/json',
                    "Authorization": token ?? "",
                    "Accept": "application/json", 
                },
            });

            const res = await response.json();

            if(res?.results){
                // Download Invoice
                downloadInvoice(res?.results);
                
                toast.success(`Submitted Purchase Order`, { position: "top-right",
                    autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                    draggable: true, progress: undefined, theme: "light" });

                clearingLineItems(selectedCartTab);
                
            } else {
                toast.error(`Submitting Purchase Order: ${res?.error}`, { position: "top-right",
                    autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                    draggable: true, progress: undefined, theme: "light" });
            }            
        } catch(ex){
            log.error(`Submitting Purchase Order: ${ex}`);
            toast.error(`Submitting Purchase Order`, { position: "top-right",
                autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                draggable: true, progress: undefined, theme: "light" });
        }

        setLoading(false);
    }

    const downloadInvoice = async (quote_id:string) => {
        try {
            const response = await fetch(`${LS_API_URL}/quote/download/${quote_id}`, {
                method: "GET", 
                headers: {
                    'Content-Type': 'application/json',
                    "Authorization": token ?? "",
                },
            });

            if (!response.ok) {
                toast.error(`Downloading Quote`, { position: "top-right",
                    autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                    draggable: true, progress: undefined, theme: "light" });
            }

            const blob = await response.blob();
            // Create an object URL from the blob
            const _url = window.URL.createObjectURL(blob);

            // Open the new window/tab
            window.open(_url, '_blank')?.focus();
        } catch(ex){
            log.error(`Downloading Invoice: ${ex}`);
        }
    }

    useEffect(()=>{
        if(selectedCartTab === "leagues") {
            setCartLineItems(storeLineItems.leagues);
        } else if(selectedCartTab === "apparel"){
            setCartLineItems(storeLineItems.apparel);
        }
    },[storeLineItems, selectedCartTab]);

    useEffect(()=>{
        // Generate Invoice
        generateInvoice();
    },[cartLineItems]);

    useEffect(()=>{ window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); },[]);

    return (
        <div className="ls-page ls-store-cart">
            <h1 className="page-title">Finalize Quote</h1>

            <div className="cart-tab-container-wrapper">
                <div className={`cart-tab-container ${store_cart_config[selectedCartTab]?.tab_direction}`}>
                    <button className={`cart-tab ${selectedCartTab === 'leagues' ? 'active' : ''}`} onClick={()=> setSelectedCartTab('leagues')}>Leagues</button>
                    <button className={`cart-tab ${selectedCartTab === 'apparel' ? 'active' : ''}`} onClick={()=> setSelectedCartTab('apparel')}>Apparel</button>
                </div>
            </div>

            <div className="cart-details-container">
                {!(cartLineItems?.length > 0) ?
                    <div className="empty-cart">
                        <p>This cart is currently empty</p> 
                        <p>add store items before attempting to submit an quote</p>
                    </div> :
                    <>
                        <div className="cart-line-items-container">
                            {cartLineItems?.map((li, i) =>
                                <StoreCartLineItem type={selectedCartTab} lineItem={li} discount={invoiceValues?.discount} key={i} />
                            )}
                        </div>

                        <div className="cart-invoice-details-container">
                            <div className="cart-invoice-details-inner">
                                <div className="section-container">
                                    <p>The following is your custom invoice based on the items that you added.</p>
                                    <p>If all of the items are correct feel free to select the 'Submit Invoice' button.  
                                            Which will generate and save your custom quote.</p> 
                                </div>

                                <div className="section-container">
                                    <h1>Order Summary</h1>

                                    <div className='total-info'>
                                        <span>Sub-Total:</span>
                                        <span>{getPrice(invoiceValues.core_sub_total)}</span>
                                    </div>

                                    {(invoiceValues?.discount != null) &&
                                        <div className='total-info wrap discount'>
                                            <span>{invoiceValues?.discount?.percentage}% {store_cart_config[selectedCartTab].discount_title} Discount:</span>
                                            <span>-{getPrice(invoiceValues?.discount?.total)}</span>
                                            <div className='discount-description'>{invoiceValues?.discount?.title}</div>
                                        </div>
                                    }

                                    {(invoiceValues?.addon_sub_total > 0) &&
                                        <div className='total-info'>
                                            <span>Addon Item(s) Sub-Total:</span>
                                            <span>{getPrice(invoiceValues.addon_sub_total)}</span>
                                        </div>
                                    }

                                    <div className='total-info cutoff'>
                                        <span className='total'>Total:</span>
                                        <span className='total'>{getPrice(invoiceValues.total)}</span>
                                    </div>

                                    <div className="btn-container">
                                        <button className="submit" disabled={cartLineItems?.length === 0 || loading} onClick={submitPurchaseOrder}>
                                            <span className="btn-title">Submit Invoice</span>
                                            <span className="btn-icon material-symbols-outlined">send_and_archive</span>
                                        </button>

                                        <p>If you have any questions feel free to contact: <a href="mailto:kevinricks@leeleeff.com" target="_blank">kevinricks@leeleeff.com</a></p>
                                    </div>   
                                </div>
                            </div>
                        </div>
                    </>
                }
            </div>
        </div>
    );
}
