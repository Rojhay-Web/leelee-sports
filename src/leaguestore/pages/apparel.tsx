import { useEffect, useState } from "react";

// Images
import cover from '../../assets/leagueStore/apparel_store_cover.png';
import StoreItemList from "../components/storeList";
import { LeagueStoreItemType } from "../../datatypes/customDT";

export default function Apparel(){
    const [selStoreItem, setSelStoreItem] = useState<LeagueStoreItemType|undefined>();
    
    useEffect(()=>{ 
        setSelStoreItem(undefined);
    },[]);

    return (
        <div className="ls-page ls-store-page">
            <section className="landing">
                <div className="img-back">
                    <img src={cover} alt="apparel store" />
                    <h1>Apparel</h1>
                </div>
            </section>

            <section className="store-items-container">
                <StoreItemList type={"apparel"} selStoreItem={selStoreItem} setSelStoreItem={setSelStoreItem} />
            </section>
        </div>
    );
}
