import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import Multiselect from "multiselect-react-dropdown";
import { gql, useQuery, useLazyQuery } from '@apollo/client';
import * as _ from 'lodash';

import { log } from "../../../utils/log";
import { formatDate } from "../../../utils";
import { GoogleIcons, LeagueSportType, LeagueStoreAddon, LeagueStoreConfigType, LeagueStoreMerchantInfo, StoreItemDetails } from "../../../datatypes/customDT";

// GQL
const GET_ICONS_QUERY = gql`
query GetGoogleIcons($query: String){
	googleIcons(query: $query){
      name
    }
}`,
GET_STORE_CONFIG_QUERY = gql`
query GetStoreConfig{
    storeConfigs{
      _id
      key
    }
}`,
GET_LEAGUE_QUERY = gql`
query GetLocations {
    leagueLocations {
        _id
        name
    }
}`,
GET_SPORTS_QUERY = gql`
query GetLeagueSports{
	sports{
      _id
      title
      icon
    }
}`;


export type TableManagementDetailsFieldsType<P> = { 
    icon?: string;
    title: string;
    key: keyof P;
    type: string;
    net_new_active?:boolean;
    title_vert_set?:boolean;
    overflow_field_content?:boolean;
    conditional_fields?:(keyof P)[];
}

export type TableManagementModalRowType<P> = { 
    storeConfig?:LeagueStoreConfigType[],
    field: TableManagementDetailsFieldsType<P>,
    item?: P,
    setItem: Dispatch<SetStateAction<P | undefined>>
};

export type TableManagementDetailsConfigType<P> = {
    fields: TableManagementDetailsFieldsType<P>[];
}

export type StringDrillDownInputType = {
    fieldKey: string,
    fieldValue?: string[],
    setItemValue: (e:any) => void
}

export type AddOnDrillDownInputType = {
    fieldKey: string,
    fieldValue?: LeagueStoreAddon[],
    setItemValue: (e:any) => void
}

export type MerchantDetailsInputType = {
    fieldKey: string,
    fieldValue?: LeagueStoreMerchantInfo[],
    setItemValue: (e:any) => void
}

export type StoreCategoryOptionSelectType = {
    fieldKey: string,
    fieldValue?: string[],
    preSelectedSet?:string[],
    setItemValue: (e:any) => void
}

export type StoreAddonOptionSelect = {
    fieldKey: string,
    fieldValue?: LeagueStoreAddon[],
    preSelectedSet?:LeagueStoreAddon[],
    setItemValue: (e:any) => void
}

export type LeagueStoreItemDetails = {
    fieldKey: string,
    fieldValue?: StoreItemDetails,
    setItemValue: (e:any) => void
}

