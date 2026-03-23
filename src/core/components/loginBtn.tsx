import { useContext, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useGoogleLogin } from '@react-oauth/google';
import { toast } from 'react-toastify';
import { gql, useLazyQuery } from '@apollo/client';
import Rodal from "rodal";

import userContext from "../../context/user.context";
import { UserContextType } from "../../datatypes";
import { checkUserRole, validateEmail, validatePasswordRequirements } from "../../utils";

import { log } from "../../utils/log";

// Images
import google_logo from '../../assets/logo/google_logo.png';
import miles_logo from '../../assets/logo/miles_logo_c1.png';
// TODO: ADD SITE LOGO
import leaguestore_logo from '../../assets/logo/leeleekiddz_league_store.png';

type LoginInputType = {
    email: string; password:string;
    firstName:string; lastName: string;
};

type AccessModalType = {
    modalShow: boolean;
    closeModal: ()=> void
}

const defaults = {
    loginInput: { email:"", password:"", firstName:"", lastName:""},
    validForm: { init: false, email:false, password:false, firstName:false, lastName:false},
    passwordRequirements: [],
    showPassword: false,
    isRegistering: false,
    submitActive: false
}

/* GQL Queries */
const REGISTRATION_QUERY = gql`
query Registration($email: String!, $password: String!, $firstName: String!, $lastName: String){
    registerUser(email: $email, password: $password, firstName: $firstName, lastName: $lastName){
        token
        user {    
            _id
            email
            name
            picture
            roles
            scopes
        }
    }
}`, 
LOGIN_QUERY = gql`
query Login($email: String!, $password: String!){
    loginUser(email: $email, password: $password){
        token
        user {
            _id
            email
            name
            picture
            roles
            scopes
        }
    }
}`,
GOOGLE_LOGIN_QUERY = gql`
query googleLogin($token: String!){
    loginGUser(token: $token){
        token
        user {
            email
            name
            picture
            _id
            roles
            scopes
        }
    }
}`;


