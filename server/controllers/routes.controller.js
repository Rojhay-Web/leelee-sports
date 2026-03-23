"use strict";
const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const fs = require('fs');

const util = require('../utils/util.js');
const auth = require('../services/blueprint/auth.service'), 
    db = require('../services/blueprint/db.service.js'),
    log = require('../services/log.service'),
    response = require('../utils/responseCode');

/* IMG Upload */
const storage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, './store/uploads'); },
    filename: function (req, file, cb) { cb(null, `${Date.now()}-${file.originalname}`); }
});
const acceptedFiles = { 'image/jpeg': true, 'image/png': true };
const fileFilter = async (req, file, cb) => {
    try {
        const auth_ret = await auth.validateUser(req?.headers);
        const is_Admin = util.checkUserRole(['ADMIN','LEAGUE_STORE_ADMIN'], auth_ret?.app_id?.roles);

        if(!(auth_ret?.results === true && is_Admin === true)){
            log.warning(`File Upload Rejected: Unauthorized User`);
            cb(new Error('Unauthorized upload attempt'), false); // Reject file
        } else if(!(file.mimetype in acceptedFiles)){
            log.warning(`File Upload Rejected: Invalid file type [${file.mimetype}]`);
            cb(new Error('Invalid file type'), false); // Reject file
        } else {
            cb(null, true); // Successful Upload
        }
    } catch (ex) {
        log.error(`File Upload error: ${ex.message}`);
        cb(new Error(`File upload error [E00]`), false); // Reject file
    }
}

const upload = multer({
    storage: storage, 
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }    
});

module.exports = function(localStore) {
    async function uploadImage(req, res){
        try {
            const auth_ret = await auth.validateUser(req?.headers);
            if(auth_ret?.results){
                const ret = await db.photos.upload(req.file.filename, req.file.path, req?.body?.name, req?.body?.photoset);
                res.status(response.SUCCESS.OK).json(ret);
            }
            else {
                // Delete temp file
                fs.unlinkSync(req.file.path); 
                res.status(response.ERROR.UNAUTHORIZED).json({ "error":"Unauthorized User" });
            }
        }
        catch(ex){
            log.error(`Uploading Image: ${ex}`);
            res.status(response.SERVER_ERROR.UNAVAILABLE).json({"error":`Error uploading image: ${ex}`});
        }
    }

    async function viewImage(req, res) {
        try {
            const ret = await db.photos.view(req.params.image_id, localStore);

            if(ret?.results?.path){
                if(ret?.results?.headerType){
                    const imgBuffer = Buffer.from(ret.results.path, 'base64');
                    // Set the Content-Type header
                    res.writeHead(200, {
                        'Cache-Control':'max-age=31536000',
                        'Content-Type': ret.results.headerType,
                        'Content-Length': imgBuffer.length
                    });
                    res.end(imgBuffer);
                } else {
                    res.writeHead(200, { 'Cache-Control':'max-age=31536000' });
                    res.sendFile(ret.results.path);
                }
            }
            else {
                res.status(response.ERROR.NOT_FOUND).json({ "error":"Image Not Found" });
            }
        }
        catch(ex){
            log.error(`View Image: ${ex}`);
            res.status(response.SERVER_ERROR.UNAVAILABLE).json({"error":`Error uploading image: ${ex}`});
        }
    }

    async function forgotPassword(req, res) {
        try {
            const ret = await auth.forgotPassword(req?.body?.email);
            res.status(response.SUCCESS.OK).json(ret);
        } catch(ex){
            log.error(`Forgot Password Send Link: ${ex}`);
            res.status(response.SERVER_ERROR.UNAVAILABLE).json({"error":`Error Sending Forgot Password Link: ${ex}`});
        }
    }

    async function resetPassword(req, res) {
        try {
            const ret = await auth.resetPassword(req?.body?.email, req?.body?.token, req?.body?.password);
            res.status(response.SUCCESS.OK).json(ret);
        } catch(ex){
            log.error(`Forgot Password Send Link: ${ex}`);
            res.status(response.SERVER_ERROR.UNAVAILABLE).json({"error":`Error Sending Forgot Password Link: ${ex}`});
        }
    }

    // Apply the rate limiting middleware to express router.
    router.use(rateLimit(util.rateLimit));

    // User Management
    router.post("/forgotPassword", forgotPassword);
    router.post("/resetPassword", resetPassword);

    // Image Management
    router.get("/kaleidoscope/:image_id", viewImage);
    router.post("/image", upload.single('image'), uploadImage);

    return router;
}