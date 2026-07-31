import React from "react";
import {HashRouter, Route, Routes} from "react-router-dom";
import Extention from './Extention';
import ExtentionPartial from './ExtentionPartial';
import Counter from './MainApp';
import UiFrameProbe from './UiFrameProbe';
import DuplicateOfferProbe from './DuplicateOfferProbe';

function App() {

    return (
        <HashRouter>
            <Routes>
                <Route index element={<Counter/>}/>
                <Route path="register" element={<Extention/>}/>
                <Route path="register-partial" element={<ExtentionPartial/>}/>
                <Route path="ui-frame" element={<UiFrameProbe/>}/>
                <Route path="ui-frame-ping" element={<DuplicateOfferProbe/>}/>
            </Routes>
        </HashRouter>
    );
}

export default App;
