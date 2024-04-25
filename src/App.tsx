import React from 'react';
import GraphRenderer from './GraphRenderer';
import json_data from './data.json';

const App = () => {
  return (
    <div>
      <GraphRenderer jsonData={json_data} />
    </div>
  );
}

export default App;