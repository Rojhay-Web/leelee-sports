import { Dispatch, SetStateAction, useContext, useEffect, useState } from "react";

import { LeagueStoreAddon, LeagueStoreContextType, LeagueStoreItemType, QuoteAddOnItemType, QuoteLineItemType } from "../../datatypes/customDT";
type StoreMenuItemType = {
    type: string;
    item?: LeagueStoreItemType;
    setSelStoreItem: Dispatch<SetStateAction<LeagueStoreItemType | undefined>>; 
}
type AddOnToolType = {
    defaultAddOns?: LeagueStoreAddon[];
    selectedAddOns?: QuoteAddOnItemType[];
    setLineItem: Dispatch<SetStateAction<QuoteLineItemType | undefined>>;
}

import leagueStoreContext from '../../context/leaguestore.context';

import { API_URL, formatDate } from "../../utils";
import { log } from "../../utils/log";

const storeMenuPageDetails: {[key: string] : any } = {
    "leagues": { 
        backTitle: "Back To All Leagues",
        quantityTitle:"Player Participants",
        additionalPriceDetails: true,
        dateRange: true,
        groupCategory: true
    },
    "apparel": { 
        backTitle: "Back To All Apparel",
        quantityTitle:"Item Quantity",
        additionalPriceDetails: false,
        dateRange: false,
        groupCategory: false
    }
}

const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

// Images
import default_img from '../../assets/logo/leeleekiddz_league_store.png';

function AddOnTool({ defaultAddOns, selectedAddOns, setLineItem }:AddOnToolType){
    const [openToggle, setOpenToggle] = useState(false);

    const calcPrice = (min?:number, perPrice?:number) =>{
        let ret = '$$';
        try {
            if(min && perPrice){
                let defaultPrice = perPrice * min;
                ret = formatter.format(defaultPrice);
            }
        } catch(ex){
            log.error(`Getting Price: ${ex}`);
        }

        return ret;
    }

    const addonIsSelected = (title?:string) => {
        let ret = false;
        if(title) {
            ret = selectedAddOns?.find((ad) => ad.title === title) !== undefined;
        }

        return ret;
    }

    const toggleAddOn = (addOn: LeagueStoreAddon) =>{
        try {
            let isAdded = addonIsSelected(addOn?.title);

            setLineItem((p)=>{                
                let tmpSel = p?.add_on_list ?? [];

                let isLocalSel = tmpSel?.find((ad) => ad.title === addOn?.title) !== undefined;

                if(isAdded) {
                    tmpSel = tmpSel?.filter((ts) => ts?.title !== addOn?.title);
                } else if(!isLocalSel) {
                    tmpSel.push(new QuoteAddOnItemType(addOn.title, addOn.minimum));
                }

                return { ...p, "add_on_list": tmpSel };
            })
        } catch(ex){
            log.error(`Toggling Addon: ${ex}`);
        }
    }

    return(
        <div className="str-drill-down-container">
            {defaultAddOns && defaultAddOns?.length > 0 &&
                <>
                    <div className="header-container" onClick={()=> setOpenToggle(p => !p)}>
                        <div className="header-text">
                            <span>Addon(s)</span>
                            <span className="mini-title">{selectedAddOns?.length ?? 0} Selected</span>
                        </div>
                        <span className="icon material-symbols-outlined">{openToggle ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}</span>
                    </div>

                    {openToggle &&
                        <div className="drill-list-container">
                            {defaultAddOns?.map((addon, i) =>
                                <div className={`drill-list-item ${addonIsSelected(addon?.title) ? 'sel' : ''}`} key={i}>
                                    <div className="check-bx-label" onClick={()=> { toggleAddOn(addon); }}>
                                        <button className="check-bx"/>
                                        <span>Request {addon.minimum} {addon.title}{/*(addon?.minimum && addon?.minimum > 1) ?'s' :''*/}</span>
                                    </div>

                                    <span className="price">+ {calcPrice(addon.minimum, addon.price)}</span>
                                </div>
                            )}
                        </div>
                    }
                </>
            }
        </div>
    );
}

