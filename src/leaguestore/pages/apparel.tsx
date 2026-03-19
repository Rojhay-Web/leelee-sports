import { useContext, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import StoreMenuItem from "../components/storeMenuItem";
import StoreItemList from "../components/storeList";

import { LeagueStoreContextType, LeagueStoreItemType } from "../../datatypes/customDT";

import leagueStoreContext from '../../context/leaguestore.context';

// Images
import cover from '../../assets/leagueStore/apparel_store_cover.png';

export default function Apparel(){
    const [searchParams] = useSearchParams();
    const [selStoreItem, setSelStoreItem] = useState<LeagueStoreItemType|undefined>();

    const { getLineItem } = useContext(leagueStoreContext.LeagueStoreContext) as LeagueStoreContextType;
    
    useEffect(()=>{ 
        const page_item = searchParams.get("item");
        let store_item = undefined;

        if(page_item) {
            let line_item = getLineItem('apparel', page_item);

            if(line_item?.store_item) {
                store_item = line_item.store_item;
            }
        }
        setSelStoreItem(store_item);
    },[searchParams]);

    return (
        <div className="ls-page ls-store-page">
            {(selStoreItem === undefined) ?
                <>
                    <section className="landing">
                        <div className="img-back">
                            <img src={cover} alt="apparel store" />
                            <h1>Apparel</h1>
                        </div>
                    </section>

                    <section className="store-items-container">
                        <StoreItemList type={"apparel"} selStoreItem={selStoreItem} setSelStoreItem={setSelStoreItem} />
                    </section>
                </> : 
                <StoreMenuItem type="apparel" item={selStoreItem} setSelStoreItem={setSelStoreItem} />
            }
        </div>
    );
}
