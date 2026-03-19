import React from "react";
import {HashRouter, Route, Routes} from "react-router-dom";
import Extention from './Extention';
import ExtentionPartial from './ExtentionPartial';
import Counter from './MainApp';

function App() {

    return (
        <HashRouter>
            <Routes>
                <Route index element={<Counter/>}/>
                <Route path="register" element={<Extention/>}/>
                <Route path="register-partial" element={<ExtentionPartial/>}/>
            </Routes>
        </HashRouter>
    );
}

export default App;
