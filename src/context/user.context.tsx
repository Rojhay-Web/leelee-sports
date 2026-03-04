import { createContext, useEffect, useState } from 'react';

import { UserContextType, User, AdminPathType } from '../datatypes';
import { buildToken, parseToken } from "../utils";

// Admin Components
// import AdminHome from '../admin/pages/adminHome';
import CmsSiteEditor from '../admin/pages/blueprint/cmsEditor';
import UserManagement from '../admin/pages/blueprint/userManagement.v2';
import SiteEditor from '../admin/pages/blueprint/siteEditor';
import ImageGallery from '../admin/pages/blueprint/imageGallery';
import { EventEditor } from '../admin/pages/blueprint/eventEditor';
import FormManager from '../admin/pages/blueprint/formManager';
import { log } from '../utils/log';

const UserContext = createContext<UserContextType | null>(null);

function Provider({ children }: { children: any }) {
    const [user, setUser] = useState<User|null>(null);
    const [token, setToken] = useState<string>();

    const [activeComponents, setActiveComponents] = useState<any>([]);

    const [activeRoles] = useState({
        'ADMIN': { title:'Site Admin', key: 'ADMIN', colorTheme: '235,17,20' },
        'LEAGUE_STORE_ADMIN': { title:'League Store Admin', key: 'LEAGUE_STORE_ADMIN', colorTheme: '186,142,35' },
    });

    const adminComponents: AdminPathType[] = [
        { title: "CMS Editor", scope:"cms_admin", icon:"engineering", path:"cms_editor", element: CmsSiteEditor },
        { title: "User Management", scope:"users", icon:"group", path:"user_management", element: UserManagement },
        { title: "Image Gallery", scope:"gallery", icon:"gallery_thumbnail", path:"image_gallery", element: ImageGallery },
        { title: "Site Editor", scope:"site_content", icon:"dvr", path:"site_editor", element: SiteEditor },
        { title: "Event Editor", scope:"events", icon:"calendar_month", path:"event_editor", element: EventEditor },
        { title: "Form Manager", scope:"form_manager", icon:"forms_apps_script", path:"form_manager_editor", element: FormManager },
    ];

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

    const setCredUser = (usr: User|null, token?: string) => {
        setUser(usr); setToken(token);
    }

    useEffect(()=> {
        if(user?._id && token){
            localStorage.setItem(import.meta.env.VITE_APP_SESSION_KEY, buildToken(user, token));
        } 

        filterActiveComponents();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[user, token]);

    useEffect(()=>{
        const sessionInfo = localStorage.getItem(import.meta.env.VITE_APP_SESSION_KEY);
        if(sessionInfo){
            let { isExpired, localUser } = parseToken(sessionInfo);
            if(isExpired || !localUser?.user || !localUser?.token) {
                localStorage.removeItem(import.meta.env.VITE_APP_SESSION_KEY);
            } else {
                setCredUser(localUser.user, localUser.token);
            } 
        }
    },[]);

    return <UserContext.Provider value={{ activeRoles, adminComponents, user, token, setCredUser, activeComponents }}>{children}</UserContext.Provider>;
}

export default { UserContext, Provider };