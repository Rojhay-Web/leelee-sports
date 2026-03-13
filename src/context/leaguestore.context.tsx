import { createContext, useContext, useEffect, useState } from 'react';
import { gql, useLazyQuery } from '@apollo/client';

import userContext from './user.context';

import { LeagueStoreContextType, LeagueStoreUserType, } from '../datatypes/customDT';
import { UserContextType } from '../datatypes';

const LeagueStoreContext = createContext<LeagueStoreContextType | null>(null);

const GET_LS_USER_QUERY = gql`
query GetLeagueStoreUser($id: String!){
    leagueStoreUser(id: $id){
        _id
        blueprint_id
        sub_org_name
        organization_id

        blueprint_user {
            given_name
            family_name
            name
        }
    }
}`;

function Provider({ children }: { children: any }) {
    const [leagueStoreUser, setLeagueStoreUser] = useState<LeagueStoreUserType|null>(null);

    const { user } = useContext(userContext.UserContext) as UserContextType;

    const [getLSUser, { loading: leagueStoreUserLoading, data }] = useLazyQuery(GET_LS_USER_QUERY, { fetchPolicy: 'no-cache' });

    const fetchLSUser = () => {
        if(user?._id){
            getLSUser({ variables: { id: user._id }});
        }
    }

    useEffect(()=>{
        if(user?._id){
            fetchLSUser();
        } else {
            setLeagueStoreUser(null);
        }
    },[user]);

    useEffect(()=>{
        if(!leagueStoreUserLoading) {
            setLeagueStoreUser(data?.leagueStoreUser ?? null);
        }
    },[leagueStoreUserLoading, data]);

    return <LeagueStoreContext.Provider value={{ leagueStoreUserLoading, leagueStoreUser, setLeagueStoreUser, fetchLSUser }}>{children}</LeagueStoreContext.Provider>;
}

export default { LeagueStoreContext, Provider };