import { useContext, useEffect, useState } from "react";

import leagueStoreContext from '../../context/leaguestore.context';
import { LeagueStoreContextType, QuoteLineItemType } from "../../datatypes/customDT";
import { log } from "../../utils/log";

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
        discount_tags: ["league_gt_2", "league_gt_1"],
        showDateRange: true
    },
    "apparel":{
        tab_direction:"right",
        discount_tags: [],
        showDateRange: false
    }
}

import default_img from '../../assets/logo/leeleekiddz_league_store.png';
import { API_URL, formatDate } from "../../utils";

function StoreCartLineItem({ type, lineItem, discount }: StoreCartLineItemType) {
    const [selImg, setSelImg] = useState<string|undefined>(undefined);
    const [subDetailRow, setSubDetailRow] = useState<SubDetailRowType[]>([]);
    const [priceDetails, setPriceDetails] = useState({ "core_total": 0, "addon_total": 0 });

    const { calcLineItemSubTotal } = useContext(leagueStoreContext.LeagueStoreContext) as LeagueStoreContextType;

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
    },[]);

    return(
        <div className="cart-line-item">
            <div className="cart-img-container">
                <div className="cart-img">
                    {(selImg && selImg?.length > 0) ?
                        <img src={`${API_URL}/kaleidoscope/${selImg}`} /> :
                        <img src={default_img} className="default"/>                         
                    }
                </div>

                {/* TODO: Edit & Remove buttons*/}
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
                                
                                <table className="sub-detail-container">
                                    {subDetailRow?.map((sdr, i) =>
                                        <tr className="sdr-row" key={i}>
                                            <td className="sdr-title">{sdr.title}</td>
                                            <td className="count-price">{sdr.count} x {getPrice(sdr.price)}</td>
                                        </tr>
                                    )}
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
                                        {lineItem.add_on_list.map((ad, i) =>
                                            <tr className="sdr-row" key={i}>
                                                <td className="sdr-title">{ad.title}</td>
                                                <td className="count-price">{ad.minimum} x {getAddOnPrice(ad.title)}</td>
                                            </tr>
                                        )}
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

export default function StoreCart(){
    // Total | Addon Sub Total | Core Sub Total | [Discount] | 
    const [invoiceValues, setInvoiceValues] = useState<InvoiceDetailsType>({ 
            addon_sub_total: 0,
            core_sub_total: 0,
            total: 0,
            discount: null
        });
    const { storeLineItems, selectedCartTab, setSelectedCartTab, calcLineItemSubTotal } = useContext(leagueStoreContext.LeagueStoreContext) as LeagueStoreContextType;

    const generateInvoiceDiscount = (lineItemCount: number) => {
        let ret = null;
        try {
            const discount_tags = store_cart_config[selectedCartTab].discount_tags;

            for(let i=0; i < discount_tags.length; i++){
                if(discount_tags[i] === "league_gt_2" && lineItemCount > 2) {
                    ret = { 
                        percentage: 20, tag:'league_gt_2',
                        title: 'Registering 3 or more of our leagues'
                    }
                    break;
                }

                if(discount_tags[i] === "league_gt_1" && lineItemCount > 1) {
                    ret = { 
                        percentage: 10, tag:'league_gt_1',
                        title: 'Registering 2 of our leagues'
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

        // Get Store Line Items
        let tmpStoreLineItems:QuoteLineItemType[] = [];
        if(selectedCartTab === "leagues") {
            tmpStoreLineItems = storeLineItems.leagues;
        } else if (selectedCartTab === "apparel") {
            tmpStoreLineItems = storeLineItems.apparel;
        }
        
        if(tmpStoreLineItems.length > 0){
            // Calculate Core Sub Total | Calculate Addon Subtotal
            tmpStoreLineItems.forEach((li) => {
                const { core_total, addon_total } = calcLineItemSubTotal(li);

                invoice_values.core_sub_total += core_total;
                invoice_values.addon_sub_total += addon_total;
            })

            // Determine Discount Amount
            invoice_values.discount = generateInvoiceDiscount(tmpStoreLineItems.length);
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

    useEffect(()=>{
        // Generate Invoice
        generateInvoice();
    },[storeLineItems, selectedCartTab]);

    useEffect(()=>{ window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); },[]);

    return (
        <div className="ls-page ls-store-cart">
            <h1 className="page-title">Finalize Invoice</h1>

            <div className="cart-tab-container-wrapper">
                <div className={`cart-tab-container ${store_cart_config[selectedCartTab]?.tab_direction}`}>
                    <button className={`cart-tab ${selectedCartTab === 'leagues' ? 'active' : ''}`} onClick={()=> setSelectedCartTab('leagues')}>Leagues</button>
                    <button className={`cart-tab ${selectedCartTab === 'apparel' ? 'active' : ''}`} onClick={()=> setSelectedCartTab('apparel')}>Apparel</button>
                </div>
            </div>

            <div className="cart-details-container">
                <div className="cart-line-items-container">
                    {selectedCartTab === "leagues" && 
                        <>
                            {storeLineItems.leagues?.map((li, i) =>
                                <StoreCartLineItem type="leagues" lineItem={li} discount={invoiceValues?.discount} key={i} />
                            )}
                        </>
                    }

                    {selectedCartTab === "apparel" && 
                        <>
                            {storeLineItems.apparel?.map((li, i) =>
                                <StoreCartLineItem type="apparel" lineItem={li} discount={invoiceValues?.discount} key={i} />
                            )}
                        </>
                    }
                </div>
                <div className="cart-invoice-details-container"></div>
            </div>
        </div>
    );
}
