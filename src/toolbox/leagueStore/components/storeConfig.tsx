import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { gql, useQuery, useMutation } from '@apollo/client';
import Rodal from "rodal";
import * as _ from 'lodash';
import { toast } from "react-toastify";

import { LeagueStoreConfigType, LeagueStoreUIConfigType } from "../../../datatypes/customDT";
import { log } from "../../../utils/log";

import leagueStoreLeaguesImg from '../../../assets/leagueStore/league_back.png';
import leagueStoreApparelImg from '../../../assets/leagueStore/apparel_back.png';
import { adminSideModalStyle, hasDuplicatesByKey } from "../../../utils/_customUtils";
import TableManagementModalRow, { TableManagementDetailsConfigType } from "./tableManagementRow";
import { handleGQLError } from "../../../utils";

// GQL
const GET_STORE_CONFIG_QUERY = gql`
query GetStoreConfig($key: String){
    storeConfigs(key: $key){
      _id
      minimum
      category
      categorySet
      addons {
        id
        title
        price
        minimum
      }
    }
}`,
UPSERT_CONFIG_MUTATION = gql`
mutation UpdateStoreConfig($id:String!, $minimum: Int, $category: String, $categorySet: [String], $addons: [JSONObj]){
    updateLeagueStoreConfig(id: $id, minimum: $minimum, category: $category, categorySet: $categorySet, addons: $addons)
}`;

// Types
type StoreConfigEditorType = {
    storeKey: string,
    selConfig?: LeagueStoreConfigType,
    setSelectedConfig: Dispatch<SetStateAction<LeagueStoreConfigType | undefined>>,
}

type StoreConfigEditorModal = {
    storeKey: string,
    selConfig?: LeagueStoreConfigType,
    modalStatus: boolean,
    setModalStatus: Dispatch<SetStateAction<boolean>>,
    setSelectedConfig: Dispatch<SetStateAction<LeagueStoreConfigType | undefined>>,
}

const leagueStoreUIConfig: LeagueStoreUIConfigType = {
    "leagues":{
        title:"Leagues Store",
        logo: leagueStoreLeaguesImg
    },
    "apparel":{
        title:"Apparel Store",
        logo: leagueStoreApparelImg
    }
}

