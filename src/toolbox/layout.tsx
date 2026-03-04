import { useContext } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';

/* Context */
import userContext from '../context/user.context';

import { UserContextType } from '../datatypes';
import { checkUserRoles } from '../utils';

export default function ToolBoxLayout(){
    const navigate = useNavigate();
    const { user } = useContext(userContext.UserContext) as UserContextType;

    if(!checkUserRoles(user?.roles, ['ADMIN','LEAGUE_STORE_ADMIN'])){
        navigate("/");

        // TODO: Fix issue
        // return(<div className="redirecting-page"><h1>Redirecting...</h1></div>);
    }

    return(<Outlet />);
}