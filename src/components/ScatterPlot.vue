<template>
  <div ref="root" class="scatter-plot bl-card-shadow">
  </div>
</template>
<script type="text/javascript">
import * as d3 from 'd3'
export default {
  data() {
    return {
        svgHeight: null,
        svgWidth: null,
        xScale: null,
        yScale: null, 
        svg: null
    }
  },
  props:['filteredCoordinates', 'colorMap'],
  methods: {
      draw(data){
          d3.select(this.$refs.root).selectAll('svg *').remove()
        const margin ={top: 10, right: 20, bottom: 10, left: 20},
            height = this.svgHeight,
            width = this.svgWidth
        const x = d3
            .scaleLinear()
            .domain(d3.extent(data, d => parseFloat(d.x)))
            .nice()
            .range([margin.left, width - margin.right])
        this.xScale = x
        const y = d3
            .scaleLinear()
            .domain(d3.extent(data, d => parseFloat(d.y)))
            .nice()
            .range([height - margin.bottom, margin.top])
        this.yScale = y
        var circle = this.svg
            .append('g')
            .selectAll('.marker')
            .data(data)
            .enter()
            .append('circle')
            .attr('class', 'marker')
            .attr('r', 3)
            .attr('cx', d => x(parseFloat(d.x)))
            .attr('cy', d => y(parseFloat(d.y)))
            // .attr('stroke', '#f0f0f0')
            // .attr('stroke-width', 0.5)
            .attr('fill', d => this.colorMap[d.type])
            .on('click', d => {
                circle.attr('opacity', 0.01)
                circle.filter(dot => dot.id === d.id).attr('opacity', 1)
                this.$bus.$emit('path-selected', d.id)
                d3.event.stopPropagation()
            })
        this.svg.on('click', d=>{
            circle.attr('opacity', 1)
            this.$bus.$emit('path-restored', null)
        })
      }
  },
    mounted(){
        this.svgHeight = Math.floor(this.$refs.root.clientHeight)
        this.svgWidth = Math.floor(this.$refs.root.clientWidth)
        this.svg = d3.select(this.$refs.root).append("svg")
            .attr("width", this.svgWidth)
            .attr("height", this.svgHeight)
        this.$bus.$on('threshold-selected', d =>{
            this.$axios.get('files/getCoordinates', {
                len: d
            }).then(({ data }) => {
                this.draw(data)
            })
        })
        this.$bus.$on('threshold-restored', ()=>{
            d3.select(this.$refs.root).selectAll('svg *').remove()
        })
    }
}

</script>
<style type="text/css" lang="scss" scoped>
.scatter-plot{
    height: 100%;
}
</style>