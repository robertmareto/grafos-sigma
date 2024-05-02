type Coordinates = {
    x: number;
    y: number;
};

interface State {
    hoveredNode?: string;
    searchQuery: string;

    // State derivado da query:
    selectedNode?: string;
    suggestions?: Set<string>;

    // State derivado do nó hovered:
    hoveredNeighbors?: Set<string>;
}


export function handleClusterChange(setClusters: (selectedClusters: string[]) => void, getSelectedClusters: () => string[]) {
    return (event: Event) => {
        setClusters(getSelectedClusters());
    };
}

export function getSelectedClusters() {
    const selectedClusters: string[] = [];
    const checkboxes = document.querySelectorAll<HTMLInputElement>("input[name=clusterOption]:checked");
    checkboxes.forEach((checkbox) => {
        selectedClusters.push(checkbox.value);
    });
    return selectedClusters;
}

export function toggleShowAllNodes(
    showAll: boolean,
    setClusters: (clusters: string[]) => void,
    getSelectedClusters: () => string[]
) {
    if (showAll) {
        setClusters([]);
    } else {
        setClusters(getSelectedClusters());
    }
}


export function setSearchQuery(state: State, graph: any, sigmaRef: any) {
    return (query: string) => {
        state.searchQuery = query;
    
        if (query) {
            const lcQuery = query.toLowerCase();
            const suggestions = graph
                .nodes()
                .map((n: any) => ({ id: n, label: graph.getNodeAttribute(n, "label") as string }))
                .filter(({ label }: any) => label.toLowerCase().includes(lcQuery));
    
            if (suggestions.length === 1 && suggestions[0].label === query) {
                state.selectedNode = suggestions[0].id;
                state.suggestions = undefined;
    
                const nodePosition = sigmaRef.current?.getNodeDisplayData(state.selectedNode) as Coordinates;
                sigmaRef.current?.getCamera().animate(nodePosition, {
                    duration: 500,
                });
            } else {
                state.selectedNode = undefined;
                state.suggestions = new Set(suggestions.map(({ id }: any) => id));
            }
        } else {
            state.selectedNode = undefined;
            state.suggestions = undefined;
        }
    
        sigmaRef.current?.refresh({
            skipIndexation: true,
        });
    };
}

export function setHoveredNode(state: State, graph: any, sigmaRef: any) {
    return (node?: string) => {
        if (node) {
            state.hoveredNode = node;
            state.hoveredNeighbors = new Set(graph.neighbors(node));
        }
    
        const nodes = graph.filterNodes((n: any) => n !== state.hoveredNode && !state.hoveredNeighbors?.has(n));
        const nodesIndex = new Set(nodes);
        const edges = graph.filterEdges((e: any) => graph.extremities(e).some((n: any) => nodesIndex.has(n)));
    
        if (!node) {
            state.hoveredNode = undefined;
            state.hoveredNeighbors = undefined;
        }
    
        sigmaRef.current?.refresh({
            partialGraph: {
                nodes,
                edges,
            },
            skipIndexation: true,
        });
    };
}