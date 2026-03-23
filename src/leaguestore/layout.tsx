import { useContext, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { ripples } from 'ldrs';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import LeagueStoreLogin from './pages/login';
import Leagues from './pages/leagues';
import Apparel from './pages/apparel';
import StoreCart from './pages/storeCart';
import Quotes from './pages/quotes';

import Header from './components/header';
import Footer from '../core/components/footer';
// import Footer from './components/footer';

import leagueStoreContext from '../context/leaguestore.context';
import userContext from '../context/user.context';

import { AdminPathType, UserContextType } from '../datatypes';
import { LeagueStoreContextType } from '../datatypes/customDT';

export const leagueStoreComponents: AdminPathType[] = [
    { title: "Leagues", scope:"", icon:"", path:"leagues", element: Leagues },
    { title: "Apparel", scope:"", icon:"", path:"apparel", element: Apparel },
    { title: "Store Cart", scope:"", icon:"", path:"cart", element: StoreCart },
    { title: "Quotes", scope:"", icon:"", path:"quotes", element: Quotes },
];

export default function LeagueStoreLayout(){
    const { leagueStoreUserLoading, leagueStoreUser, setLeagueStoreUser } = useContext(leagueStoreContext.LeagueStoreContext) as LeagueStoreContextType;
    const { user } = useContext(userContext.UserContext) as UserContextType;

    useEffect(()=>{ ripples.register(); },[]);

    useEffect(()=> {
        if(!user && leagueStoreUser) {
            setLeagueStoreUser(null);
        }
    },[user]);

    return (
        <div className='app-body'>
            <ToastContainer />
            <Header />
            <div className={`store-page-body`}>
                {leagueStoreUserLoading ?
                    <div className='loading-container'><l-ripples size="250" speed="2" color="rgba(255,117,201,1)"></l-ripples></div> :
                    <>
                        {leagueStoreUser?._id ? <Outlet /> : <LeagueStoreLogin /> }
                    </>
                }
            </div>
            <Footer />
        </div>
    );
}
