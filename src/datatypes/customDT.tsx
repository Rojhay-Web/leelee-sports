import { Dispatch, SetStateAction } from 'react';
import { v4 as uuidv4 } from 'uuid';
import * as _ from 'lodash';

import { Photo, User } from '.';

// Context Type
export type LeagueStoreContextType = {
    leagueStoreUserLoading?: boolean,
    leagueStoreUser: LeagueStoreUserType | null;
    setLeagueStoreUser: Dispatch<SetStateAction<LeagueStoreUserType | null>>; 
    fetchLSUser: () => void;

    selectedCartTab: string;
    setSelectedCartTab: Dispatch<SetStateAction<string>>;

    storeLineItems: StoreLineItemType;

    calcLineItemSubTotal: (lineItem: QuoteLineItemType | undefined) => LineItemTotals;
    addLineItem: (lineItem: QuoteLineItemType) => void;
    removeLineItem: (type:string, quote_item_id: string) => void;
    clearingLineItems: (type:string) => void;
    getLineItem: (type:string, quote_item_id: string) => QuoteLineItemType | undefined;
}

// Types
export type GoogleIcons = { 
    name?: string;
    popularity?: number;
    categories?: string[];
}

export type LeagueStoreUIConfigType = { 
    [key:string]: { 
        logo: string;
        title: string;
    }
}

export type StoreLineItemType = {
    leagues: QuoteLineItemType[];
    apparel: QuoteLineItemType[];
}

export type LineItemTotals = { 
    core_total: number; 
    addon_total: number; 
}

export type PurchaseOrderDiscountType = {
    percentage?: number;
    tag?: string;
    title?: string;
    total?:number;
}

// Classes
export class LeagueStoreUserType {
    _id?: string;
    blueprint_id?: string;
    blueprint_user?: User;

    sub_org_name?: string;
    organization_id?: string;

    organization?: OrganizationType;
    location?: LeagueLocationsType;

    //constructor(__id: string, _blueprint_id: string, _sub_org_name?:string, _organization_id?:string ) {
    constructor(tmpUser?: LeagueStoreUserType){
        this._id = tmpUser?._id;
        this.blueprint_id = tmpUser?.blueprint_id;
        this.sub_org_name = tmpUser?.sub_org_name;
        this.organization_id = tmpUser?.organization_id;
    }
}

export class LeagueSportType {
    _id?: string;
    title?: string; 
    icon?: string;
    description?: string;
    active?: boolean;

    constructor(){
        this.title = '';
        this.icon = '';
        this.description = '';
        this.active = false;
    }
}

export class LeagueStoreAddon {
    id?:string;
    title?:string;
    price?:number;
    minimum?:number;

    constructor(){ 
        this.id = uuidv4();
        this.minimum = 1;
    }
}

export class LeagueStoreConfigType {
    _id?:string;
    key?: string;
    minimum?: number;
    category?: string;
    categorySet?: string[];
    addons?: LeagueStoreAddon[];

    constructor(){}
}

export class LeagueStoreMerchantInfo {
    title?: string;
    subText?: string;
    defaultLogo?: string;
    store_id?: string;

    constructor(store_key:string) {
        this.store_id = store_key;
    }
}

export class LeagueLocationsType {
    _id?:string;
    name?: string;
    merchantInfo?:LeagueStoreMerchantInfo[];

    constructor(){}
}

export class StoreItemDetails {
    // LeagueItemDetails
    sport_id?: string;
    sport_info?: LeagueSportType;
    start_dt?: Date;
    end_dt?: Date;
    locations?: LeagueLocationsType[] = [];

    // ApparelItemDetails
    customDesign?:boolean;

    constructor(){}
}

export class LeagueStoreItemType {
    _id?:string;
    store_id?: string;
    store_item_id?:string;
    title?: string;
    description?: string;
    active?: boolean;
    minimum?: number;
    
    price_per_item?: number;
    additional_set_price?: number;

    category?: string;
    categorySet?: string[];

