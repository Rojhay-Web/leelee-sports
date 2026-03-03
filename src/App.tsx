import "./styles/app.less";
import SiteRoutes from "./Routes";

// Contexts
import ContextCompose from "./context";
import UserContext from "./context/user.context";
import ApolloContext from "./context/apollo.context";

function App(){
    return(
        <ContextCompose items={[
            [UserContext],
            [ApolloContext],
          ]}>
          <SiteRoutes />
        </ContextCompose>
    )
}

export default App;