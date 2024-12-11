import React, { useEffect } from 'react';
import { register } from "@adobe/uix-guest";

export default function Extension() {
    useEffect(() => {
        const init = async () => {
            const guestServer = await register({
                id: "extensionId",
                methods: {
                    extensionNamespace: {
                        getMessage: async () => {
                            const hostInfo = await guestServer.host.hostNamespace.getHostInfo();
                            return `Message: "${hostInfo}"`;
                        },
                        setMessage: async (text) => {
                            localStorage.setItem('guest-text', text);
                            return `Success`;
                        }
                    }
                }
            });
        };
        init();
    }, []);

    return (
        <>
            <p>Guest app register view</p>
        </>
    );
};