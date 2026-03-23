require('dotenv').config();

const fns = require('date-fns');
const { GraphQLError } = require('graphql');

const log = require('../services/log.service'),
    response = require('../utils/responseCode');

const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/g;
const validSpecialChars = { '!':true, '@':true, '$':true, '&':true, '_':true, '|':true, '?':true, '#':true };

module.exports = {
    rateLimit: {
        windowMs: 1 * 60 * 1000, // 1 minutes
        max: 1000, // limit each IP to 1000 requests per windowMs
        handler: (req, res, next) => {
            const error = new Error('Rate limit exceeded');
            error.status = response.ERROR.RATE_LIMIT;
            // Pass the error to the next error handling middleware
            next(error); 
        }
    },
    formatDate(date, formatStr = 'yyyy-MM-dd HH:mm:ss'){
        let ret = null;
        try {
            ret = fns.format(date, formatStr);
        }
        catch(ex){
            log.error(`Formatting Date: ${ex}`);
            ret = null;
        }
        return ret;
    },
    terminate(server, options = { coredump: false, timeout: 500 }){
        const exit = code => {
            options.coredump ? process.abort() : process.exit(code)
        }
        
        return (code, reason) => (err, promise) => {
            if (err && err instanceof Error) {
                // Log error information, use a proper logging library here :)
                log.error(`${reason} ${err.message} - ${err.stack}`);
            }
            
            if(code === 0){
                // Attempt a graceful shutdown
                server.close(exit);
                setTimeout(exit, options.timeout).unref();
            }            
        }
    },
    activeUserCheck(userValidation, roles=null){
        if((userValidation.error || !userValidation.results)){
            log.error(userValidation.error);
            throw new GraphQLError(userValidation.error, { extensions: { code: response.ERROR.UNAUTHORIZED } });
        } else if(roles && 
            !(
                userValidation?.app_id?.roles != undefined && 
                userValidation?.app_id?.roles.some(element => roles.includes(element)) 
            )
        ){
            log.error(`Invalid Role Type`);
            throw new GraphQLError('Invalid Role', { extensions: { code: response.ERROR.UNAUTHORIZED } });
        }
    },
    validateGQLParams(params, obj){
        if(!obj){ 
            throw new GraphQLError("param object is empty", { extensions: { code: 'BAD_REQUEST' } });    
        }
        else{
            let missingList = [];

            for(let i = 0; i < params.length; i++){
                if(!(params[i] in obj) || obj[params[i]] == null || obj[params[i]].length == 0){
                    log.warning(`${params[i]} is missing`);
                    missingList.push(params[i]);
                }
            }

            if(missingList.length > 0){
                throw new GraphQLError(`${missingList.join(",")} parameters are missing`, { extensions: { code: 'ValidationError' } });
            }
        }
    },
    checkGQLResults(ret){
        if(ret.error) {
            if(!ret?.errorCode || ret?.errorCode >= 0){
                log.error(ret.error);
            }            
            throw new GraphQLError(ret.error, { extensions: { code: 'SERVICE_ERROR' } }); 
        }
    },
    jsonStrFormatter(str, isString){
        let ret = null;
        try {
            if(isString){
                ret = (str?.length > 0 ? JSON.parse(str) : {});
            }
            else {
                ret = (str ? JSON.stringify(str) : '{}');
            }
        }
        catch(ex){
            ret = (isString ? {} : '{}');
        }

        return ret;
    },
    validateDate(value){
        let ret = false;
        try {
            ret = !isNaN((new Date(value)).getTime());
        }
        catch(ex){
            console.log(`Validating Date: ${ex}`);
        }
        return ret;
    },
    parseDateString(date, start=false){
        try {
            if(date) {
                let d = fns.parseISO(date);
                let startOfDt = (start ? fns.startOfDay(d) : d);

                return fns.formatISO(startOfDt);
            }
        }
        catch(ex){
            log.error(`Parsing Date String: ${ex}`);
        }
        return null;
    },
    hasPagesLeft(page, page_size, item_total=0){
        try {
            if(page < 0) return false;
            
            return (page * page_size) < item_total;
        }
        catch(ex){
            log.error(`Check If Has Pages Left: ${ex}`);
        }
    
        return false;
    },
    checkUserRole(roles, userRoles){
        let ret = false;
        try {
            // ret = userRoles != undefined && userRoles.includes(role);
            ret = (userRoles != undefined && userRoles.some(element => roles.includes(element)));
        } catch(ex){
            log.error(`Checking User Role: ${ex}`);
        }
    
        return ret;
    },
    validateValue(list){
        let ret = [];
        try {
            for(let i =0; i < list.length; i++){
                switch(list[i]?.type){
                    case "email":
                        if(!list[i]?.data.match(emailRegex)){
                            ret.push('email');
                        }
                        break;
                    case "text":
                        if(!list[i]?.data || list[i]?.data?.length <= 0){
                            ret.push(list[i]?.title ?? 'empty field');
                        }
                        break;
                    case "number":
                        if(!list[i]?.data || isNaN(list[i]?.data)){
                            ret.push(list[i]?.title ?? 'empty field');
                        }
                        break;
                    case "password":
                        if(list[i]?.data?.length < 8){
                            ret.push('password');
                            break;
                        }

                        let u_case=0, l_case=0, special=0, numeric=0;
                        Array.from(list[i]?.data).forEach((c) =>{
                            if(c in validSpecialChars){ special++; }
                            if(c.charCodeAt(0) >= 64 && c.charCodeAt(0) <= 90 ){ u_case++; }
                            if(c.charCodeAt(0) >= 97 && c.charCodeAt(0) <= 122 ){ l_case++; }
                            if(!isNaN(c)){ numeric++; }                            
                        });

                        if(u_case < 1 || l_case < 1 || special < 1 || numeric < 1){
                            ret.push('password');                        
                        }           
                        break;
                    default:
                        ret.push("invalid string type");
                        break;
                }
            }
        } catch(ex){
            log.error(`Validating String List: ${ex}`);
        }

        return ret;
    }
}