/* eslint-disable no-empty */
import { MetricsPanelCtrl } from 'grafana/app/plugins/sdk';
import TimeSeries from 'grafana/app/core/time_series2';
import * as _ from 'lodash';
import * as smcat from 'state-machine-cat';
const scxml = require('../node_modules/scxml/dist/scxml');
import {
    graphAttrsDark,
    nodeAttrsDark,
    edgeAttrsDark
} from './svgAttributes';

const panelDefaults = {
    scxml: '',
    graph: {
        nodeString: '',
        transitionString: ''
    },
    mode: 'Current State',
    stateData: '',
    containerDivId: 'container_0',
    trailNum: null,
    colorSetStringDark:['[color = "#ff0000" active]', 
        '[color = "#b30000" active]', 
        '[color = "#800000" active]',
        '[color = "#4d0000" active]', 
        '[color = "#1a0000" active]'],
    colorSetStringLight:['[color = "#ff0000" active]', 
        '[color = "#ff6666" active]', 
        '[color = "#ff9999" active]',
        '[color = "#ffcccc" active]', 
        '[color = "#ffe6e6" active]'],
    theme:'Dark'

};

class diagramCtrl extends MetricsPanelCtrl {

    /** @ngInject **/
    constructor($scope, $injector) {
        super($scope, $injector);
        _.defaults(this.panel, panelDefaults);
        this.errorMessage = undefined;
        const isLightTheme = document.body.classList.contains('theme-light');//check if grafana theme is light.
        this.panel.theme = isLightTheme ? 'Light' : 'Dark';
        this.panel.containerDivId = 'container_' + this.panel.id;
        this.events.on('init-edit-mode', this.onInitEditMode.bind(this));
        this.events.on('data-received', this.onDataReceived.bind(this));
        this.render();
    }

    onInitEditMode() {
        this.addEditorTab('Graph definition', 'public/plugins/aftmi-grafanaplugin-statemachinepanel/partials/editor.html', 2);
    }

    /**
     * @param {*} dataList: timeSeries data
     * Receive timeSeries data from the datasource and get the currentState value from it.
     * Render the diagram with the updated current state.
     */
    onDataReceived(dataList) {
        if (dataList == undefined || dataList.length == 0) {
            throw new Error('Null response from the datasource.');
        }
        this.series = dataList.map(this.seriesHandler.bind(this));
        this.panel.stateData = this.getStateData(this.panel.trailNum, this.panel.mode, this.series[0].datapoints);
        let revisedGraphText = this.reviseGraphText(this.panel.mode, this.panel.graph.nodeString, this.panel.stateData) + ';\n' + this.panel.graph.transitionString;
        this.renderGraph(revisedGraphText);
    }

    /**
    * @param {*} seriesData data received from the datasource, ordered by time.
    */
    seriesHandler(seriesData) {
        const series = new TimeSeries({
            datapoints: seriesData.datapoints,
            alias: seriesData.target
        });
        series.flotpairs = series.getFlotPairs(this.panel.nullPointMode);
        return series;
    }

