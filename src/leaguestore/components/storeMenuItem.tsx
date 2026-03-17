import { Dispatch, SetStateAction, useEffect, useState } from "react";

import { LeagueStoreItemType } from "../../datatypes/customDT";
type StoreMenuItemType = {
    type: string;
    item?: LeagueStoreItemType;
    setSelStoreItem: Dispatch<SetStateAction<LeagueStoreItemType | undefined>>; 
}

const storeMenuPageDetails: {[key: string] : any } = {
    "leagues": { 
        backTitle: "Back To All Leagues",
        additionalPriceDetails: true,
        dateRange: true,
        groupCategory: true
    },
    "apparel": { 
        backTitle: "Back To All Apparel",
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
import { API_URL, formatDate } from "../../utils";
import { log } from "../../utils/log";

export default function StoreMenuItem({ type, item, setSelStoreItem }: StoreMenuItemType){
    const [selImg, setSelImg] = useState<string|undefined>(undefined);
    const [menuDetails, setMenuDetails] = useState(storeMenuPageDetails['leagues']);
    
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
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

        if(item?.photos && item?.photos?.length > 0) {
            setSelImg(item.photos[0]._id);
        }
    },[item]);

    useEffect(()=>{
        if(type in storeMenuPageDetails) {
            setMenuDetails(storeMenuPageDetails[type]);
        }
    },[type]);

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
                </div>
            </section>

            <section className="selection-component">
                {menuDetails?.groupCategory === true &&
                    <div className="category-section">
                        <div className="section-title">{item?.category}</div>

                        <div className="input-container">
                            <select className="group-category-select">
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
                        <button>
                            <span className="material-symbols-outlined">remove</span>
                        </button>

                        <div className="input-container">
                            <input type="number" name="minimum" min="0" step="1" value={0} onChange={(e)=>{ }} autoComplete="off" />
                        </div>

                        <button>
                            <span className="material-symbols-outlined">add</span>
                        </button>
                    </div>
                    <span className="title">Quantity</span>
                </div>
            </section>
        </div>
    );
}
