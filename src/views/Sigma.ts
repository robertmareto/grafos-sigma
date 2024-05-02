import Sigma from "sigma";
import EdgeCurveProgram from "@sigma/edge-curve";
import { createNodeBorderProgram } from "@sigma/node-border";
import Graph from "graphology";
//import { Coordinates, EdgeDisplayData, NodeDisplayData } from "sigma/types";

export function renderSigma(graph: Graph, container: HTMLElement) {
    return new Sigma(graph, container, {
        defaultNodeType: "bordered",
        labelSize: 12,
        labelDensity: 10,
        labelGridCellSize: 5,
        labelRenderedSizeThreshold: 12,
        labelFont: "Lato, sans-serif", // Fonte da Label
        zIndex: true,
        defaultEdgeType: "curve",
        itemSizesReference: "positions",
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
}
