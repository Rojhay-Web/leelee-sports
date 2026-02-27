import { Dispatch, SetStateAction, useContext, useEffect, useRef, useState } from "react";
import ReactQuill from "react-quill-new";
import Resizer from "react-image-file-resizer";
import { gql, useLazyQuery, useMutation } from "@apollo/client";
import Slider from "react-slick";
import { toast } from "react-toastify";
import { spiral } from 'ldrs';
import sanitizeHtml from 'sanitize-html';
import { v4 as uuidv4 } from 'uuid';

import { Form, FormField, SiteEvent, UserContextType } from "../../../datatypes";
import { formatDateStr, handleGQLError } from "../../../utils";
import { log } from "../../../utils/log";

// Custom Styles
import 'react-quill-new/dist/quill.snow.css';
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import userContext from "../../../context/user.context";
import { ImageEditor } from "../../pages/blueprint/siteEditor";

type FeatureType = SiteEvent;

type AddEditFeatureItemType = {
    featureId: string, featureType:string,
    toggleSelFeature: (id?:string) => void
}

type AddEditFeatureEditorType = {
    featureSettings: FeatureSettingType,
    data: FeatureType,
    setData: Dispatch<SetStateAction<FeatureType |undefined>>
}

type EditFieldType = {
    fieldData: any, setFieldData: (keyVal: keyof FeatureType, val: any) => void,
    name:string, type: string, keyVal: keyof FeatureType,
    size?:number, required?: boolean, 
    icon?: string, options?:string[]
}

type CustomImageStrComponentType = {
    imgList: string[], setImgList: (list: string[]) => void
}

type FeatureSettingFieldType = {
    name: string, keyVal: string, size: number,
    required: boolean, icon: string, type: string,
    options?:string[]
};

type FeatureSettingType = {
    pageTitle: string, icon: string, hasForms: boolean,
    fields: FeatureSettingFieldType[],
    defaultData: FeatureType
}

type ButtonDataType = {
    icon: string, title: string, buttonStyle: string,
    actionType: string, active: boolean
}

type FormEditorType = {
    formData?: Form, idx: number,
    setFormData: (data: Form, idx: number) => void
}

type FormFieldEditorType = {
    fieldData: FormField, idx: number,
    setFieldData: (data: FormField, idx: number) => void,
    removeField: (idx: number) => void
}

const GET_EVENT_QUERY = gql`
query getEvent($gid:String!){
	event(gid:$gid){
        google_event_id
        title
        description
        location
        images
        start
        end
        forms {
            id
            title
            description
            fields {
                title
                type
                required
                options
            }
        }
    }
}`,
GET_ANNOUNCEMENT_QUERY = gql`
query getAnnouncement($id:String!){
	announcement(id:$id){
        _id
        title
        description
        type
        images
        forms {
            id
            title
            description
            fields {
                title
                type
                required
                options
            }
        }
    }
}`,
UPSERT_ANNOUNCEMENT = gql`
mutation updateAnnouncement($id: String, $title: String!, $description: String!, $images: [String], $forms:[FormInput]){
	upsertAnnouncement(id:$id, title: $title, description: $description, images: $images, forms: $forms)
}`,
UPSERT_EVENT = gql`
mutation updateEvent($gid:String, $title: String!, $description: String!, $location:String, $images: [String], $start:Date!, $end:Date, $forms:[FormInput]){
	upsertEvent(gid:$gid, title: $title, description: $description, location: $location, images: $images, start: $start, end: $end, forms: $forms)
}`,
REMOVE_FEATURE_ITEM = gql`
mutation removeFeature($featureType: String!, $id:String!){
	removeFeatureItem(featureType:$featureType, id: $id)
}`;