function AddOnDrillDownInput({ fieldKey, fieldValue, setItemValue }: AddOnDrillDownInputType){
    const [openToggle, setOpenToggle] = useState(false);

    const handleTextChange = (e: any, idx: number) => {
        try {
            let tmpFieldVal = _.cloneDeep(fieldValue);

            if(tmpFieldVal && idx < tmpFieldVal?.length){
                const name: keyof LeagueStoreAddon = e.target.name;

                tmpFieldVal[idx][name] = e.target.value;
                setItemValue({ target: { name: fieldKey, value: tmpFieldVal }});
            }
        } catch(ex) {
            log.error(`Handing Text Change: ${ex}`);
        }
    }

    const deleteItem = (idx: number) => {
        try {
            let tmpFieldVal = _.cloneDeep(fieldValue);

            if(tmpFieldVal && idx < tmpFieldVal?.length){
                tmpFieldVal.splice(idx, 1); 
                setItemValue({ target: { name: fieldKey, value: tmpFieldVal }});
            }
        } catch(ex) {
            log.error(`Handing Text Change: ${ex}`);
        }
    }

    const addItem = () => {
        try {
            let tmpFieldVal = fieldValue ? _.cloneDeep(fieldValue) : [];
            tmpFieldVal.push(new LeagueStoreAddon());

            setItemValue({ target: { name: fieldKey, value: tmpFieldVal }});
        } catch(ex) {
            log.error(`Handing Text Change: ${ex}`);
        }
    }

    return(
        <div className="str-drill-down-container">
            <div className="header-container">
                <div className="header-text">{fieldValue?.length} item(s)</div>
                <span className="icon material-symbols-outlined" onClick={()=> setOpenToggle(p => !p)}>{openToggle ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}</span>
            </div>
            
            {openToggle && 
                <div className="drill-list-container">
                    {fieldValue?.map((val, i) => 
                        <div className="drill-list-item" key={i}>
                            <div className="item-multi-edit-container">
                                <div className="item-edit-field sz-5">
                                    <span className="field-title">Title</span>
                                    <input type="text" name="title" value={val?.title} onChange={(e)=>{ handleTextChange(e, i)}} autoComplete="off" />
                                </div>
                                <div className="item-edit-field sz-2">
                                    <span className="field-title">Min</span>
                                    <input type="number" name="minimum" min="0" step="1" value={val?.minimum} onChange={(e)=>{ handleTextChange(e, i)}} autoComplete="off" />
                                </div>
                                <div className="item-edit-field sz-3">
                                    <span className="field-title">Price Per</span>
                                    <input type="number" name="price" min="0" step="0.01" value={val?.price} onChange={(e)=>{ handleTextChange(e, i)}} autoComplete="off" />
                                </div>
                            </div>

                            <button onClick={()=>{ deleteItem(i) }}>
                                <span className="material-symbols-outlined">delete</span>
                            </button>
                        </div>
                    )}
                    <button className="add-btn" onClick={addItem}>
                        <span className="icon material-symbols-outlined">add_circle</span>
                        <span className="add-title">Add Addon</span>
                    </button>
                </div>
            }
        </div>
    )
}

function StringDrillDownInput({ fieldKey, fieldValue, setItemValue }: StringDrillDownInputType){
    const [openToggle, setOpenToggle] = useState(false);

    const handleTextChange = (e: any, idx: number) => {
        try {
            let tmpFieldVal = _.cloneDeep(fieldValue);

            if(tmpFieldVal && idx < tmpFieldVal?.length){
                tmpFieldVal[idx] = e.target.value;
                setItemValue({ target: { name: fieldKey, value: tmpFieldVal }});
            }
        } catch(ex) {
            log.error(`Handing Text Change: ${ex}`);
        }
    }

    const deleteItem = (idx: number) => {
        try {
            let tmpFieldVal = _.cloneDeep(fieldValue);

            if(tmpFieldVal && idx < tmpFieldVal?.length){
                tmpFieldVal.splice(idx, 1); 
                setItemValue({ target: { name: fieldKey, value: tmpFieldVal }});
            }
        } catch(ex) {
            log.error(`Handing Text Change: ${ex}`);
        }
    }

    const addItem = () => {
        try {
            let tmpFieldVal = fieldValue ? _.cloneDeep(fieldValue) : [];
            tmpFieldVal.push('');

            setItemValue({ target: { name: fieldKey, value: tmpFieldVal }});
        } catch(ex) {
            log.error(`Handing Text Change: ${ex}`);
        }
    }

    return(
        <div className="str-drill-down-container">
            <div className="header-container">
                <div className="header-text">{fieldValue?.length} item(s)</div>
                <span className="icon material-symbols-outlined" onClick={()=> setOpenToggle(p => !p)}>{openToggle ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}</span>
            </div>
            
            {openToggle && 
                <div className="drill-list-container">
                    {fieldValue?.map((val, i) => 
                        <div className="drill-list-item" key={i}>
                            <div className="item-edit-container">
                                <span className="material-symbols-outlined">reorder</span>
                                <input type="text" name="value" value={val} onChange={(e)=>{ handleTextChange(e, i)}} autoComplete="off" />
                            </div>

                            <button onClick={()=>{ deleteItem(i) }}>
                                <span className="material-symbols-outlined">delete</span>
                            </button>
                        </div>
                    )}
                    <button className="add-btn" onClick={addItem}>
                        <span className="icon material-symbols-outlined">add_circle</span>
                        <span className="add-title">Add Item</span>
                    </button>
                </div>
            }
        </div>
    )
}

