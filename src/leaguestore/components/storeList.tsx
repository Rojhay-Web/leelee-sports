import { Dispatch, SetStateAction, useContext, useEffect, useRef, useState } from "react";
import { gql, useLazyQuery } from '@apollo/client';
import { ripples } from 'ldrs';

import { log } from "../../utils/log";
import { getPrice } from "../../utils/_customUtils";
import { API_URL, DEBOUNCE_TIME, formatDate } from "../../utils";

import TablePaginationComponent from "../../toolbox/leagueStore/components/tablePaginationComponent";

import leagueStoreContext from '../../context/leaguestore.context';

import { LeagueStoreContextType, LeagueStoreItemType } from "../../datatypes/customDT";
type StoreItemListType = {
    type: string;
    selStoreItem?: LeagueStoreItemType;
    setSelStoreItem: Dispatch<SetStateAction<LeagueStoreItemType | undefined>>; 
}

type StoreItemComponentType = {
    item: LeagueStoreItemType;
    setSelStoreItem: Dispatch<SetStateAction<LeagueStoreItemType | undefined>>; 
}

type StoreListItemConfigType = {
    placeholder: string;
    emptyText: string;
    itemElement?: (props:any)=> JSX.Element;
}

const GET_STORE_ITEM_QUERY = gql`
query GetStoreItems($location_id: String, $store_key: String, $query:String, $page:Int, $pageSize: Int){
    storeItems(location_id: $location_id, store_key: $store_key, query: $query, active: true, page: $page, pageSize: $pageSize){
        totalResults
        pagesLeft
        results {
            _id
            store_id
            store_item_id
            title
            description
            active
            minimum

            price_per_item
            additional_set_price

            category
            categorySet

            details {
                customDesign
                sport_id
                sport_info {
                    icon
                    title
                }
                start_dt
                end_dt
                locations {
                    _id
                }
            }
            addons {
                title
                price
                minimum
            }
            photos {
                _id
            }
        }
    }
}`;

// Images
import default_img from '../../assets/logo/leeleekiddz_league_store.png';

const PAGE_SIZE = 8;
const storeListItemConfig: { [key:string]: StoreListItemConfigType } = {
    "leagues": { 
        placeholder: 'Search All Leagues',
        emptyText: "Sorry We Don't Have Any Leagues For This Search",
        itemElement: LeagueStoreItem
    },
    "apparel": { 
        placeholder: 'Search Jerseys & All Apparel',
        emptyText: "Sorry We Don't Have Any Items For This Search",
        itemElement: ApparelStoreItem
    }
}

