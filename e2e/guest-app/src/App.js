import React from "react";
import {HashRouter, Route, Routes} from "react-router-dom";
import Extention from './Extention';
import Counter from './MainApp';

function App() {

    return (
        <HashRouter>
            <Routes>
                <Route index element={<Counter/>}/>
                <Route path="register" element={<Extention/>}/>
            </Routes>
        </HashRouter>
    );
}

export default App;
