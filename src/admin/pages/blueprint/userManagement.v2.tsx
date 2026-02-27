import { useEffect, useState } from "react";

import * as _ from 'lodash';

import UserManagementTable, { UserDetailsCell, UserRegDateCell, UserRegTypeCell, UserRoleCell, UserRoleCheckCell, UserScopesCell } from "../../components/blueprint/userManagementTable";

import { User, UserManagementTableTab } from "../../../datatypes";

import { log } from "../../../utils/log";
import { DEBOUNCE_TIME } from "../../../utils";

// Table Tab Configs
const tableTabs: UserManagementTableTab[] = [
    { 
        id: 0,
        title: 'All Users', 
        roleFilter: null, 
        initialState:{
            columnPinning:{
                left: ["userDetails"]
            }
        },
        columns:[
            { 
                id:"given_name",
                header: 'User', accessorKey: 'userDetails', 
                cell: ({ row }) => { 
                    return <UserDetailsCell user={row.original} />
                }
            },
            { 
                id: 'roles',
                header: 'Roles', accessorKey: 'roles', size: 400, 
                enableSorting: false,
                cell: ({ row }) => { 
                    return <UserRoleCell roles={row?.original?.roles} /> 
                }
            },
            { 
                id: 'registration_date',
                header: 'Registration Date', accessorKey: 'registration_date', 
                cell: ({ row }) => { 
                    return <UserRegDateCell registration_date={row.original.registration_date}/>
                }
            },
            { 
                header: 'Registration Type', 
                accessorKey: 'registration_type', 
                id: 'registration_type',
                cell: ({ row }) => { 
                    return <UserRegTypeCell registration_type={row.original.registration_type}/> 
                }
            },
        ],
        detailsConfig:{
            searchUserTab: false,
            sendInviteToggle: true,
            fields:[
                { icon:'text_select_jump_to_beginning', title: 'First Name', key:'given_name', type: 'text', net_new_active: false },
                { icon:'text_select_jump_to_end', title: 'Last Name', key:'family_name', type: 'text', net_new_active: false },
                { icon:'signature', title: 'Full Name', key:'name', type: 'generated_text', net_new_active: false, conditional_fields:['given_name', 'family_name'] },
                { icon:'type_specimen', title: 'Registration Type', key:'registration_type', net_new_active: false, type: 'view_only_text' },
                { icon:'event_note', title: 'Registration Date', key:'registration_date', net_new_active: false, type: 'view_only_date' },
                { icon:'domino_mask', title: 'Roles', key:'roles', type: 'multi_select', net_new_active: true }
            ]
        }
    },
    { 
        id: 1,
        title: 'Admins', roleFilter: 'ADMIN',
        initialState:{
            columnPinning:{
                left: ["userDetails"]
            }
        }, 
        columns:[
            { 
                id:"given_name",
                header: 'User', accessorKey: 'userDetails', 
                cell: ({ row }) => { 
                    return <UserDetailsCell user={row.original} />
                }
            },
            { 
                id: 'adminCheck',
                header: 'Site Admin?', accessorKey: 'adminCheck',
                enableSorting: false,
                cell: ({ row }) => { 
                    return <UserRoleCheckCell pageRole="ADMIN" roles={row?.original?.roles} /> 
                }
            },
            { 
                id: 'scopes',
                header: 'Admin Scopes', accessorKey: 'scopes', size: 700, 
                enableSorting: false,
                cell: ({ row }) => { 
                    return <UserScopesCell scopes={row?.original?.scopes} /> 
                }
            },
        ],
        detailsConfig:{
            searchUserTab: true,
            sendInviteToggle: true,
            fields:[
                { icon:'text_select_jump_to_beginning', title: 'First Name', key:'given_name', type: 'view_only_text', net_new_active: false },
                { icon:'text_select_jump_to_end', title: 'Last Name', key:'family_name', type: 'view_only_text', net_new_active: false },
                { icon:'signature', title: 'Full Name', key:'name', type: 'generated_text', net_new_active: false, conditional_fields:['given_name', 'family_name'] },
                { icon:'toggle_on', title: 'Site Admin', key:'roles', type: 'role_filter_toggle', net_new_active: true },
                { icon:'list_alt_add', title: 'Scopes', key:'scopes', type: 'multi_select', net_new_active: true }
            ]
        }
    }
];

function UserManagement(){
    const [displaySearch, setDisplaySearch] = useState("");
    const [query, setQuery] = useState("");

    const [selectedTab, setSelectedTab] = useState(tableTabs[0]);

    // Side Panel
    const [selUser, setSelUser] = useState<User | undefined>(undefined)
    
    const searchQuery = (e:any) => {
        try {
            setDisplaySearch(e.target.value);
        }
        catch(ex){
            log.error(`Searching User Management: ${ex}`);
        }
    }

    const addUser = () => { setSelUser(new User()); }

    useEffect(() => {
        const delayInputTimeoutId = setTimeout(() => {
            setQuery(displaySearch);
        }, DEBOUNCE_TIME);

        return () => clearTimeout(delayInputTimeoutId);
    }, [displaySearch]);

    useEffect(()=>{ document.title = "User Management"; },[]);

    return(
        <div className="admin-component user-management">
            <div className="table-ctrl-container">
                <div className="ctrl-tabs">
                    {tableTabs.map((tab, i) =>
                        <button className={`tab-btn ${selectedTab.id == i ? 'sel-tab' : ''}`} 
                            key={i} onClick={()=> setSelectedTab(tab)}
                        >
                            {tab.title}
                        </button>
                    )}
                </div>

                <div className="ctrl-actions">
                    <div className="action-input-container">
                        <span className="material-symbols-outlined">search</span>
                        <input type="text" name="query" placeholder='Search Users' value={displaySearch} onChange={searchQuery} />
                    </div>

                    <button className='table-action-btn' onClick={addUser}>
                        <span className="material-symbols-outlined">person_add</span>
                        <span className="btn-title">Add User</span>
                    </button>
                </div>
            </div>

            <UserManagementTable tableConfig={selectedTab} searchQuery={query} selUser={selUser} setSelUser={setSelUser}/>
        </div>
    );
}

export default UserManagement;