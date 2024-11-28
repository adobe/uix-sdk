import {GuestUIFrame, useExtensions} from '@adobe/uix-host-react';
import React from "react";
export default function HostContainer( { guestId, appBuilderEndpoint}) {
    const {extensions} = useExtensions(() => ({
        updateOn:"all"
    }));

    const methods = {
        actionBar: {
            getButtons: {
                onClick() {

                }
            }
        }
    }
    console.log('extension: ', extensions)
    return (
    <div className="">
        { extensions.length > 0 ?
            <GuestUIFrame
                sandbox="allow-same-origin "
                id="iframe_add"
                key={Math.random()}
                guestId={guestId}
                src={appBuilderEndpoint}
                style={{ minWidth: '800px', borderWidth: '0px', padding: '10px', height: '600px' }}
                privateMethods={methods}/>
            : "Loading..."}
    </div>
    );
}
