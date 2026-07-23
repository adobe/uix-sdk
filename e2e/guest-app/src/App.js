import React from "react";
import {HashRouter, Route, Routes} from "react-router-dom";
import Extention from './Extention';
import ExtentionPartial from './ExtentionPartial';
import Counter from './MainApp';
import UiFrameProbe from './UiFrameProbe';

function App() {

    return (
        <HashRouter>
            <Routes>
                <Route index element={<Counter/>}/>
                <Route path="register" element={<Extention/>}/>
                <Route path="register-partial" element={<ExtentionPartial/>}/>
                <Route path="ui-frame" element={<UiFrameProbe/>}/>
            </Routes>
        </HashRouter>
    );
}

export default App;