const MAX_FORMS = 2, MAX_GALLERY_COUNT = 10,
quillSetup = {
    modules: {
        toolbar:[
            [{ 'header': '1'}, {'header': '2'}, {size: []}],
            ['bold', 'italic', 'underline', 'strike'],
            [{'list': 'ordered'}, {'list': 'bullet'}, 
                {'indent': '-1'}, {'indent': '+1'}],
            ['link', 'clean'],
        ],
        clipboard: {matchVisual: false }
    },
    formats: [
        'header', 'font', 'size',
        'bold', 'italic', 'underline', 'strike',
        'list', 'indent', 'link',
    ]
},
feature_settings: {[key:string]: FeatureSettingType} = {
    "event":{
        pageTitle: "event", hasForms: true, icon:"event",
        fields:[
            { name: "event title", keyVal:"title", size: 6, required: true, icon:"edit_square", type:"text" },
            { name: "event location", keyVal:"location", size: 4, required: false, icon:"location_on", type:"text" },
            { name: "start date", keyVal:"start", size: 5, required: true, icon:"edit_calendar", type:"datetime" },
            { name: "end date", keyVal:"end", size: 5, required: false, icon:"edit_calendar", type:"datetime" },
            { name: "event description", keyVal:"description", size: 10, required: true, icon:"description", type:"textarea" },
            { name: "event images", keyVal:"images", size: 10, required: false, icon:"add_photo_alternate", type:"gallery" },
        ],
        defaultData: { 
            title: '', location: '', start: new Date(), end: undefined, 
            description: '', images: [], forms:[], tag:`evt-${uuidv4()}`
        }
    }
},
button_data_actions: {[key:string]: ButtonDataType} = {
    "loading":{ icon: "pending", title: "Loading", buttonStyle:"border", actionType: '', active: false },
    "update":{ icon: "save", title: "Update", buttonStyle:"full", actionType: 'update', active: true },
    "create":{ icon: "save", title: "Create", buttonStyle:"full", actionType: 'create', active: true },
    "warning":{ icon: "error", title: "See Errors", buttonStyle:"border_error", actionType: 'warnings', active: true },
};
// form_field_types = [
//     "", "text", "number", "date", 
//     "email", "tel", "textarea", "select"
// ];


/* Custom Image String Field */
function CustomImageStrComponent({ imgList, setImgList}: CustomImageStrComponentType){
    const photoUploadRef = useRef<HTMLInputElement>(null);

    const settings = {
        infinite: false,
        slidesToShow: 4,
        slidesToScroll: 1,
        speed: 500,
        responsive: [
            {
                breakpoint: 770,
                settings: {
                    slidesToShow: 2,
                    infinite: false
                }
            }
        ]
    };

    const removeImg = (idx: number) => {
        try {
            if(window.confirm("Are you sure you want to delete this image?")){
                let tmpList = [...imgList];
                tmpList.splice(idx,1);

                setImgList(tmpList);
            }
        }
        catch(ex){
            log.error(`Removing Image: ${ex}`);
        }
    }

    const handleClick = () => {
        if(photoUploadRef?.current){
            photoUploadRef?.current?.click();
        }
    }

    const setImageFile = (e:any) => {
        try {
            if(e?.target?.files?.length > 0){
                Resizer.imageFileResizer(e.target.files[0],
                    500, // Max Width
                    500, // Max Height
                    "JPEG", // compressFormat
                    75, // quality
                    0, // rotation
                    (uri: any) => { 
                        setImgList([...imgList, uri]); 
                        e.target.value = null;
                    }, 
                    "base64", // outputType
                    200, // minWidth
                    200 // minHeight 
                );
            }
        }
        catch(ex){
            log.error(`Setting Image File: ${ex}`);
        }
    }

    return(
        <div className="img-str-container">
            <div className="img-container-body ctrl">
                <div className="img-container add" onClick={handleClick}>
                    <div className="title-row">
                        <span className="material-symbols-outlined">cloud_upload</span>
                        <span>Upload New Image</span>
                    </div>
                </div>
            </div>
            <div className="slider-container">
                <Slider {...settings}>                        
                    {imgList.map((imgSrc,i)=> 
                        <div className="img-container-body">
                            <div className="img-container" key={i}>
                                <span className="material-symbols-outlined close-btn" onClick={()=> removeImg(i)}>close</span>
                                {imgSrc ? <img src={imgSrc} alt="uploaded feature item" /> : <div className="title-row"><span>Invalid Image</span></div>}
                            </div> 
                        </div>
                    )}
                </Slider>
            </div>

            <input className='hiddenInput' type="file" accept="image/*" name="image" ref={photoUploadRef} onChange={setImageFile} />
        </div>
    );
}

