import { useContext, useEffect, useState } from "react";
import { Link, useLocation, useNavigate  } from "react-router-dom";
import { Sheet } from 'react-modal-sheet';

import { Outlet } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import userContext from "../../context/user.context";

import { AdminPathType, CtrlContainerType, MobileNavType, UserContextType } from "../../datatypes";
import { log } from "../../utils/log";
import { checkUserRoles } from "../../utils";

// Pages
// import LeagueLanding from "./pages/landing";
import SportEditor from "./pages/sportEditor";

import leeLee_logo from '../../assets/logo/logo_kiddz3.png';

export const leagueStoreComponents: AdminPathType[] = [
    { title: "League Sports", scope:"", icon:"sports", path:"league_sports", element: SportEditor },
    
];

/* Menu Panel */
function CtrlContainer({ displayComponents, selComponent, query, navOpen, openNav, pressEvent, searchQuery }: CtrlContainerType){
    const { user, setCredUser } = useContext(userContext.UserContext) as UserContextType;
    const navigate = useNavigate();

    const basePath = '/toolbox/leaguestore';

    const signOff = () => {
        try {
            if(window.confirm('Are you sure you want to Sign out?')){
                linkOnPress(); setCredUser(null, undefined);
                
                localStorage.removeItem(import.meta.env.VITE_APP_SESSION_KEY);
                navigate('/');
            }
        }
        catch(ex){
            log.error(`Unable to signOff: ${ex}`);
        }
    }

    const linkOnPress = () => {
        if(pressEvent) pressEvent();
    }

    const toggleSearch = () => {
        if(navOpen === false && openNav) {
            openNav();
        }
    }

    return(
        <div className="panel-container">
            <div className="side-title">
                <div className="title-icon">
                    <img src={leeLee_logo} alt="Lee Lee Kiddz League Store Editor" />
                </div>
                <span className="title-txt">League Store Editor</span>
            </div>

            <div className="side-search">
                <div className="admin-input-container">
                    <span className="material-symbols-outlined" onClick={toggleSearch}>search</span>
                    <input type="text" name="query" placeholder='Search For Tool' value={query} onChange={searchQuery} />
                </div>
            </div>

            <div className="component-list-container">
                {displayComponents.map((item: AdminPathType, i:number)=>
                    <Link to={`${basePath}/${item.path}`} className={`component-item ${selComponent === `${basePath}/${item.path}` ? 'sel':''}`} onClick={linkOnPress} key={i} title={item.title}>
                        <span className="material-symbols-outlined">{item.icon}</span>
                        <span className="item-title">{item.title}</span>
                    </Link>
                )}
            </div>

            <div className="side-user-container">
                <div className="user-info">
                    <div className="user-img">
                        <span className="material-symbols-outlined">person</span>
                    </div>
                    <span className="user-email">{user?.email}</span>
                </div>
                <div className="sign-out-link" onClick={signOff}>
                    <span className="material-symbols-outlined">logout</span>
                    <span className="item-title">Sign-out</span>
                </div>
            </div>
        </div>
    );
}

function NavContainer({ displayComponents, selComponent, query, pressEvent, searchQuery }: CtrlContainerType){
    const [openNav, setOpenNav] = useState(false);

    return(
        <div className={`ctrl-panel side-panel ${(openNav ? '': 'mini')}`}>
            <div className="panel-controller" onClick={()=>{ setOpenNav((d)=> { return !d; }); }}>
                <span className="material-symbols-outlined">{(!openNav ? 'chevron_right' : 'chevron_left')}</span>
            </div>
            <CtrlContainer displayComponents={displayComponents} selComponent={selComponent} 
                navOpen={openNav} openNav={()=>{ setOpenNav(true) }} query={query} searchQuery={searchQuery} />
        </div>
    );
}

