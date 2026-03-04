import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { gql, useQuery, useMutation } from '@apollo/client';
import Rodal from "rodal";
import parse from 'html-react-parser';
import * as _ from 'lodash';

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

    const closeModal = () => {
        setModalStatus(false); 
        setSelectedSport(undefined);
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
            </div>
        </Rodal>
    );
}

// Sports Editor Tool
export default function SportEditor(){
    const [selSport, setSelSport] = useState<LeagueSportType | undefined>(undefined);
    const [modalStatus, setModalStatus] = useState(false);

    const { loading, data, refetch }= useQuery(GET_SPORTS_QUERY, {fetchPolicy: 'no-cache', onError: handleGQLError});

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
                            {data.sports.map((sport: LeagueSportType, i: number) => 
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
