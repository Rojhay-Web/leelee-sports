import { formatDateStr } from ".";

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