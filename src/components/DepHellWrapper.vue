<template>
  <div class="dep-hell-wrapper bl-card-shadow" ref="root">
  </div>
</template>
<script type="text/javascript">
import * as d3 from 'd3'
export default {
  data() {
    return {
      deps: null,
      svg: null,
      svgWidth: null,
      svgHeight: 0,
      lenTreshold: null,
      dependedData: null,
      maxDepended: 0, 
      hierarchyHiehgt: 110,
      stackHeight: 30,
      fileDepInfo: null, // store dep info for each file
      centerSvg: null,
    }
  },
  props: ['root', 'filesInfo', 'colorMap'],
  updated() {
    console.log("dephellwrapper updated")
    console.log('root in dephell updated')
  },
  computed: {
    dendrogramR() { return Math.min(this.svgWidth, this.svgHeight) / 2 - 130 }
  },
  methods: {
    dataAdapter(){
      let maxVal = 0
      this.dependedData = []
      for(let i=0; i< this.filesInfo.length; i++) {
        if(maxVal < this.filesInfo[i].fileInfo.depended)
          maxVal = this.filesInfo[i].fileInfo.depended
        this.dependedData.push({fileid: this.filesInfo[i].id, depended: this.filesInfo[i].fileInfo.depended})
      }
      this.maxDepended = maxVal
    },
    drawHierachy() {
      let vm = this
      var formatNumber = d3.format(",d");
      var x = d3.scaleLinear()
        .range([0, 2 * Math.PI]);
      var y = d3.scaleLinear()
        .range([this.dendrogramR + this.stackHeight, this.dendrogramR + this.stackHeight + this.hierarchyHiehgt]).domain([1, 0]);
      var partition = d3.partition();
      var arc = d3.arc()
        .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x0))); })
        .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x1))); })
        .innerRadius(function(d) { return Math.max(0, y(d.y0)); })
        .outerRadius(function(d) { return Math.max(0, y(d.y1)); });

      var hierarchyG = this.svg.append('g')
        .attr('transform', 'translate(' + this.svgWidth / 2 + ',' + (this.svgHeight / 2) + ')')

      // 颜色色卡
      var a = d3.rgb(254,227,145), b = d3.rgb(102,37,6)
      var compute = d3.interpolate(a, b)
      var linear = d3.scaleLinear().domain([0, this.maxDepended]).range([0, 1])
      
      //partition the tree and attach additional attr on root as well as its descendants
      var node = hierarchyG.selectAll(".hierarchy-node").data(partition(this.root).descendants().slice(1)).enter().append("g")
      node.append("path")
        .attr("class", "hierarchy-node")
        .attr('id', (d, i) => 'hierarchy-node-'+i)
        .attr("d", arc)
        .style("stroke", d => {
          return 'white'
        })
        .style("fill", function(d) {
          if (d.data.type === "dir")
            return "#fed9a6"
          if(d.data.type === 'file' && d.depth === 6){
            let temp = vm.dependedData.find(item => item.fileid === d.data.id)
            return compute(linear(temp.depended))
          }
          // return '#e5d8bd' 
          return '#ece4d5'
        })
        .each((d, i) => {
          if(d.data.type === 'dir'){
            var firstArcSection = /(^.+?)L/
            let curNode = node.select('#hierarchy-node-'+i)
            var newArc = firstArcSection.exec(curNode.attr('d'))[1]
            newArc = newArc.replace(/,/g, ' ')
            if(arc.centroid(d)[1] > 0){
              var startLoc = /M(.*?)A/,
                middleLoc = /A(.*?)0 0 1/,
                endLoc = /0 0 1 (.*?)$/
              var newStart = endLoc.exec(newArc)[1],
                newEnd = startLoc.exec(newArc)[1],
                middleSec = middleLoc.exec(newArc)[1]
              newArc = 'M' + newStart + 'A' + middleSec + '0 0 0' + newEnd 
            }
            node.append('path')
              .attr('class', 'hiddenDonutArcs')
              .attr('id', 'donutArc'+i)
              .attr('d', newArc)
              .style('fill', 'none')
            }
        })
        .append("title")
        .text((d) => d.data.name)

        // 添加文字
        node
        .append('text')
        .style('cursor', 'default')
        .style('font-size', 12+'px')
        .attr('id', (d, i) => 'text'+i)
        .attr('dy', function(d, i) { 
          // vue
          return (arc.centroid(d)[1] > 0 ? -4 : 12) 
        })
        .append('textPath')
        .attr('startOffset','50%')
        .style('text-anchor','middle')
        .attr('xlink:href', (d, i) => '#donutArc'+i)
        .text(function(d, i){
          if(d.data.type === 'dir'){
            let firstArc = (/(^.+?)L/).exec(arc(d))[1]
            let startPoint = (/M(.*?)A/).exec(firstArc)[1].split(','),
              endPoint = firstArc.split(',').slice(-2)
            let distX = startPoint[0]-endPoint[0],
              distY = startPoint[1]-endPoint[1]
            let dist = Math.sqrt(distX * distX + distY * distY)
            let name = d.data.name.substr(d.data.name.lastIndexOf('\\') + 1)
            if(dist < name.length*10)
              return '...'
            else return name
          }
        })
    },
    drawRadialStack(data) {
      //get StackData from badDeps
      let keys = ['long', 'indirect', 'direct'].map(d => `${d}-count`),
        stack = d3.stack().keys(keys)
      this.fileDepInfo = []
      this.root.leaves().forEach(node => {
        let fileid = node.data.id, stackItem = {fileid}
        let stackData = data.find(d => d.fileid === fileid)
        stackItem['long-count'] = Math.log(stackData['long']+1)
        stackItem['indirect-count'] = Math.log(stackData['indirect']+1)
        stackItem['direct-count'] = Math.log(stackData['direct']+1)
        this.fileDepInfo.push(stackItem)
      })
      let series = stack(this.fileDepInfo)
      //draw stack chart
      let maxVal = d3.max(series[series.length - 1], d => d[1])
      var y = d3.scaleLinear()
        .range([this.dendrogramR + 5, this.dendrogramR + this.stackHeight]).domain([maxVal, 0]);
      // 角度平分
      let offset = 2 * Math.PI / this.root.leaves().length
      var arc = d3.arc()
        .startAngle(function(d, i) { return i * offset })
        .endAngle(function(d, i) { return (i + 1) * offset })
        .innerRadius(function(d) { return y(d[0]) })
        .outerRadius(function(d) { return y(d[1]) });

      this.svg.select('.radial-stack').remove()
      let seiresG = this.svg.append("g")
        .attr("class", "radial-stack")
        .attr('transform', 'translate(' + this.svgWidth / 2 + ',' + (this.svgHeight / 2) + ')')
        .selectAll("g").data(series).enter().append('g').attr("class", 'seires')
        .attr("fill", (d, i) => {
          let type = keys[i].split('-')[0]
          return this.colorMap[type]
        })
      seiresG.selectAll('g').data(d => d).enter().append('path').attr('d', arc)

    }
  },
  watch: {
    lenTreshold(val){
      if(val || val === 0)
        this.$axios.get('files/getStackData', {
          threshold: val
        }).then(({ data }) => {
          this.drawRadialStack(data)
        })
    },
  },
  created(){
    const requiredData = ['root', 'filesInfo']
    let cnt = 0
    requiredData.forEach(d => {
      this.$watch(d, val => {
        if(val) cnt++
        if(cnt === requiredData.length) {
          this.dataAdapter()
          this.drawHierachy()
          this.lenTreshold = 0
        }
      })
    })
  },
  mounted() {
    this.svgWidth = Math.floor(this.$refs.root.clientWidth)
    this.svgHeight = Math.floor(this.$refs.root.clientHeight)
    this.svg = d3.select(this.$refs.root).append('svg')
      .attr('width', this.svgWidth)
      .attr('height', this.svgHeight)
    this.$bus.$on('threshold-selected', d =>{
      this.lenTreshold = d
      // this.drawRadialStack()
    })
  }
}

</script>
<style type="text/css" lang="scss">
.dep-hell-wrapper {
  height: 100%;
  .hierarchy-node {
    &:hover {
      transform: translate(20);
    }
  }
}

</style>
