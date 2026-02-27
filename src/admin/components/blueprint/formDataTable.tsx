import { useEffect, useMemo, useState } from "react";
import DataTable from 'react-data-table-component';
import { gql, useLazyQuery } from '@apollo/client';
import parse from 'html-react-parser';

import { convertArrayOfObjectsToCSV, formatDateStr, handleGQLError } from '../../../utils';
import { log } from "../../../utils/log";


type FormDataTableType = {
    formType: string, featureId?: string,
    toggleFeatureSelect: () => void
}

type TitleBarType = {
    title:string, forms?:{ id: string, title: string }[]
};

const DEFAULT_PAGE_SIZE = 20;
const FORM_DATA_QUERY = gql`
query getFormData($id:String!, $type:String!, $parentId:String, $page:Int, $pageSize: Int){
	submittedFormData(id:$id, type:$type, parentId:$parentId, page:$page, pageSize:$pageSize){
 		pagesLeft
      	results {
          form_data
          timestamp
        }
    }
}`,
GET_FORM_DETAILS = gql`
query getForm($id:String!, $type:String!, $parentId:String){
    formDetails(id:$id, type:$type, parentId:$parentId){
        id
        title
        fields {
            title
            type
        }
    }
}`,
GET_EVENT_QUERY = gql`
query getEvent($gid:String!){
	event(gid:$gid){
        title
        forms {
            id
            title
        }
    }
}`,
GET_ANNOUNCEMENT_QUERY = gql`
query getAnnouncement($id:String!){
	announcement(id:$id){
        title
        forms {
            id
            title
        }
    }
}`;

const ExpandedComponent = ({ data }: {data: any}) => <pre>{JSON.stringify(data, null, 2)}</pre>;

