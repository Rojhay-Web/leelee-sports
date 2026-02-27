const { Logtail } = require("@logtail/node");
require('dotenv').config();

const logtail = process.env.DEBUG === "1" ? null :
    new Logtail(process.env.LOG_TOKEN, {
        sendLogsToConsoleOutput: false,
        endpoint: `https://${process.env.LOG_INGESTION_HOST}`,
    });

module.exports = {
    error: function(message, additional_data=null){
        try {
            if(logtail){
                logtail.error(message, additional_data);
            }
            else {
                console.log("[ERROR] > ", message, additional_data);
            }
        }
        catch(ex){
            console.log(`[ER] Logging: ${ex}`);
        }
    },
    warning: function(message, additional_data = null){
        try {
            if(logtail){
                logtail.warn(message, additional_data);
            }
            else {
                console.log("[WARNING] > ", message, additional_data);
            }
        }
        catch(ex){
            console.log(`[ER] Logging(2): ${ex}`);
        }
    },
    info: function(message, additional_data = null){
        try {
            if(logtail){
                logtail.info(message, additional_data);
            }
            else {
                console.log("[INFO] > ", message, additional_data);
            }
        }
        catch(ex){
            console.log(`[ER] Logging(3): ${ex}`);
        }
    },
    debug: function(message, additional_data = null){
        try {   
            if(logtail){
                logtail.debug(message, additional_data);
            } 
            else {
                console.log("[DEBUG] > ", message, additional_data);
            }     
        }
        catch(ex){
            console.log(`[ER] Logging(4): ${ex}`);
        }
    }
}