function UserAccessModal({ modalShow, closeModal }:AccessModalType){
    const [isRegistering, setIsRegistering] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [passwordRequirements, setPasswordRequirements] = useState<string[]>([]);

    const [loginInput, setLoginInput] = useState<LoginInputType>({ email:"", password:"", firstName:"", lastName:""});
    const [validForm, setValidForm] = useState({ email:false, password:false, firstName:false, lastName:false});
    const [submitActive, setSubmitActive] = useState(false);

    const { setCredUser } = useContext(userContext.UserContext) as UserContextType;

    const [registerUser,{ loading: loading_registration, error: error_registration, data: data_registration }] = useLazyQuery(REGISTRATION_QUERY, {fetchPolicy: 'no-cache'});    
    const [loginUser,{ loading: loading_login, error: error_login, data: data_login }] = useLazyQuery(LOGIN_QUERY, {fetchPolicy: 'no-cache'}); 
    const [loginGUser,{ loading: loading_g_login, error: error_g_login, data: data_g_login }] = useLazyQuery(GOOGLE_LOGIN_QUERY, {fetchPolicy: 'no-cache'});

    const initStart = useRef<{[key:string]: boolean}>({ init: false, email:false, password:false, firstName:false, lastName:false});
    
    const gLogin = useGoogleLogin({
        onSuccess: (tokenResponse) => {  
            loginGUser({ variables: { token: tokenResponse.access_token }});
        },
        onError:(error) => { 
            log.error(`Google Login: ${error}`);
            toast.error("Sorry, We were unable to login with google [Please Contact Site Admin]", { position: "top-right",
                autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                draggable: true, progress: undefined, theme: "light" });    
        }
    });

    const handleChange = (e:any) =>{
        try {
            let name = e.target.name;
            initStart.current[name] = true;
            setLoginInput((d)=>{
                return {...d, [name]: e.target.value };
            });

        } catch(ex){
            log.error(`Handling Change: ${ex}`);
        }
    }

    const accessAction = () => {
        try {
            if(!loading_registration && !loading_login){
                if(isRegistering){
                    registerUser({ variables: {
                        email: loginInput?.email,
                        password: loginInput?.password,
                        firstName: loginInput?.firstName,
                        lastName: loginInput?.lastName,
                    }});
                }
                else {
                    loginUser({ variables: {
                        email: loginInput?.email,
                        password: loginInput?.password,
                    }});
                }
            }
        } catch(ex){
            log.error(`Access Action : ${ex}`);
        }
    }

    const checkFormRequirements = (type: string) => {
        try {
            let invalidReq = [];

            switch(type){
                case "password":
                    const pReq = validatePasswordRequirements(loginInput?.password);
                    
                    if(pReq?.str_length) {
                        invalidReq.push('Must be at least 8 characters')
                    }
                    if(pReq?.u_case) {
                        invalidReq.push('Atleast 1 uppercase letter (A-Z)')
                    }
                    if(pReq?.l_case) {
                        invalidReq.push('Atleast 1 lowercase letter (a-z)')
                    }
                    if(pReq?.special) {
                        invalidReq.push('Atleast 1 special character (e.g., !, @, #, $)')
                    }
                    if(pReq?.numeric) {
                        invalidReq.push('Atleast 1 number (0-9)')
                    }
                    break;
                case "email":
                    if(!validateEmail(loginInput?.email)){
                        invalidReq.push("Invalid Email");
                    }
                    break;
                case "firstName":
                    if(loginInput?.firstName?.length <= 0){
                        invalidReq.push("Invalid Firstname");
                    }
                    break;
                default:
                    break;
            }
            
            // Set form validation on field
            if(initStart?.current[type]){
                setValidForm((d) => { return {...d, [type]: invalidReq?.length > 0 }; });
                if(type === "password"){
                    setPasswordRequirements(invalidReq);
                }
            }
            return invalidReq?.length === 0;
        } catch(ex){
            log.error(`Checking Password Requirements: ${ex}`);
        }

        return false;
    }

    useEffect(()=>{
        if(initStart?.current.init) {
            if(!isRegistering){
                setSubmitActive(validateEmail(loginInput?.email));
            }
            else {
                const checkPwd = checkFormRequirements("password");
                const checkEmail = checkFormRequirements("email");
                const checkFirstNm = checkFormRequirements("firstName");

                setSubmitActive(checkPwd && checkEmail && checkFirstNm);
            }
        }
    },[loginInput, isRegistering]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(()=>{ 
        initStart.current.init = modalShow; 
        return ()=> { 
            setIsRegistering(defaults.isRegistering);
            setShowPassword(defaults.showPassword);
            setPasswordRequirements(defaults.passwordRequirements);

            setLoginInput({...defaults.loginInput });
            setValidForm({...defaults.validForm});
            setSubmitActive(defaults.submitActive);

            initStart.current = {...defaults.validForm };
        }
    },[modalShow]);

    // Registration
    useEffect(()=>{
        if(!loading_registration && data_registration?.registerUser){
            setCredUser(data_registration.registerUser?.user, data_registration.registerUser?.token);
        }
    },[loading_registration, data_registration]); // eslint-disable-line react-hooks/exhaustive-deps

    // Blueprint Login
    useEffect(()=>{
        if(!loading_login && data_login?.loginUser){
            setCredUser(data_login.loginUser?.user, data_login.loginUser?.token);
        }
    },[loading_login, data_login]); // eslint-disable-line react-hooks/exhaustive-deps

    // Google Login
    useEffect(()=>{
        if(!loading_g_login && data_g_login?.loginGUser){
            setCredUser(data_g_login.loginGUser?.user, data_g_login.loginGUser?.token);
        }
    },[loading_g_login, data_g_login]); // eslint-disable-line react-hooks/exhaustive-deps

    // Error Messaging
    useEffect(()=>{
        if(error_registration) {
            toast.error(error_registration?.message, { position: "top-right",
                autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                draggable: true, progress: undefined, theme: "light" });
        } else if(error_login){
            toast.error(error_login?.message, { position: "top-right",
                autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                draggable: true, progress: undefined, theme: "light" });
        } else if(error_g_login) {
            toast.error(error_g_login?.message, { position: "top-right",
                autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                draggable: true, progress: undefined, theme: "light" });
        }
    },[error_registration, error_login, error_g_login]);

    return(
        <div className="user-access-container">
            <div className="user-access-title">
                <img src={miles_logo} alt="SITE LOGO" />
            </div>
            {isRegistering ?
                <>
                    <h1>Create your account</h1>
                    <p>Create an account to personalize your experience and stay connected.</p>
                </> : 
                <>
                    <h1>Log in to your account</h1>
                    <p>Welcome back, log in to stay connected and up to date.</p>
                </>
            }

            <div className="user-access-content">
                <div className="access-btn-container">
                    <div className="access-btn" onClick={()=> gLogin()}>
                        <img src={google_logo} alt="Google" />
                        <span>Google</span>
                    </div>
                </div>

                <div className="divider"><span>Or with email and password</span></div>

                <div className="custom-login-container">
                    <div className="custom-input-container">
                        <span className="input-title">Email Address</span>
                        <div className="input-container">
                            <input type="text" name={"email"} value={loginInput['email']} onChange={handleChange} />
                            {validForm?.email && <span className="material-symbols-outlined warning">warning</span>}
                        </div>
                    </div>
                    {isRegistering &&
                        <>
                            <div className="custom-input-container">
                                <span className="input-title">First Name</span>
                                <div className="input-container">
                                    <input type="text" name={"firstName"} value={loginInput['firstName']} onChange={handleChange} />
                                    {validForm?.firstName && <span className="material-symbols-outlined warning">warning</span>}
                                </div>
                            </div>

                            <div className="custom-input-container">
                                <span className="input-title">Last Name</span>
                                <div className="input-container">
                                    <input type="text" name={"lastName"} value={loginInput['lastName']} onChange={handleChange} />
                                </div>
                            </div>
                        </>
                    }

                    <div className="custom-input-container">
                        <span className="input-title">Password</span>
                        <div className="input-container">
                            <input type={showPassword ? "text":"password"} name={"password"} value={loginInput['password']} onChange={handleChange} />
                            <span className="material-symbols-outlined" onClick={()=>{ setShowPassword((d) => !d)}}>{showPassword ? "visibility" :"visibility_off"}</span>
                        </div>

                        <div className="input-requirements">
                            {passwordRequirements.map((req,i) =>
                                <span key={i}>{req}</span>
                            )}
                        </div>
                    </div>
                </div>
            </div> 

            <div className="access-btn-container end">
                <div className={`access-btn submit ${submitActive ? 'active' : 'inactive'}`} onClick={accessAction}>
                    <span>{isRegistering ? "Sign up" : "Login"}</span>
                    {(loading_registration || loading_login) &&
                        <span className="material-symbols-outlined loading">app_badging</span>
                    }
                </div>
            </div>

            {isRegistering ?
                <div className="login-change-link">Already have an account? <span onClick={()=> setIsRegistering(false)}>Login</span></div> : 
                <>
                    <Link to="/forgotPassword" className="forgot-link" onClick={closeModal} >Forgot Password</Link>
                    <div className="login-change-link">Don't have an account? <span onClick={()=> setIsRegistering(true)}>Register</span></div> 
                </>
            }   
        </div>
    );
}

function AppAccessModal({ closeModal }:AccessModalType){
    const { user, setCredUser } = useContext(userContext.UserContext) as UserContextType;
        
    const signOff = () => {
        try {
            if(window.confirm('Are you sure you want to Sign out?')){
                setCredUser(null, undefined);  closeModal();
                localStorage.removeItem(import.meta.env.VITE_APP_SESSION_KEY);
            }
        }
        catch(ex){
            log.error(`Unable to signOff: ${ex}`);
        }
    }

    return(
        <div className="user-access-container">
            <div className="user-title-row">
                <div className="usr-img-container">
                    {user?.picture ?
                        <img src={user.picture} alt="User Profile" /> :
                        <span className="material-symbols-outlined">person</span>
                    }
                </div>
                <div className="user-name">Welcome <span>{user?.name ?? "To Our Portal"}</span></div>
            </div>

             
            <div className="access-btn-container">
                {checkUserRole('ADMIN', user?.roles) &&
                    <Link to="/allAccess" className="access-panel-btn">
                        <img src={miles_logo} alt="Google" />
                        <div className="title-container">
                            <h2>Miles Admin Portal</h2>
                            <p>Your friendly neighborhood all-in-one control center for managing site content, settings, and updates with speed and simplicity.</p>
                        </div>

                        <span className="material-symbols-outlined link-icon">arrow_forward_ios</span>
                    </Link>
                }

                <Link to="/leagueStore" className="access-panel-btn">
                    <img src={leaguestore_logo} alt="Lee Lee League Store" />
                    <div className="title-container">
                        <h2>League Store</h2>
                        <p>Your one-stop community hub for our local kids sports leagues while grabbing the official team gear they need to compete.</p>
                    </div>

                    <span className="material-symbols-outlined link-icon">arrow_forward_ios</span>
                </Link>
            </div> 

            <div className="modal-btn-container">
                <div className="modal-btn sign-out" onClick={signOff}>
                    <span className="material-symbols-outlined link-icon">logout</span>
                    <span>Signout</span>
                </div>
            </div>
        </div>
    );
}

export default function LoginBtn(){
    const [show, setShow] = useState(false);
    const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

    const { user } = useContext(userContext.UserContext) as UserContextType;

    const toggleShow = () => { setShow((d)=> !d ); }
    const calcModalSize = () => {
        let ret = { width: 400, height: 300 };
        try {
            ret.width = (windowSize.width > 400 ? 400 : .90 * windowSize.width);
            ret.height = (windowSize.height < 250 ? 250 : .80 * windowSize.height);
        }
        catch(ex){
            log.error(`Calculating Modal Size: ${ex}`);
        }
        return ret;
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
            <div className={`admin-btn-container ${!user ? 'non-user':''}`} onClick={toggleShow}>
                {!user ?
                    <span className="material-symbols-outlined">account_circle</span>:
                    <>
                        {checkUserRole('ADMIN', user?.roles) ? 
                            <span className="material-symbols-outlined">apps</span> :
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

            <Rodal className="admin-user-btn-container" visible={show} onClose={() => { setShow(false); }} 
                width={calcModalSize().width} height={calcModalSize().height}>
                    {!user ? <UserAccessModal modalShow={show} closeModal={()=> setShow(false)} /> : <AppAccessModal modalShow={show} closeModal={()=> setShow(false)} /> }
            </Rodal>
        </>
    );
}