    /**
     * Return information on states based on the display mode.
     * Current State mode: {current state value : timeStamp}, if a trail of states will be returned as an object if trailNum is not null.
     * Transition Counts mode: {state value: count}
     * Time in State mode: {state value: lasting time in percentage without %}
     * @param {*} mode 
     * @param {*} datapoints 
     */
    getStateData(trailNum, mode, datapoints) {
        let stateData = {};
        if (_.isArray(datapoints) && datapoints.length != 0) {
            let revised = this.removeDuplicates(datapoints);
            if (mode === 'Transition Counts') {
                let stateCounts = revised.map(item => item[0].toUpperCase()).reduce((counts, state) => {
                    if (state in counts) {
                        counts[state]++;
                    }
                    else {
                        counts[state] = 1;
                    }
                    return counts;
                }, {});
                stateData = stateCounts;
            } else if (mode === 'Time in State') {
                let stateTime = _.cloneDeep(revised);
                let timeInterval = _.last(stateTime)[1] - stateTime[0][1];
                for (let i = 0; i < revised.length; i++) {
                    if (i === revised.length - 1) {
                        stateTime[i][1] = 0;
                    } else {
                        stateTime[i][1] = revised[i + 1][1] - stateTime[i][1];
                    }
                }
                stateData = stateTime.map(each => [each[0].toUpperCase(), each[1] / timeInterval * 100]).reduce((result, item) => {
                    if (item[0] in result) {
                        result[item[0]] += item[1];
                    } else {
                        result[item[0]] = item[1];
                    }
                    return result;
                }, {});
            } else {
                if(!trailNum){
                    let item = _.last(revised);
                    stateData[item[0].toUpperCase()] = item[1];
                }else{
                    let item = [];
                    for(let i = 0; i < Math.min(trailNum, 5); i++){
                        item[i] = revised[revised.length - 1 - i];
                    }
                    stateData = item.reduce((result, each) => {
                        if(!(each[0] in result)) {
                            result[each[0].toUpperCase()] = each[1];
                        }
                        return result;
                    }, {});
                }
            }
        } else {
            throw new Error('Invalid query response!');
        }
        return stateData;
    }

    /**
     * Remove datapoints with duplicate timestamps. */
    removeDuplicates(datapoints) {
        let data = [];
        if (_.isArray(datapoints) && datapoints.length != 0) {
            data[0] = datapoints[0];
            for(let i = 1; i < datapoints.length; i++){
                if(datapoints[i][1] !== datapoints[i-1][1]){
                    data[i] = datapoints[i]; 
                }else{
                    data[i] = null;
                }
            }
        }
        return data.filter(val => !(!val || val === ''));
    }

    /**
  * @param {*} nodeString
  * @param {*} stateData
  * Check if the model is valid.
  * Invalid cases:
  * Model with invalid states, invalid query response and states not exist in the model.
  */
    validateModelAndData(nodeString, stateData){
        if (nodeString == undefined || nodeString.length == 0) {
            throw new Error('Invalid model: the model has no valid states!');
        }
        if(!stateData) {
            throw new Error('Invalid query response!');
        }
        let upperCasedNodeString = nodeString.toUpperCase();
        let states = Object.keys(stateData);
        for(let i = 0; i < states.length; i++) {
            if(upperCasedNodeString.indexOf(states[i].toUpperCase()) == -1){
                throw new Error('Invalid model: state '+states[i].toUpperCase()+' does not exist in the model!');
            }
        }
    }

    /**
     * Modify the graphText based on the display mode and state related data.
     * @param {*} mode 
     * @param {*} nodeString original graphText generated by scxml API and syntaxFormatter, only modify nodeString.
     * @param {*} stateData 
     * e.g: 
     * Transition Counts mode: {'IDLE': 20, 'EXECUTE': 30}
     * Time in State mode: {'IDLE': 10.3, 'EXECUTE': 89.7}
     * Current State mode: {'IDLE': timestamp}
     */
    reviseGraphText(mode, nodeString, stateData) {
        this.validateModelAndData(nodeString, stateData);
        let revised;
        if (mode === 'Transition Counts') {
            let re = new RegExp(Object.keys(stateData).join('|'), 'gi');
            revised = nodeString.replace(re, function (matched) {
                return matched.toUpperCase() + ': counts: ' + stateData[matched.toUpperCase()];
            });
        } else if (mode === 'Time in State') {
            let re = new RegExp(Object.keys(stateData).join('|'), 'gi');
            revised = nodeString.replace(re, function (matched) {
                //each time percentage has two decimal places.
                return matched.toUpperCase() + ': time: ' + stateData[matched.toUpperCase()].toFixed(2) + '%';
            });
        } else {
            let statesInTrail = Object.keys(stateData);
            let colorSetString = this.panel.theme == 'Light' ? this.panel.colorSetStringLight:this.panel.colorSetStringDark;
            revised = nodeString;
            for(let i = 0; i < statesInTrail.length; i++) {
                let re = new RegExp(statesInTrail[i]);
                revised = revised.replace(re, statesInTrail[i].toUpperCase() + colorSetString[i]);
            }
        }
        return revised;
    }

