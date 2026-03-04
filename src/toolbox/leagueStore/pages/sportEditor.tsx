import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { gql, useQuery, useMutation } from '@apollo/client';
import Rodal from "rodal";
import parse from 'html-react-parser';
import * as _ from 'lodash';
import { toast } from "react-toastify";

import { handleGQLError } from "../../../utils";
import { adminSideModalStyle } from "../../../utils/_customUtils";

// GQL
const GET_SPORTS_QUERY = gql`
query GetLeagueSports{
	sports{
      _id
      title
      icon
      description
      active
    }
}`,
UPSERT_SPORT_MUTATION = gql`
mutation upsertSport($id: String, $title: String, $icon: String, $description: String, $active: Boolean){
    upsertSport(id: $id, title: $title, icon: $icon, description: $description, active: $active)
}`;

// Types
import { LeagueSportType } from "../../../datatypes/customDT";
import { log } from "../../../utils/log";
import TableManagementModalRow, { TableManagementDetailsConfigType } from "../components/tableManagementRow";
type SportEditorModalType = {
    selectedSport?: LeagueSportType,
    modalStatus: boolean,
    setModalStatus: Dispatch<SetStateAction<boolean>>,
    setSelectedSport: Dispatch<SetStateAction<LeagueSportType | undefined>>,
}

