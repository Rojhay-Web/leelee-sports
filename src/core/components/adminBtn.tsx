import { useContext, useEffect, useState } from "react";
import { useGoogleLogin } from '@react-oauth/google';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import Rodal from "rodal";

import userContext from "../../context/user.context";
import { UserContextType } from "../../datatypes";
import { log } from "../../utils/log";
import { checkUserRole } from "../../utils";

function AdminBtn(){
    const [userModal, setUserModal] = useState(false);
    const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

    const { user, setUser, setUserToken } = useContext(userContext.UserContext) as UserContextType;
    
    const gLogin = useGoogleLogin({
        onSuccess: (tokenResponse) => { setUserToken(tokenResponse); },
        onError:(error) => { 
            log.error(`Google Login: ${error}`);
            toast.error("Sorry, We were unable to login with google [Please Contact Site Admin]", { position: "top-right",
                autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                draggable: true, progress: undefined, theme: "light" });    
        }
    });

    const btnAction = () => {
        try {
            if(!user) {
                gLogin();
            }
            else {
                // Open Logged in Modal
                setUserModal((d) => { return !d; });
            }
        }
        catch(ex){
            log.error(`Admin Button Action: ${ex}`);
        }
    }

    const calcModalSize = () => {
        let ret = { width: 400, height: 300 };
        try {
            ret.width = (windowSize.width > 832 ? 500 : .25 * windowSize.width);
            ret.height = (windowSize.height < 250 ? 250 : .25 * windowSize.height);
        }
        catch(ex){
            log.error(`Calculating Modal Size: ${ex}`);
        }
        return ret;
    }

    const signOff = () => {
        try {
            if(window.confirm('Are you sure you want to Sign out?')){
                setUser(null); setUserModal(false);
                localStorage.removeItem(import.meta.env.VITE_APP_SESSION_KEY);
            }
        }
        catch(ex){
            log.error(`Unable to signOff: ${ex}`);
        }
    }

    useEffect(()=> {
        function handleResize() {
            setWindowSize({ width: window.innerWidth, height: window.innerHeight });
        }
      
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize); 
    },[]);

    return (
        <>
            <div className={`admin-btn-container ${!user ? 'non-user':''}`} onClick={btnAction}>
                {!user ?
                    <span className="material-symbols-outlined">account_circle</span>:
                    <>
                        {checkUserRole('ADMIN', user?.roles) ? 
                            <Link className="app-link" to="/allAccess"><span className="material-symbols-outlined">apps</span></Link> :
                            <>  
                                {user?.picture ?
                                    <img src={user.picture} alt="User Profile" /> :
                                    <span className="material-symbols-outlined">person</span>
                                }
                            </>
                        }
                    </>
                }
            </div> 

            <Rodal className="admin-user-btn-container" visible={userModal} onClose={() => { setUserModal(false); }} 
                width={calcModalSize().width} height={calcModalSize().height}>
                    <div className="sign-out-link" onClick={signOff}>{user?.email} Sign-out</div>
            </Rodal>
        </>
    );
}

export default AdminBtn;