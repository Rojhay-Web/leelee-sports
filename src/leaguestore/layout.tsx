import { Outlet } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import LeagueStoreLogin from './pages/login';

import Header from './components/header';
import Footer from './components/footer';

import { AdminPathType } from '../datatypes';

export const leagueStoreComponents: AdminPathType[] = [
    // { title: "Leagues", scope:"", icon:"", path:"leagues", element: LeaguesComponent },
];

export default function LeagueStoreLayout(){
    return (
        <div className='app-body'>
            <ToastContainer />
            <Header />
            <div className={`store-page-body`}>
                {/*<Outlet />*/}
                <LeagueStoreLogin />
            </div>
            <Footer />
        </div>
    );
}
