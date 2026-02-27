import { CSSProperties, Dispatch, SetStateAction, useContext, useEffect, useRef, useState } from 'react';
import { gql, useLazyQuery, useMutation } from '@apollo/client';
import Rodal from "rodal";
import Multiselect from 'multiselect-react-dropdown';
import * as _ from 'lodash';
import { toast } from 'react-toastify';

import {
    Column,
    ColumnDef,
    flexRender,
    getCoreRowModel,
    SortingState,
    useReactTable,
} from '@tanstack/react-table';

import userContext from "../../../context/user.context";
import { User, UserContextType, UserManagementDetailsConfigType, UserManagementDetailsFieldsType, UserManagementTableTab } from '../../../datatypes';
import { log } from '../../../utils/log';
import { checkUserRole, DEBOUNCE_TIME, formatDate, handleGQLError } from '../../../utils';

type UserManagementTableType = {
    tableConfig: UserManagementTableTab,
    searchQuery?:string,
    selUser?: User,
    setSelUser: Dispatch<SetStateAction<User | undefined>>
};

type UserManagementModalType = {
    multiLists: {[key: string]: string[]},
    roleFilter: string | null,
    detailsConfig: UserManagementDetailsConfigType,
    selUser?: User,
    setSelUser: Dispatch<SetStateAction<User | undefined>>,
    modalStatus: boolean,
    setModalStatus: Dispatch<SetStateAction<boolean>>
};

type UserManagementModalRowType = { 
    roleFilter: string | null,
    multiLists: {[key: string]: string[]},
    field: UserManagementDetailsFieldsType,
    user?: User,
    setUser: Dispatch<SetStateAction<User | undefined>>
};

/* CONSTANTS */
const PAGE_SIZE = 10;

/* GQL */
const SEARCH_USERS_QUERY = gql`
query searchUsers($query: String, $role: String, $sortType: String, $sortAsc: Boolean, $page:Int, $pageSize: Int){
	searchUsers(query: $query, role:$role, sortType:$sortType, sortAsc:$sortAsc, page:$page, pageSize:$pageSize){
      pagesLeft
      totalCount
      results {
        _id  
        email
        name
        picture
        given_name
        family_name
        registration_type
        registration_date
        roles
        scopes
        id
      }
    }
}`,
UPSERT_USER_MUTATION = gql`
    mutation upsertUser($_id: String, $email: String, $given_name: String, $family_name: String, $roles: [String], $scopes: JSONObj, $sendInvite: Boolean){
        upsertUser(_id: $_id, email: $email, given_name: $given_name, family_name: $family_name, roles: $roles, scopes: $scopes, sendInvite: $sendInvite)
    }`,
REMOVE_USER_MUTATION = gql`
    mutation removeUser($_id: String!){
        removeUser(_id: $_id)
    }`;;

/* Table Cells */
export function UserDetailsCell({ user }: { user?: User }) {
    return (
        <div className="usrmgt_cell user_details">
            <span className="material-symbols-outlined user_detail_icon">account_circle</span>
            <div className="user_details_info">
                <div className="name">
                    {user?.given_name && <span>{user?.given_name}</span>}
                    {user?.family_name && <span>{user?.family_name}</span>}
                </div>
                <div className="email">{user?.email}</div>
            </div>
        </div>
    );
}

