import { useState } from "react";

import OrganizationConfig from "../components/organizationConfig";
import LeagueStoreUsersConfig from "../components/leagueStoreUsersConfig";

import { LeagueStoreUserType, OrganizationType } from "../../../datatypes/customDT";


// League Store Manager
export default function UserAccountManager(){
    const [selOrganization, setSelectedOrganization] = useState<OrganizationType | undefined>(undefined);
    const [selUser, setSelectedUser] = useState<LeagueStoreUserType | undefined>(undefined);

    return (
        <div className="admin-component league-store-component">
            <div className="league-store-component-row top">
                <div className="row-col sz-10">
                    <OrganizationConfig selOrganization={selOrganization} setSelectedOrganization={setSelectedOrganization} />
                </div>
            </div>
            <div className="league-store-component-row fill">
                <div className="row-col sz-10">
                    <LeagueStoreUsersConfig selUser={selUser} setSelectedUser={setSelectedUser} />
                </div>
            </div>
        </div>
    );
}
