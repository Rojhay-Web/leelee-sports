import { isPast } from "date-fns";
import { formatDateStr } from ".";
import { log } from "./log";

const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export const VIDEOS_URL = 'https://www.youtube.com/@LeeLeeKiddz/videos';

export const adminSideModalStyle = {
    height: 'calc(100vh - 50px)',
    width: (window.innerWidth > 770 ? '50%' : 'calc(100% - 45px)'), 
    right: '8px', margin: 'auto 0 auto auto'
};

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

export const hasDuplicatesByKey = (arr:any[], key:any) => {
  const uniqueKeys = new Set();
  for (const item of arr) {
    const value = item[key];
    // If the Set already has the value, it's a duplicate
    if (uniqueKeys.has(value)) {
      return true; 
    }
    // Otherwise, add the value to the Set
    uniqueKeys.add(value);
  }
  return false; // No duplicates found after checking all items
};

export const expiredDateStr = (dateStr?: string) => {
    let ret = false;
    try {
        if(!dateStr) return true;

        const tmpDt = new Date(dateStr);
        ret = isPast(tmpDt);
    } catch(ex){
        console.log(`Checking Expired Dt: ${ex}`);
    }
    return ret;
}

export const getPrice = (val?:number) => {
    let ret = '$$';
    try {
        if(val){
            ret = formatter.format(val);
        }
    } catch(ex){
        log.error(`Getting Price: ${ex}`);
    }
    
    return ret;
}

export const downloadBlobURL = (url:any, filename?:string) => {
    try {
        // - Create a temporary anchor element
        const link = document.createElement('a');

        // - Set the anchor's attributes for download
        link.href = url;
        link.setAttribute('download', filename || 'download.pdf'); // Specify the filename
        
        // - Append the link to the document body (necessary for Firefox) and simulate a click
        document.body.appendChild(link);
        link.click();

        // - Clean up by removing the link and revoking the object URL
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        
        // Open the new window/tab
        // window.open(url, '_blank','noopener,noreferrer')?.focus(); 
    } catch(ex){
        log.error(`Downloading Blob URL: ${ex}`);
    }
}