/* Editable Fields */
function EditField({fieldData, setFieldData, name, keyVal, type, size=10, required=false, icon="category", options=[]}:EditFieldType){
    const [hasError, setHasError] = useState(false);
    const fieldInit = useRef(false);

    const defaultHandleChange = (e: any) => {
        switch(type){
            case "text":
            case "select":
            case "datetime":
                setFieldData(keyVal, e.target.value);
                break;
            case "textarea":
            case "gallery":
                setFieldData(keyVal, e);
                break;
            default:
                break;
        }
    }

    const invalidField = () => {
        try {
            switch(type){
                case "text":
                case "select":
                case "datetime":
                case "gallery":
                    return !(!required || fieldData?.length > 0);
                case "textarea":
                    const plainStr = sanitizeHtml(fieldData);
                    return !(!required || plainStr?.length > 0);
                default:
                    return false;
            }
        }
        catch(ex){
            log.error(`Validating Field [${name}]: ${ex}`);
            return false;
        }
    }

    useEffect(()=>{
        if(!!fieldInit?.current){
            setHasError(invalidField());
        }

        fieldInit.current = true;
    },[fieldData]); // eslint-disable-line react-hooks/exhaustive-deps

    return(
        <div className={`edit-field-container sz-${size} ${hasError ? 'error' : ''}`}>
            <span className="field-title">{name} {(required ? '*' : '')}</span>

            <div className={`field-container ${type}`}>
                <span className="material-symbols-outlined field-icon">{icon}</span>
                {type === "text" && 
                    <input type="text" name={name} value={fieldData} onChange={defaultHandleChange} />
                }
                {type === "textarea" && 
                    <ReactQuill theme="snow" value={fieldData} onChange={defaultHandleChange} 
                        modules={quillSetup.modules} formats={quillSetup.formats} className="admin-quill"
                    />
                }
                {type === "datetime" && 
                    <input type="datetime-local" name={name} value={fieldData} onChange={defaultHandleChange} />
                }
                {type === "select" && 
                    <select className='admin-select' name={name} value={fieldData} onChange={defaultHandleChange}>
                        {options?.map((option, j)=>
                            <option key={j} value={option}>{option}</option>
                        )}
                    </select>
                }
                {/*type === "gallery" && <CustomImageStrComponent imgList={fieldData} setImgList={defaultHandleChange}/>*/}
                {type === "gallery" && <ImageEditor maxSelect={MAX_GALLERY_COUNT} tag={fieldData?.tag} updateList={()=>{}}/>}
            </div>
        </div>
    );
}

/* Add/Edit Feature Component */
function AddEditFeatureEditor({ featureSettings, data, setData }: AddEditFeatureEditorType){
    const setFieldData = (keyVal: keyof FeatureType, val: any) => {
        setData((d: FeatureType | undefined)=> {
            return (d ? {...d, [keyVal]: val } : undefined);
        });
    };

    return(
        <div className="feature-editor-container">
            {featureSettings?.fields.map((field,i) =>
                <EditField key={i} fieldData={data[field.keyVal as keyof typeof data]} setFieldData={setFieldData}
                    name={field.name} keyVal={field.keyVal as keyof FeatureType} type={field.type} 
                    size={field.size} required={field.required}
                    icon={field.icon} options={field?.options}
                />
            )}
        </div>
    );
}

