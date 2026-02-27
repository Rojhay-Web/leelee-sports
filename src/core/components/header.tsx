import { useState } from "react";
import { Link, NavLink } from "react-router-dom";

import LoginBtn from "./loginBtn";

/* Images */
import logo from "../../assets/logo/logo_kiddz3.png";

function MobileNav({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (s:boolean) => void }) {
    return (
        <div className={`m-sidenav-container ${(isOpen ? "active": "")}`}>
            <div className="m-nav-close" onClick={() => setIsOpen(false)}><span className="close-nav" /></div>
            <div className="m-sidenav-section">
                <NavLink className="m-sidenav-link" to="/" onClick={() => setIsOpen(false)}>Home</NavLink>
                <NavLink className="m-sidenav-link" to="/leagues" onClick={() => setIsOpen(false)}>Leagues</NavLink>
                <NavLink className="m-sidenav-link" to="/rules" onClick={() => setIsOpen(false)}>Rulesbook</NavLink>
                <NavLink className="m-sidenav-link" to="/media" onClick={() => setIsOpen(false)}>Media</NavLink>
            </div>
        </div>
    );
}

function Header(){
    const [sideNav, setSideNav] = useState(false);
    const setSidebarDisplay = (status: boolean) => {
        document.body.classList.toggle('noscroll', status);
        setSideNav(status);
    }
    
    return (
        <>
            <MobileNav isOpen={sideNav} setIsOpen={setSidebarDisplay}/>
            <nav className="navbar navbar-expand-lg">
                <button className="navbar-toggler" type="button" aria-label="Toggle navigation" onClick={() => setSidebarDisplay(true)}>
                    <span className="material-symbols-outlined navbar-toggler-icon">menu</span>
                </button>

                <Link className="navbar-brand" to="/">
                    <div className="initial-wrapper">
                        <img src={logo} alt="Lee Lee Kiddz Logo"/>
                    </div>
                </Link>

                <div className="collapse navbar-collapse">
                    <div className="collapse-container">
                        <div className='page-nav-container'>
                            <NavLink className="nav-item nav-link" to="/leagues">Leagues</NavLink>
                            <NavLink className="nav-item nav-link" to="/rules">Rulesbook</NavLink>
                            <NavLink className="nav-item nav-link" to="/media">Media</NavLink>
                        </div>
                    </div>
                </div>

                <div className="nav-tail">
                    <a href="https://account.venmo.com/u/leeleeff" target="_blank" className="link-btn c2alt">
                        <span className="icon material-symbols-outlined">volunteer_activism</span>
                        <span>Donate</span>
                    </a>
                    <div className="nav-login-btn-container">
                        <LoginBtn />
                    </div>
                </div>
            </nav>
        </>
    );
}

export default Header;