import { createContext, useContext, useEffect } from 'react';
import { ApolloClient, InMemoryCache, ApolloProvider, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

import { GQL_URL } from '../utils';
import { UserContextType } from '../datatypes';
import userContext from './user.context';

const ApolloContext = createContext(null);

function Provider({ children }: { children: any }) {
    const { userToken } = useContext(userContext.UserContext) as UserContextType;
    
    const httpLink = createHttpLink({ uri: GQL_URL });
    let authLink = setContext(async (_, { headers }) => {
            return {
                headers: { ...headers, authorization: userToken ?? "" }
            }
        }), 
        client = new ApolloClient({
            link: authLink.concat(httpLink), cache: new InMemoryCache(),
        });
    
    useEffect(()=>{ client.resetStore(); },[userToken, client]);

    return <ApolloContext.Provider value={null}>
            <ApolloProvider client={client}>{children}</ApolloProvider>
        </ApolloContext.Provider>;
}

export default { ApolloContext, Provider };