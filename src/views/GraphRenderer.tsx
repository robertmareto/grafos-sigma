import React, { useState, useEffect, useRef, useCallback } from 'react';
import { JSONData, State } from '../Types'
import Sigma from "sigma";
import { Coordinates, EdgeDisplayData, NodeDisplayData } from "sigma/types";
import { createGraph, CommunityDetails, modularityDetails } from './Graphology';
import { renderSigma } from './Sigma';
import { handleClusterChange, getSelectedClusters, toggleShowAllNodes, setSearchQuery, setHoveredNode, setEdgeReducer } from './SigmaUtils';

import { BiBookContent, BiRadioCircleMarked } from "react-icons/bi";
import { SigmaContainer, ControlsContainer, ZoomControl, FullScreenControl, SearchControl,  } from "@react-sigma/core";
import { BsArrowsFullscreen, BsFullscreenExit, BsZoomIn, BsZoomOut } from 'react-icons/bs';
//import "@react-sigma/core/lib/react-sigma.min.css";


//import {subgraph} from 'graphology-operators';  // Para trabalhar com sub graphos => https://graphology.github.io/standard-library/operators.html#subgraph

/* TO DO:
    - Graphology gerar um arquivo .json e sigma apenas importar
    - Sub Clusters
    - Label Proporcional ao Node (nota: parece que o sigma usa uma mesma fonte para todo o Canva e não por nó)
    - Configurar para aceitar weight no lugar de size nas edges do dataGraph.json
*/


interface Props {
    jsonData: JSONData;
};

