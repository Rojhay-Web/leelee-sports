import { createContext, useContext, useEffect, useState } from 'react';

import userContext from './user.context';

import { LeagueStoreContextType, LeagueStoreUserType, } from '../datatypes/customDT';
import { UserContextType } from '../datatypes';

const LeagueStoreContext = createContext<LeagueStoreContextType | null>(null);

function Provider({ children }: { children: any }) {
    const [leagueStoreUser, setLeagueStoreUser] = useState<LeagueStoreUserType|null>(null);

    const { user } = useContext(userContext.UserContext) as UserContextType;

    useEffect(()=>{
        if(user?._id){
            // TODO: Get LeagueStore User
        } else {
            setLeagueStoreUser(null);
        }
    },[user]);

    return <LeagueStoreContext.Provider value={{ leagueStoreUser, setLeagueStoreUser }}>{children}</LeagueStoreContext.Provider>;
}

export default { LeagueStoreContext, Provider };