export function UserRoleCell({ roles }: { roles?: string[]}) {
    const LIST_SIZE = 2;
    const additionalBtnRef = useRef<HTMLDivElement>(null);
    const additionalListRef = useRef<HTMLDivElement>(null);
    const { activeRoles } = useContext(userContext.UserContext) as UserContextType;

    const [toggleAdd, setToggleAdd] = useState(false);
    
    const getRoleTheme = (role: string) => {
        const theme = role in activeRoles ? activeRoles[role].colorTheme : '170,170,170';
        return theme;
    }

    const toggleAdditional = (status: boolean) => {
        try {
            setToggleAdd(status);
        } catch(ex){
            log.error(`Setting Additional Toggle: ${ex}`);
        }
    }

    useEffect(() => {
        document.addEventListener("click", handleClickOutside, false);
        return () => {
            document.removeEventListener("click", handleClickOutside, false);
        };
    }, []);

    const handleClickOutside = (event: any) => {
        if (
            (additionalBtnRef.current && !additionalBtnRef.current.contains(event.target)) &&
            (additionalListRef.current && !additionalListRef.current.contains(event.target))
        ) {
            setToggleAdd(false);
        }
    };

    return (
        <div className="usrmgt_cell roles">
            {roles?.slice(0,LIST_SIZE).map((role,i) =>
                <div className={`role-container`} key={i}
                    style={{
                        backgroundColor: `rgba(${getRoleTheme(role)}, 0.3)`,
                        color: `rgba(${getRoleTheme(role)}, 1)`
                    }}
                >
                    {role}
                </div>
            )}

            {roles && roles?.length > 2 &&
                <div className='additional-roles-container'>
                    <div className={`additional-roles ${toggleAdd ? 'add-active' : ''}`} onClick={()=> toggleAdditional(true)} ref={additionalBtnRef}>+{(roles?.length - LIST_SIZE)}</div>

                    {toggleAdd &&
                        <div className='additional-roles-content' ref={additionalListRef}>
                            {roles?.slice(LIST_SIZE).map((role,i) =>
                                <div className={`role-container mini`} key={i}
                                    style={{
                                        backgroundColor: `rgba(${getRoleTheme(role)}, 0.3)`,
                                        color: `rgba(${getRoleTheme(role)}, 1)`
                                    }}
                                >
                                    {role}
                                </div>
                            )}
                        </div>
                    }
                </div>
            }
        </div>
    )
}

export function UserRegDateCell({ registration_date }: { registration_date?: Date }) {
    return (
        <div className="usrmgt_cell reg_dt_cell">
            {registration_date ? formatDate(registration_date, 'MM/dd/yyyy HH:mm:ss') : 'No Registration Date'}
        </div> 
    );
}

export function UserRegTypeCell({ registration_type }: { registration_type?: string }) {
    const type_style = (registration_type ?
        registration_type.toLowerCase().split(" ").join('_') :
        ''
    );
    return (
        <div className="usrmgt_cell reg_type_cell">
            <span className={type_style}>{registration_type ?? 'No Registration Type'}</span>
        </div>
    );
}

export function UserScopesCell({ scopes }: { scopes?: any}) {
    const LIST_SIZE = 4;
    const additionalBtnRef = useRef<HTMLDivElement>(null);
    const additionalListRef = useRef<HTMLDivElement>(null);
    
    const { adminComponents } = useContext(userContext.UserContext) as UserContextType;

    const [toggleAdd, setToggleAdd] = useState(false);
    const [scopeList, setScopeList] = useState<string[]>([]);

    const toggleAdditional = (status: boolean) => {
        try {
            setToggleAdd(status);
        } catch(ex){
            log.error(`Setting Additional Toggle: ${ex}`);
        }
    }

    useEffect(()=>{
        let builtList: string[] = [];
        if(scopes) {
            const dictList = Object.keys(scopes);
            
            dictList.forEach((item) => {
                const scopeIdx = adminComponents.findIndex((ac) => ac.scope === item);
                if(scopes[item] === true && scopeIdx >= 0){
                    builtList.push(adminComponents[scopeIdx].title);
                }
            });
        }

        setScopeList(builtList);
    },[scopes]);

    useEffect(() => {
        document.addEventListener("click", handleClickOutside, false);
        return () => {
            document.removeEventListener("click", handleClickOutside, false);
        };
    }, []);

    const handleClickOutside = (event: any) => {
        if (
            (additionalBtnRef.current && !additionalBtnRef.current.contains(event.target)) &&
            (additionalListRef.current && !additionalListRef.current.contains(event.target))
        ) {
            setToggleAdd(false);
        }
    };

    return (
        <div className="usrmgt_cell roles">
            {scopeList?.slice(0,4).map((role,i) =>
                <div className={`role-container`} key={i}
                    style={{
                        backgroundColor: `rgba(170,170,170, 0.3)`,
                        color: `rgba(170,170,170, 1)`
                    }}
                >
                    {role}
                </div>
            )}

            {scopeList && scopeList?.length > LIST_SIZE &&
                <div className='additional-roles-container'>
                    <div className={`additional-roles ${toggleAdd ? 'add-active' : ''}`} onClick={()=> toggleAdditional(true)} ref={additionalBtnRef}>+{(scopeList?.length - LIST_SIZE)}</div>

                    {toggleAdd &&
                        <div className='additional-roles-content' ref={additionalListRef}>
                            {scopeList?.slice(LIST_SIZE).map((role,i) =>
                                <div className={`role-container mini`} key={i}
                                    style={{
                                        backgroundColor: `rgba(170,170,170, 0.3)`,
                                        color: `rgba(170,170,170, 1)`
                                    }}
                                >
                                    {role}
                                </div>
                            )}
                        </div>
                    }
                </div>
            }
        </div>
    )
}