function MerchantDetailsInput({ fieldKey, fieldValue, setItemValue }: MerchantDetailsInputType){    
    const [activeFields, setActiveFields] = useState<{[key:string]: boolean}>({});
    const { loading, data }= useQuery(GET_STORE_CONFIG_QUERY);

    const addMissingConfig = (key?: string) => {
        if(key){
            const tmpList = [...(fieldValue ?? []), new LeagueStoreMerchantInfo(key)];

            setItemValue({ target: { name: fieldKey, value: tmpList }});
        }
    }

    const handleToggle = (idx: number) => { 
        const tmpevent = { target: { name: 'defaultLogo', value:!(fieldValue && fieldValue[idx]?.defaultLogo) }}

        handleTextChange(tmpevent, idx);
    }

    const handleTextChange = (e: any, idx: number) => {
        try {
            let tmpFieldVal = _.cloneDeep(fieldValue);

            if(tmpFieldVal && idx < tmpFieldVal?.length){
                const name: keyof LeagueStoreMerchantInfo = e.target.name;

                tmpFieldVal[idx][name] = e.target.value;
                setItemValue({ target: { name: fieldKey, value: tmpFieldVal }});
            }
        } catch(ex) {
            log.error(`Handing Text Change: ${ex}`);
        }
    }

    useEffect(()=>{
        const tmpDict:{[key:string]: boolean} = {};
        if(fieldValue && fieldValue?.length > 0){
            fieldValue.forEach((f) => {
                if(f.store_id) { 
                    tmpDict[f.store_id] = true;
                }
            });
        }

        setActiveFields(tmpDict);
    },[fieldValue]);
    
    return(
        <div className="merchant-details-input-container">
            {fieldValue?.map((field,i) => 
                <div className="config-container active" key={`active-${i}`}>
                    <div className="container-icon">
                        <span className="icon material-symbols-outlined">edit_note</span>
                    </div>
                    <div className="config-title">{field.store_id} Invoice</div>

                    <div className="input-field-container">
                        <div className="item-edit-field sz-6">
                            <span className="field-title">Title</span>
                            <input type="text" name="title" value={field?.title} onChange={(e)=>{ handleTextChange(e, i) }} autoComplete="off" />
                        </div>
                        <div className="item-edit-field sz-4">
                            <span className="field-title">Show Lee Lee Logo?</span>
                            <button className={`simple-toggle-switch ${(field && field.defaultLogo) ? 'active' : ''}`} onClick={(e)=>{ handleToggle(i) }}>
                                <span className='slider' />
                            </button>
                        </div>

                        <div className="item-edit-field sz-10">
                            <span className="field-title">Address Line</span>
                            <textarea name="subText" rows={3} value={field?.subText} onChange={(e)=>{ handleTextChange(e, i) }} autoComplete="off" />
                        </div>
                    </div>
                </div>
            )}

            {data?.storeConfigs?.map((config: LeagueStoreConfigType, i:number) =>
                <div className={`config-container missing ${config?.key && config.key in activeFields ? 'hidden' : ''}`} 
                    key={`missing-${i}`} onClick={()=> addMissingConfig(config.key)}>
                    <div className="container-icon">
                        <span className="icon material-symbols-outlined">add</span>
                    </div>
                    <div className="config-title">{config.key}</div>
                </div>
            )}
        </div>
    )
}