/* Form Field Editor */
function FormFieldEditor({ fieldData, idx, setFieldData, removeField }:FormFieldEditorType){
    const [newOption, setNewOption] = useState("");

    const setField = (keyVal: keyof FeatureType, val: any) => {
        try {
            const tmpField = {...fieldData, [keyVal]: val };
            setFieldData(tmpField, idx);
        }
        catch(ex){
            log.error(`Setting Field Data: ${ex}`);
        }
    }

    const toggleRequired = (status: boolean) => {
        try {
            const tmpField = {...fieldData, required: status };
            setFieldData(tmpField, idx);
        }
        catch(ex){
            log.error(`Toggling Required: ${ex}`);
        }
    }

    const addOption = () => {
        try {
            if(newOption?.length > 0){
                const tmpField = {...fieldData,
                    options: (fieldData?.options ? [...fieldData.options, newOption] : [newOption])
                };
                setFieldData(tmpField, idx);

                setNewOption("");
            }
        }
        catch(ex){
            log.error(`Setting Field Options: ${ex}`);
        }
    }

    const removeOption = (optionIdx: number) => {
        try {
            if(window.confirm("Are you sure you want to remove this option?")) {
                let tmpOptions = fieldData?.options ? fieldData?.options : [];

                if(optionIdx < tmpOptions.length) {
                    tmpOptions.splice(optionIdx,1);
                }

                const tmpField = {...fieldData, options: tmpOptions };
                setFieldData(tmpField, idx);
            }
        }
        catch(ex){
            log.error(`Removing Field Options: ${ex}`);
        }
    }

    const handleKeySubmit = (e: any) => {
        try {
            if(e.key === 'Enter'){
                addOption();
            }
        }
        catch(ex){
            log.error(`Handle Key Submit: ${ex}`);
        }
    }

    return(
        <div className="field-editor-container">
            <div className="remove-btn" onClick={()=> { removeField(idx); }}>
                <span className="material-symbols-outlined">delete</span>
            </div>
            
            {/* Field Title */}
            <EditField fieldData={fieldData.title} setFieldData={setField}
                name={'field title'} keyVal="title" type={"text"} 
                size={4} required={true} icon="edit_square" 
            />

            {/* Field Type */}
            {/*<EditField fieldData={fieldData.type} setFieldData={setField}
                name={'field type'} keyVal="type" type={"select"} 
                size={4} required={true} icon="category" options={form_field_types}
            />*/}

            <div className='edit-field-container sz-2'>
                <div className={`required-container ${!!fieldData?.required ? 'active' : ''}`}  onClick={()=> { toggleRequired(!fieldData?.required); }}>
                    <div className="toggle-container"><div className="toggle-btn" /></div>
                    <span>Required</span>
                </div>
            </div>

            {fieldData.type === "select" && 
                <div className="option-list">
                    <div className="title">Options</div>
                    <div className="option-value-list">
                        {fieldData?.options?.map((option, i) =>
                            <div className="option-item" key={i}>
                                <span className="value">{option}</span>
                                <span className="material-symbols-outlined" onClick={()=> removeOption(i)}>cancel</span>
                            </div>
                        )}
                    </div>

                    <div className="add-option-container">
                        <input type="text" value={newOption} onChange={(e) => setNewOption(e.target.value)} onKeyDown={handleKeySubmit}/>
                        <span className={`material-symbols-outlined option-add-icon ${newOption?.length > 0 ? '' : 'hide'}`} onClick={addOption}>forms_add_on</span>
                    </div>                    
                </div>
            }
        </div>
    );
}