function MobileNav({ isOpen, displayComponents, selComponent, query, searchQuery, setOpen }: MobileNavType){
    return(
        <div className="mobile-nav-container">
            <Sheet isOpen={isOpen} onClose={() => setOpen(false)} snapPoints={[0.75]}>
                <Sheet.Container className={'sheet-container'}>
                    <Sheet.Content>
                        <div className="ctrl-panel">
                            <CtrlContainer displayComponents={displayComponents} selComponent={selComponent} 
                                query={query} searchQuery={searchQuery} pressEvent={()=> setOpen(false)}  />
                        </div>
                    </Sheet.Content>
                </Sheet.Container>
                <Sheet.Backdrop onTap={()=> setOpen(false) }/>
            </Sheet>
        </div>
    );
}

export default function LeagueStoreLayout(){
    const [query, setQuery] = useState("");
    const [displayComponents, setDisplayComponents] = useState<any>([]);
    const [selComponent, setSelComponent] = useState("");

    const [header, setHeader] = useState({ icon: "store", title:"League Store Admin" });
    const [mobileNavOpen, setMobileNavOpen] = useState(false);

    const { user } = useContext(userContext.UserContext) as UserContextType;
        
    const location = useLocation();
    const navigate = useNavigate();

    const searchQuery = (e:any) => {
        try {
            setQuery(e.target.value);
        }
        catch(ex){
            log.error(`Searching: ${ex}`);
        }
    }

    const getHeaderTitle = () => {
        let ret = { icon: "store", title:"League Store Admin" };
            
        try {
            const filterComp = leagueStoreComponents.filter((ac: AdminPathType) => { return `/allaccess/${ac.path}` === selComponent; });

            if(selComponent?.length > 0 && filterComp?.length > 0) {
                ret = { icon: filterComp[0].icon, title:filterComp[0].title };
            }
        }
        catch(ex){
            log.error(`Getting Header: ${ex}`);
        }

        setHeader(ret);
    }

    useEffect(()=>{
        let filterList = leagueStoreComponents.filter((comp: AdminPathType) => {
            const hasQuery = comp.title.toLowerCase().indexOf(query.toLowerCase()) >= 0;
            return hasQuery;
        });

        setDisplayComponents(filterList);
    },[leagueStoreComponents, query]);

    useEffect(()=>{ 
        getHeaderTitle(); 
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[selComponent, leagueStoreComponents]);

    useEffect(()=>{
        setSelComponent(location?.pathname ?? "")
    },[location?.pathname]);

    if(!checkUserRoles(user?.roles, ['LEAGUE_STORE_ADMIN'])){
        navigate("/toolbox");
        return(
            <div className="redirecting-page">
                <span>Sorry you don't have access to this tool</span>
                <h1>Redirecting...</h1>
            </div>
        );
    }

    return(
        <div className='app-body'>
            <ToastContainer />

            <div className="admin-home-page league-store-admin">
                <MobileNav displayComponents={displayComponents} selComponent={selComponent} 
                    query={query} searchQuery={searchQuery} 
                    isOpen={mobileNavOpen} setOpen={setMobileNavOpen} />
                <NavContainer displayComponents={displayComponents} selComponent={selComponent} 
                    query={query} searchQuery={searchQuery} />

                <div className="base-section">
                    <div className="base-header">
                        <span className="material-symbols-outlined mobile-btn" onClick={()=> { setMobileNavOpen(!mobileNavOpen); }}>widgets</span>
                        <h1>
                            <span className="material-symbols-outlined">{header.icon}</span>
                            <span className="h1-title-text">{header.title}</span>
                        </h1>

                        <div className="app-link-bookend-container">
                            <Link className="app-link header-btn" to="/leaguestore">
                                <span className="material-symbols-outlined">shopping_cart</span>
                                <span className="header-title">League Store</span>
                            </Link>

                            <Link className="app-link alt header-btn" to="/">
                                <span className="material-symbols-outlined">captive_portal</span>
                                <span className="header-title">Website</span>
                            </Link>
                        </div>
                    </div>

                    <Outlet />
                </div>
            </div>
        </div>
    );
}