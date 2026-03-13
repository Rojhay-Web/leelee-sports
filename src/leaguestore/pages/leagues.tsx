import { useEffect } from "react";

import StoreItemList from "../components/storeList";

// Images
import cover from '../../assets/leagueStore/league_store_cover.png';

export default function Leagues(){
    useEffect(()=>{ },[]);

    return (
        <div className="ls-page ls-store-page">
            <section className="landing">
                <div className="img-back">
                    <img src={cover} alt="league store" />
                    <h1>Leagues</h1>
                </div>
            </section>

            <section className="store-items-container">
                <div className="gradient-background-container"><div className="gradient-background" /></div>
                <StoreItemList type={"leagues"} />
            </section>
        </div>
    );
}