/* Forms Editor Component */
function FormEditor({ idx, formData, setFormData }: FormEditorType){
    const defaultFormField:FormField = { title:"", type:"", required: false, options:[] };

    const setFormBaseData = (keyVal: keyof FeatureType, val: any) => {
        try {
            if(formData){
                setFormData({ ...formData, [keyVal]: val }, idx);
            }
        }
        catch(ex){
            log.error(`Setting Base Form Field Data: ${ex}`);
        }
    }

    const setFormFieldData = (fieldData: FormField, fieldIdx: number) => {
        try {
            if(formData){
                let tmpForm = { ...formData };
                tmpForm.fields[fieldIdx] = fieldData;

                setFormData(tmpForm, idx);
            }
        }
        catch(ex){
            log.error(`Setting Form Field Data: ${ex}`);
        }
    }

    const addFormField = () => {
        try {
            if(formData) {
                const tmpFormData = {
                    ...formData,
                    "fields":[...formData.fields, defaultFormField]
                };

                setFormData(tmpFormData, idx);
            }
        }
        catch(ex){
            log.error(`Adding Form Field: ${ex}`);
        }
    }

    const removeFormField = (fieldIdx: number) => { 
        try {
            if(formData && window.confirm(`Are you sure you want to remove this field?`)) {
                const tmpFormData = { ...formData };
                tmpFormData.fields.splice(fieldIdx,1);
                setFormData(tmpFormData, idx);
            }
        }
        catch(ex){
            log.error(`Removing Form Field: ${ex}`);
        }
    }

    return(
        <div className="feature-editor-container form-editor">
            {formData ? 
                <>  
                    {/* Title */}
                    <EditField fieldData={formData.title} setFieldData={setFormBaseData}
                        name={'form title'} keyVal="title" type={"text"} 
                        size={10} required={true} icon="edit_square" 
                    />

                    {/* Description */}
                    <EditField fieldData={formData.description} setFieldData={setFormBaseData}
                        name={'form description'} keyVal="description" type={"textarea"}
                        size={10} required={true} icon="description" 
                    />

                    {/* Form Fields */}
                    <div className="form-fields-list">
                        <div className="section-title">Form Fields *</div>
                        {formData?.fields.map((field,i) =>
                            <FormFieldEditor key={i} fieldData={field} idx={i} 
                                setFieldData={setFormFieldData} removeField={removeFormField} />
                        )}

                        <div className="add-form-field-container">
                            <div className="add-form-field-btn" onClick={addFormField}>Add Field</div>
                        </div>
                    </div>
                </> :
                <div>Data Missing</div>
            }
        </div>
    );
}

