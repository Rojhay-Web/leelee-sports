import { formatDateStr } from ".";

export const VIDEOS_URL = 'https://www.youtube.com/@LeeLeeKiddz/videos';

export const formatDateV2 = (date: Date | undefined, format: string) => {
    let ret = 'TBD';
    try {
        if(date){
            let tmpDate = new Date(date);
            if(!isNaN(tmpDate.getTime())){
                ret = formatDateStr(tmpDate.toISOString(), format);
            }                
        }
    }
    catch(ex){
        console.log(`V2 Date Format: ${ex}`);
    }
    
    return ret;
}