import { ColumnDef, InitialTableState } from "@tanstack/react-table";
import { Dispatch, SetStateAction } from "react";

export class User {
    _id?: string;
    email: string = ''; 
    given_name?:string;
    family_name?:string;
    name?: string;
    picture?:string;
    verified_email?:Boolean; 

    registration_type?: string;
    registration_date?: Date;
    
    id?: string; // Registerted Google ID
    roles?:string[]; 
    scopes?: any;

    constructor(){
        this.email = '';
        this.given_name = '';
        this.family_name = '';
        this.name = '';
    }
}


export type UserContextType = {
    user: User | null; setUser: Dispatch<SetStateAction<User|null>>;
    userToken: any | null; setUserToken: Dispatch<SetStateAction<any|null>>;
    loading: Boolean | null; loading_permissions: Boolean | null;
    activeComponents: any; activeRoles: { [key: string]: any };
    adminComponents: AdminPathType[];
}

export type UserManagementDetailsFieldsType = { 
    icon?: string;
    title: string;
    key: keyof User;
    type: string;
    net_new_active?:boolean;
    conditional_fields?:(keyof User)[];
}

export type UserManagementDetailsConfigType = {
    searchUserTab: Boolean;
    sendInviteToggle: Boolean;
    fields: UserManagementDetailsFieldsType[];
}

export type UserManagementTableTab = {
    id: number;
    title: string; 
    initialState?: InitialTableState;
    roleFilter: string | null; 
    columns: ColumnDef<User>[],
    detailsConfig: UserManagementDetailsConfigType
}

export type AdminPathType = {
    title: string;  scope: string; icon: string;
    path:string; element: ()=> JSX.Element;
}

export type AdminTableColType = {
    title: string; 
    key: string; 
    type: string;
    default: any; 
    options?:string[];
    selectKey?:string;
    dictionary?:{[key:string]:any };
    required: boolean;
}

export type PageKey = {
    _id?: String
    title: String
    type?: String
    metaData?: any
    value?: { [key:string]:any}
}

export type SitePage = {
    _id?:string;
    title:string;
    key?:string;
    pageKeys: PageKey[];
}

export type Photosets = {
    _id?: string;
    title: string;
    description: string;
    created?: Date;
}

export type Photo = {
    _id: string;
    title: string;
    photosets: string[];
    created: Date;
}

export type FilePhoto = {
    _id: string;
    title?: string;
    photosets?: string[];
    created?: Date;
    url?: string;
    type: string; 
    file?: File;
    fileId?: string;
}

export type FileUploadStatus = {
    id:string | null, uploadId: string | undefined, success:boolean
}

export type FormField = {
    title: string;
    type: string;
    required?: boolean;
    size?: number;
    options?: string[];
}

export type Form = {
    id?: string;
    title: string;
    description: string;
    fields: FormField[];
}

export type SiteEvent = {
    _id?: string;
    google_event_id?: string;
    title: string;
    description: string;
    location?: string;
    images?: string[];
    start?: Date;
    end?: Date;
    tag?: string;

    forms?: Form[];
}