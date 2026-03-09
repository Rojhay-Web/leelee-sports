import { useEffect, useState } from "react";

import { LeagueLocationsType, LeagueStoreConfigType, LeagueStoreItemType } from "../../../datatypes/customDT";

import StoreConfigEditor from "../components/storeConfig";
import LocationManager from "../components/locationConfig";
import LeagueStoreItemManager from "../components/leagueStoreItemConfig";

// League Store Manager
export default function LeagueStoreManager(){
    const [selConfig, setSelectedConfig] = useState<LeagueStoreConfigType | undefined>(undefined);
    const [selLocation, setSelectedLocation] = useState<LeagueLocationsType | undefined>(undefined);
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
                    <StoreConfigEditor storeKey="leagues" selConfig={selConfig} setSelectedConfig={setSelectedConfig} />
                </div>
                <div className="row-col sz-6">
                    <LocationManager selLocation={selLocation} setSelectedLocation={setSelectedLocation} />
                </div>
            </div>
            <div className="league-store-component-row fill">
                <div className="row-col sz-10">
                    <LeagueStoreItemManager type={"leagues"} selLeagueStoreItem={selLeagueStoreItem} setSelLeagueStoreItem={setSelLeagueStoreItem} />
                </div>
            </div>
        </div>
    );
}
