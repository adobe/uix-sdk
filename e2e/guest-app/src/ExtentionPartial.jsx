import React, { useEffect } from 'react';
import { register } from "@adobe/uix-guest";

export default function ExtensionPartial() {
    useEffect(() => {
        const init = async () => {
            await register({
                id: "ext-partial",
                methods: {
                    extensionNamespace: {
                        getMessage: async () => {
                            return `Message from partial guest`;
                        }
                    }
                }
            });
        };
        init();
    }, []);

    return (
        <>
            <p>Guest app partial register view</p>
        </>
    );
};
