import { useEffect, useState } from "react";

import { LeagueLocationsType, LeagueStoreConfigType } from "../../../datatypes/customDT";

import StoreConfigEditor from "../components/storeConfig";
import LocationManager from "../components/locationConfig";

// Sports Editor Tool
export default function StoreManager(){
    const [selConfig, setSelectedConfig] = useState<LeagueStoreConfigType | undefined>(undefined);
    const [selLocation, setSelectedLocation] = useState<LeagueLocationsType | undefined>(undefined);

    useEffect(()=>{
        if(selConfig != undefined){
            // TODO: Set other component selects to undefined to close any open modal
            setSelectedLocation(undefined);
        }
    },[selConfig]);

    return (
        <>
            <div className="admin-component league-store-component store-manager">
                <div className="league-store-component-row sz-4 top">
                    <div className="row-col sz-4">
                        <StoreConfigEditor storeKey="leagues" selConfig={selConfig} setSelectedConfig={setSelectedConfig} />
                    </div>
                    <div className="row-col sz-6">
                        <LocationManager selLocation={selLocation} setSelectedLocation={setSelectedLocation} />
                    </div>
                </div>
                <div className="league-store-component-row fill">
                    <div className="row-col sz-10"></div>
                </div>
            </div>
        </>
    );
}
