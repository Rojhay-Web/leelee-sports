import { isPast, addDays, format } from "date-fns";
import { toast } from "react-toastify";
import parse from 'html-react-parser';

import { User } from "../datatypes";
import { log } from "./log";

const rootPath = (window.location.href.indexOf("localhost") > -1  ? "http://localhost:8080" : "");

export const GQL_URL = `${rootPath}/v1/gql`;
export const API_URL = `${rootPath}/v1/api`;

export const LOG_INGESTION_HOST = "";
export const LOG_TOKEN = "";

export const DEBOUNCE_TIME = 250;

const validSpecialChars = { '!':true, '@':true, '$':true, '&':true, '_':true, '|':true, '?':true, '#':true };
const emailRegex: RegExp = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function parseToken(token: string){
    var localUser: { user: User | null, expDt: Date | null, token?:string } | null = null, 
        isExpired: Boolean | null = true; 

    try {
        localUser = JSON.parse(token);
        if(localUser && localUser.expDt){
            isExpired = (localUser?.user && isPast(localUser.expDt));
        }
    }
    catch(ex){
        log.error("[Error] parsing token: ",ex);
    }

    return { localUser, isExpired }
}

export function buildToken(user: User, userToken?: string){
    let token = ""; 

    try {
        token = JSON.stringify({ user: user, token: userToken, expDt: addDays(new Date(), 30) });
    }
    catch(ex){
        log.error("[Error] parsing token: ",ex);
    }

    return token;
}

export const emptyList = (length: number) => {
    let ret: any[]  = [];
    for(let i=0; i < length; i++){ ret.push(i); }
    return ret;
}

export const handleGQLError = (err:any) => {
    try {
        toast.error(`Sorry we encountered an error. [${err}]`, { position: "top-right",
            autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
            draggable: true, progress: undefined, theme: "light" });
    }
    catch(ex){
        log.error(`Handling Error: ${ex}`);
    }
}

export const formatDate = (date: Date, formatStr: string) => {
    let ret = 'NaN';
    try {
        let dateStr = (date instanceof Date) ? date.toString() : date;
        if(validateDate(dateStr, true)){
            let d = new Date(date);
            ret = format(d, formatStr);
        }
    }
    catch(ex){
        log.error(`Formatting Date string: ${ex}`);
    }

    return ret;
}

export const formatDateStr = (dateStr: string, formatStr: string) => {
    let ret = 'NaN';
    try {
        if(validateDate(dateStr, true)){
            let d = new Date(dateStr);
            ret = format(d, formatStr);
        }
    }
    catch(ex){
        log.error(`Formatting Date string: ${ex}`);
    }

    return ret;
}

export function convertArrayOfObjectsToCSV(array: any[], keys: {name: string, replace?:string}[]) {
    try {
        let result = '';

        const columnDelimiter = ',';
        const lineDelimiter = '\n';

        result += keys.map((k) => k.name).join(columnDelimiter);
        result += lineDelimiter;

        array.forEach(item => {
            let ctr = 0;
            keys.forEach((key) => {
                if (ctr > 0) result += columnDelimiter;
                const keyName = (key.replace ?? key.name);
                result += item[keyName];
                
                ctr++;
            });
            result += lineDelimiter;
        });

        return result;
    }
    catch(ex){
        log.error(`Convert Array Of Objects To CSV: ${ex}`);
        return '';
    }
}

export function parseRichText(str: string | null){
    try {
        return (!!str ? parse(str) : '')
    }
    catch(ex){
        log.error(`Parsing Ritch Text: ${ex}`);
        return '';
    }
}

export function validateEmail(email: string){
    try {
        if (emailRegex.test(email)){
            return true;
        }
    }
    catch(ex){
        log.error("[Error] Validating Email Address: ", ex);
    }
    return false;
}

export function validatePasswordRequirements(data: string) {
  let ret: { [key: string]: boolean} = {};
  try {
    let u_case=0, l_case=0, special=0, numeric=0;
    Array.from(data ?? "").forEach((c) =>{
        if(c in validSpecialChars){ special++; }
        if(c.charCodeAt(0) >= 64 && c.charCodeAt(0) <= 90 ){ u_case++; }
        if(c.charCodeAt(0) >= 97 && c.charCodeAt(0) <= 122 ){ l_case++; } 
        if(!isNaN(Number(c))){ numeric++; }                         
    });
    
    if(data?.length < 8){ ret["str_length"] = true; }
    if(u_case < 1) { ret["u_case"] = true; }
    if(l_case < 1) { ret["l_case"] = true; }
    if(special < 1) { ret["special"] = true; }
    if(numeric < 1) { ret["numeric"] = true; }
  }
  catch(ex){
    log.error(`[Error] validating password requirements: ${ex}`);
  }

  return ret;
}

export const handleGQLErrorLocal = (err:any) => {
   console.log(`[GQL Error]: `, err);
}

export const checkUserRole = (role:string, roles?:string[], ) =>{
    let ret = false;
    try {
        ret = roles != undefined && roles.includes(role);
    } catch(ex){
        log.error(`Checking User Role: ${ex}`);
    }

    return ret;
}

export const checkUserRoles = (userRoles:string[] | undefined, roles:string[]) =>{
    let ret = false;
    try {
        ret = userRoles != undefined && userRoles.some(element => roles.includes(element))
    } catch(ex){
        log.error(`Checking All User Roles: ${ex}`);
    }

    return ret;
}

/* Private Functions*/
function validateDate(value: string, required=true){
    let ret = false;
    try {
        ret = !required || !isNaN((new Date(value)).getTime());
    }
    catch(ex){
        log.error(`Validating Date: ${ex}`);
    }
    return ret;
}

// function preloadImage (src: string) {
//   return new Promise((resolve, reject) => {
//     const img = new Image()
//     img.onload = function() {
//       resolve(img)
//     }
//     img.onerror = img.onabort = function() {
//       reject(src)
//     }
//     img.src = src
//   })
// }