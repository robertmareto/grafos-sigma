// Types.ts

// Definindo os tipos de dados para os nós
interface NodeAttributes {
    x: number;
    y: number;
    size: number;
    label: string;
    color: string;
    modularity_class: number;
    //community: string;
}

// Definindo os tipos de dados para as arestas
interface EdgeAttributes {
    size: number;
}

// Definindo a interface para um nó
interface Node {
    key: string;
    attributes: NodeAttributes;
}

// Definindo a interface para uma aresta
interface Edge {
    key: string;
    source: string;
    target: string;
    attributes: EdgeAttributes;
}

// Definindo o formato do JSON de dados
interface JSONData {
    nodes: Node[];
    edges: Edge[];
}

interface State {
    hoveredNode?: string;
    searchQuery: string;

    // State derivado da query:
    selectedNode?: string;
    suggestions?: Set<string>;

    // State derivado do nó hovered:
    hoveredNeighbors?: Set<string>;
}

// Exportando os tipos para uso em outros arquivos
export type { NodeAttributes, EdgeAttributes, Node, Edge, JSONData, State};