    addons?: LeagueStoreAddon[];
    details?: StoreItemDetails;

    photos?:Photo[];

    constructor(store_type: string){
        this.store_id = store_type;
        this.store_item_id = uuidv4();
    }

    generateClone(props: LeagueStoreItemType): void {
        // Deep Copy Data
        const clone_props = _.cloneDeep(props);

        // Clone All Base Fields
        this.store_id = clone_props.store_id;
        this.store_item_id = uuidv4();

        this.title = clone_props.title;
        this.description = clone_props.description;
        this.active = clone_props.active;
        this.minimum = clone_props.minimum;

        this.price_per_item = clone_props.price_per_item;
        this.additional_set_price = clone_props.additional_set_price;

        this.category = clone_props.category;
        this.categorySet = clone_props.categorySet;

        this.addons = clone_props.addons;
        this.details = clone_props.details;
    }
}

export class OrganizationType {
    _id?:string;
    name?:string;
    address?:string;
    city?:string;
    state?:string;
    zip?:string;

    billing_area_id?:string;

    merchantInfo?:LeagueStoreMerchantInfo[];

    constructor(){}

    generateClone(props: OrganizationType): void {
        // Deep Copy Data
        const clone_props = _.cloneDeep(props);

        // Clone All Base Fields
        this.name = clone_props.name;
        this.address = clone_props.address;
        this.city = clone_props.city;
        this.state = clone_props.state;

        this.zip = clone_props.zip;
        this.merchantInfo = clone_props.merchantInfo;
    }
}

export class QuoteAddOnItemType {
    id?:number;
    title?:string;
    count?:number;
    minimum?:number;

    constructor(_title?: string, _minimum?: number){
        this.title = _title;
        this.minimum = _minimum;
        this.count = _minimum;
    }
}

export class LineItemDetailIndItemType {
    item_number?:number | string;
    item_title?:string;
    item_category_sel?:string;

    constructor(){
        this.item_number = "";
        this.item_title = "";
        this.item_category_sel = "";
    }
}

export class QuoteLineItemType {
    _id?:string;
    quote_item_id?: string;
    item_count?: number;
    overall_category_sel?:string;
    item_additional_details?:string;

    // Add On List
    add_on_list?: QuoteAddOnItemType[];

    // Custom Design Details
    design_name?: string;
    design_description?: string;
    design_img?: string;

    // Individual Item Details
    custom_item_list?: LineItemDetailIndItemType[];

    // Store Item Details
    store_item?: LeagueStoreItemType;

    constructor(_store_item:LeagueStoreItemType){
        // Deep Copy Data
        const clone_props = _.cloneDeep(_store_item);
        
        // Clean Unnessary params
        // delete clone_props?.photos;

        // Set Default Items
        this.store_item = clone_props;
        this.item_count = clone_props?.minimum ?? 0;

        if(clone_props?.details?.customDesign != true && (clone_props?.categorySet && clone_props?.categorySet?.length > 0)){
            this.overall_category_sel = clone_props.categorySet[0];
        }
    }
}

export class PurchaseOrderType {
    _id?: string;
    ls_user_id?:string;
    type?: string;

    status?:string;
    invoice_number?:number;

    core_sub_total?: number;
    addon_sub_total?: number;
    total?: number;
    discount?: PurchaseOrderDiscountType;

    status_date?: Date;
    creation_date?: Date;

    line_items?: QuoteLineItemType[];

    constructor(
        _core_sub_total:number, _addon_sub_total:number, _total:number,
        _discount: PurchaseOrderDiscountType, _line_items: QuoteLineItemType[],
        _type: string
    ){
        this.type = _type;
        this.core_sub_total = _core_sub_total;
        this.addon_sub_total = _addon_sub_total;
        this.total = _total;
        this.discount = _discount;

        _line_items.forEach((li) => {
            delete li?.quote_item_id;
            delete li?.store_item?.photos;
        });

        this.line_items = _line_items;
    }
}