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

export type GoogleIcons = { 
    name?: string;
    popularity?: number;
    categories?: string[];
}
