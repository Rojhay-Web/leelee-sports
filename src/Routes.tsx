import "./styles/app.less";

import { useContext } from "react";
import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  RouterProvider,
} from "react-router-dom";

/* Types */
import { AdminPathType, UserContextType } from "./datatypes";

/* Context */
import userContext from "./context/user.context";

/* Layouts */
import Layout from "./core/components/layout";
import AdminLayout from "./admin/components/blueprint/adminLayout";

/* Admin Pages */
import AdminHome from "./admin/pages/blueprint/adminHome";

/* Core Pages */
import NoMatch from "./core/pages/nomatch";
import Home from "./core/pages/home";

import { checkUserRole } from "./utils";

const paths = [
    { path: "*", element: NoMatch }
];

function SiteRoutes(){
    const { user, activeComponents } = useContext(userContext.UserContext) as UserContextType;

    const router = createBrowserRouter(
        createRoutesFromElements(
            <>
                {/* Core Routes */ }
                <Route path="/" element={<Layout />}>
                    <Route index element={<Home />} />
                    {paths.map((rt, i) => 
                        <Route path={rt.path} element={<rt.element />}  key={i} /> 
                    )}
                </Route>

                {/* Admin Routes */ }
                <Route path="/allaccess" element={(checkUserRole('ADMIN', user?.roles) ? <AdminLayout /> : <Layout />)}>
                    <Route index element={(checkUserRole('ADMIN', user?.roles) ? <AdminHome /> : <NoMatch />)} />
                    {activeComponents?.map((art: AdminPathType, i:number) =>
                        <Route path={art.path} element={(checkUserRole('ADMIN', user?.roles) ? <art.element />: <NoMatch />)} key={i} />
                    )}
                    <Route path="*" element={<NoMatch />} />
                </Route>
            </>
        ));
   return (<RouterProvider router={router} />)
}

export default SiteRoutes;