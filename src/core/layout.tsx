import { Outlet } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Footer from './components/footer';
import Header from './components/header';

function Layout(){
    return (
        <div className='app-body'>
            <ToastContainer />
            <Header />
            <div className={`page-body`}>
                <Outlet />
            </div>
            <Footer />
        </div>
    );
}

export default Layout;