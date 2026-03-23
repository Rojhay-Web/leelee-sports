'use strict';
require('dotenv').config();

const { addMinutes, isPast } = require("date-fns");
const { UTCDate } = require('@date-fns/utc');

const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
const db = require('./db.service'),
    log = require('../log.service'),
    mail = require('./mail.service'),
    util = require('../../utils/util');

const { 
    TOKEN_SECRET, SALT_ROUNDS, DatabaseName,
    RESET_TOKEN_LENGTH, TOKEN_EXPIRE_DAYS
} = process.env;

module.exports = {
    validateUser: async function(headers){
        try {
            const { authorization: token } = headers;

            if(!token){
                return { error: "Invalid Token" };
            }

            let decoded = jwt.verify(token, TOKEN_SECRET);
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
    },
    forgotPassword: async function(email=""){
        try {
            // Validate Email Address
            email = email ? email.trim() : "";
            let param_validation = util.validateValue([ 
                { type:"email", data: email, title: "Email" } 
            ]);

            if(param_validation.length > 0){
                return { error: `${param_validation.join(",")} is invalid`, results: false };
            }

            const collection = await dbCollection("users");
            if(collection == null){
                return { "error": "Unable to Send Reset Link [E00] [Please contact site admin]"};;
            }

            const user = await collection.findOne({ email: email });
            if(!user) return { error: 'User DNE' };

            // Update Token
            let resetLen =  Math.pow(10,(RESET_TOKEN_LENGTH <= 0 ? 1 : RESET_TOKEN_LENGTH - 1));
            let resetToken = Math.floor(Math.random() * (9 * resetLen)) + (1 * resetLen);

            const ret = await collection.updateOne(
                { _id: user._id },
                { 
                    $set: { 
                        resetToken: resetToken, 
                        resetExpiration: addMinutes(new UTCDate(), 50)
                    } 
                }
            );

            if(!(ret?.modifiedCount > 0)){
                return { error: 'Unable to Send Reset Link [E01]'};
            }

            const { emailHtml, emailText } = buildResetEmail(user?.name, user?.email, resetToken);
            const res = await mail.sendEmail(email, 'Lee Lee Kiddz Password Reset', emailText, emailHtml, null);

            return { results: res?.email_status };
        } catch(ex){
            log.error(`Initializing Forgotten Password: ${ex}`);
            return { error: `Initializing Forgotten Password`, results: false };
        }
    },
    resetPassword: async function(email="", token="", password=""){
        try {
            // Validate Email Address
            email = email ? email.trim() : "";
            let param_validation = util.validateValue([ 
                { type:"email", data: email, title: "Email" },
                { type:"password", data: password, title: "Password" } 
            ]);

            if(param_validation.length > 0){
                return { error: `${param_validation.join(",")} is invalid`, results: false };
            }

            const collection = await dbCollection("users");
            if(collection == null){
                return { "error": "Unable to Validate Reset Token [E00] [Please contact site admin]"};;
            }

            // Get User By Email
            const user = await collection.findOne({ email: email });
            if(!user) return { error: 'User DNE' };

            // Validate Token
            if(user?.resetToken != token){
                return { error: 'Invalid Reset Token' };
            } else if(user?.resetExpiration && isPast(new UTCDate(user.resetExpiration))){
                return { error: 'Expired Reset Token' };
            }

            // Encrypt Password
            const hash = await bcrypt.hashSync(password, parseInt(SALT_ROUNDS));

            // Reset Password
            const result = await collection.updateOne(
                { email: email },  
                {  $set: { password: hash } }
            );

            const tmpUser = { ...user };

            // Remove Sensative User Info
            delete tmpUser.resetExpiration;
            delete tmpUser.resetToken;
            delete tmpUser.password;

            const login_token = (result.matchedCount > 0) ? 
                jwt.sign({ id: user?._id }, TOKEN_SECRET, {
                    expiresIn: (TOKEN_EXPIRE_DAYS ?? 7) * 86400000
                }) : null;
                
            return { results: { user: tmpUser, token: login_token } };
        } catch(ex){
            log.error(`Validating Reset Token: ${ex}`);
            return { error: `Validating Reset Token`, results: false };
        }
    }
}

/* Private Functions */
async function dbCollection(conn_collection) {
    let collection = null;
    try {
        const dbClient = db.dbClient.db(DatabaseName);
        collection = dbClient.collection(conn_collection);
    }
    catch(ex){
        log.error(`Connection to Database: ${ex}`);
    }

    return collection;
}

function buildResetEmail(name, email, token){
    const emailHtml = `
        <head>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Tourney:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
        </head>

        <div class="container" style='padding: 16px;'>
            <div class="title" style="display:flex; margin-bottom: 16px;">
                <h1 style='margin:0; align-content: center; font-family: "Tourney", sans-serif; font-weight: 900; margin-right: auto'><span style="font-style: italic;">LEE LEE KIDDZ</span> Password Reset</h1>
                <img src="https://www.leeleeff.com/imgs/logo/leeleekiddz_logo.jpg" style="width: 100px; height: 100px;" />
            </div>

            <div class="content-container" style="display: block; text-align: center; font-size: 24px; padding: 0 5%;">
                <p style="margin:0;">Hi ${name},</p>

                <p style="margin:0;">
                    We're sending you this email because there has been a request to reset your password.
                </p>
                <p style="margin:0;">
                    Click on this link to create a new password.
                </p>
                <div style="text-align: center; padding: 8px 0; margin: 32px 0 8px;">
                    <a href="https://www.leeleeff.com/forgotPassword?email=${email}&token=${token}" style="all:unset; font-size: 18px; padding: 8px 48px; border-radius: 32px; background-color: rgba(255,117,201,1); color: #fff; cursor: pointer;">Set a new password</a>
                </div>
                <p style="margin:0; font-size: 18px; color: rgba(100,100,100,1);">
                    If you did not submit this request please ignore this email.
                </p>
                <p style="margin:0; font-size: 18px; color: rgba(100,100,100,1);">
                    Your password will not be changed.
                </p>

                <p style="margin:16px 0 0; font-weight: bold;">Lee Lee Admin Team</p>
            </div>
        </div>
    `;

    const emailText = `
        Hi ${name},
        We're sending you this email because there has been a request to reset your password.
        Click on this link to create a new password.

        'https://www.leeleeff.com/forgotPassword?email=${email}&token=${token}'

        If you did not submit this request please ignore this email. Your password will not be changed.

        Lee Lee Admin Team`;

    return { emailHtml, emailText };
}