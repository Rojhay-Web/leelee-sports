import { useContext, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ring } from 'ldrs';
import { toast } from "react-toastify";

import { API_URL, validateEmail, validatePasswordRequirements } from "../../utils";
import { log } from "../../utils/log";
import { UserContextType } from "../../datatypes";

import userContext from '../../context/user.context';

export default function ForgotPassword(){
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [email, setEmail] = useState("");

    const [token, setToken] = useState("");
    const [password, setPassword] = useState("");
    const [password2, setPassword2] = useState("");

    const [valid, setValid] = useState(false);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState("forgot");
    const [passwordRequirements, setPasswordRequirements] = useState<string[]>([]);

    const pageRef = useRef({ password: false });

    const { setCredUser } = useContext(userContext.UserContext) as UserContextType;

    const submitRequest = async () => {
        try {
            if(valid && !loading) {
                setLoading(true);
                let add_path = '',
                    stepData: any = { email: email };

                if(step === "forgot") {
                    add_path = 'forgotPassword';
                } else if(step === "reset"){
                    add_path = 'resetPassword';
                    stepData.token = token;
                    stepData.password = password;
                }

                if(add_path?.length > 0) {
                    const postData = JSON.stringify(stepData);
                    const response = await fetch(`${API_URL}/${add_path}`, {
                        method: "POST", body: postData,
                        headers: {
                            'Content-Type': 'application/json',
                            "Accept": "application/json", 
                        },
                    });

                    const res = await response.json();

                    if(res?.results) {
                        if(step === "forgot"){
                            setStep('reset');
                        } else if(step === "reset") {
                            // Log User In
                            setCredUser(res.results?.user, res.results?.token);
                            // Navigate back to home
                            navigate('/');
                        }
                    } else {
                         toast.error(`Resetting Password: ${res?.error}`, { position: "top-right",
                            autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                            draggable: true, progress: undefined, theme: "light" });
                    }
                }
            }
        } catch(ex){
            log.error(`Submitting Request: ${ex}`);
        }

        setLoading(false);
    }

    const validatePassword = () => {
        let invalidReq = [];
        const pReq = validatePasswordRequirements(password);
                            
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

        setPasswordRequirements(invalidReq);
    }

    useEffect(()=>{ 
        if(pageRef?.current?.password) {
            validatePassword(); 
        }

        pageRef.current.password = true;
    },[password]);

    useEffect(()=>{
        let resetStepValidation = (step !== 'reset' || 
            (
                validatePasswordRequirements(password) && 
                token?.length > 4 &&
                password === password2
            )
        );

        setValid(validateEmail(email) && resetStepValidation);
    },[step, email, token, password, password2]);

    useEffect(()=>{ 
        const reset_token = searchParams.get("token");
        const reset_email = searchParams.get("email");

        if(reset_token) {
            setStep('reset');

            setToken(reset_token);
            if(reset_email) setEmail(reset_email);
        }
    },[searchParams]);

    useEffect(()=>{ ring.register(); },[]);

    return (
        <div className="core-page forgot">              
            <section className="forgot-container">
                <div className="forgot-title">
                    <Link to="/" className="back-link">
                        <span className="material-symbols-outlined">chevron_left</span>
                    </Link>
                    <h1>Forgot Password</h1>
                </div>

                <div className="forgot-controller">
                    <p>Enter the email address used for your Lee Lee Kiddz account.</p>
                    <div className="input-container">
                        <input type="text" name="email" value={email} 
                            placeholder="Please enter your email address"
                            onChange={(e)=> setEmail(e.target.value)} />
                    </div>

                    {step === "reset" &&
                        <div className="reset-container">
                            <div className={`custom-input-container ${token?.length > 4 ? 'clear' : ''}`}>
                                <span className="input-title">Token</span>
                                <div className={`input-container`}>
                                    <input type="text" name="token" value={token} 
                                        placeholder="Please enter your reset token"
                                        onChange={(e)=> setToken(e.target.value)} />
                                </div>
                            </div>

                            <div className="custom-input-container">
                                <span className="input-title">Password</span>

                                <div className="input-container">
                                    <input type="text" name="password" value={password} 
                                        placeholder="Please enter your new password"
                                        autoComplete="off"
                                        onChange={(e)=> setPassword(e.target.value)} />
                                </div>

                                <div className="input-requirements">
                                    {passwordRequirements.map((req,i) =>
                                        <span key={i}>{req}</span>
                                    )}
                                </div>
                            </div>

                            <div className="custom-input-container">
                                <span className="input-title">Confirm Password</span>

                                <div className="input-container">
                                    <input type="text" name="password2" value={password2} 
                                        placeholder="Please enter your new password"
                                        autoComplete="off"
                                        onChange={(e)=> setPassword2(e.target.value)} />
                                </div>

                                <div className="input-requirements">
                                    {(passwordRequirements?.length === 0 && password != password2) && 
                                        <span>Passwords must match</span>
                                    }
                                </div>
                            </div>
                        </div>
                    }
                    
                    <button onClick={submitRequest} disabled={!valid || loading}>
                        {loading && <span><l-ring size="12" stroke="2" speed="2" color="rgba(250,250,250,1)"/></span>}
                        <span>
                            {step === "reset" ? 'Reset Password' : 'Send Reset Link'}
                        </span>
                    </button>                    
                </div>
            </section>       
        </div>
    );
}
