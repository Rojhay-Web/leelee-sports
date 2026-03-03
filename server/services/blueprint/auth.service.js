'use strict';
require('dotenv').config();

const jwt = require("jsonwebtoken");
const db = require('./db.service'),
    log = require('../log.service');

module.exports = {
    validateUser: async function(headers){
        try {
            const { authorization: token } = headers;

            if(!token){
                return { error: "Invalid Token" };
            }

            let decoded = jwt.verify(token, process.env.TOKEN_SECRET);
            if (!decoded) {
                log.error(`Verifing Token [E01]: ${err}`);
                return { error: "Unauthorized", results: false };
            }

            let usrPermissions = await db.getFullUser(decoded.id);
            if(usrPermissions?.error){
                return { error: 'No User Permissions'};
            }
            
            if(!usrPermissions.results){
                log.warning(`Validating UserId: User ID`);
                return { error: `User DNE`, results: false};
            }

            return { results: true, app_id: usrPermissions.results };
        }
        catch(ex){
            log.error(`Validating UserId: ${ex}`);
            return { error: `Validating UserId: ${ex}`, results: false };
        }
    }
}