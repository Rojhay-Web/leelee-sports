import { createContext, useContext, useEffect, useState } from 'react';
import { gql, useLazyQuery } from '@apollo/client';
import * as _ from 'lodash';
import { v4 as uuidv4 } from 'uuid';

import userContext from './user.context';

import { LeagueStoreContextType, LeagueStoreUserType, QuoteLineItemType, StoreLineItemType, } from '../datatypes/customDT';
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

        organization {
            billing_area_id
        }
    }
}`;

function Provider({ children }: { children: any }) {
    const [leagueStoreUser, setLeagueStoreUser] = useState<LeagueStoreUserType|null>(null);

    const [selectedCartTab, setSelectedCartTab] = useState('leagues');
    const [storeLineItems, setStoreLineItems] = useState<StoreLineItemType>({ "leagues":[], "apparel" :[]});

    const { user } = useContext(userContext.UserContext) as UserContextType;

    const [getLSUser, { loading: leagueStoreUserLoading, data }] = useLazyQuery(GET_LS_USER_QUERY, { fetchPolicy: 'no-cache' });

    // []-> Exported
    const fetchLSUser = () => {
        if(user?._id){
            getLSUser({ variables: { id: user._id }});
        }
    }

    // []-> Exported
    const calcLineItemSubTotal = (lineItem?: QuoteLineItemType) => {
        let ret = { "core_total": 0, "addon_total": 0 };
        try {
            if(lineItem?.store_item?.store_id === "leagues") {
                // Min Price
                const item_min = lineItem?.store_item?.minimum ?? 0,
                    to_min_price = lineItem?.store_item?.price_per_item ?? 0;
                
                ret.core_total = item_min * to_min_price;

                // Post Min Price
                const post_min_price = lineItem?.store_item?.additional_set_price ?? 0,
                    post_min_count = (lineItem?.item_count ?? 0) - item_min;
                
                if(post_min_count > 0) {
                    ret.core_total += (post_min_count * post_min_price);
                }

                // Include AddOns
                if(lineItem?.add_on_list && lineItem?.add_on_list?.length > 0){
                    lineItem?.add_on_list.forEach((ad) => {
                        const add_on_store_item = lineItem?.store_item?.addons ? 
                            lineItem?.store_item?.addons.find((ad2) => ad2.title === ad.title) :
                            null;
                        
                        if(add_on_store_item && ad?.count && add_on_store_item?.price) {
                            ret.addon_total += (ad.count * add_on_store_item.price);
                        }
                    });
                }
            } else if(lineItem?.store_item?.store_id === "apparel") {
                // Min Price
                const item_price = lineItem?.store_item?.price_per_item ?? 0;
                ret.core_total = item_price * (lineItem?.item_count ?? 0);
            }
        } catch(ex){
            log.error(`Calculating Line Item Subtotal: ${ex}`);
        }

        return ret;
    }

    // []-> Exported
    const addLineItem = (lineItem: QuoteLineItemType) => {
        try {
            let clone_line_item = _.cloneDeep(lineItem);
            
            // Set Cart Selected Tab based on last item added
            if(clone_line_item?.store_item?.store_id){
                setSelectedCartTab(clone_line_item?.store_item?.store_id);
            }

            if(clone_line_item.quote_item_id) {
                // Update Existing Line Item
                setStoreLineItems((p)=>{
                    let tmpStore = {...p };
                    
                    switch(clone_line_item?.store_item?.store_id){
                        case "leagues":
                            const league_index = tmpStore.leagues.findIndex(item => item.quote_item_id === clone_line_item.quote_item_id);
                            if(league_index >= 0) {
                                tmpStore.leagues[league_index] = clone_line_item;
                            }
                            break;
                        case "apparel":
                            const apparel_index = tmpStore.apparel.findIndex(item => item.quote_item_id === clone_line_item.quote_item_id);
                            if(apparel_index >= 0) {
                                tmpStore.apparel[apparel_index] = clone_line_item;
                            }
                            break;
                    }

                    return tmpStore;
                });
            } else { 
                // Add New Line Item
                clone_line_item.quote_item_id = uuidv4();
                // Dictionary to prevent duplicates being added
                let add_store_map: any = {}; 

                setStoreLineItems((p)=>{
                    let tmpStore = {...p };

                    if(clone_line_item?.quote_item_id && !(clone_line_item.quote_item_id in add_store_map)) {
                        switch(clone_line_item?.store_item?.store_id){
                            case "leagues":
                                // Add quote_item_id to Dictionary to prevent duplication
                                if(clone_line_item?.quote_item_id) add_store_map[clone_line_item.quote_item_id] = true;
                                
                                // Add To List
                                tmpStore.leagues.push(clone_line_item);
                                break;
                            case "apparel":
                                // Add quote_item_id to Dictionary to prevent duplication
                                if(clone_line_item?.quote_item_id) add_store_map[clone_line_item.quote_item_id] = true;
                                
                                // Add To List
                                tmpStore.apparel.push(clone_line_item);
                                break;
                        }
                    }

                    return tmpStore;
                });
            }           
        } catch(ex){
            log.error(`Adding Line Item: ${ex}`);
        }
    }

    // []-> Exported
    const removeLineItem = (type:string, quote_item_id: string) => {
        try {
            // Set Cart Selected Tab based on last item added
            if(type){ setSelectedCartTab(type); }
            
            setStoreLineItems((p)=>{
                let tmpStore = {...p};

                switch(type){
                    case "leagues":
                        tmpStore.leagues = tmpStore.leagues.filter((tl) => tl.quote_item_id != quote_item_id);
                        break;
                    case "apparel":
                        tmpStore.apparel = tmpStore.apparel.filter((tl) => tl.quote_item_id != quote_item_id);
                        break;
                }

                return tmpStore;
            });
        } catch(ex){
            log.error(`Removing Line Item: ${ex}`);
        }
    }

    // []-> Exported
    const clearingLineItems = (type:string) => {
        try {
            setStoreLineItems((p)=>{
                let tmpStore = {...p};

                switch(type){
                    case "leagues":
                        tmpStore.leagues = [];
                        break;
                    case "apparel":
                        tmpStore.apparel = [];
                        break;
                }

                return tmpStore;
            });
        } catch(ex){
            log.error(`Adding Line Item: ${ex}`);
        }
    }

    // []-> Exported
    const getLineItem = (type: string, quote_item_id: string) => {
        let ret = undefined;

        switch(type){
            case "leagues":
                ret = storeLineItems.leagues.find((tl) => tl.quote_item_id === quote_item_id);
                break;
            case "apparel":
                ret = storeLineItems.apparel.find((tl) => tl.quote_item_id === quote_item_id);
                break;
        }

        return ret;
    }

    // Effects
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

    return <LeagueStoreContext.Provider value={{ 
        leagueStoreUserLoading, leagueStoreUser, setLeagueStoreUser, 
        fetchLSUser, calcLineItemSubTotal,

        selectedCartTab, setSelectedCartTab,

        storeLineItems,
        addLineItem, removeLineItem, 
        clearingLineItems, getLineItem
    }}>{children}</LeagueStoreContext.Provider>;
}

export default { LeagueStoreContext, Provider };