export function UserRoleCheckCell({ pageRole, roles }: { pageRole:string, roles?: string[] }) {
    const type_style = checkUserRole(pageRole, roles);
    return (
        <div className="usrmgt_cell role_check_cell">
            {type_style &&
                <div className='active-status'>
                    <span className="material-symbols-outlined">check</span>
                </div>
            }
        </div>
    );
}

export function UserSearchTool({ setSelUser }: { setSelUser: Dispatch<SetStateAction<User | undefined>> }) {
    const [displaySearch, setDisplaySearch] = useState("");
    const [userQuery, setUserQuery] = useState("");
    const [toggleSearch, setToggleSearch] = useState(false);

    const additionalBtnRef = useRef<HTMLInputElement>(null);
    const additionalListRef = useRef<HTMLDivElement>(null);

    const { user } = useContext(userContext.UserContext) as UserContextType;

    // GQL
    const authHeader = {context: { headers: { "Authorization": user?._id }}};
    const [retrieveUsers,{ loading, error, data }] = useLazyQuery(SEARCH_USERS_QUERY, {fetchPolicy: 'no-cache', ...authHeader});

    const searchQuery = (e:any) => {
        try {
            setDisplaySearch(e.target.value);
        }
        catch(ex){
            log.error(`Searching User Management: ${ex}`);
        }
    }

    const handleOutsideClick = (event: any) => {
        if (
            (additionalBtnRef.current && !additionalBtnRef.current.contains(event.target)) &&
            (additionalListRef.current && !additionalListRef.current.contains(event.target))
        ) {
            setToggleSearch(false);
        }
    };

    const handleSearchFocus = () => {
        if(userQuery?.length > 0){
            setToggleSearch(true);
        }
    }

    const toggleUser = (user: User) => {
        setSelUser(user);
        setDisplaySearch(user.email ?? 'Selected User Has No Email Address!');
        setToggleSearch(false);
    }

    useEffect(() => {
        const delayInputTimeoutId = setTimeout(() => {
            setUserQuery(displaySearch);
        }, DEBOUNCE_TIME);

        return () => clearTimeout(delayInputTimeoutId);
    }, [displaySearch]);

    useEffect(()=>{ 
        if(userQuery?.length > 0) {
            setToggleSearch(true);
            retrieveUsers({
                variables: {
                    "query": userQuery,
                    "role": undefined,
                    "sortType": 'name', "sortAsc": true,
                    "page":1, "pageSize":PAGE_SIZE
                }
            });
        } else {
            setToggleSearch(false);
        }
     },[userQuery]);

    useEffect(() => {
        document.addEventListener("click", handleOutsideClick, false);
        return () => {
            document.removeEventListener("click", handleOutsideClick, false);
        };
    }, []);

    return(
        <div className='search-container'>
            <input className='text-input' type="text" name='user_search' 
                placeholder='Search For Active User' value={displaySearch} onChange={searchQuery} 
                ref={additionalBtnRef} onFocus={handleSearchFocus} />

            {(toggleSearch) &&
                <div className={`search-results-container`} ref={additionalListRef}>
                    {loading ?
                        <div className='table-loading'>
                            <div className='loader'>
                                <l-spiral size="150" speed="0.9" color="rgba(0,41,95,1)" />
                            </div>
                            <h1>Searching...</h1>
                        </div> :
                        <>
                            {!(data?.searchUsers?.results?.length > 0) ?
                                <div className="no-results">No Users Found</div> :
                                <>
                                    {data.searchUsers.results.map((user: User) => (
                                        <div key={user._id} className='search-result' onClick={() => toggleUser(user)}>
                                            <UserDetailsCell user={user} />
                                        </div>
                                    ))}
                                </>
                            }
                        </>
                    }
                </div>
            }
        </div>
    );
}

