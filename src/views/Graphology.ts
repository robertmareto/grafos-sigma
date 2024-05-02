import Graph from "graphology";
import { cropToLargestConnectedComponent } from "graphology-components";
import forceAtlas2 from "graphology-layout-forceatlas2";
import circular from "graphology-layout/circular";
import louvain from "graphology-communities-louvain";
import circlepack from "graphology-layout/circlepack";
import noverlap from 'graphology-layout-noverlap';
import { JSONData, NewNode, CommunityDetails, modularityDetails, GephiNode } from '../Types'
// import { UndirectedGraph } from 'graphology';
// import JSONdata from '../dataGraph.json';

export function createGephiGraph(data: any): [Graph, CommunityDetails, modularityDetails] {
    const graph = new Graph({
        multi: true,
        allowSelfLoops: true,
        type: 'directed'
    });

    graph.import(data);

    //cropToLargestConnectedComponent(graph);

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


    //TO DO = CALCULAR MELHOR A EXPESSURA DA EDGE
    graph.forEachEdge((edge) => {
        //const degree = graph.degree(edge);
        graph.setEdgeAttribute(
            edge,
            "size",
            1.5
        )
    });

    //circular.assign(graph);

    //const settings = forceAtlas2.inferSettings(graph);
    //forceAtlas2.assign(graph, { settings, iterations: 600 });

    louvain.assign(graph, {
        resolution: 1
    });

    //let hierarquia = "community"

    const communityDetails = louvain.detailed(graph);

    let hierarquia = "modularity_class"

    const ModularityCount = countUniqueModularityClasses(data.nodes);

    graph.setAttribute('ModularityCount', ModularityCount.count)

    const modularityDetails = countUniqueModularityClasses(data.nodes);

    let counter = modularityDetails.count

    let nodecounter = 0

    graph.forEachNode((node) => {
        nodecounter++
    });

    const graphNodes = new Set(graph.nodes()); // Obtém todos os nós do grafo

    // Filtra os nós de modularityDetails.classes que não estão no grafo
    for (const nodeId in modularityDetails.classes) {
        if (!graphNodes.has(nodeId)) {
            delete modularityDetails.classes[nodeId];
        }
    }
    
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

    console.log('Grapho gerado usando Modularidade do tipo:', hierarquia )
    console.log('Numero de Clusters', counter )
    console.log('Numero de nós', nodecounter )
    console.log('============================================================')

    return [graph, communityDetails, modularityDetails];
}

export function createNewGraph(data: any): [Graph, CommunityDetails, modularityDetails] {
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

    circular.assign(graph);

    const settings = forceAtlas2.inferSettings(graph);
    forceAtlas2.assign(graph, { settings, iterations: 600 });

    louvain.assign(graph, {
        resolution: 1
    });

    let hierarquia = "community"

    const modularityDetails = { count: 0, classes: {"0": 0} }

    const communityDetails = louvain.detailed(graph);

    let counter = communityDetails.count

    let nodecounter = 0

    graph.forEachNode((node) => {
        nodecounter++
    });

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

    console.log('Grapho gerado usando Modularidade do tipo:', hierarquia )
    console.log('Numero de Clusters', counter )
    console.log('Numero de nós', nodecounter )
    console.log('============================================================')

    return [graph, communityDetails, modularityDetails];
}

// Conta o numero de Modularidades unicas e retorna uma relação de nós por classe de modularidade
export function countUniqueModularityClasses(nodes: GephiNode[]): { count: number, classes: Record<string, number> } {
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
