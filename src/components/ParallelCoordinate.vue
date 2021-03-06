<template>
  <div ref="root" id="parallel-coordinate" @click="resetBrush">
  </div>
</template>
<script type="text/javascript">
import * as d3 from 'd3';

export default {
  data() {
    return {
      svgHeight: null,
      svgWidth: null,
      chartData: null,
      dimensions: ['func', 'depending', 'depended', 'direct', 'indirect', 'size'],
      extents: null,
      fileids: null,
      y: {}
    }
  },
  props: ['filesInfo', 'libName'],
  watch: {
    filesInfo(val) {
      if (val !== null) {
        this.dataAdapter()
        this.draw()
      }
    }
  },
  methods: {
    resetBrush() {
      this.extents = this.dimensions.map(function(p) { return [0, 0]; });
      this.brushParallelChart()
      d3.selectAll('.brush rect:nth-child(n+2)').style('display', 'none')
    },
    draw() {
      const that = this

      function path(d) {
        return line(that.dimensions.map(function(dim) { return [x(dim), that.y[dim](d[dim])]; }));
      }
      var margin = { top: 40, right: 0, bottom: 30, left: 20 },
        width = this.svgWidth - margin.left - margin.right,
        height = this.svgHeight - margin.top - margin.bottom;

      var x = d3.scaleBand().range([0, width]).paddingInner(1).paddingOuter(0.3),
        dragging = {};


      var line = d3.line(),
        background,
        foreground

      var svg = d3.select(this.$refs.root).append("svg")
        .attr("width", this.svgWidth)
        .attr("height", this.svgHeight)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      x.domain(this.dimensions);
      this.dimensions.forEach((d) => {
        this.y[d] = d3.scaleLinear()
          .domain(d3.extent(this.chartData, function(p) {
            return p[d];
          }))
          .range([height, 0])
      })

      // 未选中时的背景灰线
      svg.append("g")
        .attr("class", "background")
        .selectAll("path")
        .data(this.chartData)
        .enter().append("path")
        .attr("d", path);

      // 选中时的前景蓝线
      foreground = svg.append("g")
        .attr("class", "foreground")
        .selectAll("path")
        .data(this.chartData)
        .enter().append("path")
        .attr("d", path)
        .append('title')
        .text(d => d.name);

      // 画坐标轴
      var g = svg.selectAll(".dimension")
        .data(this.dimensions)
        .enter().append("g")
        .attr("class", "dimension")
        .attr("transform", function(d) { return "translate(" + x(d) + ")"; })

      g.append("g")
        .attr("class", "axis")
        .each(function(d) {
          let yAxis = d3.axisLeft(that.y[d]).tickFormat(d3.format("d"))
          if(that.y[d].domain()[1] <= 5) yAxis.ticks(that.y[d].domain()[1])
          d3.select(this).call(yAxis)
        })
        .append("text")
        .attr("fill", "black")
        .style("text-anchor", "middle")
        .attr("y", -9)
        .text(function(d) { 
          if(d === 'func') return 'function'
          if(d === 'depending') return 'outgoing'
          if(d === 'depended') return 'incoming'
          return d; 
        });

      // 添加画刷
      g.append("g")
        .attr("class", "brush")
        .each(function(d) {
          d3.select(this).call(that.y[d].brush = d3.brushY().extent([
            [-8, 0],
            [8, height]
          ])
          .on("brush start", that.brushstart.bind(that))
          .on("brush", that.brushParallelChart.bind(that)));
        })
        .selectAll("rect")
        .attr("x", -8)
        .attr("width", 16);

    },
    dataAdapter() {
      const dimensions = d3.keys(this.filesInfo[0].fileInfo).filter(d => d !== 'scc');
      this.chartData = this.filesInfo.map(d => {
        let fileInfo = {}
        dimensions.forEach((dim) => {
          const val = d.fileInfo[dim]
          fileInfo[dim] = val.hasOwnProperty('length') ? val.length : val
        })
        return Object.assign({}, {
          id: d.id,
          ...fileInfo
        })
      })
    },
    brushstart() {
      d3.event.sourceEvent.stopPropagation();
    },
    brushParallelChart() {
      const that = this
      for (var i = 0; i < this.dimensions.length; ++i) {
        const dim = this.dimensions[i]

        if (d3.event && (d3.event.target == this.y[dim].brush)) {
          this.extents[i] = d3.event.selection.map(this.y[dim].invert, this.y[dim]);
        }
      }
      this.fileids = []
      d3.selectAll('.foreground>path').style("display", function(d) {
        let shouldDisplay = false
        shouldDisplay = that.dimensions.every(function(p, i) {
          if (that.extents[i][0] == 0 && that.extents[i][0] == 0) {
            return true;
          }
          return that.extents[i][1] <= d[p] && d[p] <= that.extents[i][0];
        })
        if (shouldDisplay) that.fileids.push(d.id)
        return shouldDisplay ? null : 'none'
      });
      this.$bus.$emit('parallel-fileid-selected', this.fileids)
    }
  },
  mounted() {
    this.svgWidth = Math.floor(this.$refs.root.clientWidth)
    this.svgHeight = Math.floor(this.$refs.root.clientHeight)
    this.extents = this.dimensions.map(function(p) { return [0, 0]; })
  }
}

</script>
<style type="text/css" lang="scss">
#parallel-coordinate {
  height: 98%;
  .background path {
    fill: none;
    stroke: #ddd;
    stroke-opacity: .2;
    shape-rendering: crispEdges;
  }

  .foreground path {
    fill: none;
    stroke: steelblue;
    stroke-opacity: .5;
  }
}

</style>