// Sports Editor Modal
function SportEditorModal({ selectedSport, modalStatus, setModalStatus, setSelectedSport }: SportEditorModalType){
    const [editSport, setEditSport] = useState<LeagueSportType|undefined>();
    const [inProgress, setInProgress] = useState(false);

    const detailsConfig: TableManagementDetailsConfigType<LeagueSportType> = {
        fields:[
            { icon:'title', title: 'Sport Title', key:'title', type: 'text', net_new_active: false },
            { icon:'circle', title: 'Sport Icon', key:'icon', type: 'g_icon_select', net_new_active: false },
            { icon:'description', title: 'Description', key:'description', type: 'description', net_new_active: false },
            { icon:'toggle_on', title: 'Active Status', key:'active', type: 'toggle', net_new_active: false },
        ]
    }

    const [upsertSport,{ loading: upsert_loading, data: upsert_data, error: upsert_error }] = useMutation(UPSERT_SPORT_MUTATION, {fetchPolicy: 'no-cache', onError: handleGQLError});
        
    const closeModal = () => {
        setModalStatus(false); 
        setSelectedSport(undefined);
    }

    const saveSport = () => {
        try {
            if(!editSport?.title){
                toast.warning(`Check Title is set for this sport before ${(editSport?._id ? 'Updating' : 'Creating')}`, { position: "top-right",
                    autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                    draggable: true, progress: undefined, theme: "light" });
            } else {
                upsertSport({
                    variables:{
                        id: editSport?._id ?? undefined,
                        title: editSport?.title,
                        description: editSport?.description,
                        icon: editSport?.icon,
                        active: editSport?.active,
                    }
                });
            }
        } catch(ex){
            log.error(`Saving Sport: ${ex}`);
        }
    }

    const deleteSport = () => {
        if(editSport?._id && window.confirm("Are you sure you want to delete this sport?")){
            // removeSport({variables: {_id: editUser._id}});
        }
    }

    useEffect(()=>{ 
        if(selectedSport){
            setModalStatus(true);
            setEditSport(_.cloneDeep(selectedSport));
        }
    },[selectedSport]);

    useEffect(()=>{
        try {
            const areEqual = _.isEqual(selectedSport, editSport);
            setInProgress(!areEqual);
        } catch(ex){
            log.error(`Checking Edit Progress: ${ex}`);
        }
    }, [editSport]);

    useEffect(()=>{ 
        if(!upsert_loading ){
            if(upsert_error){
                // const errorMsg = JSON.stringify(upsert_error, null, 2);

                toast.error(`Error ${(editSport?._id ? 'Updating' : 'Creating')} This Sport: ${upsert_error.message}`, { position: "top-right",
                    autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                    draggable: true, progress: undefined, theme: "light" });
            } else if(upsert_data?.upsertSport){
                closeModal();
                toast.success(`${(editSport?._id ? 'Updated This' : 'Created New')} Sport`, { position: "top-right",
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
                    <span>Manage League Sport</span>
                </div>

                <div className='title-row'>
                    <h1>{(editSport?._id ? 'Update League Sport Info' : 'Create New League Sport')}</h1>
                    {inProgress && 
                        <div className='edit-in-progress'>
                            <span className="icon material-symbols-outlined">edit_square</span>
                            <span>Edit In Progress</span>
                        </div>
                    }
                </div>

                <div className='field-list-container'>
                    {/* Dynamic list based on detailsConfig.fields list */}
                    {detailsConfig.fields?.map((field, i) => {
                        return(
                            <TableManagementModalRow<LeagueSportType> key={i} field={field} item={editSport} setItem={setEditSport} />
                        );
                    })}
                </div>

                <div className='editor-actions-container'>
                    <div className='button-list'>
                        <button className='list-btn save' disabled={upsert_loading || !inProgress} onClick={saveSport}>
                            {upsert_loading ? 
                                <div className='btn-icon loader'>
                                    <l-spiral size="14" speed="0.9" color="#fff" />
                                </div> :
                                <span className="btn-icon material-symbols-outlined">save</span>
                            }
                            <span className='btn-text'>Save</span>
                        </button>

                        {(editSport?._id !== undefined ) &&
                            <button className='list-btn delete' onClick={deleteSport}>
                                <span className="btn-icon material-symbols-outlined">delete_forever</span>
                                <span className='btn-text'>Delete Sport</span>
                            </button>
                        }
                    </div>
                </div>
            </div>
        </Rodal>
    );
}

// Sports Editor Tool
export default function SportEditor(){
    const [selSport, setSelSport] = useState<LeagueSportType | undefined>(undefined);
    const [modalStatus, setModalStatus] = useState(false);

    const { loading, data, refetch }= useQuery(GET_SPORTS_QUERY, {fetchPolicy: 'no-cache' });

    const pageRender = useRef(false);
    
    useEffect(()=>{ 
       if(!modalStatus && pageRender?.current) {
           refetch();
       }
       pageRender.current = true;
    },[modalStatus]);

    return (
        <>
            <div className="admin-component league-store-component sport-editor">
                <div className="table-ctrl-container">
                    <div className="ctrl-actions">
                        <button className='table-action-btn' onClick={()=>{ setSelSport(new LeagueSportType()) }}>
                            <span className="material-symbols-outlined">add_circle</span>
                            <span className="btn-title">Add League Sport</span>
                        </button>
                    </div>
                </div>

                {/* Sports Tiles */}
                <div className="ls-editor-tile-container">
                    {loading ?
                        <>Loading...</> :
                        <>
                            {data?.sports.map((sport: LeagueSportType, i: number) => 
                                <div className={`sport-tile ${sport?.active ? '' : 'inactive'}`} key={i} onClick={()=>{ setSelSport(sport)}}>
                                    <div className="edit-icon">
                                        <span className="material-symbols-outlined">edit_note</span>
                                    </div>
                                    <h2>
                                        <span className="sport-icon material-symbols-outlined">{(sport?.icon ?? 'orbit')}</span>
                                        <span className="sport-title">{sport?.title ?? 'No title..'}</span>
                                    </h2>
                                    <div className="active-status-container">
                                        <span className={`bullet ${sport?.active ? 'active' : ''}`} />
                                        <span className="active-txt">{sport?.active ? 'Active' : 'In-active'}</span>
                                    </div>
                                    <div className="sport-description">
                                        {(!!sport?.description ? parse(sport?.description) : '.. No Description')}
                                    </div>
                                </div>
                            )}
                        </>
                    }
                </div>
            </div>

            <SportEditorModal selectedSport={selSport} setSelectedSport={setSelSport} modalStatus={modalStatus} setModalStatus={setModalStatus} />
        </>
    );
}
