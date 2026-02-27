import React from "react";
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';

import App from "./App";
import "./styles/app.less";

const appRoot = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);

appRoot.render(
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GCID ?? ""}>
        <React.StrictMode>
            <App />
        </React.StrictMode>
    </GoogleOAuthProvider>
);