"use strict";
require('dotenv').config();
const { google } = require('googleapis');
const { v4: uuidv4 } = require('uuid');

const log = require('../log.service'),
    util = require('../../utils/util');

const sheets = {
    "table": { name:"users", fields:[
        { title: "", type:"", required: false, default: null },
    ]}
};

module.exports = {
    // Data By Sheet
    getDataBySheet: async function(sheet){
        try {
            if(!sheet || !(sheet in sheets)){
                return { error: 'Invalid Sheet Name' };
            }

            const sheetData = await getSheetData(sheet);
            if(sheetData?.error){
                return { error: `Unable to get ${sheet} data [E01]` };
            }

            let formatted_data = processSheetData(sheets[sheet], sheetData.results);
            return { results: formatted_data };
        }
        catch(ex){
            log.error(`Getting Data By Sheet: ${ex}`);
            return { 'error': 'Getting Data By Sheet [E00]'};
        }
    },
    addDataBySheet: async function(sheet, sheetData){
        try {
            if(!sheet || !(sheet in sheets)){
                return { error: 'Invalid Sheet Name' };
            }

            // Build Row
            const formatted_data = formatSheetRowData(sheets[sheet], [sheetData], true);
            if(formatted_data?.error?.length > 0){
                return { error: formatted_data.error.join(', ') };
            }

            const googleAuth = getGoogleAuth();
            const sheetInstance = await google.sheets({ version: 'v4', auth: googleAuth});
            const updateSheet = await sheetInstance.spreadsheets.values.append({
                auth: googleAuth,
                spreadsheetId: process.env.GOOGLE_SHEET_ID,
                range: 'users',
                valueInputOption: 'RAW',
                resource:{ values: formatted_data.data }
            });

            return { results: updateSheet?.data?.updates && updateSheet?.data?.updates.updatedRows > 0 };
        }
        catch(ex){
            log.error(`Adding Data By Sheet: ${ex}`);
            return { 'error': 'Adding Data By Sheet [E00]'};
        }
    },
    updatingDataBySheet: async function(sheet, appId, sheetData){
        try {
            if(!sheet || !(sheet in sheets)){
                return { error: 'Invalid Sheet Name' };
            }

            const sheetData = await getSheetData(sheet);
            if(sheetData?.error){
                return { error: `Unable to get ${sheet} data [E03]` };
            }

            let sheetRow = sheetData.results.map((u) => u.appId).indexOf(appId);
            if(sheetRow < 0){
                return { error: 'Row DNE', results: false };
            }

            // Build Row
            const formatted_data = formatSheetRowData(sheets[sheet], [sheetData.results[sheetRow]], true);
            if(formatted_data?.error?.length > 0){
                return { error: formatted_data.error.join(', ') };
            }

            // Update Row
            const googleAuth = getGoogleAuth();
            const sheetInstance = await google.sheets({ version: 'v4', auth: googleAuth});
            const updateSheet = await sheetInstance.spreadsheets.values.update({
                auth: googleAuth,
                spreadsheetId: process.env.GOOGLE_SHEET_ID,
                range: `users!${(sheetRow + 2)}:${(sheetRow + 2)}`,
                valueInputOption: 'RAW',
                resource:{ values: formatted_data }
            });

            return { results: updateSheet?.data && updateSheet?.data?.updatedRows > 0 };
        }
        catch(ex){
            log.error(`Updating Data By Sheet: ${ex}`);
            return { 'error': 'Updating Data By Sheet [E00]'};
        }
    },
    deletingDataBySheet: async function(sheet, appId){
        try {
            if(!sheet || !(sheet in sheets)){
                return { error: 'Invalid Sheet Name' };
            }

            const sheetData = await getSheetData(sheet);
            if(sheetData?.error){
                return { error: `Unable to get ${sheet} data [E04]` };
            }

            let sheetRow = sheetData.results.map((u) => u.appId).indexOf(appId);
            if(sheetRow < 0){
                return { error: 'Row DNE', results: false };
            }

            const sheetInstance = await google.sheets({ version: 'v4', auth: googleAuth});
            const updateSheet = await sheetInstance.spreadsheets.values.clear ({
                auth: googleAuth,
                spreadsheetId: process.env.GOOGLE_SHEET_ID,
                range: `users!${(sheetRow + 2)}:${(sheetRow + 2)}`
            });

            return { results: !!updateSheet?.data?.clearedRange };
        }
        catch(ex){
            log.error(`Deleting Data By Sheet: ${ex}`);
            return { 'error': 'Deleting Data By Sheet [E00]'};
        }
    }
};


