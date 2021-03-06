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
        svg: null,
        circle: null,
        maxLen: 0,
        minLen: 0,
        selectedId: null
    }
  },
  props:['colorMap', 'libName'],
  methods: {
      drawLegend(data){
        var keys = Object.keys(data), val = Object.values(data)
        let legendG = this.svg.append('g')
            .attr('transform','translate(30,25)')
        // circle
        legendG.append('circle').attr('r',keys[0]).attr('fill', '#bdbdbd')
        legendG.append('circle').attr('r',keys[1]).attr('cx', 30).attr('fill', '#bdbdbd')
        legendG.append('circle').attr('r',keys[2]).attr('cx', 63).attr('fill', '#bdbdbd')
        legendG.append('circle').attr('r',keys[3]).attr('cx', 98).attr('fill', '#bdbdbd')
        legendG.append('circle').attr('r',keys[4]).attr('cx', 135).attr('fill', '#bdbdbd')
        legendG.append('circle').attr('r',keys[5]).attr('cx', 175).attr('fill', '#bdbdbd')
        // line
        legendG.append('text').text(val[0]).attr('font-size','12px').attr('dy', '0.4em').attr('dx', '0.6em')
        legendG.append('text').text(val[1]).attr('font-size','12px').attr('dy', '0.4em').attr('dx', '3.2em')
        legendG.append('text').text(val[2]).attr('font-size','12px').attr('dy', '0.4em').attr('dx', '6.1em')
        legendG.append('text').text(val[3]).attr('font-size','12px').attr('dy', '0.4em').attr('dx', '9.1em')
        legendG.append('text').text(val[4]).attr('font-size','12px').attr('dy', '0.4em').attr('dx', '12.4em')
        legendG.append('text').text(val[5]).attr('font-size','12px').attr('dy', '0.4em').attr('dx', '16em')
      },
      draw(data){
        d3.select(this.$refs.root).selectAll('svg *').remove()
        let vm = this
        var margin
        if(this.libName === 'vue')
            margin ={top: 50, right: 0, bottom: 10, left: 0} 
        if(this.libName === 'd3')
            margin ={top: 80, right: 100, bottom: 30, left: 70} 
        const height = this.svgHeight,
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
        var compute = d3.interpolate(4, 9) 
        var linear = d3.scaleLinear().domain([Math.sqrt(this.minLen), Math.sqrt(this.maxLen)]).range([0, 1])
        let legendData = {}
        this.circle = this.svg
            .append('g')
            .attr('class', 'circle')
            .selectAll('circle')
            .data(data)
            .enter()
            .append('circle')
            .attr('r', d => {
                let r = compute(linear(Math.sqrt(d.len)))
                legendData[Math.round(r)] = d.len
                return r
            })
            .attr('cx', d => x(parseFloat(d.x)))
            .attr('cy', d => y(parseFloat(d.y)))
            .attr('fill', d => this.colorMap[d.type])
        if(this.libName === 'd3')
            this.drawLegend(legendData)
        else{
            legendData ={}
            for(let i=2; i<=10; i+=2){
                let key = compute(linear(Math.sqrt(i)))
                legendData[key] = i
            }
            this.drawLegend(legendData)
        }
        var brush = d3.brush()
            .on("end", brushend)
            .extent([[0, 0], [this.svgWidth, this.svgHeight]])
        this.svg.append('g')
            .attr('class', 'brush')
            .call(brush)
            .on('click', () =>{
                this.$bus.$emit('path-selected', [])
                this.selectedId = null
                this.circle.attr('stroke', null)
            })
        function brushend(){
            var s = d3.event.selection
            if(!s) return
            let left = s[0], right = s[1], ids = []
            vm.circle.attr('stroke', null)
            vm.circle.each(d => {
                let curNode = vm.circle.filter(dot => dot.id === d.id)
                let x = curNode.attr('cx'), y = curNode.attr('cy')
                if(x > left[0] && x < right[0] && y > left[1] && y < right[1]){
                    curNode.attr('stroke', '#4393c3').attr('stroke-width', 2.5)
                    ids.push(d.id)
                }
            })
            if(ids.length === 1) vm.selectedId = ids[0]
            d3.select('.brush').call(brush.move, null)
            vm.$bus.$emit('path-selected', ids)
        }
    },
  },
    mounted(){
        this.svgHeight = Math.floor(this.$refs.root.clientHeight)
        this.svgWidth = Math.floor(this.$refs.root.clientWidth)
        this.svg = d3.select(this.$refs.root).append("svg")
            .attr("width", this.svgWidth)
            .attr("height", this.svgHeight)
        this.$axios.get('files/getCoordinates', {
        }).then(({ data }) => {
            this.maxLen = d3.max(data.map(d => d.len))
            this.minLen = d3.min(data.map(d => d.len))
            this.draw(data)
        })
        this.$bus.$on('graph-fileid-selected', d=>{
            if(!d) this.circle.attr('stroke', null)
        })
        this.$bus.$on('bad-fileid-selected', d=>{
            if(!d) {
                this.circle.attr('stroke', null)
                this.circle.filter(dot => dot.id === this.selectedId)
                    .attr('stroke', '#4393c3').attr('stroke-width', 2.5)
            }
            else{
                this.circle.filter(dot => d.indexOf(dot.id) != -1)
                    .attr('stroke', '#9970ab').attr('stroke-width', 2.5)
                this.circle.filter(dot => dot.id === this.selectedId)
                    .attr('stroke', '#4393c3').attr('stroke-width', 2.5)
            }
        })
    }
}

</script>
<style type="text/css" lang="scss">
.scatter-plot{
    height: 100%;
}
</style>