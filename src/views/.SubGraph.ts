import {subgraph} from 'graphology-operators';

const sub = subgraph(graph, function (key, attr) {
    return key.startsWith('J') || attr.color === 'red';
  });