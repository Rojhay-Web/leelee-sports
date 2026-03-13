import { useContext, useState } from "react";
import { Link, NavLink } from "react-router-dom";

import userContext from "../../context/user.context";

import { User, UserContextType } from "../../datatypes";

/* Images */
import logo from '../../assets/logo/leeleekiddz_league_store.png';
import { checkUserRoles } from "../../utils";


function MobileNav({ user, isOpen, setIsOpen }: { user: User | null, isOpen: boolean, setIsOpen: (s:boolean) => void }) {
    return (
        <div className={`m-sidenav-container ${(isOpen ? "active": "")}`}>
            <div className="m-nav-close" onClick={() => setIsOpen(false)}><span className="close-nav" /></div>
            <div className="m-sidenav-section">
                <NavLink className="m-sidenav-link" to="/leaguestore/leagues" onClick={() => setIsOpen(false)}>Leagues</NavLink>
                <NavLink className="m-sidenav-link" to="/leaguestore/apparel" onClick={() => setIsOpen(false)}>Apparel</NavLink>
                <NavLink className="m-sidenav-link" to="/leaguestore/quotes" onClick={() => setIsOpen(false)}>Quotes</NavLink>
            </div>

            <div className="m-sidenav-section tail">
                <NavLink className="m-sidenav-link mini-link" to="/" onClick={() => setIsOpen(false)}>Lee Lee Kiddz</NavLink>
                {checkUserRoles(user?.roles, ['LEAGUE_STORE_ADMIN']) &&
                    <NavLink className="m-sidenav-link mini-link" to="/toolbox/leaguestore" onClick={() => setIsOpen(false)}>Admin Tool</NavLink>
                }
                <NavLink className="m-sidenav-link mini-link" to="/leaguestore?org_setting=true" onClick={() => setIsOpen(false)}>Account Settings</NavLink>
            </div>
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
            <MobileNav isOpen={sideNav} setIsOpen={setSidebarDisplay} user={user}/>
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

                <div className="collapse navbar-collapse nav-bookend tail">
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

                <button className="navbar-toggler" type="button" aria-label="Toggle navigation" onClick={() => setSidebarDisplay(true)}>
                    <span className="material-symbols-outlined navbar-toggler-icon">menu</span>
                </button>
            </nav>
        </>
    );
}

export default Header;