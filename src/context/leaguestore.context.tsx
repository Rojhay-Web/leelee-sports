import { createContext, useContext, useEffect, useState } from 'react';
import { gql, useLazyQuery } from '@apollo/client';

import userContext from './user.context';

import { LeagueStoreContextType, LeagueStoreUserType, QuoteLineItemType, } from '../datatypes/customDT';
import { UserContextType } from '../datatypes';
import { log } from '../utils/log';

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

    const calcLineItemSubTotal = (lineItem?: QuoteLineItemType) => {
        let ret = 0;
        try {
            if(lineItem?.store_item?.store_id === "leagues") {
                // Min Price
                const item_min = lineItem?.store_item?.minimum ?? 0,
                    to_min_price = lineItem?.store_item?.price_per_item ?? 0;
                
                ret = item_min * to_min_price;

                // Post Min Price
                const post_min_price = lineItem?.store_item?.additional_set_price ?? 0,
                    post_min_count = (lineItem?.item_count ?? 0) - item_min;
                
                if(post_min_count > 0) {
                    ret += (post_min_count * post_min_price);
                }

                // Include AddOns
                if(lineItem?.add_on_list && lineItem?.add_on_list?.length > 0){
                    lineItem?.add_on_list.forEach((ad) => {
                        const add_on_store_item = lineItem?.store_item?.addons ? 
                            lineItem?.store_item?.addons.find((ad2) => ad2.title === ad.title) :
                            null;
                        
                        if(add_on_store_item && ad?.count && add_on_store_item?.price) {
                            ret += (ad.count * add_on_store_item.price);
                        }
                    });
                }
            } else if(lineItem?.store_item?.store_id === "apparel") {
                // Min Price
                const item_price = lineItem?.store_item?.price_per_item ?? 0;
                ret = item_price * (lineItem?.item_count ?? 0);
            }
        } catch(ex){
            log.error(`Calculating Line Item Subtotal: ${ex}`);
        }

        return ret;
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

    return <LeagueStoreContext.Provider value={{ leagueStoreUserLoading, leagueStoreUser, setLeagueStoreUser, fetchLSUser, calcLineItemSubTotal }}>{children}</LeagueStoreContext.Provider>;
}

export default { LeagueStoreContext, Provider };