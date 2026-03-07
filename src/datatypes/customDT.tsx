import { v4 as uuidv4 } from 'uuid';
import { Photo } from '.';

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

export type StoreItemDetails  = {
    // LeagueItemDetails
    sport_id?: string;
    start_dt?: Date;
    end_dt?: Date;
    locations?: LeagueLocationsType[];

    // ApparelItemDetails
    customDesign?:boolean;
}

// Classes
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

export class LeagueStoreItemType {
    _id?:string;
    photo?:Photo;
    store_id?: string;
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

    constructor(){}
}