function StoreCategoryOptionSelect({ preSelectedSet, fieldKey, fieldValue, setItemValue }: StoreCategoryOptionSelectType){    
    const [openToggle, setOpenToggle] = useState(false);
    const [newValue, setNewValue] = useState("");
    const [disabledNew, setDisabledNew] = useState<string[]>([]);
    
    const valueIsSelected = (val: string) => {
        if(fieldValue){
            return fieldValue.some(element => {
                return element.toLowerCase() === val.toLowerCase();
            });
        }

        return false;
    }

    const valueInPreselect = (val: string) => {
        if(preSelectedSet){
            return preSelectedSet.some(element => { return element === val; });
        }

        return false;
    }

    const toggleSelect = (val: string, addToDisabled=false) => {
        let tmpFieldVal = fieldValue ? _.cloneDeep(fieldValue) : [];

        if(!valueIsSelected(val)){
            tmpFieldVal.push(val);
        } else {
            tmpFieldVal = tmpFieldVal.filter((fv) => { return fv != val; });

            if(!valueInPreselect(val) && addToDisabled){
                setDisabledNew((p:string[]) => {
                    let ret: string[] = [...p];

                    if(!ret.includes(val)){
                        ret.push(val);
                    }

                    return ret;
                });
            }
        }

        setItemValue({ target: { name: fieldKey, value: tmpFieldVal }});
    }

    const toggleDisabledSelect = (val:string) => {
        toggleSelect(val);

        setDisabledNew((p) => {
            return p.filter((v) => { return val != v; });
        });
    }

    const addNewOption = () => {
        if(newValue?.length > 0) {
            toggleSelect(_.cloneDeep(newValue));
            setNewValue('');
        }
    }

    return(
        <div className="str-drill-down-container select-list">
            <div className="header-container">
                <div className="header-text">{fieldValue?.length} item(s)</div>
                <span className="icon material-symbols-outlined" onClick={()=> setOpenToggle(p => !p)}>{openToggle ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}</span>
            </div>
            
            {openToggle && 
                <div className="select-list-container">
                    {/* FieldValue Data not in preSelectedSet */}
                    {fieldValue?.filter((fv) => { return !valueInPreselect(fv); }).map((set, i) => 
                        <div className={`select-list-item ${valueIsSelected(set) ? 'sel' : ''}`} key={`field-${i}`}>
                            <button className="check-bx" onClick={()=> { toggleSelect(set, true) }}/>
                            <span className="title">{set}</span>
                        </div>
                    )}

                    {/* Disabled New Set */}
                    {disabledNew?.map((set, i) => 
                        <div className={`select-list-item`} key={`disabled-set-${i}`}>
                            <button className="check-bx" onClick={()=> { toggleDisabledSelect(set) }}/>
                            <span className="title">{set}</span>
                        </div>
                    )}

                    {/* PreSelected Set */}
                    {preSelectedSet?.map((set, i) => 
                        <div className={`select-list-item ${valueIsSelected(set) ? 'sel' : ''}`} key={`pre-${i}`}>
                            <button className="check-bx" onClick={()=> { toggleSelect(set) }}/>
                            <span className="title">{set}</span>
                        </div>
                    )}

                    {/* Add New Input */}
                    <div className={`select-list-item`}>
                        <button className="icon-btn" disabled={newValue?.length <= 0} onClick={addNewOption}>
                            <span className="material-symbols-outlined">add_circle</span>
                        </button>
                        <input type="text" value={newValue} placeholder="Add New Option" onChange={(e)=>{ setNewValue(e.target.value) }} />
                    </div>
                </div>
            }
        </div>
    )
}