    /**
    * @param graphText
    * Render svg based on graph definiton text string.
    * Call state-machine-cat render API.
    * Change the svg theme based on grafana current theme.
    */
    renderGraph(graphText) {
        if (graphText != undefined && graphText.length > 0) {
            const diagramContainer = document.getElementById(this.panel.containerDivId);
            try {
                const svgcode = smcat.render(
                    graphText,
                    {
                        inputType: 'smcat',
                        outputType: 'svg',
                        direction: 'left-right',
                        engine: 'dot',
                        dotGraphAttrs: this.panel.theme == 'Light' ? null : graphAttrsDark,
                        dotNodeAttrs: this.panel.theme == 'Light' ? null : nodeAttrsDark,
                        dotEdgeAttrs: this.panel.theme == 'Light' ? null : edgeAttrsDark
                    }
                );
                diagramContainer.innerHTML = svgcode.replace(/svg width="[^"]+" height="[^"]+"/g, 'svg width="100%" height="90%"');
            } catch (err) {
                throw new Error('Unable to render the graph.');
            }
        } else {
            throw new Error('Invalid model!');
        }
    }

    /**
   * 
   * DFS traversal, collect all nodes and transitions information.
   * @param node 
   * @param nodeList: array of node.id, use{} to indicate hierarchical relationships.
   * e.g: A{b,c;},D{e,f,g;},H,I;
   * @param transitionList: array, collect formatted transitions.
   * e.g: a=>b:1; b=>c:2;
   */
    deepTraversal(node, nodeList, transitionList) {
        if (node == undefined || node == null) {
            return;
        }
        if (node.$type != 'scxml') {
            nodeList.push(node.id, ',');
        }
        let children = node.descendants;
        let transitions = node.transitions;
        if (children.length > 0) {
            nodeList.pop();//remove the "," in front of "{"
            nodeList.push('{');
            for (let i = 0; i < children.length; i++) {//check all children states
                if (!nodeList.includes(children[i].id)) {//if the child state has not been traversed.
                    this.deepTraversal(children[i], nodeList, transitionList);
                }
            }
            nodeList.pop();//remove "," in front of "}", use ";" to indicate the end of nested nodes.
            nodeList.push(';', '}', ',');
        }
        for (let j = 0; j < transitions.length; j++) {
            const eachTransition = transitions[j].source.id + '=>' + transitions[j].target.id + ':' + transitions[j].events + ';';
            transitionList.push(eachTransition);
        }
        return { nodeList, transitionList };
    }

    /**
     * Format nodes and transitions into required syntax
     * Formatted syntax in nodeString and transitionString
     * e.g:
     * {nodeString: p1{a,b,c;},p2{d,e,f;},p3,p4,
     * transitionString:
     * a=>b:1;
     * a=>c:2;
     * b=>c:3;
     * d=>e:4;
     * d=>f:5;
     * p1=>p3:6;
     * p1=>p4:7;}
     * @param nodeList
     * @param transitionList
     */
    syntaxFormatter(nodeList, transitionList) {
        if (nodeList.length == 0 || transitionList.length == 0)
            return;
        let nodeString = nodeList.join('');
        nodeString = nodeString.slice(1, -3);//remove unnecessary characters.
        let transitionString = '';
        for (let i = 0; i < transitionList.length; i++) {
            transitionString += '\n' + transitionList[i];
        }
        return { nodeString, transitionString };
    }
    /**
     * Locate the effective root for deepTraversal.
     * @param {*} scObject A state chart object.
     */
    locateRoot(scObject) {
        if (scObject == undefined || scObject._model == undefined || scObject._model.descendants == undefined) {
            throw new Error('Invalid model!');
        }
        else {
            let roots = scObject._model.descendants;
            for (let i = 0; i < roots.length; i++) {
                if (roots[i].$type == 'scxml') {
                    return roots[i];
                }
            }
        }
    }

