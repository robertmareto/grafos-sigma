import React from 'react';
import GraphRenderer from './views/GraphRenderer';
import jsonData from './dataGraph.json'


const App = () => {
    return (
        <div>
            <GraphRenderer jsonData={jsonData} />
        </div>
    );
}

export default App;
