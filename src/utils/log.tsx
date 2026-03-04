import { LOG_INGESTION_HOST, LOG_TOKEN } from './index';
const logtail = false;

export const log = {
    error: function(msg: string, additional_data?: any){
        if(logtail){
           sendLog('ERROR', msg, additional_data);
        }
        else {
            console.error(` [ERROR]: ${msg}`);
        }
    },
    warning: function(msg: string, additional_data?: any){
        if(logtail){
            sendLog('WARN', msg, additional_data);
        }
        else {
            console.warn(` [WARNING]: ${msg}`);
        }
    },
    info: function(msg: string, additional_data?: any){
        if(logtail){
            sendLog('INFO', msg, additional_data);
        }
        else {
            console.info(` [INFO]: ${msg}`);
        }
    },
    debug: function(msg: string, additional_data?: any){
        if(window.location.href.indexOf("localhost") > -1) {
            if(logtail){
                sendLog('DEBUG', msg, additional_data);
            }
            else {
                console.log(` [DEBUG]: ${msg}`);
            }
        }
    }
}

async function sendLog(level: string, msg: string, additional_data?:any){
    try {
        await fetch(`https://${LOG_INGESTION_HOST}`, 
            {
                method: 'POST', 
                headers: { 
                    Authorization: `Bearer ${LOG_TOKEN}`, 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({
                     "message": msg,
                     "level":level,
                     "nested": additional_data
                })
            }
        );
    }
    catch(ex){
        console.log(`Sending Log: ${ex}`);
    }
}