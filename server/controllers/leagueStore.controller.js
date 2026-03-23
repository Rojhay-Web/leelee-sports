"use strict";
const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const fs = require('fs');

// League Store Services
const ls_db = require('../services/leagueStore/db.service.js'),
    response = require('../utils/responseCode'),
    auth = require('../services/blueprint/auth.service'), 
    log = require('../services/log.service'),
    util = require('../utils/util.js');

/* File Upload */
const fileFilter = async (req, file, cb) => {
    try {
        const auth_ret = await auth.validateUser(req?.headers);
        if(auth_ret?.results !== true){
            log.warning(`File Upload Rejected: Unauthorized User`);
            cb(new Error('Unauthorized upload attempt'), false); // Reject file
        } else {
            cb(null, true); // Successful Upload
        }
    } catch (ex) {
        log.error(`File Upload error: ${ex.message}`);
        cb(new Error(`File upload error [E10]`), false); // Reject file
    }
};

const upload = multer({
    storage: multer.memoryStorage(), 
    fileFilter: fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }    
});

module.exports = function() {
    async function submitQuote(req, res) {
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

                const ret = await ls_db.purchaseOrder.download(req.params.id, is_invoice, req.query?.filter_items);                

                if(ret.results && fs.existsSync(ret.results)){
                    res.download(ret.results, function(d_err){
                        if(ret?.fd != null){
                            fs.closeSync(ret?.fd);
                            fs.unlinkSync(ret.results);
                        }                            
                    });
                } else {
                    res.status(response.SERVER_ERROR.INTERNAL).json({"error":`Downloading Invoice[E00]: Contact System Admin` });
                }
            } else {
                res.status(response.ERROR.UNAUTHORIZED).json({ "error":"Unauthorized User" });
            }
        }
        catch(ex){
            log.error(`Adding Purchase Order Image: ${ex}`);
            res.status(response.SERVER_ERROR.UNAVAILABLE).json({"error":`Error uploading image: ${ex}`});
        }
    }

    async function uploadPO(req, res) {
        try {
            const auth_ret = await auth.validateUser(req?.headers);
            if(auth_ret?.results){             
                const ret = await ls_db.purchaseOrder.uploadPO(req?.body?.quoteId, req?.body?.poNumber, [], req.file);                
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

    router.post("/quote/submit", submitQuote);
    router.get('/quote/download/:id', downloadInvoice);

    router.post("/purchase_order/upload", upload.single('purchaseOrder'), uploadPO);

    return router;
}