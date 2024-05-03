import React from 'react';
import GraphRenderer from './views/GraphRenderer';
import jsonData from './data/data.json';

const App = () => {
    return (
        <div>
            <GraphRenderer jsonData={jsonData} />
        </div>
    );
}

export default App;
