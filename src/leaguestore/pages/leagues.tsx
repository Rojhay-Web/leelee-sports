import { useEffect, useState } from "react";

import StoreItemList from "../components/storeList";

import { LeagueStoreItemType } from "../../datatypes/customDT";

// Images
import cover from '../../assets/leagueStore/league_store_cover.png';
import StoreMenuItem from "../components/storeMenuItem";

export default function Leagues(){
    const [selStoreItem, setSelStoreItem] = useState<LeagueStoreItemType|undefined>();

    useEffect(()=>{ 
        setSelStoreItem(undefined);
    },[]);

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
