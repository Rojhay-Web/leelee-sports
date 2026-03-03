import { createContext, useContext, useEffect } from 'react';
import { ApolloClient, InMemoryCache, ApolloProvider, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

import { GQL_URL } from '../utils';
import { UserContextType } from '../datatypes';
import userContext from './user.context';
import { log } from '../utils/log';

const ApolloContext = createContext(null);

function Provider({ children }: { children: any }) {
    const { token } = useContext(userContext.UserContext) as UserContextType;

    const httpLink = createHttpLink({ uri: GQL_URL });
    let authLink = setContext(async (_, { headers }) => {
            return {
                headers: { ...headers, authorization: token ?? "" }
            }
        }), 
        client = new ApolloClient({
            link: authLink.concat(httpLink), cache: new InMemoryCache(),
        });
    
    useEffect(()=>{ log.debug('Refresh Provider'); client.resetStore(); },[token]);

    return <ApolloContext.Provider value={null}>
            <ApolloProvider client={client}>{children}</ApolloProvider>
        </ApolloContext.Provider>;
}

export default { ApolloContext, Provider };