export default function StoreMenuItem({ type, item, setSelStoreItem }: StoreMenuItemType){
    const [selPhotoIdx, setSelPhotoIdx] = useState(-1);
    const [selImg, setSelImg] = useState<string|undefined>(undefined);
    const [menuDetails, setMenuDetails] = useState(storeMenuPageDetails['leagues']);

    const [editLineItem, setEditLineItem] = useState<QuoteLineItemType|undefined>();
    const [errorList, setErrorList] = useState<string[]>([]);
    const [itemTotal, setItemTotal] = useState(0);

    const { calcLineItemSubTotal } = useContext(leagueStoreContext.LeagueStoreContext) as LeagueStoreContextType;
    
    const travesePhotoSet = (dir: number) => {
        if(dir < 0 && selPhotoIdx > 0){
            setSelPhotoIdx((p) => p -1);
        } else if(item?.photos && dir > 0 && (selPhotoIdx + 1) < item?.photos?.length){
            setSelPhotoIdx((p) => p + 1);
        }
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

    const toggleCount = (increase: boolean) => {
        if(!increase && !((!editLineItem?.item_count || !item?.minimum) || (editLineItem?.item_count <= item?.minimum))){
            setEditLineItem((p) =>{
                let new_val = (p?.item_count ? (Number(p?.item_count) - 1) : 0);
                return { ...p, "item_count": new_val };
            });
        } else if(increase) {
            setEditLineItem((p) =>{
                let new_val = (p?.item_count ? (Number(p?.item_count) + 1) : 0);
                return { ...p, "item_count": new_val };
            });
        }
    }

    const handleChange = (e: any) => {
        let name = e.target.name;

        setEditLineItem((p) =>{
            return { ...p, [name]: e.target.value };
        });
    }

    const validateMenuItem = () => {
        let ret = true;
        try {
            let errorList: string[] = [];
            if(editLineItem?.store_item === undefined) {
                ret = false;
                // Add To Validation Error String
                errorList.push("Missing Store Item");
            } 

            if(!editLineItem?.item_count || !editLineItem?.store_item?.minimum || (editLineItem?.item_count < editLineItem.store_item.minimum)){
                ret = false;
                // Add To Validation Error String
                errorList.push("Minimum Item Count");
            }

            setErrorList(errorList);
        } catch(ex){
            log.error(`Validating StoreItem: ${ex}`);
        }

        return ret;
    }

    useEffect(()=>{
        if(item?.photos && selPhotoIdx >= 0 && selPhotoIdx < item?.photos.length){
            setSelImg(item?.photos[selPhotoIdx]?._id);
        } else {
            setSelImg(undefined);
        }
    },[selPhotoIdx]);

    useEffect(()=>{
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

        if(item?.photos && item?.photos?.length > 0) {
            setSelPhotoIdx(0);
        }

        if(item){
            let tmpEditLI = new QuoteLineItemType(item);
            if(item?.details?.customDesign != true && (item?.categorySet && item?.categorySet?.length > 0)){
                tmpEditLI.overall_category_sel = item.categorySet[0];
            }

            setEditLineItem(tmpEditLI);
        }
    },[item]);

    useEffect(()=>{
        if(type in storeMenuPageDetails) {
            setMenuDetails(storeMenuPageDetails[type]);
        }
    },[type]);

    useEffect(()=> {
        if(validateMenuItem()){
            setItemTotal(calcLineItemSubTotal(editLineItem))
        }
    },[editLineItem]);

    return (
        <div className="store-menu-item-container">
            <div className="back-button-container">
                <button className="back-button" onClick={()=> setSelStoreItem(undefined)}>
                    <span className="icon material-symbols-outlined">chevron_left</span>
                    <span className="back-title">
                        {(type in storeMenuPageDetails) ? storeMenuPageDetails[type].backTitle : "Back To All Store Items"}
                    </span>
                </button>
            </div>            

            <section className="details-component">
                <div className="selected-image-container">
                    {(selImg && selImg?.length > 0) ?
                        <img src={`${API_URL}/kaleidoscope/${selImg}`} /> :
                        <img src={default_img} className="default"/>                         
                    }
                </div>
                <div className="details-content">
                    <h1>{item?.title}</h1>

                    {/* Price Details */}
                    <div className="price-details-container">
                        <div className="price-row">
                            <div className="price">{getPrice(item?.price_per_item)}</div>
                            {menuDetails?.additionalPriceDetails === true &&
                                <div className="price-details">
                                    <span>/ per ({item?.minimum ?? "~"} kids) </span>
                                </div>
                            }
                        </div>

                        {menuDetails?.additionalPriceDetails === true &&
                            <div className="price-row">
                                <div className="price-details">
                                    <span>{getPrice(item?.additional_set_price)} / per after minimum</span>
                                </div>
                            </div>
                        }
                    </div>

                    {/* Dates */}
                    {menuDetails?.dateRange === true &&
                        <div className="detail-section">
                            <div className="section-title">League Dates</div>
                            <div className="date-row">
                                {item?.details?.start_dt &&
                                    <span>{formatDate(item?.details?.start_dt, 'MMM dd, yyyy')}</span>
                                }
                                {item?.details?.end_dt &&
                                    <>
                                        <span>-</span>
                                        <span>{formatDate(item?.details?.end_dt, 'MMM dd, yyyy')}</span>
                                    </>
                                }
                            </div>
                        </div>
                    }

                    <div className="detail-section">
                        <div className="section-title">Details</div>
                        <div className="section-text">{item?.description}</div>                            
                    </div>

                    {(item?.photos && item?.photos?.length > 1) &&
                        <div className="photoset-container">
                            <button className="page-ctrl" disabled={selPhotoIdx < 1} onClick={()=> travesePhotoSet(-1)}>
                                <span className="icon material-symbols-outlined">chevron_left</span>
                            </button>
                            
                            <div className="photoset-list-container">
                                {item?.photos?.map((photo, i) =>
                                    <button className={`set-list-photo ${i === selPhotoIdx ? 'sel' : ''}`} key={i} onClick={()=> setSelPhotoIdx(i) }>
                                        <img src={`${API_URL}/kaleidoscope/${photo._id}`} alt={`${photo?.title}`}/>
                                    </button>
                                )}
                            </div>
    
                            <button className="page-ctrl" disabled={(selPhotoIdx < 0 || selPhotoIdx >= (item?.photos?.length - 1))} onClick={()=> travesePhotoSet(1)}>
                                <span className="icon material-symbols-outlined">chevron_right</span>
                            </button>
                        </div>
                    }
                </div>
            </section>

            <section className="selection-component">
                {editLineItem && 
                    <div className="selection-fields">
                        {menuDetails?.groupCategory === true &&
                            <div className="category-section">
                                <div className="section-title">{item?.category}</div>

                                <div className="input-container">
                                    <select className="group-category-select" name="overall_category_sel" value={editLineItem?.overall_category_sel} 
                                        onChange={handleChange} disabled={!item?.categorySet || item?.categorySet?.length <= 1}>
                                        <option hidden>Please Select a {item?.category}</option>
                                        {item?.categorySet?.map((set, i) =>
                                            <option key={i} value={set}>{set}</option>
                                        )}
                                    </select>
                                </div>
                            </div>
                        }

                        <div className="quantity-count-container">
                            <div className="quantity-count">
                                <button disabled={(!editLineItem?.item_count || !item?.minimum) || (editLineItem?.item_count <= item?.minimum)} onClick={()=> toggleCount(false)}>
                                    <span className="material-symbols-outlined">remove</span>
                                </button>

                                <div className="input-container">
                                    <input type="number" name="item_count" min={item?.minimum ?? 0} step="1" value={editLineItem?.item_count} onChange={handleChange} autoComplete="off" />
                                </div>

                                <button onClick={()=> toggleCount(true)}>
                                    <span className="material-symbols-outlined">add</span>
                                </button>
                            </div>
                            <span className="title">{menuDetails?.quantityTitle ?? 'Quantity'}*</span>
                        </div>

                        <div className="category-section">
                            <div className="section-title">Additional Details</div>

                            <div className="input-container">
                                <textarea name="item_additional_details" value={editLineItem?.item_additional_details} rows={2} />
                            </div>
                        </div>

                        {/* Add Ons */}
                        <AddOnTool defaultAddOns={item?.addons} selectedAddOns={editLineItem?.add_on_list} setLineItem={setEditLineItem} />
                    </div>
                }

                <div className="btn-container">
                    <button className="add-btn" disabled={errorList?.length > 0}>
                        <span className="title">Add To Quote</span>

                        <span className="price">({getPrice(itemTotal)})</span>
                    </button>
                </div>
            </section>
        </div>
    );
}
