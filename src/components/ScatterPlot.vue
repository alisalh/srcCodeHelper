<template>
  <div ref="root" class="scatter-plot bl-card-shadow">
  </div>
</template>
<script type="text/javascript">
import * as d3 from 'd3'
export default {
  data() {
    return {
        height: null,
        width: null,
        xScale: null,
        yScale: null
      
    }
  },
  props:[],
  methods: {
      draw(){
        const margin ={top: 10, right: 20, bottom: 10, left: 20},
            height = this.height,
            width = this.width
        const svg = d3.select(this.$refs.root)
            .append('svg')
            .attr('width', width)
            .attr('height', height)
        const x = d3
            .scaleLinear()
            .domain(d3.extent(data, d => d.x))
            .nice()
            .range([margin.left, width - margin.right])
        this.xScale = x
        const y = d3
            .scaleLinear()
            .domain(d3.extent(data, d => d.y))
            .nice()
            .range([height - margin.bottom, margin.top])
        this.yScale = y
        var circle = svg
            .append('g')
            .selectAll('.marker')
            .data(data)
            .enter()
            .append('circle')
            .attr('class', 'marker')
            .attr('r', 3.5)
            .attr('cx', d => x(d.x))
            .attr('yy', d => y(d.y))
      }
  },
  mounted(){
      this.height = Math.floor(this.$refs.root.clientHeight)
      this.width = Math.floor(this.$refs.root.clientWidth)

  }
}

</script>
<style type="text/css" lang="scss" scoped>
.scatter-plot{
    height: 100%;
}
</style>