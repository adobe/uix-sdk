import React, { useState, useEffect } from 'react';

export default function Extension() {
    const [text, setText] = useState('');
    const [hostInfo, setHostInfo] = useState('');

    useEffect(() => {
        setText(localStorage.getItem('guest-text') || '');
        setHostInfo(localStorage.getItem('host-info') || '');

        const handler = (e) => {
            if (!e || e.key === 'guest-text') {
                setText(localStorage.getItem('guest-text') || '');
            }
            if (!e || e.key === 'host-info') {
                setHostInfo(localStorage.getItem('host-info') || '');
            }
        };

        window.addEventListener('storage', handler, false);
        return () => {
            window.removeEventListener('storage', handler, false);
        };
    }, []);

    return (
        <div className='card'>
            <h3>Guest App</h3>
            {text && (<p id="text-from-host">{text}</p>)}
            {hostInfo && (<p id="info-from-host">{hostInfo}</p>)}
        </div>
    );
};