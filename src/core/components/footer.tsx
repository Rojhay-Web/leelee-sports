import { useState } from "react";

import { Link } from "react-router-dom";

/* Images */
import logo from "../../assets/logo/logo_kiddz3.png";

function Footer(){
    const [copyrightDate, setCopyrightDate] = useState('2026');

    return (
        <div className="footer-container">
            <div className="footer-background" />
            <div className="footer">
                <div className="footer-section">
                    <div className="footer-title main">Lee Lee</div>
                    <div className="footer-subtitle plus">KIDDZ LEAGUE</div>
                    <div className="footer-title">Contact Us</div>
                    <p className="item"><i className="far fa-envelope"/> <span>leeleekiddz@leeleeff.com</span></p>
                    <div className="item icon-section">
                        <a href="https://www.instagram.com/leeleekiddz/" target="_blank"><i className="fab fa-instagram"/></a>
                        <a href="https://www.facebook.com/profile.php?id=100092479205096/" target="_blank"><i className="fab fa-facebook"/></a>
                        <a href="https://www.youtube.com/channel/UCJmXEwpe1vFAmsuuQT9onwQ" target="_blank"><i className="fab fa-youtube"/></a>
                    </div>
                </div>

                <div className="footer-section ctr">                            
                    <img src={logo} alt="Lee Lee Flag Football Logo"/>
                </div>

                <div className="footer-section split">
                    <div className="footer-title">Site Resources</div>
                    <div className="link-column">
                        <Link className="item item-link" to="/leagues">League Info</Link>
                        <Link className="item item-link" to="/leagues/schedule">League Schedules</Link>
                        <Link className="item item-link" to="/leaguestore">League Store</Link>
                    </div>
                    <div className="link-column">                            
                        <Link className="item item-link" to="/media">Media</Link>
                        <Link className="item item-link" to="/rules">Rules</Link>
                    </div>
                </div>
            </div>

            <div className="footer-bottom">
                <i className="far fa-copyright"/>
                <span>{copyrightDate}. Lee Lee Kiddz. All Rights Reserved.</span>
            </div>
        </div>
    );
}

export default Footer;