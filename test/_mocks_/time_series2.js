class TimeSeries {
    //  opts = {
    //   datapoints: [1][1],
    //   alias: 'd',
    //   seriesName: 'd',
    //   operatorName: 'd'
    // }

    constructor(opts ){
        this.datapoints = opts.datapoints;
        this.alias = opts.alias;
        this.target = opts.alias;
        this.seriesName = opts.seriesName;
        this.name = this.alias;
        this.operatorName = opts.operatorName;
    }
}

export {TimeSeries};