    /**
     * Modifiy the API scxml as a promise step1
     * Return a promise of scxml model, can be used by scxmlModel().then(result)
     * API: scxml, origianl version is a callback function
     * @param {*} scxmlString scxml format string
     */
    scxmlModel(scxmlString) {
        return new Promise((resolve, reject) => {
            scxml.documentStringToModel(null, scxmlString, (err, model) => {
                if (err) {
                    reject(err);
                }
                resolve(model);
            });
        });
    }

    /**
     * Modifiy the API scxml as a promise step2
     * Return a promise of scxml fnModel, can be used by scxmlFnModel().then(result)
     * API: scxml, origianl version is a callback function
     * @param {*} model returned by scxmlModel
     */
    scxmlFnModel(model) {
        return new Promise((resolve, reject) => {
            model.prepare((err, fnModel) => {
                if (err) {
                    reject(err);
                }
                resolve(fnModel);
            });
        });
    }

    /**
     * Modifiy the API scxml as a promise step3
     * Return a promise of statechart object, can be used by generateStateChart().then(result)
     * API: scxml, origianl version is a callback function
     * @param {*} model returned by scxmlModel
     */
    generateStateChart(fnModel) {
        return new Promise((resolve) => {
            let sc = new scxml.core.Statechart(fnModel);
            resolve(sc);
        });
    }

    /**
     * Modify the API scxml as an async function, calls scxmlModel, scxmlFnModel and generateStateChart in order.
     * Return a promise of a statechart object, can be used by scxmlParserAsync().then(result)
     * API: scxml, orgianl version is called with embedded callbacks.
     * Error handling: Check the validity of input scxml file string, throw an error if valid.
     * @param {*} scxmlString 
     */
    async scxmlParserAsync(scxmlString) {
        try {
            let model = await this.scxmlModel(scxmlString);
            let fnModel = await this.scxmlFnModel(model);
            let sc = await this.generateStateChart(fnModel);
            return sc;
        } catch (err) {
            throw new Error('SCXML is invalid!');
        }
    }

    link(scope) {
        scope.$watch('ctrl.panel.scxml', async (scxmlString) => {
            try {
                let sc = await this.scxmlParserAsync(scxmlString);
                this.errorMessage = undefined;
                let root = await this.locateRoot(sc);
                let scmodel = await this.deepTraversal(root, [], []);
                this.panel.graph = await this.syntaxFormatter(scmodel.nodeList, scmodel.transitionList);
                let graphText = this.panel.graph.nodeString + ';' + '\n' + this.panel.graph.transitionString;
                await this.renderGraph(graphText);
            } catch (err) {
                this.errorMessage = err.toString();
            }
            await this.refresh();
        });

        scope.$watch('ctrl.panel.mode', async () => {
            let revisedGraphText = await this.reviseGraphText(this.panel.mode, this.panel.graph.nodeString, this.panel.stateData) + ';\n' + this.panel.graph.transitionString;
            await this.renderGraph(revisedGraphText);
            await this.refresh();
        });

        scope.$watch('ctrl.panel.trailNum', async () => {
            let revisedGraphText = await this.reviseGraphText(this.panel.mode, this.panel.graph.nodeString, this.panel.stateData) + ';\n' + this.panel.graph.transitionString;
            await this.renderGraph(revisedGraphText);
            await this.refresh(); 
        });
    }
}

diagramCtrl.templateUrl = 'partials/module.html';

export { diagramCtrl, diagramCtrl as MetricsPanelCtrl };

