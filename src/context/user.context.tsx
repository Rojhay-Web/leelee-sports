import { createContext, useEffect, useRef, useState } from 'react';
import { gql, useLazyQuery } from '@apollo/client';
import { toast } from 'react-toastify';

import { UserContextType, User, AdminPathType } from '../datatypes';
import { parseToken, buildToken } from "../utils";

// Admin Components
// import AdminHome from '../admin/pages/adminHome';
import CmsSiteEditor from '../admin/pages/blueprint/cmsEditor';
import UserManagement from '../admin/pages/blueprint/userManagement.v2';
import SiteEditor from '../admin/pages/blueprint/siteEditor';
import ImageGallery from '../admin/pages/blueprint/imageGallery';
import { EventEditor } from '../admin/pages/blueprint/eventEditor';
import FormManager from '../admin/pages/blueprint/formManager';
import { log } from '../utils/log';

const GOOGLE_LOGIN_QUERY = gql`
query googleLogin($token: String!){
    loginGUser(token: $token){
        email
        name
        picture
        _id
        roles
        scopes
    }
}`,
GET_USER_PERMISSIONS_QUERY = gql`
query getUserPermissions($_id: String!){
    user(_id: $_id){
        roles
        scopes
    }
}`;

const UserContext = createContext<UserContextType | null>(null);

function Provider({ children }: { children: any }) {
    const [user, setUser] = useState<User|null>(null);
    const [userToken, setUserToken] = useState<any|null>(null);
    const [activeComponents, setActiveComponents] = useState<any>([]);

    const [activeRoles] = useState({
        'ADMIN': { title:'Site Admin', key: 'ADMIN', colorTheme: '235,17,20' },
    });

    const adminComponents: AdminPathType[] = [
        { title: "CMS Editor", scope:"cms_admin", icon:"engineering", path:"cms_editor", element: CmsSiteEditor },
        { title: "User Management", scope:"users", icon:"group", path:"user_management", element: UserManagement },
        { title: "Image Gallery", scope:"gallery", icon:"gallery_thumbnail", path:"image_gallery", element: ImageGallery },
        { title: "Site Editor", scope:"site_content", icon:"dvr", path:"site_editor", element: SiteEditor },
        { title: "Event Editor", scope:"events", icon:"calendar_month", path:"event_editor", element: EventEditor },
        { title: "Form Manager", scope:"form_manager", icon:"forms_apps_script", path:"form_manager_editor", element: FormManager },
    ];

    const refreshPermissions = useRef(false);

    const [retrieveUserData,{ loading, error, data }] = useLazyQuery(GOOGLE_LOGIN_QUERY, {fetchPolicy: 'no-cache'});
    const [retrieveUserPermissions,{ loading: loading_permissions, data: data_permissions }] = useLazyQuery(GET_USER_PERMISSIONS_QUERY, {fetchPolicy: 'no-cache'});    

    const filterActiveComponents = () => {
        try {
            let filterList = adminComponents.filter((comp) => {
                const isInScope = user?.scopes 
                    && (comp.scope in user.scopes)
                    && user.scopes[comp.scope] === true;
    
                return isInScope;
            });

            setActiveComponents(filterList);
        }
        catch(ex){
            log.error(`Filtering Active Components: ${ex}`);
        }
    }

    useEffect(()=>{
        if(userToken && userToken?.access_token){
            retrieveUserData({ variables: { token: userToken.access_token }});
        }
    },[userToken, retrieveUserData]);

    useEffect(()=> {
        if(user?._id){
            localStorage.setItem(import.meta.env.VITE_APP_SESSION_KEY, buildToken(user));

            if(refreshPermissions.current){
                retrieveUserPermissions({ variables: { _id: user._id }});
            }
        }        

        filterActiveComponents();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[user, refreshPermissions.current]);

    useEffect(()=> {
        if(!loading && data?.loginGUser){
            setUser(data.loginGUser);
        }
    },[data, loading]);

    useEffect(()=>{
        if(error) {
            toast.error(error?.message, { position: "top-right",
                autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                draggable: true, progress: undefined, theme: "light" });
        } 
    },[error]);

    useEffect(()=> {
        if(!loading_permissions && data_permissions?.userPermissions){
            refreshPermissions.current = false;
            setUser((d: any)=> {
                return {...d, ...data_permissions?.userPermissions};
            });
        }
    },[data_permissions, loading_permissions]);

    useEffect(()=>{
        const sessionInfo = localStorage.getItem(import.meta.env.VITE_APP_SESSION_KEY);
        if(sessionInfo){
            let { isExpired, localUser } = parseToken(sessionInfo);
            if(isExpired || !localUser?.user) {
                localStorage.removeItem(import.meta.env.VITE_APP_SESSION_KEY);
            }
            else {
                refreshPermissions.current = true;
                setUser(localUser.user);
            } 
        }
    },[]);

    return <UserContext.Provider value={{ activeRoles, adminComponents, user, setUser, userToken, setUserToken, loading, loading_permissions, activeComponents }}>{children}</UserContext.Provider>;
}

export default { UserContext, Provider };