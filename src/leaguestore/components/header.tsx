import { useContext, useState } from "react";
import { Link, NavLink } from "react-router-dom";

import userContext from "../../context/user.context";

import { UserContextType } from "../../datatypes";

/* Images */
import logo from '../../assets/logo/leeleekiddz_league_store.png';
import { checkUserRoles } from "../../utils";


function MobileNav({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (s:boolean) => void }) {
    return (
        <div className={`m-sidenav-container ${(isOpen ? "active": "")}`}>
            
        </div>
    );
}

function Header(){
    const [sideNav, setSideNav] = useState(false);

    const { user } = useContext(userContext.UserContext) as UserContextType;

    const navActivityClass = ({ isActive }: { isActive: boolean }) => (isActive ? `sel nav-item nav-link`: `nav-item nav-link`);

    const setSidebarDisplay = (status: boolean) => {
        document.body.classList.toggle('noscroll', status);
        setSideNav(status);
    }
    
    return (
        <>
            <MobileNav isOpen={sideNav} setIsOpen={setSidebarDisplay}/>
            <nav className="navbar navbar-expand-lg leaguestore-nav">
                <div className="collapse navbar-collapse nav-bookend">
                    <div className="collapse-container">
                        <div className='page-nav-container'>
                            <NavLink className={navActivityClass} to="/leaguestore/leagues">Leagues</NavLink>
                            <NavLink className={navActivityClass} to="/leaguestore/apparel">Apparel</NavLink>
                            <NavLink className={navActivityClass} to="/leaguestore/quotes">Quotes</NavLink>
                        </div>
                    </div>
                </div>

                <Link className="navbar-brand" to="/leaguestore">
                    <div className="initial-wrapper">
                        <img src={logo} alt="Lee Lee Kiddz League Store Logo"/>
                    </div>
                </Link>

                <div className="nav-bookend tail">
                    <NavLink className={'nav-item nav-link icon-link'} to="/">
                        <span className="material-symbols-outlined">captive_portal</span>
                        <span className="header-title">Lee Lee Kiddz</span>
                    </NavLink>
                    {checkUserRoles(user?.roles, ['LEAGUE_STORE_ADMIN']) &&
                        <NavLink className={'nav-item nav-link'} to="/toolbox/leaguestore">Admin Tool</NavLink>
                    }

                    <NavLink className={'nav-item nav-link'} to="/leaguestore?org_setting=true">
                        <span className="material-symbols-outlined">tv_options_input_settings</span>
                    </NavLink>
                </div>
            </nav>
        </>
    );
}

export default Header;