/* User Management Modal */
function UserManagementModalRow({ roleFilter, multiLists, field, user, setUser }: UserManagementModalRowType) {
    const [multiSelected, setMultiSelected] = useState<string[]>([]);
    const [toggleActive, setToggleActive] = useState(false);

    const setUserDetails = (e:any) => {
        try {
            const update_key = e.target.name,
                update_value = e.target.value;

            setUser((p: any) => {
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
                    if(user && user[tmpField]?.length > 0){
                        tmpText.push(user[tmpField]);
                    }
                }
            }
        } catch(ex) {
            log.error(`Generating Text: ${ex}`);
        }

        return (tmpText?.length == 0 ? '' : tmpText.join(' '));
    }

    const multiUpdated = (item: string | null, type: string) => {
        // Update User Object
        if(item){
            setUser((p: any) => {
                let ret = { ...p };
                switch (field.key) {
                    case 'roles':
                        let newList = [...(p?.roles ?? [])];
                        if(type === 'ADD' && !newList.includes(item)) { 
                            newList.push(item);
                        } else if(type === 'REMOVE') {
                            newList = [...newList].filter((l) => l !== item);
                        }

                        ret = { ...p, roles: newList };
                        break;
                    case 'scopes':
                        ret = {...p, 
                            scopes: { 
                                ...p.scopes, 
                                [item]:(type === 'ADD' ? true : false) 
                            }
                        };
                        break;
                    default:
                        break;
                }

                return ret;
            });
        }
    }

    useEffect(()=>{
        if(user){
            switch (field.key) {
                case 'roles':
                    setMultiSelected(user?.roles ?? []);
                    setToggleActive(checkUserRole(roleFilter ?? '', user?.roles))
                    break;
                case 'scopes':
                    const tmpScopes = user?.scopes ?? {};
                    const trueKeys = Object.keys(tmpScopes).filter(key => tmpScopes[key] === true);

                    setMultiSelected(trueKeys ?? []);
                    break;
                default:
                    break;
            }
        }
    },[user]);

    return(
        <div className='field-item-row'>
            <div className='field-title'>
                <span className="field-icon material-symbols-outlined">{field.icon ?? 'radio_button_unchecked'}</span>
                <span className='field-title-text'>{field.title}</span>
            </div>

            <div className='field-content'>
                {(field.type === 'user_search') &&
                    <UserSearchTool setSelUser={setUser} />
                }

                {(field.type === 'email') &&
                    <input className='text-input' type="email" name={field.key} placeholder='Enter Email Address' value={(user && user[field.key] ? user[field.key] : '')} onChange={setUserDetails} />
                }

                {(field.type === 'text') &&
                    <input className='text-input' type="text" name={field.key} placeholder='Search Users' value={(user && user[field.key] ? user[field.key] : '')} onChange={setUserDetails} />
                }

                {(field.type === 'generated_text') &&
                    <div className='view-text'>
                        {!(generateText().length > 0) ?
                            <span className='unset-text'>Field Not Set</span> :
                            <span className='valid-text'>{generateText()}</span>
                        }
                    </div>
                }

                {(field.type === 'view_only_text') &&
                    <div className='view-text'>
                        {!(user && user[field.key]) ?
                            <span className='unset-text'>Field Not Set</span> :
                            <span className='valid-text'>{user[field.key]}</span>
                        }
                    </div>
                }

                {(field.type === 'view_only_date') &&
                    <div className='view-text'>
                        {!(user && user[field.key]) ?
                            <span className='unset-text'>Date Not Set</span> :
                            <span className='valid-text'>{formatDate(user[field.key],'MM/dd/yyyy HH:mm:ss')}</span>
                        }
                    </div>
                }

                {(field.type === 'multi_select') &&
                    <Multiselect
                        isObject={false}
                        showCheckbox
                        options={multiLists[field.key] ?? []}
                        selectedValues={multiSelected}
                        placeholder={`Select ${field.title}`}
                        onSelect={(_: any, selectedItem: any) => multiUpdated(selectedItem, 'ADD')}
                        onRemove={(_: any, selectedItem: any) => multiUpdated(selectedItem, 'REMOVE')}
                        style={{
                            chips: {
                                backgroundColor: 'rgba(0,41,95,1)',
                                fontSize: '10px',
                            },
                            searchBox:{
                                borderWidth:'2px', borderColor: 'rgba(170,170,170,1)',
                                borderRadius: '8px'
                            }
                        }}
                    />
                }

                {(field.type === 'role_filter_toggle') &&
                    <button className={`simple-toggle-switch ${toggleActive ? 'active' : ''}`} onClick={() => multiUpdated(roleFilter, (toggleActive ? 'REMOVE' : 'ADD'))}>
                        <span className='slider' />
                    </button>
                }
            </div>
        </div>
    );
}