const GraphRenderer = (props: Props) => {
    const sigmaRef = useRef<Sigma | null>(null);
    const [communityDetails] = useState<CommunityDetails | null>(null);

    // Função para renderizar o gráfico Sigma
    const renderGraph = useCallback(() => {
        const [graph, details, modularityDetails ] = createGraph(props.jsonData);
        
        // Localiza o container
        const container = document.getElementById("container") as HTMLElement;
        
        // Define tamanho do container
        container.style.height = "600px";
        container.style.width = "100%";
        
        // Renderiza o grapho com o Sigma
        sigmaRef.current = renderSigma(graph, container);

        // Esconde o loader da DOM
        const loader = document.getElementById("loader") as HTMLElement;
        if (loader) loader.style.display = "none";

        const state: State = { searchQuery: "" };

        const renderer = sigmaRef.current

        function updatesigma() { 
             sigmaRef.current?.refresh({
            skipIndexation: false,
            });
        }

        const searchQueryHandler = setSearchQuery(state, graph, sigmaRef);
        const hoveredNodeHandler = setHoveredNode(state, graph, sigmaRef);

        const setClusters = (selectedClusters: string[]) => {
            if (selectedClusters.length === 0) {
                // Se nenhum cluster estiver selecionado, exibir todos os nós
                graph.forEachNode((node) => {
                    graph.setNodeAttribute(node, "hidden", false);
                });
                updatesigma()
            } else {
                // Exibir apenas os nós dos clusters selecionados
                graph.forEachNode((node) => {
                    const community = graph.getNodeAttribute(node, "modularity_class").toString();
                    if (selectedClusters.includes(community)) {
                        graph.setNodeAttribute(node, "hidden", false);
                    } else {
                        graph.setNodeAttribute(node, "hidden", true);
                    }
                });
                updatesigma()
            }
        };

        // Seletor de Cluster-Comunidades
        const clusterInputParent = document.getElementById("clusterInput");

        // Verificar se o seletor já existe antes de criar novamente
        if (clusterInputParent && !clusterInputParent.querySelector("#clusterCheckboxes")) {
            // Cria um grupo de checkboxes
            const clusterCheckboxesGroup = document.createElement("div");
            clusterCheckboxesGroup.id = "clusterCheckboxes";
            
            // Adiciona a opção "Exibir Todos" como checkbox
            const showAllCheckbox = document.createElement("input");
            showAllCheckbox.type = "checkbox";
            showAllCheckbox.name = "clusterOption";
            showAllCheckbox.value = "";
            showAllCheckbox.id = "showAllCheckbox";
            showAllCheckbox.addEventListener("change", () => toggleShowAllNodes(
                showAllCheckbox.checked,
                setClusters,
                getSelectedClusters,
            )); // Define a função de clique para exibir todos
            const showAllLabel = document.createElement("label");
            showAllLabel.htmlFor = "showAllCheckbox";
            showAllLabel.textContent = "Exibir Todos";
            clusterCheckboxesGroup.appendChild(showAllCheckbox);
            clusterCheckboxesGroup.appendChild(showAllLabel);

            // Adiciona as checkboxes para cada cluster
            for (let i = 0; i < modularityDetails.count; i++) {
                const clusterCheckbox = document.createElement("input");
                clusterCheckbox.type = "checkbox";
                clusterCheckbox.name = "clusterOption";
                clusterCheckbox.value = i.toString();
                clusterCheckbox.id = `clusterCheckbox${i}`;
                clusterCheckbox.addEventListener("change", handleClusterChange(setClusters, getSelectedClusters)); // Define a função de clique para selecionar o cluster
                const clusterLabel = document.createElement("label");
                clusterLabel.htmlFor = `clusterCheckbox${i}`;
                clusterLabel.textContent = `Cluster ${i + 1}`;
                clusterCheckboxesGroup.appendChild(clusterCheckbox);
                clusterCheckboxesGroup.appendChild(clusterLabel);
            }
            
            clusterInputParent.appendChild(clusterCheckboxesGroup);
            updatesigma()
        }

        // State for drag'n'drop
        let draggedNode: string | null = null;
        let isDragging = false;

        // // Ações ao clicar no Nó
        // renderer.on("downNode", (e) => {
        //     isDragging = true; // Define o estado de arrasto
        //     draggedNode = e.node;
        //     graph.setNodeAttribute(draggedNode, "highlighted", true);
        // });

        // Ações ao passar o mouse sobre o Nó
        renderer.on("enterNode", (e) => {
            draggedNode = e.node; // Define o nó especifico
            hoveredNodeHandler(draggedNode) // oculta os nós sem relação
            graph.setNodeAttribute(draggedNode, "highlighted", true); // dá destauqe ao nó
        });

        // Ações ao sair o mouse do Nó
        renderer.on("leaveNode", (e) => {
            draggedNode = e.node;
            hoveredNodeHandler(undefined)
            graph.setNodeAttribute(draggedNode, "highlighted", false);
        });

        // // Eventos com o mouse em movimento arrastando o nó
        // renderer.getMouseCaptor().on("mousemovebody", (e) => {
        //     if (!isDragging || !draggedNode) return;

        //     // Get new position of node
        //     const pos = renderer.viewportToGraph(e);

        //     graph.setNodeAttribute(draggedNode, "x", pos.x);
        //     graph.setNodeAttribute(draggedNode, "y", pos.y);

        //     // Prevent sigma to move camera:
        //     e.preventSigmaDefault();
        //     e.original.preventDefault();
        //     e.original.stopPropagation();
        // });

        // // On mouse up, we reset the autoscale and the dragging mode
        // renderer.getMouseCaptor().on("mouseup", () => {
        //     if (draggedNode) {
        //     graph.removeNodeAttribute(draggedNode, "highlighted");
        //     }
        //     isDragging = false;
        //     draggedNode = null;
        // });

        // // Ações ao largar o nó
        // renderer.getMouseCaptor().on("mousedown", () => {
        //     //setHoveredNode(undefined)
        //     if (!renderer.getCustomBBox()) renderer.setCustomBBox(renderer.getBBox());
        // });  
        
        // Liga interações de entrada no nó de pesquisa:
        const searchInput = document.getElementById("search-input") as HTMLInputElement;

        // Monitora o input da pesquista
        searchInput.addEventListener("input", () => {
            searchQueryHandler(searchInput.value || "");
        });
        searchInput.addEventListener("blur", () => {
            searchQueryHandler("");
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
        setEdgeReducer(sigmaRef.current, graph, state);

        // Atualiza o gráfico Sigma para refletir as alterações
        sigmaRef.current?.refresh({
            skipIndexation: false,
        });
    
}, [communityDetails, props.jsonData]);


    useEffect(() => {
        renderGraph();

        // Limpeza ao desmontar o componente
        return () => {
            if (sigmaRef.current) {
                sigmaRef.current.kill();
                sigmaRef.current = null;
            }
        };
    }, [renderGraph]);

    return (
        <><div>
            <div id="loader">Loading ...</div>
            <div id="clusterInput" className='clusterInput'>
            <div id="search">
                <input type="search" id="search-input" list="suggestions" placeholder="Search Node"></input>
                <datalist id="suggestions">
                    <option value="Myriel"></option>
                    <option value="cop30"></option>
                    <option value="brasil"></option>
                    <option value="robert"></option>
                    <option value="robert2"></option>
                    <option value="nrobert2"></option>
                </datalist>
            </div></div>
            <div id="container"></div>
        </div></>
)};

export default GraphRenderer;
