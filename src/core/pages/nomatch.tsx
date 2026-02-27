import { useContext, useEffect } from "react";
import { spiral } from 'ldrs'

import userContext from "../../context/user.context";
import { UserContextType } from "../../datatypes";

function NoMatch(){
    const { loading, loading_permissions } = useContext(userContext.UserContext) as UserContextType;
    
    useEffect(()=>{ spiral.register(); },[])

    return (
        <div className="no-match-page">              
            <div className="loading-container">
                <l-spiral size="150" speed="0.9" color="black" />
                {(loading || loading_permissions) ? <></> : 
                    <div className="no-page-txt">
                        <h1>404</h1>
                        <p>Sorry Unable to find this page</p>
                    </div>
                }
            </div>            
        </div>
    );
}

export default NoMatch;