import "./styles/app.less";
import SiteRoutes from "./Routes";

// Contexts
import ContextCompose from "./context";
import UserContext from "./context/user.context";
import ApolloContext from "./context/apollo.context";
import LeagueStoreContext from "./context/leaguestore.context";

function App(){
    return(
        <ContextCompose items={[
            [UserContext],
            [ApolloContext],
            [LeagueStoreContext]
          ]}>
          <SiteRoutes />
        </ContextCompose>
    )
}

export default App;