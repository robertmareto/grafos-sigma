import { useEffect, useRef } from 'react';
import Graph from "graphology";
import Sigma from "sigma";
import { Coordinates, EdgeDisplayData, NodeDisplayData } from "sigma/types";
import { cropToLargestConnectedComponent } from "graphology-components";
import forceAtlas2 from "graphology-layout-forceatlas2";
import circular from "graphology-layout/circular";
//import { NodeBorderProgram } from "@sigma/node-border"
import { createNodeBorderProgram } from "@sigma/node-border";
import circlepack from "graphology-layout/circlepack";
import louvain from "graphology-communities-louvain";
import EdgeCurveProgram from "@sigma/edge-curve";
import noverlap from 'graphology-layout-noverlap';


//import { SigmaContainer, ControlsContainer, ZoomControl, FullScreenControl, SearchControl } from "@react-sigma/core";
//import "@react-sigma/core/lib/react-sigma.min.css";


//import {subgraph} from 'graphology-operators';  // Para trabalhar com sub graphos => https://graphology.github.io/standard-library/operators.html#subgraph

/* TO DO: 
    - Menu Ocultar Clusters {node atributte "community: 5"}
    - Sub Clusters
    - Label Proporcional ao Node (nota: parece que o sigma usa uma mesma fonte para todo o Canva e não por nó)
*/

interface NodeAttributes {
    x: number;
    y: number;
    size: number;
    label: string;
    color: string;
}

interface EdgeAttributes {
    size: number;
}

interface Node {
    key: string;
    attributes: NodeAttributes;
}

interface Edge {
    key: string;
    source: string;
    target: string;
    attributes: EdgeAttributes;
}

interface JSONData {
    nodes: Node[];
    edges: Edge[];
}

interface Props {
    jsonData: JSONData;
};

