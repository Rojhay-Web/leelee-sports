import { useEffect, useState } from "react";

import { LeagueStoreConfigType, LeagueStoreItemType } from "../../../datatypes/customDT";

import StoreConfigEditor from "../components/storeConfig";
import LeagueStoreItemManager from "../components/leagueStoreItemConfig";

// League Store Manager
export default function ApparelStoreManager(){
    const [selConfig, setSelectedConfig] = useState<LeagueStoreConfigType | undefined>(undefined);
    const [selLeagueStoreItem, setSelLeagueStoreItem] = useState<LeagueStoreItemType | undefined>(undefined);

    useEffect(()=>{
        if(selConfig != undefined){
            // setSelectedLocation(undefined);
            // setSelLeagueStoreItem(undefined);
        }
    },[selConfig]);

    return (
        <div className="admin-component league-store-component store-manager">
            <div className="league-store-component-row top">
                <div className="row-col sz-4">
                    <StoreConfigEditor storeKey="apparel" selConfig={selConfig} setSelectedConfig={setSelectedConfig} />
                </div>
                <div className="row-col sz-6 empty" />
            </div>
            <div className="league-store-component-row fill">
                <div className="row-col sz-10">
                    <LeagueStoreItemManager type={"apparel"} selLeagueStoreItem={selLeagueStoreItem} setSelLeagueStoreItem={setSelLeagueStoreItem} />
                </div>
            </div>
        </div>
    );
}
