const nodemailer = require('nodemailer');

require('dotenv').config();
const log = require('../log.service');

const { 
    EMAIL_ADDRESS, EMAIL_TOKEN, SITE_ADMIN, DEBUG
} = process.env;

let mailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: EMAIL_ADDRESS, pass: EMAIL_TOKEN
    }
});

module.exports = {
    sendEmail: async function(toEmail, subject, emailText, emailHtml, content=null){
        try {
            if(content) {
                emailText, emailHtml = buildEmailBody(content);
            }
            
            if(!toEmail || !subject){
                log.warning("Missing toEmail or subject so email send was canceled");
                return { "email_status":false };
            }

            const mailDetails = {
                from: `Lee Lee Website <${EMAIL_ADDRESS}>`, // sender address
                to: (DEBUG === "1" ? SITE_ADMIN : toEmail), 
                subject: subject,
                text: emailText,
                html: emailHtml,
            }
            
            let info = await mailTransporter.sendMail(mailDetails);
            log.info(`Email Sent: ${info.messageId}`);
            return { email_status: true };
        }
        catch(ex){
            log.error(`Sending Email: ${ex}`);
            return { error: `Sending Email: ${ex}`, email_status: false };
        }
    },
    sendEmailAttachment: async function(toEmail, subject, emailText, emailHtml, files, content=null){
        try {
            if(content) {
                emailText, emailHtml = buildEmailBody(content);
            }
            
            if(!toEmail || !subject){
                log.warning("Missing toEmail or subject so email send was canceled");
                return { "email_status":false };
            }

            let file_list = Array.isArray(files) ? files :  [files];

            let attachment_list = file_list.map((file) => {
                return { filename: file.name, content: file.data }; 
            });

            const mailDetails = {
                from: `Lee Lee Website Website <${process.env.EMAIL_ADDRESS}>`, // sender address
                to: (DEBUG === "1" ? SITE_ADMIN : toEmail), 
                subject: subject,
                text: emailText,
                html: emailHtml,
                attachments: attachment_list
            }
            
            let info = await mailTransporter.sendMail(mailDetails);
            log.info(`Email Sent: ${info.messageId}`);
            return { email_status: true };
        }
        catch(ex){
            log.error(`Sending Email: ${ex}`);
            return { error: `Sending Email: ${ex}`, email_status: false };
        }
    }
}

/* Private Functions */
function buildEmailBody(content){
    let text = "", html ="";
    try {
        content.forEach((item) =>{
            text += ` ${item.text}`;
            html += `<${item.tag}>${item.text}</${item.tag}>`;
        });
    }
    catch(ex){
        log.error(`Building Email Body: ${ex}`);
    }

    return text, html;
}