const GraphRenderer = (props: Props) => {
    const sigmaRef = useRef<Sigma | null>(null);

    useEffect(() => {
        const graph = new Graph({
            multi: true,
            allowSelfLoops: true,
            type: 'directed'
        }); // Cria um Novo Grapho

        const data = props.jsonData; // Usando os dados JSON passados como propriedade

        graph.import(data); // Importa os dados

        cropToLargestConnectedComponent(graph); // Mantém apenas o maior componente conectado do grafo

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
        
            // Define o tamanho da label proporcional ao tamanho do nó
            graph.setNodeAttribute(
                node,
                "labelSize",
                14 + ((graph.getNodeAttribute(node, "size") - minSize) / (maxSize - minSize)) * (24 - 14), // Ajuste os valores de 14 e 24 conforme necessário
            );
        });
        

        // Posiciona os nós em um círculo e aplica o algoritmo Force Atlas 2 para obter um layout adequado
        circular.assign(graph);
        const settings = forceAtlas2.inferSettings(graph);
        forceAtlas2.assign(graph, { settings, iterations: 600 });

        // Identifica comunidades no grafo usando o algoritmo de Louvain
        louvain.assign(graph, {
            resolution: 1
        });

        let details = louvain.detailed(graph);

        //console.log(details.count)

        // Define cores aleatórias para cada comunidade
        const colors: Record<number, number> = {};
        for (let i = 0; i < details.count; i++){
            colors[i] = Math.random() * 16777215; 
        }

        // Atribui cores e outros atributos aos nós com base em suas comunidades
        for (let element in details.communities) {
            graph.mergeNodeAttributes(element, {
                color: "#" + Math.floor(colors[details.communities[element]] + graph.getNodeAttribute(element,'size')).toString(16),
                borderColor: "white",
                community: details.communities[element]
            });
        }

        // Agrupa visualmente os nós de acordo com suas comunidades
        circlepack.assign(graph, {
            center: 2,
            hierarchyAttributes: ["community"],
            scale: 2 // Aumenta a escala do grafico distanciando os clusters
        });

        // Aplica o layout noverlap com opções de configuração
        noverlap.assign(graph, {
            maxIterations: 500,
            settings: {
                margin: 6, // Distancia os nós
                ratio: 1.5,
                expansion: 1.5 // Quanto os nós podem expandir
              }
        });

        console.log(graph)

        // Esconde o loader da DOM
        const loader = document.getElementById("loader") as HTMLElement;
        if (loader) loader.style.display = "none";

        // Desenha o grafo final usando Sigma
        const container = document.getElementById("container") as HTMLElement;
        container.style.height = "800px";
        container.style.width = "100%";

        sigmaRef.current = new Sigma(graph, container, {
            defaultNodeType: "bordered",
            //labelSize: 16,
            labelDensity: 5.87,
            labelGridCellSize: 10,
            labelRenderedSizeThreshold: 10,
            zIndex: true,
            defaultEdgeType: "curve",
            //labelFont: "Lato, sans-serif",
            itemSizesReference: "positions",
            //zoomToSizeRatioFunction: undefined,
            edgeProgramClasses: {
                curve: EdgeCurveProgram,
              },
            nodeProgramClasses: {
                bordered: createNodeBorderProgram({
                  borders: [
                    { size: { attribute: "borderSize", defaultValue: 0.0001 }, color: { attribute: "borderColor" } },
                    { size: { fill: true }, color: { attribute: "color" } },
                  ],
                }),
              },
            });

        //console.log(sigmaRef.current)


        // Tipo e declaração de estado interno:
        interface State {
            hoveredNode?: string;
            searchQuery: string;
        
            // State derivado da query:
            selectedNode?: string;
            suggestions?: Set<string>;
        
            // State derivado do nó hovered:
            hoveredNeighbors?: Set<string>;
        }
        const state: State = { searchQuery: "" };
        
        // Atualiza o estado da pesquisa:
        function setSearchQuery(query: string) {
            state.searchQuery = query;
        
            if (query) {
                const lcQuery = query.toLowerCase();
                const suggestions = graph
                    .nodes()
                    .map((n) => ({ id: n, label: graph.getNodeAttribute(n, "label") as string }))
                    .filter(({ label }) => label.toLowerCase().includes(lcQuery));
        
                if (suggestions.length === 1 && suggestions[0].label === query) {
                    state.selectedNode = suggestions[0].id;
                    state.suggestions = undefined;
        
                    const nodePosition = sigmaRef.current?.getNodeDisplayData(state.selectedNode) as Coordinates;
                    sigmaRef.current?.getCamera().animate(nodePosition, {
                        duration: 500,
                    });
                } else {
                    state.selectedNode = undefined;
                    state.suggestions = new Set(suggestions.map(({ id }) => id));
                }
            } else {
                state.selectedNode = undefined;
                state.suggestions = undefined;
            }
        
            sigmaRef.current?.refresh({
                skipIndexation: true,
            });
        }
        
        // Atualiza o nó hovered:
        function setHoveredNode(node?: string) {
            if (node) {
                state.hoveredNode = node;
                state.hoveredNeighbors = new Set(graph.neighbors(node));
            }
        
            const nodes = graph.filterNodes((n) => n !== state.hoveredNode && !state.hoveredNeighbors?.has(n));
            const nodesIndex = new Set(nodes);
            const edges = graph.filterEdges((e) => graph.extremities(e).some((n) => nodesIndex.has(n)));
        
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
        }

        const renderer = sigmaRef.current

        // State for drag'n'drop
        let draggedNode: string | null = null;
        let isDragging = false;

        // Ações ao clicar no Nó
        renderer.on("downNode", (e) => {
            isDragging = true; // Define o estado de arrasto
            draggedNode = e.node;
            graph.setNodeAttribute(draggedNode, "highlighted", true);
        });

        // Ações ao passar o mouse sobre o Nó
        renderer.on("enterNode", (e) => {
            draggedNode = e.node; // Define o nó especifico
            setHoveredNode(draggedNode) // oculta os nós sem relação
            graph.setNodeAttribute(draggedNode, "highlighted", true); // dá destauqe ao nó
        });

        // Ações ao sair o mouse do Nó
        renderer.on("leaveNode", (e) => {
            draggedNode = e.node;
            setHoveredNode(undefined)
            graph.setNodeAttribute(draggedNode, "highlighted", false);
        });

        // Eventos com o mouse em movimento arrastando o nó
        renderer.getMouseCaptor().on("mousemovebody", (e) => {
            if (!isDragging || !draggedNode) return;

            // Get new position of node
            const pos = renderer.viewportToGraph(e);

            graph.setNodeAttribute(draggedNode, "x", pos.x);
            graph.setNodeAttribute(draggedNode, "y", pos.y);

            // Prevent sigma to move camera:
            e.preventSigmaDefault();
            e.original.preventDefault();
            e.original.stopPropagation();
        });

        // On mouse up, we reset the autoscale and the dragging mode
        renderer.getMouseCaptor().on("mouseup", () => {
            if (draggedNode) {
            graph.removeNodeAttribute(draggedNode, "highlighted");
            }
            isDragging = false;
            draggedNode = null;
        });

        // Ações ao largar o nó
        renderer.getMouseCaptor().on("mousedown", () => {
            //setHoveredNode(undefined)
            if (!renderer.getCustomBBox()) renderer.setCustomBBox(renderer.getBBox());
        });  
        
        // Liga interações de entrada no nó de pesquisa:
        const searchInput = document.getElementById("search-input") as HTMLInputElement;

        searchInput.addEventListener("input", () => {
            setSearchQuery(searchInput.value || "");
        });
        searchInput.addEventListener("blur", () => {
            setSearchQuery("");
        });
        
        // Renderiza os nós de acordo com o estado interno:
        sigmaRef.current?.setSetting("nodeReducer", (node, data) => {
            const res: Partial<NodeDisplayData> = { ...data };

            if (state.hoveredNeighbors && !state.hoveredNeighbors.has(node) && state.hoveredNode !== node) {
                res.label = "";
                res.color = "#f6f6f6";
            }

            if (state.selectedNode === node) {
                res.highlighted = true;
            } else if (state.suggestions) {
                if (state.suggestions.has(node)) {
                    res.forceLabel = true;
                } else {
                    res.label = "";
                    res.color = "#f6f6f6";
                }
            }

            return res;
        });

        // Define o EdgeReducer para controlar a renderização das arestas
        sigmaRef.current?.setSetting("edgeReducer", (edge, data) => {
            const res: Partial<EdgeDisplayData> = { ...data };

            if (state.hoveredNode && !graph.hasExtremity(edge, state.hoveredNode)) {
                res.hidden = true;
            }

            if (
                state.suggestions &&
                (!state.suggestions.has(graph.source(edge)) || !state.suggestions.has(graph.target(edge)))
            ) {
                res.hidden = true;
            }

            return res;
        });


        // Remover o renderizador Sigma anterior, se houver, quando este efeito for executado novamente
        return () => {
            if (sigmaRef.current) {
                sigmaRef.current.kill();
                sigmaRef.current = null;
            }
        };
    }, [props.jsonData]);

    return (
        
        <div>
            <div id="loader">Loading ...</div>
            <div id="search">
                <input type="search" id="search-input" list="suggestions" placeholder="Try searching for a node..."></input>
                <datalist id="suggestions"><option value="Myriel"></option>
                    <option value="Napoleon"></option>
                    <option value="MlleBaptistine"></option>
                    <option value="MmeMagloire"></option>
                    <option value="CountessDeLo"></option>
                    <option value="Geborand"></option>
                    <option value="Champtercier"></option>
                    <option value="Cravatte"></option>
                    <option value="Count"></option>
                    <option value="OldMan"></option>
                    <option value="Labarre"></option>
                    <option value="Valjean"></option>
                    <option value="Marguerite"></option>
                    <option value="MmeDeR"></option>
                    <option value="Isabeau"></option>
                    <option value="Gervais"></option>
                    <option value="Tholomyes"></option>
                    <option value="Listolier"></option>
                    <option value="Fameuil"></option>
                    <option value="Blacheville"></option>
                    <option value="Favourite"></option>
                    <option value="Dahlia"></option>
                    <option value="Zephine"></option>
                    <option value="Fantine"></option>
                    <option value="MmeThenardier"></option>
                    <option value="Thenardier"></option>
                    <option value="Cosette"></option>
                    <option value="Javert"></option>
                    <option value="Fauchelevent"></option>
                    <option value="Bamatabois"></option>
                    <option value="Perpetue"></option>
                    <option value="Simplice"></option>
                    <option value="Scaufflaire"></option>
                    <option value="Woman1"></option>
                    <option value="Judge"></option>
                    <option value="Champmathieu"></option>
                    <option value="Brevet"></option>
                    <option value="Chenildieu"></option>
                    <option value="Cochepaille"></option>
                    <option value="Pontmercy"></option>
                    <option value="Boulatruelle"></option>
                    <option value="Eponine"></option>
                    <option value="Anzelma"></option>
                    <option value="Woman2"></option>
                    <option value="MotherInnocent"></option>
                    <option value="Gribier"></option>
                    <option value="Jondrette"></option>
                    <option value="MmeBurgon"></option>
                    <option value="Gavroche"></option>
                    <option value="Gillenormand"></option>
                    <option value="Magnon"></option>
                    <option value="MlleGillenormand"></option>
                    <option value="MmePontmercy"></option>
                    <option value="MlleVaubois"></option>
                    <option value="LtGillenormand"></option>
                    <option value="Marius"></option>
                    <option value="BaronessT"></option>
                    <option value="Mabeuf"></option>
                    <option value="Enjolras"></option>
                    <option value="Combeferre"></option>
                    <option value="Prouvaire"></option>
                    <option value="Feuilly"></option>
                    <option value="Courfeyrac"></option>
                    <option value="Bahorel"></option>
                    <option value="Bossuet"></option>
                    <option value="Joly"></option>
                    <option value="Grantaire"></option>
                    <option value="MotherPlutarch"></option>
                    <option value="Gueulemer"></option>
                    <option value="Babet"></option>
                    <option value="Claquesous"></option>
                    <option value="Montparnasse"></option>
                    <option value="Toussaint"></option>
                    <option value="Child1"></option>
                    <option value="Child2"></option>
                    <option value="Brujon"></option>
                    <option value="MmeHucheloup"></option></datalist>
                </div>
                <div id="container"></div>
        </div>
    );
};

export default GraphRenderer;
