'use strict';
/**
 * Represents the data to be displayed on a graph and provides
 * the endpoints allowing for the plotting of this data.
 */
class GraphData {
  constructor() {
    /** @private @const {xAxis: string, yAxis:string, title:string} labels */
    this.labels = {
      xAxis: '',
      yAxis: '',
      title: '',
    };
    /** @const {Array<Object>} */
    this.dataSources = [];
    /** @private @const {GraphPlotter} */
    this.plotter_ = new GraphPlotter(this);
    /** @private @const {Array<string>} colors_
     * Each new datasource is assigned a color.
     * At first an attempt will be made to assign an unused color
     * from this array and failing that old colors are reused.
     */
    this.colors_ = [
      'green',
      'orange',
    ];
  }

  /**
   * Sets the label for the x-axis if provided as an argument and returns
   * this instance for method chaining. If no label is provided then
   * the current label is returned.
   * @param {string} label
   * @return {(string|GraphData)}
   */
  xAxis(label) {
    if (arguments.length > 0) {
      this.labels.xAxis = label;
      return this;
    }
    return this.labels.xAxis;
  }

  /**
   * Sets the label for the y-axis if provided as an argument and returns
   * this instance for method chaining. If no label is provided then
   * the current label is returned.
   * @param {string} label
   * @return {(string|GraphData)}
   */
  yAxis(label) {
    if (arguments.length > 0) {
      this.labels.yAxis = label;
      return this;
    }
    return this.labels.yAxis;
  }

  /**
   * Sets the label for the title if provided as an argument and returns
   * this instance for method chaining. If no label is provided then
   * the current label is returned.
   * @param {string} label
   * @return {(string|GraphData)}
   */
  title(label) {
    if (arguments.length > 0) {
      this.labels.title = label;
      return this;
    }
    return this.labels.title;
  }

  /**
   * Registers the supplied data as a dataSource, enabling it to be plotted and
   * processed. The data source should be in the form of an object where
   * the keys are the desired display labels (for the legend) corresponding
   * to the supplied values, each of which should be a one dimensional array of
   * numbers or a dict of key:value pairs for categorical data.
   * For example:
   * {
   *   labelOne: [numbers...],
   *   labelTwo: [numbers...],
   * }
   * or
   * {
   *   labelOne: {
   *     categoryOne: [numbers...],
   *     categoryTwo: [numbers...],
   *   },
   *   labelTwo: {
   *     categoryOne: [numbers...],
   *     categoryTwo: [numbers...],
   *   },
   * }
   *
   * Data of the second form will be converted into a table on the
   * dataSource object with the first column corresponding to the
   * categories and the second to the values.
   * So for the above example it will become:
   * [
   *  [categoryOne, [numbers...]],
   *  [categoryTwo, [numbers...]],
   * ]
   * @param {Object} data
   * @return {GraphData}
   */
  addData(data) {
    if (typeof data !== 'object') {
      throw new TypeError('Expected an object to be supplied.');
    }
    for (const [displayLabel, values] of Object.entries(data)) {
      if (values.constructor !== Array && typeof values !== 'object') {
        throw new TypeError(`Unexpected type for value: ${typeof values}`);
      }
      const table =
          values.constructor === Array ? values : Object.entries(values);
      this.dataSources.push({
        data: table,
        color: this.nextColor_(),
        key: displayLabel,
      });
    }
    return this;
  }

  /**
   * Deletes any old data and registers the supplied data as a dataSource,
   * enabling it to be plotted and processed. The data source should be in
   * the form of an object where the keys are the desired display labels
   * (for the legend) corresponding to the supplied values, each of which
   * should be an array of numbers.
   * For example:
   * {
   *   labelOne: [numbers...],
   *   labelTwo: [numbers...],
   * }
   * @param {Object} data
   * @return {GraphData}
   */
  setData(data) {
    this.dataSources = [];
    return this.addData(data);
  }

  /**
   * Returns the next color to be assigned to a data source from
   * the colors array. This will cycle through old colors once
   * the unused colors are exhausted.
   * @return {string}
   */
  nextColor_() {
    return this.colors_[this.dataSources.length % this.colors_.length];
  }
  /**
   * Returns the maximum value from all dataSources based on the value
   * computed by projection.
   * @param {function(Object): number} projection
   * @return {number}
   */
  max(projection) {
    const projectAll = dataSource => dataSource.data.map(projection);
    const maxReducer =
      (acc, curr) => Math.max(acc, Math.max(...projectAll(curr)));
    return this.dataSources.reduce(maxReducer, Number.MIN_VALUE);
  }

  /**
   * Applies the supplied processingFn to all of the dataSources held
   * in this instance and returns an array of the processed data along
   * with it's additional plotting information.
   * The processing function supplied to process should return data in
   * a format suitable for plotting (e.g., an array of
   * objects, consisting of x and y co-ordinates, for a line plot).
   * @param {function(Array<?>): Array<Object>} processingFn
   * @returns {Array<Object>}
   */
  process(processingFn, ...args) {
    if (typeof processingFn !== 'function') {
      const type = typeof processingFn;
      throw new TypeError(
          `Expected argument of type function, but got: ${type}`);
    }
    return this.dataSources.map(({ key, color, data}) => {
      return {
        key,
        color,
        data: processingFn(data, ...args)
      };
    });
  }

  /**
   * Returns all of the labels associated with each data source.
   * @returns {Array<string>}
   */
  keys() {
    return this.dataSources.map(({ key }) => key);
  }

  /**
   * Computes the cumulative frequency for all data sources provided
   * and plots the results to the screen.
   */
  plotCumulativeFrequency() {
    this.plotter_.plot(new LinePlotter());
  }

  /**
   * Orders the data so that it's percentiles can be identified
   * and plots a box and whisker plot.
   */
  plotBoxPlot() {
    this.plotter_.plot(new BoxPlotter());
  }

  /**
   * Plot a dot plot. This will assign stack offsets to each of the data points
   * where the dots would otherwise overlap (so that instead they are stacked
   * atop each other).
   */
  plotDot() {
    this.plotter_.plot(new DotPlotter());
  }

  /**
   * Plots a bar chart. Data should be inputted in the categorical format
   * described in the documentation of addData.
   */
  plotBar() {
    this.plotter_.plot(new BarPlotter());
  }

  /**
   * Computes the cumulative frequency for the list of values provided.
   * @param {Array<number>} data
   * @returns {Array<Object>}
   */
  static computeCumulativeFrequencies(data) {
    const sortedData = data.sort((a, b) => a - b);
    return sortedData.map((value, i) => {
      return {
        x: i,
        y: value,
      };
    });
  }
}
