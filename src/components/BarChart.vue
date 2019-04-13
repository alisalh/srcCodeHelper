<template>
  <div class="bar-chart" ref="root">
  </div>
</template>
<script type="text/javascript">
import * as d3 from "d3";
export default {
  data() {
    return {
      svgWidth: null,
      svgHeight: null
    };
  },
  props: ["chartData", "colorMap"],
  watch: {
    chartData(val) {
      if (val) {
        console.log(val)
        this.draw();
      }
    }
  },
  methods: {
    draw() {
      console.log("bar draw");
      d3.select(".bar-chart>svg *").remove();
      var svg = d3.select(this.$refs.root).append('svg')
        .attr('width', this.svgWidth)
        .attr('height', this.svgHeight),
        margin = { top: 0, right: 40, bottom: 10, left: 60},
        width = this.svgWidth - margin.left - margin.right,
        height = this.svgHeight - margin.top - margin.bottom,
        g = svg
          .append("g")
          .attr(
            "transform",
            "translate(" + margin.left + "," + margin.top + ")"
          );

      var y = d3
          .scaleBand()
          .rangeRound([0, height])
          .padding(0.3),
        x = d3.scaleLinear().rangeRound([0, width-20]);

      y.domain(
        this.chartData.map(function(d) {
          return d.type;
        })
      );
      x.domain([
        0,
        d3.max(this.chartData, function(d) {
          return Math.log(d.num+1);
        })
      ]);

      g.append("g")
        .attr("class", "axis axis--y")
        .call(d3.axisLeft(y))
        .call(g => g.select('.domain').remove())

      let barG = g.selectAll(".bar")
        .data(this.chartData)
        .enter()
        .append('g')
      barG.append("rect")
        .attr("class", "bar")
        .attr("y", function(d) {
          return y(d.type);
        })
        .attr("height", y.bandwidth())
        .attr("width", function(d) {
          return x(Math.log(d.num+1));
        })
        .attr("fill", d => this.colorMap[d.type])
      barG.append('text')
        .attr("x", function(d){ return x(Math.log(d.num+1))})
        .attr("y", function(d){ return y(d.type)})
        .attr('dx', '0.2em')
        .attr('dy', '1.0em')
        .text(function(d){ return d.num})
        .style('fill', 'black')
        .attr('font-size', 12)
    }
  },
  mounted() {
    this.svgWidth = Math.floor(this.$refs.root.clientWidth);
    this.svgHeight = Math.floor(this.$refs.root.clientHeight);
    this.$bus.$on('threshold-selected', d =>{
      
    })
  }
};
</script>
<style type="text/css" lang="scss">
.barChart { 
  height: 100%;
}
</style>