function UserManagementModal({ modalStatus, setModalStatus, multiLists, roleFilter, detailsConfig, selUser, setSelUser }: UserManagementModalType){
    const [windowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
    const [editUser, setEditUser] = useState<User|undefined>(undefined);
    
    const [inProgress, setInProgress] = useState(false);
    const [editType, setEditType] = useState<string>('NEW'); 
    const [sendInvite, setSendInvite] = useState(false); 

    const { user } = useContext(userContext.UserContext) as UserContextType;

    // Mutations
    const authHeader = {context: { headers: { "Authorization": user?._id }}};
    const [upsertUser,{ loading: upsert_loading, data: upsert_data, error: upsert_error }] = useMutation(UPSERT_USER_MUTATION, {fetchPolicy: 'no-cache', ...authHeader, onError: handleGQLError});
    const [removeUser,{ loading: remove_loading, data: remove_data, error: remove_error }] = useMutation(REMOVE_USER_MUTATION, {fetchPolicy: 'no-cache', ...authHeader, onError: handleGQLError});
    
    const modalStyle = {
        height: 'calc(100vh - 50px)',
        width: (windowSize.width > 770 ? '50%' : 'calc(100% - 45px)'), 
        right: '8px', margin: 'auto 0 auto auto'
    };

    const defaultField: { [key: string]: UserManagementDetailsFieldsType } = {
        'NEW' : { icon:'alternate_email', title: 'Email', key:'email', type: 'email' },
        'ACTIVE': { icon:'search', title: 'Search User', key:'_id', type: 'user_search' },
        'ACTIVE_SELECT' : { icon:'alternate_email', title: 'Email', key:'email', type: 'view_only_text' },
    };

    const pageTitle = (selUser?._id !== undefined ? 
        `Update ${roleFilter ?? ''} User` : (detailsConfig.searchUserTab ? `Add/Update ${roleFilter ?? ''} User` : `Add ${roleFilter ?? ''} User`)
    );

    const closeModal = () => {
        setModalStatus(false); 
        setSelUser(undefined);
    }

    const deleteUser = () => {
        if(editUser?._id && window.confirm("Are you sure you want to delete this user?")){
            removeUser({variables: {_id: editUser._id}});
        }
    }

    const saveUser = () => {
        const { _id, email } = editUser ?? {};
        const customVariables: { [key:string]: any } = {};

        detailsConfig.fields?.forEach((field) => {
            if(field.key && editUser && editUser[field.key] !== undefined){
                customVariables[field.key] = editUser[field.key];
            }
        });

        upsertUser({ 
            variables: {
                ...(editUser?._id ? {_id: _id} : { email: email}),
                ...customVariables,
                sendInvite: sendInvite
            } 
        });
    }
    
    useEffect(()=> {
        if(selUser){
            const tmpEditType = (selUser?._id !== undefined) ? 'ACTIVE_SELECT' : 'NEW';

            setModalStatus(true);
            setEditUser({..._.cloneDeep(selUser)});
            setEditType(tmpEditType);
        }
    },[selUser, detailsConfig]);

    useEffect(()=>{
        try {
            const areEqual = _.isEqual(selUser, editUser);
            setInProgress(!areEqual);
        } catch(ex){
            log.error(`Checking Edit Progress: ${ex}`);
        }
    }, [editUser]);

    useEffect(()=>{ 
        if(!upsert_loading ){
            if(upsert_error){
                toast.error(`Error Adding/Editing User: ${upsert_error.message}`, { position: "top-right",
                    autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                    draggable: true, progress: undefined, theme: "light" });
            } else if(upsert_data?.upsertUser){
                closeModal();
                toast.success(`Adding/Editing User.`, { position: "top-right",
                    autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                    draggable: true, progress: undefined, theme: "light" });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[upsert_loading, upsert_data, upsert_error]);

    useEffect(()=>{ 
        if(!remove_loading ){
            if(remove_error){
                toast.error(`Error Removing User: ${remove_error.message}`, { position: "top-right",
                    autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                    draggable: true, progress: undefined, theme: "light" });
            } else if(remove_data?.removeUser){
                closeModal();
                toast.success(`Removing User.`, { position: "top-right",
                    autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                    draggable: true, progress: undefined, theme: "light" });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[remove_loading, remove_data, remove_error]);

    return(
        <Rodal className="user-management-editor-modal" 
            customStyles={modalStyle} visible={modalStatus} 
            onClose={closeModal} animation={'slideRight'}
        >
            <div className='user-management-editor-container'>
                <div className='header-row'>
                    <span>User Details</span>
                </div>

                <div className='title-row'>
                    <h1>{pageTitle}</h1>
                    {inProgress && 
                        <div className='edit-in-progress'>
                            <span className="icon material-symbols-outlined">edit_square</span>
                            <span>Edit In Progress</span>
                        </div>
                    }
                </div>

                {(detailsConfig.searchUserTab && (selUser?._id === undefined)) &&
                    <div className='toggle-btn-row'>
                        <div className='field-list-toggle'>
                            <button className={`toggle-btn ${(editType === 'ACTIVE' ? 'active' : '')}`} onClick={() => setEditType('ACTIVE')}>Find User</button>
                            <button className={`toggle-btn ${(editType === 'NEW' ? 'active' : '')}`} onClick={() => setEditType('NEW')}>New User</button>
                        </div>
                    </div>
                }

                <div className='field-list-container'>
                    {/* Change based on editType */}
                    <UserManagementModalRow field={defaultField[editType]} roleFilter={roleFilter} user={editUser} setUser={setEditUser} multiLists={multiLists} />

                    {/* Dynamic list based on detailsConfig.fields list */}
                    {detailsConfig.fields?.map((field, i) => {
                        if(field?.net_new_active != true && editType === 'NEW'){
                            return(<div className='inactive-row' key={i} />);
                        }

                        return(
                            <UserManagementModalRow key={i} field={field} roleFilter={roleFilter} user={editUser} setUser={setEditUser} multiLists={multiLists} />
                        );
                    })}
                </div>

                <div className='editor-actions-container'>
                    <button className='list-btn send-invite' onClick={()=> setSendInvite((p) => !p)}>
                        <span className={`toggle-check ${sendInvite ? 'active' : ''}`} />
                        <span className='btn-text'>Send Invitation</span>
                    </button>

                    <div className='button-list'>
                        <button className='list-btn save' disabled={upsert_loading || !inProgress} onClick={saveUser}>
                            {upsert_loading ? 
                                <div className='btn-icon loader'>
                                    <l-spiral size="14" speed="0.9" color="#fff" />
                                </div> :
                                <span className="btn-icon material-symbols-outlined">save</span>
                            }
                            <span className='btn-text'>Save</span>
                        </button>

                        {(roleFilter == null && selUser?._id !== undefined ) &&
                            <button className='list-btn delete' onClick={deleteUser}>
                                <span className="btn-icon material-symbols-outlined">delete_forever</span>
                                <span className='btn-text'>Delete User</span>
                            </button>
                        }
                    </div>
                </div>
            </div>
        </Rodal>
    );
}

/* Table */
export default function UserManagementTable({ tableConfig, searchQuery, selUser, setSelUser }: UserManagementTableType){
    const [multiLists, setMultiLists] = useState<{[key:string]:string[]}>({});

    const [sorting, setSorting] = useState<SortingState>([]);
    const [columns, setColumns] = useState<ColumnDef<User>[]>([]);
    const [loadDelay, setLoadDelay] = useState(false);
    const [modalStatus, setModalStatus] = useState(false);

    const [page, setPage] = useState(1);
    const pageRender = useRef({ default: false, modal: false});

    const { user, adminComponents, activeRoles } = useContext(userContext.UserContext) as UserContextType;

    // GQL
    const authHeader = {context: { headers: { "Authorization": user?._id }}};
    const [retrieveUsers,{ loading, error, data: users_data }] = useLazyQuery(SEARCH_USERS_QUERY, {fetchPolicy: 'no-cache', ...authHeader});

    const table = useReactTable({
        data: users_data?.searchUsers?.results ?? [],
        columns,
        initialState: tableConfig?.initialState,
        state: { sorting },
        getCoreRowModel: getCoreRowModel(),
        debugTable: false, debugHeaders: false, debugColumns: false,
        columnResizeMode: "onChange",
        onSortingChange: setSorting,
    });

    const getCommonPinningStyles = (column: Column<User>): CSSProperties => {
        const isPinned = column.getIsPinned();
        const isLastPinned = isPinned === "left" && column.getIsLastColumn("left");
        const width = column.getSize();

        return {
            width: width <= 150 ? 'initial' : column.getSize(),
            position: isPinned ? "sticky" : "relative",
            left: isPinned === "left" ? `${column.getStart("left")}px` : undefined,
            zIndex: isPinned ? 1 : 0,
            boxShadow: isLastPinned ? "rgba(170, 170, 170, 0.3) 4px 0px 4px -2px" : undefined
        };
    }

    const runQuery = () => {
        try {
            setLoadDelay(true);

            // Build Sort
            const sortType = sorting.length > 0 ? sorting[0].id : undefined;
            const isSortAsc = sorting.length > 0 ? !sorting[0].desc : undefined;

            retrieveUsers({
                variables: {
                    "query":searchQuery,
                    "role": tableConfig?.roleFilter ?? undefined,
                    "sortType":sortType, 
                    "sortAsc": isSortAsc,
                    "page":page, "pageSize":PAGE_SIZE
                }
            });
        } catch (ex){
            log.error(`Running User Query: ${ex}`);
        }
    }

    const resetSearch = () => {
        try {
            if(page > 1){
                setPage(1);
            } else {
                runQuery();
            }
        } catch(ex){
            log.error(`Reseting Table Page: ${page}`);
        }
    }

    useEffect(()=>{
        setMultiLists((p)=>{
            const tmpScopes = adminComponents.map((ac) => ac.scope);
            const tmpRoles = Object.keys(activeRoles);
            return {
                ...p,
                "scopes":[...tmpScopes],
                "roles":[...tmpRoles]
            }
        });
    },[adminComponents, activeRoles]);

    useEffect(()=>{
        const newColumnList = tableConfig?.columns ?? [];
        setColumns(newColumnList);
        resetSearch();
    },[tableConfig]);

    useEffect(()=>{
        table.getToggleAllColumnsVisibilityHandler();
    },[columns]);

    useEffect(()=>{ 
        if(pageRender?.current.default) { runQuery(); }
        pageRender.current.default = true;
    },[page]);

    useEffect(()=>{ resetSearch(); },[searchQuery, sorting]);

    useEffect(()=>{ 
        if(!modalStatus && pageRender?.current.modal) {
            runQuery();
        }

        pageRender.current.modal = true;
     },[modalStatus]);
    
    useEffect(()=>{
        let delayLoadTimeoutId:NodeJS.Timeout;

        if(loading === false) {
            delayLoadTimeoutId = setTimeout(() => { setLoadDelay(false); }, 500);
        }

        return () => clearTimeout(delayLoadTimeoutId);
    },[loading]);

    return (
        <>
            <div className="user-management-table-container">
                {loading || loadDelay ? 
                    <div className='table-loading'>
                        <div className='loader'>
                            <l-spiral size="150" speed="0.9" color="rgba(0,41,95,1)" />
                        </div>
                        <h1>Searching...</h1>
                    </div> :            
                    <table className="user-management-table" 
                        style={{ width: table.getTotalSize() }}
                    >
                        <thead>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => {
                                        return(
                                            <th key={header.id} colSpan={header.colSpan}
                                                style={{ ...getCommonPinningStyles(header.column) }}
                                            >
                                                <div className={`header-container ${header.column.getCanSort() ? 'sortable' : ''}`} onClick={header.column.getToggleSortingHandler()}>
                                                    {flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext(),
                                                    )}
                                                    {{
                                                        asc: <span className="material-symbols-outlined">north</span>,
                                                        desc: <span className="material-symbols-outlined">south</span>,
                                                    }[header.column.getIsSorted() as string] ?? 
                                                        (header.column.getCanSort() ? 
                                                            <div className='multi-sort'>
                                                                <span className="material-symbols-outlined">north</span>
                                                                <span className="material-symbols-outlined">south</span>
                                                            </div>
                                                            : null
                                                        )
                                                    }
                                                </div>
                                            </th>
                                        );
                                    })}

                                    {/* Empty Header For Actions*/}
                                    <th className='empty-header'/>
                                </tr>
                            ))}
                        </thead>
                        <tbody>
                            {table.getRowModel().rows.map((row) => {
                                return (
                                    <tr key={row.id}>
                                        {row.getVisibleCells().map((cell) => {
                                            return (
                                                <td key={cell.id}
                                                    style={{ ...getCommonPinningStyles(cell.column) }}
                                                >
                                                    {flexRender(
                                                        cell.column.columnDef.cell,
                                                        cell.getContext(),
                                                    )}
                                                </td>
                                            )
                                        })}

                                        {/* Column For Actions*/}
                                        <td>
                                            <button className='update-user-btn' onClick={() => setSelUser(row.original)}>
                                                <span className="material-symbols-outlined">more_vert</span>
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                }
            </div>
            
            {/* User Editor Modal */}
            <UserManagementModal roleFilter={tableConfig?.roleFilter} multiLists={multiLists} 
                selUser={selUser} setSelUser={setSelUser} detailsConfig={tableConfig.detailsConfig} 
                modalStatus={modalStatus} setModalStatus={setModalStatus}
            />
        </>
    );
}