function StoreConfigEditorModal({ storeKey, modalStatus, setModalStatus, selConfig, setSelectedConfig }: StoreConfigEditorModal){
    const [editStoreConfig, setEditStoreConfig] = useState<LeagueStoreConfigType|undefined>();
    const [inProgress, setInProgress] = useState(false);
    
    const detailsConfig: { [key: string]: TableManagementDetailsConfigType<LeagueStoreConfigType>} = {
        "leagues":{
            fields:[
                { icon:'counter_1', title: 'Purchased League Minimum', key:'minimum', type: 'number', net_new_active: false },
                { icon:'type_specimen', title: 'League Type', key:'category', type: 'text', net_new_active: false },
                { icon:'format_list_bulleted_add', title: 'League Type Options', key:'categorySet', type: 'string_drill_down_list', net_new_active: false, title_vert_set: true },
                { icon:'list', title: 'League Addons', key:'addons', type: 'addon_drill_down_list', net_new_active: false, title_vert_set: true },
            ]
        },
        "apparel":{
            fields:[
                { icon:'counter_1', title: 'Cart Purchased Minimum', key:'minimum', type: 'number', net_new_active: false },
                { icon:'type_specimen', title: 'Item Dimensions', key:'category', type: 'text', net_new_active: false },
                { icon:'format_list_bulleted_add', title: 'Item Dimensions Dimensions Options', key:'categorySet', type: 'string_drill_down_list', net_new_active: false, title_vert_set: true },
            ]
        }
    }

    const [upsertConfig,{ loading: upsert_loading, data: upsert_data, error: upsert_error }] = useMutation(UPSERT_CONFIG_MUTATION, {fetchPolicy: 'no-cache', onError: handleGQLError});

    const closeModal = () => {
        setModalStatus(false); 
        setSelectedConfig(undefined);
    }

    const validateConfig = () => {
        let ret = [];
        try {
            if(!editStoreConfig?.category){
                ret.push('Add Category');
            }

            if(!editStoreConfig?.minimum|| editStoreConfig?.minimum <= 0){
                ret.push('Add Store Minimum');
            }

            if(editStoreConfig?.addons){
                if(hasDuplicatesByKey(editStoreConfig.addons, 'title')){
                    ret.push('Duplication Addons');
                }
                
                const emptyPrices = editStoreConfig.addons.filter((a) => !a.price || !(a.price >= 0))
                if(emptyPrices?.length > 0) {
                    ret.push('Check Addon Prices');
                }
            }


        } catch(ex){
            log.error(`Validating Config: ${ex}`);
            ret.push('[EC 001]');
        }

        return ret;
    }

    const saveConfig = () => {
        // Validate Data
        const validations = validateConfig();
        if(validations?.length > 0){
            toast.warning(`Please Check the following: ${validations?.join(', ')}`, { position: "top-right",
                autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                draggable: true, progress: undefined, theme: "light" });
        } else {
            upsertConfig({ variables:{
                id: editStoreConfig?._id,
                minimum: editStoreConfig?.minimum ? Number(editStoreConfig?.minimum): undefined,
                category: editStoreConfig?.category,
                categorySet: editStoreConfig?.categorySet,
                addons: editStoreConfig?.addons
            }});
        }
    }

     useEffect(()=>{ 
        if(selConfig){
            setModalStatus(true);
            setEditStoreConfig(_.cloneDeep(selConfig));
        }
    },[selConfig]);

    useEffect(()=>{
        try {
            const areEqual = _.isEqual(selConfig, editStoreConfig);
            setInProgress(!areEqual);
        } catch(ex){
            log.error(`Checking Edit Progress: ${ex}`);
        }
    }, [editStoreConfig]);

    useEffect(()=>{ 
        if(!upsert_loading ){
            if(upsert_error){
                const errorMsg = JSON.stringify(upsert_error, null, 2);
                console.log(errorMsg);

                toast.error(`Error Updating This Config: ${upsert_error.message}`, { position: "top-right",
                    autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                    draggable: true, progress: undefined, theme: "light" });
            } else if(upsert_data?.updateLeagueStoreConfig){
                closeModal();
                toast.success(`Updating Your Config`, { position: "top-right",
                    autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                    draggable: true, progress: undefined, theme: "light" });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[upsert_loading, upsert_data, upsert_error]);

    return(
        <Rodal className="user-management-editor-modal" 
            customStyles={adminSideModalStyle} visible={modalStatus} 
            onClose={closeModal} animation={'slideRight'}
        >
            <div className='user-management-editor-container'>
                <div className='header-row'>
                    <span>Manage Store Config</span>
                </div>

                <div className='title-row'>
                    <h1>{`${leagueStoreUIConfig[storeKey]?.title} Store`}</h1>
                    {inProgress && 
                        <div className='edit-in-progress'>
                            <span className="icon material-symbols-outlined">edit_square</span>
                            <span>Edit In Progress</span>
                        </div>
                    }
                </div>

                <div className='field-list-container'>
                    {(storeKey in detailsConfig) && detailsConfig[storeKey].fields?.map((field, i) => {
                        return(
                            <TableManagementModalRow<LeagueStoreConfigType> key={i} field={field} item={editStoreConfig} setItem={setEditStoreConfig} />
                        );
                    })}
                </div>

                <div className='editor-actions-container'>
                    <div className='button-list'>
                        <button className='list-btn save' disabled={upsert_loading || !inProgress} onClick={saveConfig}>
                            {upsert_loading ? 
                                <div className='btn-icon loader'>
                                    <l-spiral size="14" speed="0.9" color="#fff" />
                                </div> :
                                <span className="btn-icon material-symbols-outlined">save</span>
                            }
                            <span className='btn-text'>Save</span>
                        </button>

                    </div>
                </div>
            </div>
        </Rodal>
    );
}

// Store Config Editor Tool
export default function StoreConfigEditor({ storeKey, selConfig, setSelectedConfig }: StoreConfigEditorType){
    const [modalStatus, setModalStatus] = useState(false);

    const { loading, data, refetch }= useQuery(GET_STORE_CONFIG_QUERY, { variables:{ key: storeKey }, fetchPolicy: 'no-cache' });

    const pageRender = useRef(false);   

    const toggleConfig = () => {
        try {
            if(data?.storeConfigs?.length > 0) {
                setSelectedConfig(data.storeConfigs[0]);
            }            
        } catch(ex){
            log.error(`Toggling Config: ${ex}`);
        }
    }

    useEffect(()=>{ 
       if(!modalStatus && pageRender?.current) {
           refetch();
       }
       pageRender.current = true;
    },[modalStatus]);

    return (
        <>
            <div className="league-store-container-cell">
                <div className="back-img">
                    <img src={leagueStoreUIConfig[storeKey]?.logo ?? ''} alt={`${storeKey} - League Store`} />
                </div>
                <div className="title-container">
                    <h2>{leagueStoreUIConfig[storeKey]?.title ?? '... Config'}</h2>
                    <button onClick={toggleConfig}>
                        <span className="material-symbols-outlined">more_horiz</span>
                    </button>
                </div>

                <div className="content-container">
                    <div className="content-description">
                        { storeKey === 'leagues' && <div>Easily modify store <span>categories</span>, update <span>minimum player counts</span>, and manage your league's core <span>addons</span> in real-time.</div> }
                        { storeKey === 'apparel' && <div>Simplify your gear logistics. Quickly update item <span>minimums</span>, toggle <span>size</span> availability, and organize apparel categories</div>}
                    </div>
                </div>
            </div>

            <StoreConfigEditorModal storeKey={storeKey} selConfig={selConfig} setSelectedConfig={setSelectedConfig} modalStatus={modalStatus} setModalStatus={setModalStatus} />
        </>
    );
}