function StoreAddonOptionSelect({ preSelectedSet, fieldKey, fieldValue, setItemValue }: StoreAddonOptionSelect){    
    const [openToggle, setOpenToggle] = useState(false);
    const [newValue, setNewValue] = useState("");
    const [disabledNew, setDisabledNew] = useState<LeagueStoreAddon[]>([]);

    const valueIsSelected = (val: LeagueStoreAddon) => {
        if(fieldValue){
            return fieldValue.some(element => {
                return (element?.title && val?.title) && element.title.toLowerCase() === val.title.toLowerCase();
            });
        }

        return false;
    }

    const valueInPreselect = (val: LeagueStoreAddon) => {
        if(preSelectedSet){
            return preSelectedSet.some(element => {
                return (element?.title && val?.title) && element.title.toLowerCase() === val.title.toLowerCase();
            });
        }

        return false;
    }

    const toggleSelect = (val: LeagueStoreAddon, addToDisabled=false) => {
        let tmpFieldVal = fieldValue ? _.cloneDeep(fieldValue) : [];

        if(!valueIsSelected(val)){
            tmpFieldVal.push(val);
        } else {
            tmpFieldVal = tmpFieldVal.filter((fv) => { return fv?.title != val?.title; });

            if(!valueInPreselect(val) && addToDisabled){
                setDisabledNew((p:LeagueStoreAddon[]) => {
                    let ret: LeagueStoreAddon[] = [...p];

                    if(!ret.includes(val)){
                        ret.push(val);
                    }

                    return ret;
                });
            }
        }

        setItemValue({ target: { name: fieldKey, value: tmpFieldVal }});
    }

    const handleTextChange = (e: any, title?: string) => {
        try {
            let tmpFieldVal = _.cloneDeep(fieldValue);
            const idx = tmpFieldVal?.findIndex((item) => { return item.title == title; })

            if(tmpFieldVal && idx && idx < tmpFieldVal?.length){
                const name: keyof LeagueStoreAddon = e.target.name;

                tmpFieldVal[idx][name] = e.target.value;
                setItemValue({ target: { name: fieldKey, value: tmpFieldVal }});
            }
        } catch(ex) {
            log.error(`Handing Text Change: ${ex}`);
        }
    }

    const addNewOption = () => {
        if(newValue?.length > 0) {
            toggleSelect({ title: _.cloneDeep(newValue) });
            setNewValue('');
        }
    }

    return(
        <div className="str-drill-down-container select-list">
            <div className="header-container">
                <div className="header-text">{fieldValue?.length} addon(s)</div>
                <span className="icon material-symbols-outlined" onClick={()=> setOpenToggle(p => !p)}>{openToggle ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}</span>
            </div>

            {openToggle && 
                <div className="select-list-container">
                    {/* FieldValue Data not in preSelectedSet */}
                    {fieldValue?.filter((fv) => { return !valueInPreselect(fv); }).map((set, i) => 
                        <div className={`select-list-item ${valueIsSelected(set) ? 'sel' : ''}`} key={`field-${i}`}>
                            <button className="check-bx" onClick={()=> { toggleSelect(set, true) }}/>
                            
                            <div className="select-list-edit-container">
                                <div className="item-edit-field sz-4">
                                    <span className="input-title">{set?.title}</span>
                                </div>
                                <div className="item-edit-field sz-2">
                                    <span className="field-title">Min</span>
                                    <input type="number" name="minimum" min="0" step="1" value={set?.minimum} onChange={(e)=>{ handleTextChange(e, set?.title) }} autoComplete="off" />
                                </div>
                                <div className="item-edit-field sz-4">
                                    <span className="field-title">Price Per</span>
                                    <input type="number" name="price" min="0" step="0.01" value={set?.price} onChange={(e)=>{ handleTextChange(e, set?.title) }} autoComplete="off" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Disabled New Set */}
                    {disabledNew?.map((set, i) => 
                        <div className={`select-list-item`} key={`field-${i}`}>
                            <button className="check-bx" onClick={()=> { }}/>
                            
                            <div className="select-list-edit-container">
                                <div className="item-edit-field sz-4">
                                    <span className="input-title">{set?.title}</span>
                                </div>
                                <div className="item-edit-field sz-2">
                                    <span className="field-title">Min</span>
                                    <input type="number" name="minimum" min="0" step="1" value={set?.minimum} disabled autoComplete="off" />
                                </div>
                                <div className="item-edit-field sz-4">
                                    <span className="field-title">Price Per</span>
                                    <input type="number" name="price" min="0" step="0.01" value={set?.price} disabled autoComplete="off" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PreSelected Set */}
                    {preSelectedSet?.map((set, i) => 
                        <div className={`select-list-item ${valueIsSelected(set) ? 'sel' : ''}`} key={`pre-${i}`}>
                            <button className="check-bx" onClick={()=> { toggleSelect(set) }}/>
                            
                            <div className="select-list-edit-container">
                                <div className="item-edit-field sz-4">
                                    <span className="input-title">{set?.title}</span>
                                </div>
                                <div className="item-edit-field sz-2">
                                    <span className="field-title">Min</span>
                                    <input type="number" name="minimum" min="0" step="1" value={set?.minimum} onChange={(e)=>{ handleTextChange(e, set?.title) }} autoComplete="off" />
                                </div>
                                <div className="item-edit-field sz-4">
                                    <span className="field-title">Price Per</span>
                                    <input type="number" name="price" min="0" step="0.01" value={set?.price} onChange={(e)=>{ handleTextChange(e, set?.title) }} autoComplete="off" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Add New Input */}
                    <div className={`select-list-item`}>
                        <button className="icon-btn" disabled={newValue?.length <= 0} onClick={addNewOption}>
                            <span className="material-symbols-outlined">add_circle</span>
                        </button>
                        <input type="text" value={newValue} placeholder="Add New Option" onChange={(e)=>{ setNewValue(e.target.value) }} />
                    </div>
                </div>
            }
        </div>
    );
}

function LeagueStoreItemDetails({ fieldKey, fieldValue, setItemValue }: LeagueStoreItemDetails){    
    const [selectedSport, setSelectedSport] = useState<LeagueSportType | undefined>(undefined);
    const [toggleDateSelector, setToggleDateSelector] = useState(false);

    const dataToggleBtnRef = useRef<HTMLDivElement>(null);
    const dateSelectorRef = useRef<HTMLDivElement>(null);
    
    const { loading:sports_loading, data: sports_data }= useQuery(GET_SPORTS_QUERY, {fetchPolicy: 'no-cache' });
    // const { loading: league_loading, data: league_data }= useQuery(GET_LEAGUE_QUERY, { fetchPolicy: 'no-cache' });

    const displayCustomDropdown = (value: string, option: any) => {
        return <div className="select-icon">
                    <span className="icon material-symbols-outlined">{option?.icon ?? 'circle'}</span>
                    <span className="icon-text">{option?.title ?? 'Inactive Title'}</span>
                </div>;
    }

     const toggleSelect = (selection: any, add: boolean) => {
        setItemValue({ target: { name: fieldKey, value: (add && selection?._id) ? selection._id : null }});
    }

    // Date Range Toggle
    const handleOutsideClick = (event: any) => {
        if (
            (dataToggleBtnRef.current && !dataToggleBtnRef.current.contains(event.target)) &&
            (dateSelectorRef.current && !dateSelectorRef.current.contains(event.target))
        ) {
            setToggleDateSelector(false);
        }
    };

    useEffect(()=>{
        if(fieldValue?.sport_id && fieldValue.sport_id.length > 0){
            let filterSport = sports_data?.sports.filter((s: LeagueSportType) => s._id === fieldValue?.sport_id)
            const tmpSelSport = filterSport?.length > 0 ? filterSport[0] : { "_id": fieldValue?.sport_id };

            setSelectedSport(tmpSelSport);
        }
    },[fieldValue]);

    useEffect(() => {
        document.addEventListener("click", handleOutsideClick, false);
        return () => {
            document.removeEventListener("click", handleOutsideClick, false);
        };
    }, []);

    return(
        <div className="store-item-details-container">
            {/* Sport Select */}
            {sports_loading ? <>Loading...</> :
                <Multiselect
                    displayValue="_id"
                    isObject={true}
                    closeOnSelect
                    className="store-item-details-dropdown"
                    singleSelect
                    options={sports_data?.sports ?? []}
                    selectedValues={(selectedSport != undefined ? [selectedSport] : [])}
                    placeholder={`Select League Sport`}
                    onSelect={(_: any, selectedItem: any) => toggleSelect(selectedItem, true)}
                    onRemove={(_: any, selectedItem: any) => toggleSelect(selectedItem, false)}
                    optionValueDecorator={displayCustomDropdown}
                    selectedValueDecorator={displayCustomDropdown}
                    style={{
                        chips: {
                            backgroundColor: 'rgba(186,142,35,1)',
                            fontSize: '10px',
                        },
                        searchBox:{
                            borderWidth:'2px', borderColor: 'rgba(170,170,170,1)',
                            borderRadius: '8px'
                        }
                    }}
                />
            }

            {/* Date Range Select */}
            <div className="date-range-container">
                <div className="range-btn" ref={dataToggleBtnRef} onClick={()=>{ setToggleDateSelector((p) => !p) }}>
                    {!(fieldValue?.start_dt) ?
                        <div className="date-container"><span>No Dates Selected</span></div> :
                        <div className="date-container">
                            <span>{formatDate(fieldValue.start_dt, 'MMM dd, yyyy')}</span>
                            <span>-</span>
                            {fieldValue?.end_dt ?
                                <span>{formatDate(fieldValue.end_dt, 'MMM dd, yyyy')}</span> :
                                <span>No Set</span>
                            }
                        </div>
                    }
                </div>

                {(toggleDateSelector) &&
                    <div className="range-selector-container" ref={dateSelectorRef}></div>
                }
            </div>

            {/* Location Select*/}
        </div>
    );
}

export default function TableManagementModalRow<P>({ storeConfig, field, item, setItem }:TableManagementModalRowType<P>){
    let dynamicValue = (item && item[field.key] ? item[field.key] as string : '');
    let dynamicKey = field.key as string;

    const [iconList, setIconList] = useState<string[]>([]);

    // GQL Queries
    const [searchGIcons,{ loading: icon_search_loading, data: icon_search_data }] = useLazyQuery(GET_ICONS_QUERY);
        
    const setItemDetails = (e:any) => {
        try {
            const update_key = e.target.name,
                update_value = e.target.value;

            setItem((p: any) => {
                let ret = { ...p, [update_key]: update_value };
                return ret;
            });
        } catch(ex){
            log.error(`Setting User Field Details: ${ex}`);
        }
    }

    const generateText = () => {
        let tmpText: string[] = [];
        try {
            if(field?.conditional_fields){
                for(let i=0; i < field?.conditional_fields?.length; i++){
                    const tmpField = field.conditional_fields[i];
                    const tmpItemField = item ? String(item[tmpField]) : null;

                    if(tmpItemField && tmpItemField?.length > 0){
                        tmpText.push(tmpItemField);
                    }
                }
            }
        } catch(ex) {
            log.error(`Generating Text: ${ex}`);
        }

        return (tmpText?.length == 0 ? '' : tmpText.join(' '));
    }

    const toggleValue = () => {
        const toggleValue = item && !!item[field.key] ? false: true;
        setItemDetails({ target: { name: field.key, value: toggleValue }});
    }

    const toggleSelect = (selection: any, add: boolean) => {
        setItemDetails({ target: { name: field.key, value: add ? selection : null }});
    }

    const displayCustomDropdown = (value: string) => {
        return <div className="select-icon">
                    <span className="icon material-symbols-outlined">{value}</span>
                    <span className="icon-text">{value}</span>
                </div>;
    }

    useEffect(()=>{
        if(field?.type === 'g_icon_select') {
            searchGIcons({ variables: { query: '' }});
        }
    },[field]);

    useEffect(()=>{
        if(!icon_search_loading && icon_search_data?.googleIcons) {
            const tmpList = icon_search_data?.googleIcons
                .map((gi: GoogleIcons) => gi.name);
            setIconList(tmpList);
        }
    },[icon_search_loading, icon_search_data])

    return(
        <div className='field-item-row'>
            <div className={`field-title ${field?.title_vert_set ? 'top' : ''}`}>
                <span className="field-icon material-symbols-outlined">{field.icon ?? 'radio_button_unchecked'}</span>
                <span className='field-title-text'>{field.title}</span>
            </div>
            <div className={`field-content ${field?.overflow_field_content ? 'open' :''}`}>
                {/* Email String */}
                {(field.type === 'email') &&
                    <input className='text-input' type="email" name={dynamicKey} placeholder={`Enter ${field.title}`} value={dynamicValue} onChange={setItemDetails} />
                }

                {/* Text String */}
                {(field.type === 'text') &&
                    <input className='text-input' type="text" name={dynamicKey} placeholder={`Enter ${field.title}`} value={dynamicValue} onChange={setItemDetails} />
                }

                {/* Number String */}
                {(field.type === 'number') &&
                    <input className='text-input' type="number" name={dynamicKey} min="0" step="1" placeholder={`Enter ${field.title}`} value={dynamicValue} onChange={setItemDetails} />
                }

                {/* Dollar String */}
                {(field.type === 'dollar') &&
                    <input className='text-input' type="number" name={dynamicKey} min="0" step="0.01" placeholder={`Enter ${field.title}`} value={dynamicValue} onChange={setItemDetails} />
                }

                {/* Description String */}
                {(field.type === 'description') &&
                    <textarea className='textarea-input' rows={3} name={dynamicKey} placeholder={`Enter ${field.title}`} value={dynamicValue} onChange={setItemDetails} />
                }

                {/* Generated Text String */}
                {(field.type === 'generated_text') &&
                    <div className='view-text'>
                        {!(generateText().length > 0) ?
                            <span className='unset-text'>Field Not Set</span> :
                            <span className='valid-text'>{generateText()}</span>
                        }
                    </div>
                }

                {/* View Only Text String */}
                {(field.type === 'view_only_text') &&
                    <div className='view-text'>
                        {!(item && item[field.key]) ?
                            <span className='unset-text'>Field Not Set</span> :
                            <span className='valid-text'>{String(item[field.key])}</span>
                        }
                    </div>
                }

                {/* View Only Date String */}
                {(field.type === 'view_only_date') &&
                    <div className='view-text'>
                        {!(item && item[field.key]) ?
                            <span className='unset-text'>Date Not Set</span> :
                            <span className='valid-text'>{formatDate(new Date(String(item[field.key])),'MM/dd/yyyy HH:mm:ss')}</span>
                        }
                    </div>
                }

                {/* Toggle */}
                {(field.type === 'toggle') &&
                    <button className={`simple-toggle-switch ${(item && item[field.key]) ? 'active' : ''}`} onClick={toggleValue}>
                        <span className='slider' />
                    </button>
                }

                {(field.type === 'g_icon_select') &&
                    <Multiselect
                        isObject={false}
                        closeOnSelect
                        className="icon-select-dropdown"
                        selectionLimit={1}
                        options={iconList ?? []}
                        selectedValues={((item && item[field.key]) ? [item[field.key]] : [])}
                        placeholder={`Select ${field.title}`}
                        onSelect={(_: any, selectedItem: any) => toggleSelect(selectedItem, true)}
                        onRemove={(_: any, selectedItem: any) => toggleSelect(selectedItem, false)}
                        optionValueDecorator={displayCustomDropdown}
                        selectedValueDecorator={displayCustomDropdown}
                        style={{
                            chips: {
                                backgroundColor: 'rgba(186,142,35,1)',
                                fontSize: '10px',
                            },
                            searchBox:{
                                borderWidth:'2px', borderColor: 'rgba(170,170,170,1)',
                                borderRadius: '8px'
                            }
                        }}
                    />
                }

                {/* String Drill Down List */}
                {(field.type === 'string_drill_down_list') &&
                    <StringDrillDownInput setItemValue={setItemDetails} fieldKey={dynamicKey} 
                        fieldValue={((item && item[field.key]) ? item[field.key] as string[] : [])}  
                    />
                }

                {/* String Drill Down List */}
                {(field.type === 'addon_drill_down_list') &&
                    <AddOnDrillDownInput setItemValue={setItemDetails} fieldKey={dynamicKey} 
                        fieldValue={((item && item[field.key]) ? item[field.key] as LeagueStoreAddon[] : [])}  
                    />
                }

                {/* Merchant Detail Selector */}
                {(field.type === 'merchant_details') &&
                    <MerchantDetailsInput setItemValue={setItemDetails} fieldKey={dynamicKey} 
                        fieldValue={((item && item[field.key]) ? item[field.key] as LeagueStoreMerchantInfo[] : [])}
                    />
                }

                {/* Category List Options Selector */}
                {(field.type === 'category_list_options') &&
                    <StoreCategoryOptionSelect setItemValue={setItemDetails} fieldKey={dynamicKey} 
                        fieldValue={((item && item[field.key]) ? item[field.key] as string[] : [])}
                        preSelectedSet={(storeConfig && storeConfig?.length > 0 ? storeConfig[0]?.categorySet : [])}
                    />
                }

                {/* AddOn List Options Selector */}
                {(field.type === 'addons_list_options') &&
                    <StoreAddonOptionSelect setItemValue={setItemDetails} fieldKey={dynamicKey} 
                        fieldValue={((item && item[field.key]) ? item[field.key] as LeagueStoreAddon[] : [])}
                        preSelectedSet={(storeConfig && storeConfig?.length > 0 ? storeConfig[0]?.addons : [])}
                    />
                }

                {/* Store Item Details - League */}
                {(field.type === 'league_store_item_details') &&
                    <LeagueStoreItemDetails setItemValue={setItemDetails} fieldKey={dynamicKey} 
                        fieldValue={((item && item[field.key]) ? item[field.key] as StoreItemDetails : undefined)}
                    />
                }
            </div>
        </div>
    );
}