function AddEditFeatureItem({featureId, featureType, toggleSelFeature}: AddEditFeatureItemType){
    const [featureSettings, setFeatureSettings] = useState<FeatureSettingType | undefined>();
    const [workingData, setWorkingData] = useState<FeatureType>();
    const [formErrors, setFormErrors] = useState<string[]>([]);

    const [buttonData, setButtonData] = useState<ButtonDataType>(button_data_actions["loading"]);
    const [activeTab, setActiveTab] = useState(-1);
    
    const { user } = useContext(userContext.UserContext) as UserContextType;
    const authHeader = {context: { headers: { "Authorization": user?._id }}};

    // GQL Queries
    const [getEvent,{ loading: event_loading, data: event_data }] = useLazyQuery(GET_EVENT_QUERY, {fetchPolicy: 'no-cache', onError: handleGQLError});
    const [getAnnouncement,{ loading: announcement_loading, data: announcement_data }] = useLazyQuery(GET_ANNOUNCEMENT_QUERY, {fetchPolicy: 'no-cache', onError: handleGQLError});

    const [upsertEvent,{ loading: upsert_event_loading, data: upsert_event_data }] = useMutation(UPSERT_EVENT, {fetchPolicy: 'no-cache', ...authHeader, onError: handleGQLError });
    const [upsertAnnouncement,{ loading: upsert_announcement_loading, data: upsert_announcement_data }] = useMutation(UPSERT_ANNOUNCEMENT, {fetchPolicy: 'no-cache', ...authHeader, onError: handleGQLError });
    const [removeFeatureItem,{ loading: remove_loading, data: remove_data }] = useMutation(REMOVE_FEATURE_ITEM, {fetchPolicy: 'no-cache', ...authHeader, onError: handleGQLError });
    
    const launchButtonAction = () => {
        try {
            switch(buttonData?.actionType){
                case 'warnings':
                    let errorMsg = ()=> (
                        <div>
                            <b>Please fix the following issues before proceeding:</b>
                            <ul>
                                {formErrors.map((err, i) => <li key={i}>{err}</li>)}
                            </ul>
                        </div>
                    );
                    toast.error(errorMsg, { position: "top-right",
                        autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                        draggable: true, progress: undefined, theme: "light" });
                    break;
                case "create":
                case "update":
                    const upsertFeatureId = featureId === '~' ? undefined : featureId;
                    const featureLoading = upsert_event_loading || upsert_announcement_loading || event_loading || announcement_loading;

                    if(featureType === "event" && !featureLoading) {
                        setButtonData(button_data_actions["loading"]);

                        upsertEvent({ variables: {
                            gid: upsertFeatureId, 
                            title: workingData?.title, description: workingData?.description, 
                            location: workingData?.location, images: workingData?.images, 
                            start: workingData?.start, end: workingData?.end, forms: workingData?.forms,
                            tag: workingData?.tag
                        }});
                    }
                    else if(featureType === "announcement" && !featureLoading){
                        setButtonData(button_data_actions["loading"]);

                        upsertAnnouncement({ variables: { 
                            id: upsertFeatureId, 
                            title: workingData?.title, description: workingData?.description, 
                            type: /*workingData?.type*/ null, images: workingData?.images, forms: workingData?.forms
                        }});
                    }
                    break;
                default:
                    break;
            }
        }
        catch(ex){
            log.error(`Launching Button Action: ${ex}`);
        }
    }

    const addForm = () => {
        try {
            if(!workingData?.forms || workingData.forms?.length < MAX_FORMS){
                setWorkingData((d: any)=> {
                    const tmp_form_list = (d?.forms ? [...d.forms] : []);
                    let ret = {...d, forms:[...tmp_form_list, {title:"", description:"", fields:[]}]};

                    return ret;
                });
            }
        }
        catch(ex){
            log.error(`Adding Form To Feature: ${ex}`);
        }
    }

    const removeForm = (e:any, idx: number) => {
        try {
            if(window.confirm("Are you sure you want to delete this form?")){
                setWorkingData((d: any)=> {
                    d.forms.splice(idx,1);
                    let ret = {...d };

                    return ret;
                });

                setActiveTab(-1);
            }

            if (e.stopPropagation) e.stopPropagation();
        }
        catch(ex){
            log.error(`Removing Form From Feature: ${ex}`);
        }
    }

    const validateForm = () => {
        try {
            let errorList: string[] = [];
            // Validate Base
            featureSettings?.fields.forEach((field) => {
                const fieldData: any = workingData ? workingData[field.keyVal as keyof typeof workingData] : null;

                switch(field.type){
                    case "text":
                    case "select":
                    case "datetime":
                    case "gallery":
                        if(!(!field.required || fieldData?.length > 0)){
                            errorList.push(`${field.name} is missing`);
                        }
                        break;
                    case "textarea":
                        const plainStr = fieldData ? sanitizeHtml(fieldData) : null;
                        if(!(!field.required || (plainStr && plainStr?.length > 0))){
                            errorList.push(`${field.name} is missing`);
                        }
                        break;
                    default:
                        break;
                }

                // Check Start/End Times
                if(field.keyVal === "end" && fieldData?.length > 0){
                    let endTime = new Date(fieldData).getTime();
                    let startTime = (workingData && workingData?.start ? new Date(workingData.start).getTime() : -1);

                    if(endTime < startTime || startTime < 0){
                        errorList.push(`Please check end date is after start date`);
                    }
                }
            });

            // Check Feature Form(s)
            if(workingData?.forms && workingData.forms.length > 0){
                workingData?.forms.forEach((form, fIdx)=> {
                    const plainDesc = form?.description ? sanitizeHtml(form?.description) : null;
                    if(form?.title?.length <= 0 || (!plainDesc || plainDesc?.length <= 0)) {
                        errorList.push(`Form ${fIdx} - Missing Title/Description`);
                    }

                    if(!form?.fields || form.fields?.length <= 0){
                        errorList.push(`Form ${fIdx} - Missing Atleast 1 Form Field`);
                    }

                    for(let i=0; i < form?.fields?.length; i++){
                        let field = form.fields[i];
                        if(field.title?.length <= 0 || field.type?.length <= 0){
                            errorList.push(`Form ${fIdx} - Check Form Fields`);
                            break;
                        }
                    }
                });
            }

            // Store Error List
            setFormErrors(errorList);
        }
        catch(ex){
            log.error(`Validating Form: ${ex}`);
        }
    }

    const updateFormData = (formData: Form, idx: number) => {
        try {
            setWorkingData((d: any)=>{
                let ret = { ...d };
                ret.forms[idx] = formData;

                return ret;
            })
        }
        catch(ex){
            log.error(`Updating Form Data: ${ex}`);
        }
    }
    
    const removeFeature = () => {
        if(featureType && featureId && window.confirm(`Are you sure you want to delete this ${featureSettings?.pageTitle}`)) {
            removeFeatureItem({ variables: { featureType: featureType, id: featureId }});
        }
    }

    useEffect(()=> { spiral.register(); },[]);

    useEffect(()=>{ if(workingData){ validateForm(); } },[workingData]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(()=>{
        if(formErrors?.length > 0){
            setButtonData(button_data_actions["warning"]);
        }
        else if(workingData && (!!workingData._id || ('google_event_id' in workingData && !!workingData?.google_event_id))){
            setButtonData(button_data_actions["update"]);
        }
        else {
            setButtonData(button_data_actions["create"]);
        }
    },[formErrors]); // eslint-disable-line react-hooks/exhaustive-deps

    // Set Feature Type
    useEffect(()=>{
        if(featureType in feature_settings) {
            setFeatureSettings(feature_settings[featureType]);
            if(featureId && featureId !== '~'){
                if(featureType === "event") {
                    getEvent({ variables: { gid: featureId }});
                }
                else if(featureType === "announcement"){
                    getAnnouncement({ variables: { id: featureId }});
                }
            }
            else {
                setWorkingData(feature_settings[featureType].defaultData);
            }
        }
    },[featureId, featureType]); // eslint-disable-line react-hooks/exhaustive-deps

    // Load Feature Data
    useEffect(()=> {
        if(!event_loading && event_data){
            const tmp_start = (event_data.event?.start ? formatDateStr(event_data.event.start, `yyyy-MM-dd'T'HH:mm`) : undefined);
            const tmp_end = (event_data.event?.end ? formatDateStr(event_data.event.end, `yyyy-MM-dd'T'HH:mm`) : undefined);
            const tmp_forms = (!event_data?.event?.forms ? [] :
                event_data?.event?.forms.map((form: any) =>{
                    const tmp_fields = form.fields.map((field: any) => {
                        let tmp_field = { ...field };
                        delete tmp_field["__typename"];

                        return tmp_field;
                    });

                    let tmp_form = {...form, fields: tmp_fields };
                    delete tmp_form["__typename"];

                    return tmp_form;
                })
            )

            setWorkingData({
                ...event_data.event,
                forms: tmp_forms,
                start: tmp_start, end: tmp_end
            });
        }
    },[event_loading, event_data]); 

     useEffect(()=> {
        if(!announcement_loading && announcement_data){
            setWorkingData({...announcement_data.announcement });
        }
    },[announcement_loading, announcement_data]);

    // Upsert Feature 
    useEffect(()=>{
        if(!upsert_event_loading && upsert_event_data){
             toast.success(`Updates/Added`, { position: "top-right",
                autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                draggable: true, progress: undefined, theme: "light" });
            toggleSelFeature(upsert_event_data.upsertEvent);
            setButtonData(button_data_actions["update"]);
        }
    },[upsert_event_loading, upsert_event_data]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(()=>{
        if(!upsert_announcement_loading && upsert_announcement_data){
             toast.success(`Updates/Added`, { position: "top-right",
                autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                draggable: true, progress: undefined, theme: "light" });
            toggleSelFeature(upsert_announcement_data.upsertAnnouncement);
            setButtonData(button_data_actions["update"]);
        }
    },[upsert_announcement_loading, upsert_announcement_data]); // eslint-disable-line react-hooks/exhaustive-deps

    // Remove Feature
    useEffect(()=>{
        if(!remove_loading && remove_data?.removeFeatureItem){
            toggleSelFeature(undefined);
        }
    },[remove_loading, remove_data]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="edit-feature-container">
            {(upsert_event_loading || upsert_announcement_loading || event_loading || announcement_loading) &&
                <div className="feature-loading">
                    <l-spiral size="300" speed="0.9" color="rgba(170,170,170,1)"/>
                </div>
            }

            {(!featureSettings) ?
                <>{/* Feature Type DNE */}</> :
                <>
                    {workingData ?
                        <>
                            <div className="feature-control-row">
                                <button className="action-btn link" onClick={()=>{toggleSelFeature(undefined)}}>
                                    <span className="material-symbols-outlined">chevron_left</span>
                                    <span className="btn-title">Back to {featureSettings?.pageTitle}s </span>
                                </button>

                                <div className="action-btn-container">
                                    {featureId !== '~' && 
                                        <button className='action-btn remove' onClick={removeFeature}>
                                            <span className="material-symbols-outlined">delete</span>
                                            <span className="btn-title">Delete {featureSettings?.pageTitle}</span>
                                        </button>
                                    }

                                    <button className={`action-btn ${buttonData.buttonStyle}`} disabled={!buttonData.active} onClick={launchButtonAction}>
                                        <span className="material-symbols-outlined">{buttonData.icon}</span>
                                        <span className="btn-title">{buttonData.title}</span>
                                    </button>
                                </div>
                            </div>

                            <div className="feature-tab-row">
                                <div className={`feature-tab ${(activeTab === -1 ? 'active' : 'inactive')}`} key={-1} onClick={()=>{ setActiveTab(-1) }}>
                                    <div className="tab-content">
                                        <span className="material-symbols-outlined">{featureSettings.icon}</span>
                                        <span className="tab-title">{featureSettings.pageTitle} - {workingData?.title ?? `Create ${featureSettings.pageTitle}`}</span>
                                    </div>
                                </div>
                                {/* FORMS */}
                                {workingData && workingData.forms?.map((f, i) => 
                                    <div className={`feature-tab ${(activeTab === i ? 'active' : 'inactive')}`} key={i} onClick={()=>{ setActiveTab(i) }}>
                                        <div className="tab-content">
                                            <span className="material-symbols-outlined">assignment</span>
                                            <span className="tab-title">Form - {f.title.length > 0 ? f.title : 'New Form'}</span>

                                            <span className="material-symbols-outlined close_icon" onClick={(e)=> removeForm(e, i)}>close</span>
                                        </div>
                                    </div>
                                )}

                                {(!workingData?.forms || workingData.forms?.length < MAX_FORMS) &&
                                    <div className={`feature-tab btn inactive`} onClick={addForm}>
                                        <div className="tab-content">
                                            <span className="material-symbols-outlined">add</span>
                                            <span className="tab-title">Add Form</span>
                                        </div>
                                    </div>
                                }
                            </div>

                            <div className="feature-content-section">
                                {(activeTab >= 0 && workingData?.forms && workingData?.forms?.length > activeTab) ?
                                    <FormEditor idx={activeTab} formData={workingData.forms[activeTab]} setFormData={updateFormData}/> :
                                    <AddEditFeatureEditor featureSettings={featureSettings} data={workingData} setData={setWorkingData} />
                                }
                            </div>
                        </> :
                        <>{/* Does Not Have Working Data*/}</>
                    }
                </>
            }
        </div>
    );
}

export default AddEditFeatureItem;