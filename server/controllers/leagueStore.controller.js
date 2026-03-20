"use strict";
const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

// League Store Services
const ls_db = require('../services/leagueStore/db.service.js'),
    response = require('../utils/responseCode'),
    auth = require('../services/blueprint/auth.service'), 
    log = require('../services/log.service'),
    util = require('../utils/util.js');

module.exports = function() {
    async function submitPO(req, res) {
        try {
            const auth_ret = await auth.validateUser(req?.headers);
            if(auth_ret?.results){
                const ret = await ls_db.purchaseOrder.submit(auth_ret?.app_id?._id, req?.body);                
                res.status(response.SUCCESS.OK).json(ret);
            } else {
                res.status(response.ERROR.UNAUTHORIZED).json({ "error":"Unauthorized User" });
            }
        }
        catch(ex){
            log.error(`Adding Purchase Order Image: ${ex}`);
            res.status(response.SERVER_ERROR.UNAVAILABLE).json({"error":`Error uploading image: ${ex}`});
        }
    }

    async function downloadInvoice(req, res){
        try {
            const auth_ret = await auth.validateUser(req?.headers);
            if(auth_ret?.results){
                const is_invoice = (req.query && req.query?.is_invoice == 1);

                const ret = await ls_db.purchaseOrder.download(auth_ret?.app_id, req.params.id, is_invoice, req.query?.filter_items);                
                res.status(response.SUCCESS.OK).json(ret);
            } else {
                res.status(response.ERROR.UNAUTHORIZED).json({ "error":"Unauthorized User" });
            }
        }
        catch(ex){
            log.error(`Adding Purchase Order Image: ${ex}`);
            res.status(response.SERVER_ERROR.UNAVAILABLE).json({"error":`Error uploading image: ${ex}`});
        }
    }

    // Apply the rate limiting middleware to express router.
    router.use(rateLimit(util.rateLimit));

    router.post("/purchaseOrder/submit", submitPO);
    router.get('/download_invoice/:id', downloadInvoice);

    return router;
}