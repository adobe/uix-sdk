import React, { useEffect } from 'react';
import { register } from "@adobe/uix-guest";

export default function Extension() {
    useEffect(() => {
        const init = async () => {
            await register({
                id: "extensionId",
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
        };
        init();
    }, []);

    return (
        <>
            <p>Guest app register view</p>
        </>
    );
};