export default function FormDataTable({ formType, featureId, toggleFeatureSelect }: FormDataTableType){
    const [titleBar, setTitleBar] = useState<TitleBarType>({ title: "", forms:[]});
    const [formId, setFormId] = useState<string|null>(null);
    const [tableCols, setTableCols] = useState<{ name: string, selector: any, replace?:string }[]>([]);
    const [tableData, setTableData] = useState<any[]>([]);

    // GQL Queries
    const [getFormDetails,{ loading: details_loading, data: details_data }] = useLazyQuery(GET_FORM_DETAILS, {fetchPolicy: 'no-cache', onError: handleGQLError});
    const [getFormData,{ loading, data }] = useLazyQuery(FORM_DATA_QUERY, {fetchPolicy: 'no-cache', onError: handleGQLError});
    
    const [getEvent,{ loading: event_loading, data: event_data }] = useLazyQuery(GET_EVENT_QUERY, {fetchPolicy: 'no-cache', onError: handleGQLError});
    const [getAnnouncement,{ loading: announcement_loading, data: announcement_data }] = useLazyQuery(GET_ANNOUNCEMENT_QUERY, {fetchPolicy: 'no-cache', onError: handleGQLError});
    
    const downloadCSV = (title:string, array: any[], colKey: any[]) => {
        try {
            const link = document.createElement('a');
            let csv = convertArrayOfObjectsToCSV(array, colKey);
            if (csv == null) return;

            const filename = `${title ?? 'clinton'}_export.csv`;

            if (!csv.match(/^data:text\/csv/i)) {
                csv = `data:text/csv;charset=utf-8,${csv}`;
            }

            link.setAttribute('href', encodeURI(csv));
            link.setAttribute('download', filename);
            link.click();
        }
        catch(ex){
            log.error(`Download CSV: ${ex}`);
        }
    }

    // Download Action
    const actionsMemo = useMemo(() => <button className="export-btn" onClick={() => downloadCSV(titleBar?.title, tableData, tableCols)}>
        <span className="material-symbols-outlined">download</span>
        <span className="btn-title">Export CSV</span>
    </button>, [titleBar, tableData, tableCols]);

    useEffect(()=>{
        if(featureId){
            if(formType === 'events') {
                getEvent({ variables: { gid: featureId }});
            }
            else if(formType === 'announcements') {
                getAnnouncement({ variables: { id: featureId }});
            }
            else {
                setFormId(featureId);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[formType, featureId]);

    useEffect(()=>{
        if(formId) {
            const pId = (formType === "site_forms" ? null : featureId);

            getFormDetails({ variables: {
                type: formType, id: formId, parentId: pId
            }});

            getFormData({ variables: {
                type: formType, id: formId, parentId: pId,
                page: -1, pageSize: DEFAULT_PAGE_SIZE
            }});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[formId]);

    useEffect(()=>{
        if(formType === "events" && !event_loading && event_data){
            setTitleBar({
                title: event_data?.event?.title,
                forms: event_data?.event?.forms
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[event_loading, event_data]);

    useEffect(()=>{
        if(formType === "announcements" && !announcement_loading && announcement_data){
            setTitleBar({
                title: announcement_data?.announcement?.title,
                forms: announcement_data?.announcement?.forms
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[announcement_loading, announcement_data]);

    useEffect(()=>{
        if(!details_loading && details_data) {
            if(formType === "site_forms"){
                setTitleBar({ title: details_data?.formDetails?.title, forms:[] });
            }

            // Set Table Columns
            const tmpCols = (details_data?.formDetails ? details_data.formDetails.fields.map((f: { title: string, type:string }) => {
                if(f.type === "textarea"){
                    return { 
                        name: f.title, 
                        width: '250px',
                        sortable: false,
                        cell: (row: any) => (
                            <div className="cell-textarea">
                                {(!!row[f.title] ? parse(row[f.title]) : '')}
                            </div>
                        )
                        
                    };
                }
                else {
                    return { 
                        name: f.title, 
                        selector: (row:any) => row[f.title],
                        sortable: true
                    };
                }
            }) : []);

            if(tmpCols?.length > 0) { 
                tmpCols.push({ 
                    name: 'Completed Date', 
                    replace: 'timestamp',
                    width: '175px',
                    cell: (row: any) => (
                        <div className="cell-date">
                            {formatDateStr(row.timestamp, 'MM-dd-yyyy h:mm aaa')}
                        </div>
                    ),
                    sortable: true,
                    sortFunction: (rowA:any, rowB:any) => {
                        const valueA = rowA.timestamp,
                            valueB = rowB.timestamp;
                        
                        if (valueA < valueB) { return -1; }
                        else if (valueA > valueB) { return 1; }
                        return 0;
                    }
                });
            }

            setTableCols(tmpCols);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[details_loading, details_data]);

    useEffect(()=>{
        if(!loading) {
            const tmpData: any[] = (!(data?.submittedFormData?.results) ? [] :
                data?.submittedFormData?.results.map((fd: any) => { 
                    return {...fd.form_data, timestamp: fd.timestamp };
                })
            );

            setTableData(tmpData);
        }
    },[loading, data]);
    
    return (
        <div className="form-data-table-container"> 
            <div className="form-title-bar">             
                <div className="title-row">
                    <div className="back-btn" onClick={toggleFeatureSelect}>
                        <span className="material-symbols-outlined">keyboard_double_arrow_left</span>
                        <span className="title">Back To All {formType}</span>
                    </div>

                    <div className={`form-title ${details_loading ? 'empty' : ''}`}>
                        {titleBar?.title}
                    </div>
                </div>

                {titleBar?.forms && titleBar.forms.length > 0 &&
                    <div className="title-row">
                        {titleBar.forms?.map((form, i) =>
                            <div className={`form-selector ${form.id === formId ? 'sel' : ''}`} key={i} onClick={()=> setFormId(form.id)}>
                                <span className="material-symbols-outlined">assignment</span>
                                <span className="title">{form.title}</span>
                            </div>
                        )}
                    </div>
                }
            </div>

            <div className="form-table-container">
                {!formId ?
                    <div className="empty-form">Please Select A Form</div> :
                    <div className="dt-container">
                        <DataTable 
                            columns={tableCols} data={tableData} 
                            expandableRows={true}
                            expandableRowsComponent={ExpandedComponent}
                            actions={actionsMemo}
                            pagination 
                        />
                    </div>
                }
            </div>
        </div>
    );
}
