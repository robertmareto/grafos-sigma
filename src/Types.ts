// Types.ts

// Definindo os tipos de dados para os nós
interface GephiNodeAttributes {
    x: number;
    y: number;
    size: number;
    label: string;
    color: string;
    modularity_class: number;
    //community: string;
}

// Definindo os tipos de dados para os nós
interface NewNodeAttributes {
    x: number;
    y: number;
    size: number;
    label: string;
    color: string;
    //community: string;
}

// Definindo os tipos de dados para as arestas
interface EdgeAttributes {
    size: number;
}
interface GephiEdgeAttributes {
    weight: number;
}

// Definindo a interface para um nó
interface NewNode {
    key: string;
    attributes: NewNodeAttributes;
}

interface GephiNode {
    key: string;
    attributes: GephiNodeAttributes;
}

// Definindo a interface para uma aresta
interface Edge {
    key: string;
    source: string;
    target: string;
    attributes: EdgeAttributes;
}

interface GephiEdge {
    key: string;
    source: string;
    target: string;
    attributes: GephiEdgeAttributes;
}


interface JSONData {
    nodes: NewNode[];
    edges: Edge[];
}

interface GephiJSONData {
    attributes: {
        creator: string
      }
    options: {
        multi: Boolean;
        allowSelfLoops: Boolean;
        type: String;
      };
    nodes: GephiNode[];
    edges: GephiEdge[];
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

interface CommunityDetails {
    count: number;
    communities: Record<string, number>;
}

interface modularityDetails {
    count: number;
    classes: Record<string, number>;
}

// Exportando os tipos para uso em outros arquivos
export type { NewNodeAttributes, GephiNodeAttributes, EdgeAttributes, NewNode, GephiNode, Edge, JSONData, GephiJSONData, State, CommunityDetails, modularityDetails};
