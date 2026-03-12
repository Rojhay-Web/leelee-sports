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

/* Admin Pages */
import AdminLayout from "./admin/components/blueprint/adminLayout";
import AdminHome from "./admin/pages/blueprint/adminHome";

/* Core Pages */
import Layout from "./core/layout";
import NoMatch from "./core/pages/nomatch";
import Home from "./core/pages/home";

/* Toolbox */
import ToolBoxLayout from "./toolbox/layout";
import ToolBoxLanding from "./toolbox/landing";

/* Toolbox - League Store */
import LeagueStoreToolboxLayout, { toolboxLeagueStoreComponents } from "./toolbox/leagueStore/layout";
import LeagueLanding from "./toolbox/leagueStore/pages/landing";

/* LeagueStore */
import LeagueStoreLayout, { leagueStoreComponents } from "./leaguestore/layout";
import LeagueStoreLanding from "./leaguestore/pages/landing";

const paths = [
    { path: "*", element: NoMatch }
];

function SiteRoutes(){
    const { activeComponents } = useContext(userContext.UserContext) as UserContextType;

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
                <Route path="/allaccess" element={<AdminLayout />}>
                    <Route index element={<AdminHome />} />
                    {activeComponents?.map((art: AdminPathType, i:number) =>
                        <Route path={art.path} element={<art.element />} key={i} />
                    )}
                    <Route path="*" element={<NoMatch />} />
                </Route>

                {/* Toolbox */}
                <Route path="/toolbox" element={<ToolBoxLayout />}>
                    <Route index element={<ToolBoxLanding /> } />
                    {/* League Store */}
                    <Route path="leaguestore" element={<LeagueStoreToolboxLayout />}>
                        <Route index element={<LeagueLanding /> } />

                        {toolboxLeagueStoreComponents?.map((art: AdminPathType, i:number) =>
                            <Route path={art.path} element={<art.element />} key={i} />
                        )}
                        <Route path="*" element={<NoMatch />} />
                    </Route>
                </Route>

                {/* League Store */}
                <Route path="/leaguestore" element={<LeagueStoreLayout />}>
                    <Route index element={<LeagueStoreLanding /> } />

                    {leagueStoreComponents?.map((art: AdminPathType, i:number) =>
                        <Route path={art.path} element={<art.element />} key={i} />
                    )}
                    <Route path="*" element={<NoMatch />} />
                </Route>
            </>
        ));
   return (<RouterProvider router={router} />)
}

export default SiteRoutes;