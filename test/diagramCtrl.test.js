/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
import _ from 'lodash';
import { diagramCtrl } from '../src/diagramCtrl';
jest.mock('grafana/app/plugins/sdk');
jest.mock('grafana/app/core/time_series2', () => {
    return jest.fn().mockImplementation(() => { });
});

describe('Diagram controller', () => {
    let ctrl;
    //Initialize the controller
    beforeEach(() => {
        diagramCtrl.prototype.events = { on: () => { } };
        diagramCtrl.prototype.panel = {};
        diagramCtrl.prototype.onInitEditMode = { bind: () => { } };
        diagramCtrl.prototype.onDataReceived = { bind: () => { } };
        diagramCtrl.prototype.render = () => { };
        ctrl = new diagramCtrl({}, {});
    });
    //Test the constructor(), check all inherited properties have been set correctly.
    describe('Constructor', () => {
        it('Should construct correctly', () => {
            expect(ctrl.panel.scxml).toBe('');
            expect(ctrl.panel.graph).toStrictEqual({ nodeString: '', transitionString: '' });
            expect(ctrl.panel.stateData).toBe('');
            expect(ctrl.panel.trailNum).toBe(null);
            expect(ctrl.panel.mode).toBe('Current State');
        });
    });
    //Test the validateModelAndData(), throw an error in invalid cases.
    describe('validateModelAndData', () => {
        const nodeString = 'A,B,C;';
        const stateData = { 'A': 111, 'B': 222, 'C': 333 };

        describe('When the model is valid:', () => {
            it('if recieve an invalid response, should throw an error', () => {
                expect(() => { ctrl.validateModelAndData(nodeString, ''); }).toThrow('Invalid query response!');
                expect(() => { ctrl.validateModelAndData(nodeString, undefined); }).toThrow('Invalid query response!');
            });

            it('if recieve valid responses, should return undefined', () => {
                expect(ctrl.validateModelAndData(nodeString, stateData)).toBe(undefined);
            });
        });

        describe('When the model is invalid:', () => {
            it('if the model has no valid states, should throw an error', () => {
                expect(() => { ctrl.validateModelAndData('', stateData); }).toThrow('Invalid model: the model has no valid states!');
            });
            it('if a state not exists in the model, should throw an error', () => {
                expect(() => { ctrl.validateModelAndData(nodeString, { 'D': 211, 'E': 333 }); }).toThrow('Invalid model: state D does not exist in the model!');
                expect(() => { ctrl.validateModelAndData(nodeString, { 'A': 111, 'B': 211, 'E': 333 }); }).toThrow('Invalid model: state E does not exist in the model!');
            });
        });
    });
    //Test getStateData(), process the datapoints received from the datasource based on different display modes.
    describe('getStateData', () => {
        describe('When datapoints is not an array', () => {
            it('datapoints is null, throw an error Invalid query response!', () => {
                expect(() => { ctrl.getStateData(null, 'Transition Counts', null); }).toThrow('Invalid query response!');
            });
            it('datapoints is an object, throw an error Invalid query response!', () => {
                expect(() => { ctrl.getStateData(null, 'Current State', { 'Idle': 2 }); }).toThrow('Invalid query response!');
            });
        });
        describe('When datapoints is an empty array', () => {
            it('datapoints is [], throw an error Invalid query response!', () => {
                expect(() => { ctrl.getStateData(null, 'Time in State', null); }).toThrow('Invalid query response!');
            });
        });
        const datapoints = [['Idle', 1565730563356],
            ['Stopped', 1565730563356],
            ['Execute', 1565730563453],
            ['Idle', 1565730563486],
            ['Execute', 1565730563560],
            ['Idle', 1565730567632],
            ['Execute', 1565730567718]];
        describe('When in Transition Counts mode', () => {
            it('returns the count of each state', () => {
                const expected = { 'IDLE': 3, 'EXECUTE': 3 };
                expect(ctrl.getStateData(null,'Transition Counts', datapoints)).toStrictEqual(expected);
            });
        });
        describe('When in Time in State mode', () => {
            it('returns the lasting time of each state', () => {
                const expected = { 'IDLE': 5.89179275561669, 'EXECUTE': 94.10820724438331 };
                expect(ctrl.getStateData(null, 'Time in State', datapoints)).toStrictEqual(expected);
            });
        });
        describe('When in Current State mode', () => {
            //In Current State mode, returns trailNum+1 states, in a descending order of timestamp.
            describe('without duplicate datapoints', () => {
                const datapoints = [['Aborted', 1565730563356],
                    ['Stopped', 1565730563378],
                    ['Held', 1565730563453],
                    ['Idle', 1565730563486],
                    ['Stopping', 1565730563560],
                    ['Complete', 1565730567632],
                    ['Execute', 1565730567718]];
                it('trailNum is null, returns the latest object as the current state', () => {
                    const expected = { 'EXECUTE': 1565730567718 };
                    expect(ctrl.getStateData(null, 'Current State', datapoints)).toStrictEqual(expected);
                });
                it('trailNum is 1, returns an object of the latest state', () => {
                    const expected = { 'EXECUTE': 1565730567718};
                    expect(ctrl.getStateData(1,'Current State', datapoints)).toStrictEqual(expected);
                });
                it('trailNum is 3, returns an object of latest 3 states', () => {
                    const expected = { 'EXECUTE': 1565730567718,'COMPLETE': 1565730567632, 'STOPPING': 1565730563560};
                    expect(ctrl.getStateData(3, 'Current State', datapoints)).toStrictEqual(expected);
                });
                it('trailNum is 6, returns an object of latest 5 states', () => {
                    const expected = { 'EXECUTE': 1565730567718,'COMPLETE': 1565730567632, 'STOPPING': 1565730563560, 'IDLE': 1565730563486, 'HELD': 1565730563453};
                    expect(ctrl.getStateData(6, 'Current State', datapoints)).toStrictEqual(expected);
                });
            });
            describe('with duplicate datapoints, should remove duplicates', () => {
                const datapoints = [
                    ['Stopped', 1565730563200],
                    ['Idle', 1565730563300],
                    ['Execute', 1565730563356],
                    ['Stopped', 1565730563356],
                    ['Held', 1565730563453],
                    ['Idle', 1565730563486],
                    ['Stopping', 1565730563560],
                    ['Complete', 1565730567718],
                    ['Execute', 1565730567718]];
                it('trailNum is null, returns the latest object as the current state', () => {
                    const expected = { 'COMPLETE': 1565730567718 };
                    expect(ctrl.getStateData(null, 'Current State', datapoints)).toStrictEqual(expected);
                });
                it('trailNum is 1, returns an object of the latest state', () => {
                    const expected = {'COMPLETE': 1565730567718};
                    expect(ctrl.getStateData(1,'Current State', datapoints)).toStrictEqual(expected);
                });
                it('trailNum is 3, returns an object of latest 3 states', () => {
                    const expected = { 'COMPLETE': 1565730567718, 'STOPPING': 1565730563560, 'IDLE': 1565730563486};
                    expect(ctrl.getStateData(3, 'Current State', datapoints)).toStrictEqual(expected);
                });
                it('trailNum is 6, returns an object of latest 5 states', () => {
                    //Idle occurred twice, so stop copying the trail states.
                    const expected = { 'COMPLETE': 1565730567718, 'STOPPING': 1565730563560, 'IDLE': 1565730563486, 'HELD': 1565730563453,'EXECUTE': 1565730563356};
                    expect(ctrl.getStateData(6, 'Current State', datapoints)).toStrictEqual(expected);
                });
            });
        });
    });

    //Test removeDuplicates(), it remove all the points with duplicate timestamps.
    describe('removeDuplicates', () => {
        const datapoints = [['Idle', 1565730563356],
            ['Execute', 1565730563356],
            ['Idle', 1565730563486],
            ['Execute', 1565730563560],
            ['Idle', 1565730567632],
            ['Execute', 1565730567632]];
        describe('Map the array of arrays to array of objects', () => {
            it('returns an object, key is the timestamp', () => {
                const expected = [['Idle', 1565730563356], ['Idle', 1565730563486], ['Execute', 1565730563560], ['Idle', 1565730567632]];
                expect(ctrl.removeDuplicates(datapoints)).toStrictEqual(expected);
            });
        });
    });
    //Test reviseGraphText(), insert style syntax or counts/time info syntax in different modes.
    describe('reviseGraphText', () => {
        const nodeString = 'EXECUTE, IDLE, STOPPED';
        describe('If input is invalid:', () => {
            it('in Current State mode, state and model does not match, should throw an error: Invalid model: state and model does not match!', () => {
                expect(() => { ctrl.reviseGraphText('Current State', nodeString, { 'CATCH': 111 }); }).toThrow('Invalid model: state CATCH does not exist in the model!');
            });
            it('in Time in State mode, state and model does not match, should throw an error: Invalid model: state and model does not match!', () => {
                expect(() => { ctrl.reviseGraphText('Time in State', nodeString, { 'CATCH': 111 }); }).toThrow('Invalid model: state CATCH does not exist in the model!');
            });
            it('in Transition Counts mode, state and model does not match, should throw an error: Invalid model: state and model does not match!', () => {
                expect(() => { ctrl.reviseGraphText('Transition Counts', nodeString, { 'CATCH': 111 }); }).toThrow('Invalid model: state CATCH does not exist in the model!');
            });
        });
        describe('In Transition Counts mode:', () => {
            const stateData = {
                'EXECUTE': 10,
                'IDLE': 2,
                'STOPPED': 3
            };
            const expected = 'EXECUTE: counts: 10, IDLE: counts: 2, STOPPED: counts: 3';
            it('when nodeString are all uppercased should insert the count for each state', () => {
                expect(ctrl.reviseGraphText('Transition Counts', nodeString, stateData)).toStrictEqual(expected);
            });
            it('when nodeString contains lowercased should insert the count for each state', () => {
                const strLow = 'Execute, Idle, Stopped';
                expect(ctrl.reviseGraphText('Transition Counts', strLow, stateData)).toStrictEqual(expected);
            });
        });

        describe('In Time in State mode:', () => {
            const stateData = {
                'EXECUTE': 45.5,
                'IDLE': 24.5,
                'STOPPED': 30
            };
            const expected = 'EXECUTE: time: 45.50%, IDLE: time: 24.50%, STOPPED: time: 30.00%';
            it('when nodeString are all uppercased should insert time for each state', () => {
                expect(ctrl.reviseGraphText('Time in State', nodeString, stateData)).toStrictEqual(expected);
            });
            it('when nodeString contains lowercased should insert time for each state', () => {
                const strLow = 'Execute, Idle, Stopped';
                expect(ctrl.reviseGraphText('Time in State', strLow, stateData)).toStrictEqual(expected);
            });
        });
        describe('In Current State mode:', () => {
            const stateData = { 'IDLE': 1, 'EXECUTE': 2, 'STOPPED':3};
            const expected = 'EXECUTE[color = "#b30000" active], IDLE[color = "#ff0000" active], STOPPED[color = "#800000" active]';
            it('should insert stylish string after the current state and its trail states', () => {
                expect(ctrl.reviseGraphText('Current State', nodeString, stateData)).toStrictEqual(expected);
            });
            
        });
    });

    //Test renderGraph(), throw errors for invalid model or check smcat API has been called correctly.
    describe('renderGraph', () => {
        describe('When the graphText is invalid', () => {
            it('should throw an error', () => {
                expect(() => { ctrl.renderGraph(undefined); }).toThrow('Invalid model!');
                expect(() => { ctrl.renderGraph(''); }).toThrow('Invalid model!');
            });
        });

    });
    //Test syntaxFormatter(), return undefined when nodeList or transitionList is empty, or return valid syntax for renderGraph().
    describe('syntaxFormatter', () => {
        const nodeList = ['{', 'p1', '{', 'a', ',', 'b', ',', 'c', ';', '}', ',', 'p2', '{', 'd', ',', 'e', ',', 'f', ';', '}', ',', 'p3', ',', 'p4', ';', '}', ','];
        const transitionList = ['a=>b:1;', 'a=>c:2;', 'b=>c:3;', 'd=>e:4;', 'd=>f:5;', 'p1=>p3:6;', 'p1=>p4:7;'];

        describe('When input is invalid:', () => {
            it('nodeList is empty returns undefined', () => {
                expect(ctrl.syntaxFormatter([], transitionList)).toBe(undefined);
            });
            it('transitionList is empty returns undefined', () => {
                expect(ctrl.syntaxFormatter(nodeList, [])).toBe(undefined);
            });
        });

        describe('When input is valid', () => {
            const expected = {
                nodeString: 'p1{a,b,c;},p2{d,e,f;},p3,p4',
                transitionString:
                    '\na=>b:1;' +
                    '\na=>c:2;' +
                    '\nb=>c:3;' +
                    '\nd=>e:4;' +
                    '\nd=>f:5;' +
                    '\np1=>p3:6;' +
                    '\np1=>p4:7;'
            };
            it('should generate correct syntax for nodes and transitions respectively', () => {
                expect(ctrl.syntaxFormatter(nodeList, transitionList)).toStrictEqual(expected);
            });
        });
    });
    //Test deepTraversal(), throw errors when a model is invalid, or return the nodelist and transisitonlist.
    describe('deepTraversal', () => {
        describe('When the root is null', () => {
            it('should return undefined', () => {
                expect(ctrl.deepTraversal(null, [], [])).toBe(undefined);
            });
        });

        describe('When the root is undefined', () => {
            it('should return undefined', () => {
                expect(ctrl.deepTraversal(undefined, [], [])).toBe(undefined);
            });
        });

        describe('When the root is valid', () => {
            const nodeA = {
                id: 'A',
                $type: 'state',
                descendants: [],
                transitions: [{
                    source: {
                        id: 'A'
                    },
                    events: 'go',
                    target: {
                        id: 'B'
                    }
                }]
            };
            const nodeB = {
                id: 'B',
                $type: 'state',
                descendants: [],
                transitions: []
            };
            const nodeQ = {
                id: 'Q',
                $type: 'scxml',
                descendants: [nodeA, nodeB],
                transitions: []
            };
            const nodeP1 = {
                id: 'P1',
                $type: 'state',
                descendants: [nodeA, nodeB],
                transitions: [{
                    source: {
                        id: 'P1'
                    },
                    events: 'run',
                    target: {
                        id: 'P2'
                    }
                }]
            };
            const nodeP2 = {
                id: 'P2',
                $type: 'state',
                descendants: [],
                transitions: []
            };
            const root = {
                id: 'P0',
                $type: 'scxml',
                descendants: [nodeP1, nodeP2, nodeA, nodeB],
                transitions: []
            };
            const expected = {
                nodeList: ['{', 'P1', '{', 'A', ',', 'B', ';', '}', ',', 'P2', ';', '}', ','],
                transitionList: ['A=>B:go;', 'P1=>P2:run;']
            };
            it('and with only one state should work', () => {
                expect(ctrl.deepTraversal(nodeB, [], [])).toStrictEqual({ nodeList: ['B', ','], transitionList: [] });
            });
            it('and with one level nested states should work', () => {
                expect(ctrl.deepTraversal(nodeQ, [], [])).toStrictEqual({ nodeList: ['{', 'A', ',', 'B', ';', '}', ','], transitionList: ['A=>B:go;'] });
            });
            it('and with two level nested states should work', () => {
                expect(ctrl.deepTraversal(root, [], [])).toStrictEqual(expected);
            });

        });
    });
    //Test locateRoot(), throw errors when a model is invalid, or return the valid root.
    describe('locateRoot', () => {
        describe('When the state chart object is undefined', () => {
            it('should return undefined', () => {
                expect(() => { ctrl.locateRoot(undefined); }).toThrow('Invalid model!');
            });
        });

        describe('When the state chart object is defined', () => {
            it('but the object has no valid _model should throw an error', () => {
                let scObject = {
                    _model: undefined
                };
                expect(() => { ctrl.locateRoot(scObject); }).toThrow('Invalid model!');
            });

            it('but the object has no valid _model.descendents should throw an error', () => {
                let scObject = {
                    _model: {
                        descendents: undefined
                    }
                };
                expect(() => { ctrl.locateRoot(scObject); }).toThrow('Invalid model!');
            });

            it('and the object is valid should locate the root', () => {
                const scObject = { _model: { descendants: [{ $type: 'initial', id: '1' }, { $type: 'scxml', id: '2' }, { $type: 'state', id: '3' }] } };
                expect(ctrl.locateRoot(scObject)).toBe(scObject._model.descendants[1]);
            });
        });
    });
    //Test scxmlModel(), catch errors for invalid models.
    describe('scxmlModel', () => {
        it('When the input is invalid should throw an error', async () => {
            await expect(ctrl.scxmlModel('')).rejects.toThrow();
            await expect(ctrl.scxmlModel(undefined)).rejects.toThrow();
        });
    });
    //Test scxmlFnModel(), catch errors for invalid models.
    describe('scxmlFnModel', () => {
        it('When the input is invalid should throw an error', async () => {
            await expect(ctrl.scxmlFnModel('')).rejects.toThrow();
            await expect(ctrl.scxmlFnModel(undefined)).rejects.toThrow();
        });
    });
    //Test generateStateChart(), catch errors for invalid models.
    describe('generateStateChart', () => {
        it('When the input is invalid should throw an error', async () => {
            await expect(ctrl.generateStateChart('')).rejects.toThrow();
            await expect(ctrl.generateStateChart(undefined)).rejects.toThrow();
        });
    });
    //Test scxmlParserAsync(), catch errors for invalid models.
    describe('scxmlParserAsync', () => {
        describe('Invalid scxml will result in an error', () => {
            it('Empty string', async () => {
                await expect(ctrl.scxmlParserAsync('')).rejects.toThrow('SCXML is invalid!');
            });

            it('Undefined', async () => {
                await expect(ctrl.scxmlParserAsync()).rejects.toThrow('SCXML is invalid!');
            });

            it('Incomplete scxml string: unclosed <scxml>', async () => {
                const scxmlString = '<scxml initial="INIT_STATES">' +
                    '<state id="ACTIVE_STATES" initial="IDLE">' +
                    '<state id="IDLE">';
                await expect(ctrl.scxmlParserAsync(scxmlString)).rejects.toThrow('SCXML is invalid!');
            });

            it('Incomplete scxml string: unclosed <state>', async () => {
                const scxmlString = '<scxml initial="INIT_STATES">' +
                    '<state id="IDLE">' +
                    '<transition event="Start" target="EXECUTE"/>' +
                    '</scxml>';
                await expect(ctrl.scxmlParserAsync(scxmlString)).rejects.toThrow('SCXML is invalid!');
            });
        });
    });
});