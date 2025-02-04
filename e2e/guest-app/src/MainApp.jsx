import React, { useState, useEffect } from 'react';

export default function Extension() {
    const [text, setText] = useState('');

    useEffect(() => {
        setText(localStorage.getItem('guest-text') || '');
        const handler = () => setText(() => localStorage.getItem('guest-text'));
    
        window.addEventListener('storage', handler, false);
        return () => {
          window.removeEventListener('storage', handler, false);
        }
    }, []);

    return (
        <div className='card'>
            <h3>Guest App</h3>
            {text && (<p id="text-from-host">{text}</p>)}
        </div>
    );
};