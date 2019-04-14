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
        scatterData: null,
        svg: null
    }
  },
  props:['filteredCoordinates'],
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
            .attr('r', 3.5)
            .attr('cx', d => x(parseFloat(d.x)))
            .attr('cy', d => y(parseFloat(d.y)))
            .attr('stroke', '#bdbdbd')
            .attr('fill', '#fff5e2')
            .on('mouseenter', d => {
                console.log(d.id)
            })
      }
  },
//   created(){
//     const requiredData = ['coordinates']
//         let cnt = 0
//         requiredData.forEach(d => {
//         this.$watch(d, val => {
//             if(val) cnt++
//             if(cnt === requiredData.length) {
               
//             }
//         })
//     })
//   },
    watch:{
        filteredCoordinates(val){
            if(val){
                this.scatterData = this.filteredCoordinates
                this.draw(this.scatterData)
            }
        }
    },
    mounted(){
        this.svgHeight = Math.floor(this.$refs.root.clientHeight)
        this.svgWidth = Math.floor(this.$refs.root.clientWidth)
        this.svg = d3.select(this.$refs.root).append("svg")
            .attr("width", this.svgWidth)
            .attr("height", this.svgHeight)
    }
}

</script>
<style type="text/css" lang="scss" scoped>
.scatter-plot{
    height: 100%;
}
</style>