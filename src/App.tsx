import React from 'react';
import GraphRenderer from './GraphRenderer';
import json_data from './dataGraph.json';

const App = () => {
  return (
    <div>
      <GraphRenderer jsonData={json_data} />
    </div>
  );
}

export default App;