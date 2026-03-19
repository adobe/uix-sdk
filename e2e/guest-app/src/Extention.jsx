import React, { useEffect } from 'react';
import { register } from "@adobe/uix-guest";

export default function Extension() {
    useEffect(() => {
        const init = async () => {
            const hashSearch = window.location.hash.split('?')[1] || '';
            const extensionId = new URLSearchParams(hashSearch).get('id') || 'extensionId';

            const connection = await register({
                id: extensionId,
                methods: {
                    extensionNamespace: {
                        getMessage: async () => {
                            return `Message from guest to host`;
                        },
                        setMessage: async (text) => {
                            localStorage.setItem('guest-text', text);
                            return `Success`;
                        }
                    }
                }
            });

            try {
                const hostInfo = await connection.host.hostNamespace.getHostInfo();
                localStorage.setItem('host-info', hostInfo);
            } catch (e) {
                // host may not provide hostNamespace in all scenarios
            }
        };
        init();
    }, []);

    return (
        <>
            <p>Guest app register view</p>
        </>
    );
};