/* Private Functions */
function getGoogleAuth(){
    let ret = null;
    try {
        const privateKey = process.env.PRIVATE_KEY;
        
        ret = new google.auth.JWT(
            process.env.CLIENT_EMAIL,
            null,
            privateKey.replace(/\\n/g, '\n'),
            'https://www.googleapis.com/auth/spreadsheets'
        );
    }
    catch(ex){
        log.error(`Authenticating Google Account: ${ex}`);
    }

    return ret;
}

function buildSheetObject(listData) {
    let ret = [];
    try {
        let colNames = listData[0];

        for(let i=1; i< listData.length; i++){
            let item = {};
            for(let j=0; j < listData[i].length; j++){
                let colName = colNames.length >= j ? colNames[j] : `col-${j}`;
                item[colName] = listData[i][j];
            }

            ret.push(item);
        }
    }
    catch(ex){
        log.error(`Building Sheet Data: ${ex}`);
    }
    return ret;
}

async function getSheetData(sheetName){
    try {
        let googleAuth = getGoogleAuth();
        if(!googleAuth){
            return { 'error': 'Retrieving Sheet Auth [E01]' };
        }

        const sheetInstance = await google.sheets({ version: 'v4', auth: googleAuth });
        const sheetInfo = await sheetInstance.spreadsheets.values.get({
            auth: googleAuth,
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: `${sheetName}`
        });

        return { "results":(sheetInfo?.data?.values ? buildSheetObject(sheetInfo.data.values) : []) };
    }
    catch(ex){
        log.error(`Getting Sheet Data: ${ex}`);
        return { 'error': 'Getting Sheet Data [E00]'};
    }
}

function processSheetData(sheetInfo, data){
    let ret = [];
    try {
        for(let i=0; i < data.length; i++){
            let row = {};
            for(let j=0; j < sheetInfo.fields.length; j++){
                const field = sheetInfo.fields[j];
                if(field in data[i] && data[i][field] != null){
                    switch(field.type){
                        case "id":
                        case "string":
                            row[field] = data[i][field];
                            break;
                        case "boolean":
                            row[field] = data[i][field].toLowerCase() === 'true';
                            break;
                        case "json":
                            row[field] = util.jsonStrFormatter(data[i][field], true);
                            break;
                        default:
                            row[field] = undefined;
                            break;
                    }
                }
                else {
                    row[field] = field.default;
                }
            }
            ret.push(row);
        }
    }
    catch(ex){
        log.error(`Formatting Sheet Data: ${ex}`);
    }

    return ret;
}

function formatSheetRowData(sheetInfo, data, isNew = false){
    let ret = [], errors = [];
    try {
        for(let i=0; i < data.length; i++){
            let row = [];
            for(let j=0; j < sheetInfo.fields.length; j++){
                const field = sheetInfo.fields[j];
                if(field.required === true && (!(field in data[i]) || data[i][field] != null)){
                    errors.push(`Required field ${field.title} is missing`);
                    row.push(null);
                }
                else if(field in data[i] && data[i][field] != null){
                    switch(field.type){
                        case "id":
                            if(isNew){
                                row.push(uuidv4());
                            }
                            else {
                                row.push(data[i][field]);
                            }
                            break;
                        case "string":
                        case "boolean":
                            row.push(data[i][field]);
                            break;
                        case "json":
                            row.push(util.jsonStrFormatter(data[i][field], true));
                            break;
                        default:
                            row.push(null);
                            break;
                    }
                }
                else {
                    row.push(field.default);
                }
            }
            ret.push(row);
        }
    }
    catch(ex){
        log.error(`Formatting Sheet Data: ${ex}`);
    }

    return { data: ret, error: errors };
}