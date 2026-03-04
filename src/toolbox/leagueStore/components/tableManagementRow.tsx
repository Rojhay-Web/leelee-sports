import { Dispatch, SetStateAction, useEffect, useState } from "react";
import Multiselect from "multiselect-react-dropdown";
import { gql, useLazyQuery } from '@apollo/client';

import { log } from "../../../utils/log";
import { formatDate } from "../../../utils";
import { GoogleIcons } from "../../../datatypes/customDT";

// GQL
const GET_ICONS_QUERY = gql`
query GetGoogleIcons($query: String){
	googleIcons(query: $query){
      name
    }
}`;

export type TableManagementDetailsFieldsType<P> = { 
    icon?: string;
    title: string;
    key: keyof P;
    type: string;
    net_new_active?:boolean;
    conditional_fields?:(keyof P)[];
}

export type TableManagementModalRowType<P> = { 
    field: TableManagementDetailsFieldsType<P>,
    item?: P,
    setItem: Dispatch<SetStateAction<P | undefined>>
};

export type TableManagementDetailsConfigType<P> = {
    fields: TableManagementDetailsFieldsType<P>[];
}

export default function TableManagementModalRow<P>({ field, item, setItem }:TableManagementModalRowType<P>){
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
            <div className='field-title'>
                <span className="field-icon material-symbols-outlined">{field.icon ?? 'radio_button_unchecked'}</span>
                <span className='field-title-text'>{field.title}</span>
            </div>
            <div className='field-content'>
                {/* Email String */}
                {(field.type === 'email') &&
                    <input className='text-input' type="email" name={dynamicKey} placeholder={`Enter ${field.title}`} value={dynamicValue} onChange={setItemDetails} />
                }

                {/* Text String */}
                {(field.type === 'text') &&
                    <input className='text-input' type="text" name={dynamicKey} placeholder={`Enter ${field.title}`} value={dynamicValue} onChange={setItemDetails} />
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
            </div>
        </div>
    );
}