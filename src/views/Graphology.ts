import Graph from "graphology";
import { cropToLargestConnectedComponent } from "graphology-components";
import forceAtlas2 from "graphology-layout-forceatlas2";
import circular from "graphology-layout/circular";
import louvain from "graphology-communities-louvain";
import circlepack from "graphology-layout/circlepack";
import noverlap from 'graphology-layout-noverlap';
import { JSONData, Node } from '../Types'
import { UndirectedGraph } from 'graphology';

// Definição do tipo CommunityDetails
export interface CommunityDetails {
    count: number;
    communities: Record<string, number>;
}

export interface modularityDetails {
    count: number;
    classes: Record<string, number>;
}

export function createGraph(data: any): [Graph, CommunityDetails, modularityDetails] {
    const graph = new Graph({
        multi: true,
        allowSelfLoops: true,
        type: 'directed'
    });

    graph.import(data);

    cropToLargestConnectedComponent(graph);

    // Calcula o tamanho dos nós com base nos graus
    const degrees = graph.nodes().map((node) => graph.degree(node));
    const minDegree = Math.min(...degrees);
    const maxDegree = Math.max(...degrees);
    const minSize = 10;
    const maxSize = 100;
    
    graph.forEachNode((node) => {
        const degree = graph.degree(node);
    
        // Define o tamanho do nó proporcional ao grau
        graph.setNodeAttribute(
            node,
            "size",
            minSize + ((degree - minDegree) / (maxDegree - minDegree)) * (maxSize - minSize),
        );
    }); 

    graph.forEachEdge((edge) => {

        graph.setEdgeAttribute(
            edge,
            "size",
            1
        )
    });

    //circular.assign(graph);

    //const settings = forceAtlas2.inferSettings(graph);
    //forceAtlas2.assign(graph, { settings, iterations: 600 });

    louvain.assign(graph, {
        resolution: 1
    });

    let hierarquia = "community"

    if (data?.nodes[0]?.attributes?.modularity_class) {
        hierarquia = "modularity_class"
        const ModularityCount = countUniqueModularityClasses(data.nodes);
        graph.setAttribute('ModularityCount', ModularityCount.count)

    }

    const modularityDetails = countUniqueModularityClasses(data.nodes);

    const communityDetails = louvain.detailed(graph);

    let counter = communityDetails.count

    if (graph.getAttribute('ModularityCount')) {
        const graphNodes = new Set(graph.nodes()); // Obtém todos os nós do grafo

        // Filtra os nós de modularityDetails.classes que não estão no grafo
        for (const nodeId in modularityDetails.classes) {
            if (!graphNodes.has(nodeId)) {
                delete modularityDetails.classes[nodeId];
            }
        }
        
        counter = modularityDetails.count;
        
        const colors: Record<number, string> = {};
        for (let i = 0; i < counter; i++) {
            colors[i] = Math.floor(Math.random() * 16777215).toString(16);
        }
        
        for (const nodeId in modularityDetails.classes) {
            const modularityClass = modularityDetails.classes[nodeId]; // Obtém a classe de modularidade
            const color = colors[modularityClass];
            graph.mergeNodeAttributes(nodeId, {
                color: '#' + color,
                borderColor: "white",
                modularityClass: modularityClass
            });
        }
    } else {
        const colors: Record<number, number> = {};
        for (let i = 0; i < counter; i++) {
            colors[i] = Math.random() * 16777215;
        }
    
        for (let element in communityDetails.communities) {
            graph.mergeNodeAttributes(element, {
                color: "#" + Math.floor(colors[communityDetails.communities[element]] + graph.getNodeAttribute(element, 'size')).toString(16),
                borderColor: "white",
                community: communityDetails.communities[element]
            });
        }
    }

    // Aplica o layout CirclePack
    circlepack.assign(graph, {
        center: 2,
        hierarchyAttributes: [hierarquia], // Atributo usado para definir os clusters
        scale: 1.2 //Escala de tamanho entre os nós
    });

    // Trabalha o espaçamento entre os nós
    noverlap.assign(graph, {
        settings: {
            margin: 1,
        }
    });

    //console.log('Grapho gerado usando Modularidade do tipo:', hierarquia )

    return [graph, communityDetails, modularityDetails];
}

export function assignNodeAttributesBasedOnCommunities(graph: Graph, details: CommunityDetails) {
    let count = details.count

    if (graph.getAttribute('ModularityCount') === null) {
          count = graph.getAttribute('ModularityCount');
    }
    

    const colors: Record<number, number> = {};
    for (let i = 0; i < count; i++) {
        colors[i] = Math.random() * 16777215;
    }

    for (let element in details.communities) {
        graph.mergeNodeAttributes(element, {
            color: "#" + Math.floor(colors[details.communities[element]] + graph.getNodeAttribute(element, 'size')).toString(16),
            borderColor: "white",
            community: details.communities[element]
        });
    }
}

// Conta o numero de Modularidades unicas e retorna uma relação de nós por classe de modularidade
export function countUniqueModularityClasses(nodes: Node[]): { count: number, classes: Record<string, number> } {
    const modularityClasses: Record<string, number> = {};
    
    nodes.forEach((node) => {
        if (node.attributes?.modularity_class) {
            const modularityClass = node.attributes.modularity_class;
            const nodeId = node.key.toString();
            modularityClasses[nodeId] = (modularityClass);
        }
    });

    const uniqueClasses = new Set(Object.values(modularityClasses));
    const uniqueClassesCount = uniqueClasses.size;

    // Convertendo valores para números antes de retornar
    for (const key in modularityClasses) {
        modularityClasses[key] = parseInt(modularityClasses[key] as any);
    }

    return { count: uniqueClassesCount, classes: modularityClasses };
}


/* Função para calcular os detalhes da modularidade
export function calculateModularityDetails(graph: Graph) {
    const modularityDetails: { count: number, classes: Record<string, any[]> } = {
        count: 0,
        classes: {}
    };

    // Itera sobre todos os nós do grafo
    graph.forEachNode((nodeId) => {
        const modularityClass = graph.getNodeAttribute(nodeId, 'modularity_class');

        // Verifica se o nó possui o atributo modularity_class
        if (modularityClass !== undefined) {
                modularityDetails.classes[modularityClass] = [];
                modularityDetails.count++;
            modularityDetails.classes[modularityClass].push(nodeId);
        }
    });

    return modularityDetails;
} */