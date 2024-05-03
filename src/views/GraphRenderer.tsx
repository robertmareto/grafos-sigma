import React, { useState, useEffect, useRef, useCallback } from 'react';
import { JSONData, State, CommunityDetails, modularityDetails } from '../Types'
import Sigma from "sigma";
import { createGephiGraph, createNewGraph } from './Graphology';
import { renderSigma } from './Sigma';
import { handleClusterChange, getSelectedClusters, toggleShowAllNodes, setSearchQuery, setHoveredNode, setEdgeReducer, setNodeReducer } from './SigmaUtils';
import { graphFunction, graphType } from './JsonValidator'

// import { BiBookContent, BiRadioCircleMarked } from "react-icons/bi";
// import { SigmaContainer, ControlsContainer, ZoomControl, FullScreenControl, SearchControl,  } from "@react-sigma/core";
// import { BsArrowsFullscreen, BsFullscreenExit, BsZoomIn, BsZoomOut } from 'react-icons/bs';
//import "@react-sigma/core/lib/react-sigma.min.css";


//import {subgraph} from 'graphology-operators';  // Para trabalhar com sub graphos => https://graphology.github.io/standard-library/operators.html#subgraph

/* TO DO:
    - painel lateral com os pares das arestas e pesos
    - Graphology gerar um arquivo .json e sigma apenas importar
    - Sub Clusters
    - Configurar para aceitar weight no lugar de size nas edges do dataGraph.json
*/

interface Props {
    jsonData: JSONData;
}

const GraphRenderer = (props: Props) => {
    const sigmaRef = useRef<Sigma | null>(null);
    const [communityDetails] = useState<CommunityDetails | null>(null);

    // Função para renderizar o gráfico Sigma
    const renderGraph = useCallback(() => {
        const [graph, details, modularityDetails ] = graphFunction(props.jsonData);
        
        // Localiza o container
        const container = document.getElementById("container") as HTMLElement;
        
        // Define tamanho do container
        container.style.height = "85vh";
        container.style.width = "100vw";
        
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

        let hierarquia = "comunnity"

        if (graphType === 'Gephi') {
            hierarquia = "modularity_class";
        }
        
        console.log(hierarquia)

        let clustercounter = graphFunction(props.jsonData) ? details.count : modularityDetails.count;

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
                    const community = graph.getNodeAttribute(node, hierarquia).toString();
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
            for (let i = 0; i < clustercounter; i++) {
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
        setNodeReducer(sigmaRef.current, graph, state);

        // Define o EdgeReducer para controlar a renderização das arestas
        setEdgeReducer(sigmaRef.current, graph, state);

        // Atualiza o gráfico Sigma para refletir as alterações
        updatesigma()
    
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
                    <option value="cop30"></option>
                    <option value="brasil"></option>
                </datalist>
            </div></div>
            <div id="container"></div>
        </div></>
)};

export default GraphRenderer;
