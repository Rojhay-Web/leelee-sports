import { Outlet } from 'react-router-dom';
import { ripples } from 'ldrs';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import LeagueStoreLogin from './pages/login';

import Header from './components/header';
import Footer from './components/footer';

import { AdminPathType } from '../datatypes';
import { useContext, useEffect } from 'react';
import { LeagueStoreContextType } from '../datatypes/customDT';

import leagueStoreContext from '../context/leaguestore.context';

export const leagueStoreComponents: AdminPathType[] = [
    // { title: "Leagues", scope:"", icon:"", path:"leagues", element: LeaguesComponent },
];

export default function LeagueStoreLayout(){
    const { leagueStoreUserLoading, leagueStoreUser } = useContext(leagueStoreContext.LeagueStoreContext) as LeagueStoreContextType;
    
    useEffect(()=>{ ripples.register(); },[]);

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
