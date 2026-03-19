import { useContext, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import StoreItemList from "../components/storeList";
import StoreMenuItem from "../components/storeMenuItem";

import { LeagueStoreContextType, LeagueStoreItemType } from "../../datatypes/customDT";

import leagueStoreContext from '../../context/leaguestore.context';

// Images
import cover from '../../assets/leagueStore/league_store_cover.png';


export default function Leagues(){
    const [searchParams] = useSearchParams();
    const [selStoreItem, setSelStoreItem] = useState<LeagueStoreItemType|undefined>();

    const { getLineItem } = useContext(leagueStoreContext.LeagueStoreContext) as LeagueStoreContextType;

    useEffect(()=>{ 
        const page_item = searchParams.get("item");
        let store_item = undefined;

        if(page_item) {
            let line_item = getLineItem('leagues', page_item);

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
                            <img src={cover} alt="league store" />
                            <h1>Leagues</h1>
                        </div>
                    </section>

                    <section className="store-items-container">
                        <div className="gradient-background-container"><div className="gradient-background" /></div>
                        <StoreItemList type={"leagues"} selStoreItem={selStoreItem} setSelStoreItem={setSelStoreItem} />
                    </section>
                </> :
                <StoreMenuItem type="leagues" item={selStoreItem} setSelStoreItem={setSelStoreItem} />
            }
        </div>
    );
}
