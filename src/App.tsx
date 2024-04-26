import React from 'react';
import GraphRenderer from './GraphRenderer';
import jsonData from './dataGraph.json'


const App = () => {
    return (
        <div>
            <GraphRenderer jsonData={jsonData} />
        </div>
    );
}

export default App;
