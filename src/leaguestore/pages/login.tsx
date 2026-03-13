import { useContext, useEffect, useRef, useState } from "react";
import { gql, useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { useGoogleLogin } from '@react-oauth/google';
import { toast } from 'react-toastify';

import { log } from "../../utils/log";
import { handleGQLError, validateEmail, validatePasswordRequirements } from "../../utils";

import userContext from "../../context/user.context";
import leagueStoreContext from "../../context/leaguestore.context";

// Images
import store_bg from '../../assets/leagueStore/store_all_long.png';
import google_logo from '../../assets/logo/google_logo.png';

import { UserContextType } from "../../datatypes";
import { LeagueLocationsType, LeagueStoreContextType, OrganizationType } from "../../datatypes/customDT";
type LoginInputType = {
    email: string; password:string;
    firstName:string; lastName: string;
};

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
}`,
GET_ORGANIZATIONS_QUERY = gql`
query GetOrganizations{
    leagueStoreOrganizations(page: -1, pageSize: 15){
        totalResults
        results {
            _id
            name
            address
            city
            state
            zip
            billing_area_id
        }
    }
}`,
GET_LOCATIONS_QUERY = gql`
query GetLocations{
    leagueLocations{
        _id
        name
        merchantInfo {
            store_id
            title
            subText
            defaultLogo
        }
    }
}`,
UPSERT_ORGANIZATION_MUTATION = gql`
mutation UpdateOrganization($id:String, $item: JSONObj){
    upsertLeagueStoreOrganization(id: $id, item: $item)
}`,
UPSERT_LS_USER_MUTATION = gql`
mutation UpsertUser($id:String, $item: JSONObj){
    upsertLeagueStoreUser(id: $id, item: $item)
}`;

function LoginComponent(){
    const [isRegistering, setIsRegistering] = useState(false);

    const [showPassword, setShowPassword] = useState(false);
    const [passwordRequirements, setPasswordRequirements] = useState<string[]>([]);

    const [loginInput, setLoginInput] = useState<LoginInputType>({ email:"", password:"", firstName:"", lastName:""});
    const [validForm, setValidForm] = useState({ email:false, password:false, firstName:false, lastName:false});
    const [submitActive, setSubmitActive] = useState(false);

    const { setCredUser } = useContext(userContext.UserContext) as UserContextType;

    const initStart = useRef<{[key:string]: boolean}>({ init: false, email:false, password:false, firstName:false, lastName:false});
        
    const [registerUser,{ loading: loading_registration, error: error_registration, data: data_registration }] = useLazyQuery(REGISTRATION_QUERY, {fetchPolicy: 'no-cache'});    
    const [loginUser,{ loading: loading_login, error: error_login, data: data_login }] = useLazyQuery(LOGIN_QUERY, {fetchPolicy: 'no-cache'}); 
    const [loginGUser,{ loading: loading_g_login, error: error_g_login, data: data_g_login }] = useLazyQuery(GOOGLE_LOGIN_QUERY, {fetchPolicy: 'no-cache'}); 

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
            } else {
                const checkPwd = checkFormRequirements("password");
                const checkEmail = checkFormRequirements("email");
                const checkFirstNm = checkFormRequirements("firstName");

                setSubmitActive(checkPwd && checkEmail && checkFirstNm);
            }
        }

        initStart.current.init = true;
    },[loginInput, isRegistering]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(()=>{  
        return ()=> { 
            setIsRegistering(defaults.isRegistering);
            setShowPassword(defaults.showPassword);
            setPasswordRequirements(defaults.passwordRequirements);

            setLoginInput({...defaults.loginInput });
            setValidForm({...defaults.validForm});
            setSubmitActive(defaults.submitActive);

            initStart.current = {...defaults.validForm };
        }
    },[]);
    
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
        <div className="ls-access-container">
             {isRegistering ?
                <>
                    <h1>Create your account</h1>
                    <p>Create an account to manage your league store purchases.</p>
                </> : 
                <>
                    <h1>Log in</h1>
                    <p>Welcome back, log in to access your league store account.</p>
                </>
            }
            
            <div className="ls-access-content">
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
                        {!isRegistering &&
                            <div className="btn-container">
                                <button className="forgot-btn" onClick={()=>{}}>Forgot Password?</button>
                            </div>
                        }

                        {passwordRequirements?.length > 0 &&
                            <div className="input-requirements">
                                {passwordRequirements.map((req,i) =>
                                    <span key={i}>{req}</span>
                                )}
                            </div>
                        }
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

                <div className="access-btn" onClick={()=> gLogin()}>
                    <img src={google_logo} alt="Google" />
                    <span>Google</span>
                </div>
            </div>

            {isRegistering ?
                <div className="login-change-link">Already have an account? <button onClick={()=> setIsRegistering(false)}>Login</button></div> : 
                <div className="login-change-link">Don't have an account? <button onClick={()=> setIsRegistering(true)}>Register</button></div> 
            } 
        </div>
    )
}

function StoreUserConfig(){
    const [submitActive, setSubmitActive] = useState(false);
    const [schoolName, setSchoolName] = useState("");
    const [selectedOrgId, setSelectedOrgId] = useState<string | undefined>(undefined);

    const [selectedOrg, setSelectedOrg] = useState<OrganizationType|undefined>(undefined);

    const { user } = useContext(userContext.UserContext) as UserContextType;
    const { fetchLSUser } = useContext(leagueStoreContext.LeagueStoreContext) as LeagueStoreContextType;

    const { loading: loading_org, data: data_org } = useQuery(GET_ORGANIZATIONS_QUERY, { fetchPolicy: 'no-cache' });
    const { loading: loading_loc, data: data_loc } = useQuery(GET_LOCATIONS_QUERY, { fetchPolicy: 'no-cache' });
    
    // Mutations
    const [insertOrganization,{ loading: org_loading, data: org_data, error: org_error }] = useMutation(UPSERT_ORGANIZATION_MUTATION, {fetchPolicy: 'no-cache', onError: handleGQLError});
    const [insertLSUser,{ loading: usr_loading, data: usr_data, error: usr_error }] = useMutation(UPSERT_LS_USER_MUTATION, {fetchPolicy: 'no-cache', onError: handleGQLError});

    const handleChange = (e:any) =>{
        try {
            let name = e.target.name;
            
            if(name === "schoolName"){
                setSchoolName(e.target.value);
            } else if(name === "selectedOrg"){              
                setSelectedOrgId(e.target.value);
            }

        } catch(ex){
            log.error(`Handling Change: ${ex}`);
        }
    }

    const handleOrgChange = (e:any) =>{
        try {
            let name = e.target.name,
                value = e.target.value;
            
            if(selectedOrg){
                setSelectedOrg((p: any) => {
                    return { ...p, [name]:value }
                });
            }
        } catch(ex){
            log.error(`Handling Org Change: ${ex}`);
        }
    }

    const registration = () =>{
        try {
            if(selectedOrgId && selectedOrgId?.length > 0){
                const ls_user = { 
                    blueprint_id: user?._id,
                    sub_org_name: schoolName,
                    organization_id: selectedOrgId
                };
                
                insertLSUser({ 
                    variables: { id: user?._id, item: ls_user }
                });
            } else if(selectedOrg) {
                const leagueLoc:LeagueLocationsType = data_loc?.leagueLocations.find((item:LeagueLocationsType) => 
                    item._id === selectedOrg.billing_area_id
                );

                const ls_org = {
                    ...selectedOrg,
                    merchantInfo: leagueLoc?.merchantInfo
                }

                insertOrganization({ 
                    variables: { id: undefined, item: ls_org }
                });
            }
        } catch(ex){
            log.error(`Registering League Store User: ${ex}`);
        }
    }

    useEffect(()=>{
        if(selectedOrgId != undefined) {
            let selOrg = new OrganizationType();

            if(selectedOrgId?.length > 0){
                selOrg = data_org?.leagueStoreOrganizations?.results.find((item:OrganizationType) => item._id === selectedOrgId);
            }

            setSelectedOrg(selOrg);
        }
    },[selectedOrgId]);

    useEffect(()=>{
        const active_school = schoolName?.length > 0;
        
        const active_org = selectedOrg != undefined
            && (selectedOrg?.name != undefined && selectedOrg?.name?.length > 0)
            && (selectedOrg?.billing_area_id != undefined && selectedOrg?.billing_area_id?.length > 0);

        setSubmitActive(active_school && active_org);
    },[schoolName, selectedOrg]);

    useEffect(()=>{ 
        if(!org_loading ){
            if(org_error){
                const errorMsg = JSON.stringify(org_error, null, 2);
                console.log(errorMsg);

                toast.error(`Error Adding New Orgaization: ${org_error.message}`, { position: "top-right",
                    autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                    draggable: true, progress: undefined, theme: "light" });
            } else if(org_data?.upsertLeagueStoreOrganization){
                toast.success(`Adding New Orgaization`, { position: "top-right",
                    autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                    draggable: true, progress: undefined, theme: "light" });
                
                const ls_user = { 
                    blueprint_id: user?._id,
                    sub_org_name: schoolName,
                    organization_id: org_data?.upsertLeagueStoreOrganization
                };
                
                insertLSUser({ 
                    variables: { id: user?._id, item: ls_user }
                });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[org_loading, org_data, org_error]);

    useEffect(()=>{ 
        if(!usr_loading ){
            if(usr_error){
                const errorMsg = JSON.stringify(usr_error, null, 2);
                console.log(errorMsg);

                toast.error(`Error Registering: ${usr_error.message}`, { position: "top-right",
                    autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                    draggable: true, progress: undefined, theme: "light" });
            } else if(usr_data?.upsertLeagueStoreUser){
                toast.success(`Welcome To The League Store`, { position: "top-right",
                    autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                    draggable: true, progress: undefined, theme: "light" });

                // Refresh LS User Check
                fetchLSUser();
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[usr_loading, usr_data, usr_error]);

    return(
        <div className="ls-access-container">
            <h1>Setup Store Account</h1>
            <p>Configure your account registration billing address.</p>

            <div className="ls-access-content">
                <div className="custom-login-container">
                    <div className="custom-input-container">
                        <span className="input-title">School Name</span>
                        <div className="input-container">
                            <input type="text" name="schoolName" value={schoolName} onChange={handleChange} />
                        </div>
                    </div>

                    <div className="custom-input-container">
                        <span className="input-title">Select Organization Address</span>
                        <div className="input-container">
                            <select name="selectedOrg" value={selectedOrgId} onChange={handleChange}>
                                <option hidden>Select a organization billing address</option>
                                <option value="">Add New Organization Address</option>
                                {data_org?.leagueStoreOrganizations?.results?.map((org: OrganizationType, i: number) =>
                                    <option value={org?._id} key={i}>{org.name}</option>
                                )}
                            </select>
                        </div>
                    </div>

                    {selectedOrg != undefined &&
                        <div className="custom-login-cluster">
                            {/* Organization Name */}
                            <div className="custom-input-container sz-4">
                                <span className="input-title">Organization Name</span>
                                <div className="input-container">
                                    <input type="text" name="name" value={selectedOrg?.name ?? ""} onChange={handleOrgChange} disabled={(selectedOrg?._id ? true : false)}/>
                                </div>
                            </div>

                            {/* Organization Address */}
                            <div className="custom-input-container sz-6">
                                <span className="input-title">Organization Address</span>
                                <div className="input-container">
                                    <input type="text" name="address" value={selectedOrg?.address ?? ""} onChange={handleOrgChange} disabled={(selectedOrg?._id ? true : false)}/>
                                </div>
                            </div>


                            {/* City */}
                            <div className="custom-input-container sz-5">
                                <span className="input-title">City</span>
                                <div className="input-container">
                                    <input type="text" name="city" value={selectedOrg?.city ?? ""} onChange={handleOrgChange} disabled={(selectedOrg?._id ? true : false)}/>
                                </div>
                            </div>

                            {/* State */}
                            <div className="custom-input-container sz-2">
                                <span className="input-title">State</span>
                                <div className="input-container">
                                    <input type="text" name="state" value={selectedOrg?.state ?? ""} onChange={handleOrgChange} disabled={(selectedOrg?._id ? true : false)}/>
                                </div>
                            </div>

                            {/* Zip */}
                            <div className="custom-input-container sz-3">
                                <span className="input-title">Zip</span>
                                <div className="input-container">
                                    <input type="text" name="zip" value={selectedOrg?.zip ?? ""} onChange={handleOrgChange} disabled={(selectedOrg?._id ? true : false)} />
                                </div>
                            </div>

                            {/* Billing Area Id */}
                            <div className="custom-input-container sz-10">
                                <span className="input-title">Billing Area</span>
                                <div className="input-container">
                                    <select name="billing_area_id" value={selectedOrg?.billing_area_id ?? ""} onChange={handleOrgChange} disabled={(selectedOrg?._id ? true : false)}>
                                        <option hidden>Select a organization billing area</option>
                                        {data_loc?.leagueLocations?.map((loc: LeagueLocationsType, i: number) =>
                                            <option value={loc?._id} key={i}>{loc.name}</option>
                                        )}
                                    </select>
                                </div>
                            </div>
                        </div>
                    }
                </div>
            </div>

            <div className="access-btn-container end">
                <div className={`access-btn submit ${submitActive ? 'active' : 'inactive'}`} onClick={registration}>
                    <span>Register</span>
                    {(org_loading || usr_loading) &&
                        <span className="material-symbols-outlined loading">app_badging</span>
                    }
                </div>
            </div>
        </div>
    )
}

export default function LeagueStoreLogin(){
    const { user } = useContext(userContext.UserContext) as UserContextType;

    useEffect(()=>{ },[]);

    return (
        <div className="ls-page ls-login">
            <div className="page-background">
                <img src={store_bg} alt="Lee Lee Kiddz League Store" />
            </div>

            <section className="login-section">
                <div className="section-container info">
                    <h1>Welcome</h1>
                    <p>
                        Our new streamlined store makes it easier than ever for school and city families 
                        to join the <span className="c1">Lee Lee Kiddz</span> family. 
                        Every league supports our mission to provide <span className="c2">STEM tutoring</span>, <span className="c2">mentorship</span>, and <span className="c2">social-emotional support</span> to students across Baltimore.
                    </p>
                    
                    <div className="dividor" />

                    <p>
                        Beyond the roster, we’ve curated an exclusive collection from performance-ready jerseys 
                        that represent your team with pride along with other equipment.  
                    </p>
                </div>

                <div className="section-container form">
                    <div className="login-ctrl-container">
                        { !user ? <LoginComponent /> : <StoreUserConfig /> }
                    </div>
                </div>
            </section>
        </div>
    );
}