function LeagueStoreItem({ item, setSelStoreItem }: StoreItemComponentType) {
    const cover_photo =  item?.photos && item?.photos?.length > 0 ? item?.photos[0] : null;

    return(
        <div className="item-container" onClick={()=> setSelStoreItem(item)}>
            <div className="cover-img">
                {cover_photo ?
                    <img src={`${API_URL}/kaleidoscope/${cover_photo._id}`} /> :
                    <img src={default_img} className="default"/>
                }

                {item?.details?.sport_info &&
                    <div className="sport-pill">
                        <span className="icon material-symbols-outlined">{item?.details?.sport_info?.icon ?? 'radio_button_unchecked'}</span>
                        <span>{item?.details?.sport_info?.title}</span>
                    </div>
                }   
            </div>
            <div className="item-content">
                <div className="title">{item.title}</div>
                <div className="date-row">
                    {item?.details?.start_dt &&
                        <span>{formatDate(item?.details?.start_dt, 'MMM dd, yyyy')}</span>
                    }
                    {item?.details?.end_dt &&
                        <>
                            <span>-</span>
                            <span>{formatDate(item?.details?.end_dt, 'MMM dd, yyyy')}</span>
                        </>
                    }
                </div>

                <div className="price-row">
                    <div className="price">{getPrice(item?.price_per_item)}</div>
                    <div className="price-details">
                        <span>/ per ({item?.minimum ?? "~"} kids) </span>
                    </div>
                </div>
                <div className="price-row">
                    <div className="price-details">
                        <span>{getPrice(item?.additional_set_price)} / per after minimum</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

function ApparelStoreItem({ item, setSelStoreItem }: StoreItemComponentType) {
    const cover_photo =  item?.photos && item?.photos?.length > 0 ? item?.photos[0] : null;

    return(
        <div className="item-container" onClick={()=> setSelStoreItem(item)}>
            <div className="cover-img">
                {cover_photo ?
                    <img src={`${API_URL}/kaleidoscope/${cover_photo._id}`} /> :
                    <img src={default_img} className="default"/>
                } 
            </div>
            <div className="item-content">
                <div className="title">{item.title}</div>
                <div className="price-row">
                    <div className="price">{getPrice(item?.price_per_item)}</div>
                </div>
            </div>
        </div>
    )
}

export default function StoreItemList({ type, selStoreItem, setSelStoreItem }: StoreItemListType){
    const [displaySearch, setDisplaySearch] = useState("");
    const [query, setQuery] = useState("");

    const [loadDelay, setLoadDelay] = useState(false);
    const [page, setPage] = useState(1);

    const pageRender = useRef({query: false, storeItem: false});
    const sectionRef = useRef<HTMLDivElement>(null);

    const { leagueStoreUser } = useContext(leagueStoreContext.LeagueStoreContext) as LeagueStoreContextType;
        

    const [getStoreItems, { loading, data }] = useLazyQuery(GET_STORE_ITEM_QUERY, { fetchPolicy: 'no-cache' });

    const searchQuery = (e:any) => {
        try {
            setDisplaySearch(e.target.value);
        }
        catch(ex){
            log.error(`Store Item Search: ${ex}`);
        }
    }

    const queryData = () => {
        setLoadDelay(true);
        getStoreItems({ variables:{
            location_id: leagueStoreUser?.organization?.billing_area_id, 
            store_key: type, query: query, 
            page: page, pageSize: PAGE_SIZE } 
        });
    }

    useEffect(() => {
        const delayInputTimeoutId = setTimeout(() => {
            setQuery(displaySearch);
        }, DEBOUNCE_TIME);

        return () => clearTimeout(delayInputTimeoutId);
    }, [displaySearch]);

    useEffect(() => {
        if(pageRender?.current?.query) {
            queryData(); 
        } 

        pageRender.current.query = true;
    },[page]);
    
    useEffect(()=>{
        if(page === 1) {
            queryData();
        } else {
            setPage(1);
        }
    },[query, type]);

    useEffect(()=>{
        let delayLoadTimeoutId:NodeJS.Timeout;

        if(loading === false) {
            delayLoadTimeoutId = setTimeout(() => { setLoadDelay(false); }, 250);
        }

        return () => clearTimeout(delayLoadTimeoutId);
    },[loading]);

    useEffect(()=>{
        if(pageRender?.current?.storeItem && sectionRef.current && selStoreItem === undefined) {
            sectionRef.current.scrollIntoView({
                behavior: 'smooth', block: 'start',
            });
        }

        pageRender.current.storeItem = true;
    },[selStoreItem]);

    useEffect(()=>{ ripples.register(); },[]);

    return (
        <div className="ls-store-list-container" ref={sectionRef}>
            {/* Search Input */}
            <div className="query-action-container">
                <div className="action-input-container">
                    <span className="material-symbols-outlined">search</span>
                    <input type="text" name="query" placeholder={type in storeListItemConfig ? storeListItemConfig[type].placeholder : `Search Store Item`} value={displaySearch} onChange={searchQuery} />
                </div>
            </div>

            {/* Item List */}
            <div className="list-container">
                {loading || loadDelay ?
                    <div className='table-loading'>
                        <div className='loader'>
                            <l-ripples size="200" speed="1.5" color="rgba(186,142,35,1)" />
                        </div>
                    </div> :
                    <>
                        {(!(data?.storeItems?.results?.length > 0)) ?
                            <div className="empty-list">{type in storeListItemConfig ? storeListItemConfig[type].emptyText : `Search Unable To Find Store Item`}</div> :
                            <>
                                {data?.storeItems?.results?.map((item: LeagueStoreItemType, i: number) => {
                                    const StoreComponent = type in storeListItemConfig ? storeListItemConfig[type].itemElement : null;
                                    if(!StoreComponent) {
                                        return(<></>);
                                    }

                                    return(
                                        <div className="store-item-container" key={i}>
                                            <StoreComponent item={item} setSelStoreItem={setSelStoreItem}/>
                                        </div>
                                    )
                                })}
                            </>
                        }
                    </>
                }
            </div>

            <TablePaginationComponent loading={loading} totalItems={data?.storeItems?.totalResults} pageSize={PAGE_SIZE} pagesLeft={data?.storeItems?.pagesLeft} page={page} setPage={setPage} />
        </div>
    );
}
