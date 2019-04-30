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
      dependedData: null,
      dependingData: null,
      maxDepended: 0, 
      maxDepending: 0,
      hierarchyHiehgt: 100,
      legendHeight: 70,
      legendData: [{type: 'indirect'}, {type: 'direct'}],
      stackHeight: 30,
      fileDepInfo: null, // store dep info for each file
      centerSvg: null,
      colorData:['#662506', '#993404','#cc4c02','#ec7014','#fe9929','#fec44f','#fee391','#fff7bc']
    }
  },
  props: ['root', 'filesInfo', 'maxDepth', 'colorMap'],
  updated() {
    console.log("dephellwrapper updated")
    console.log('root in dephell updated')
  },
  computed: {
    // vue-130, d3-120
    dendrogramR() { return Math.min(this.svgWidth, this.svgHeight) / 2 - 130 }
  },
  methods: {
    drawColorBar(data){
      var colorBarG = this.svg.append('g')
        .attr('class', 'bar')
        .attr('transform', 'translate(35,'+180+')')
      colorBarG.append('text')
        .text('more')
        .attr('font-size', 14)
        .attr('dy', '-0.3em')
        .attr('dx', '-0.5em')
      data.forEach((d,i) =>{
        colorBarG.append('rect')
          .attr('width', 18)
          .attr('height', 20)
          .attr('y', i*20)
          .attr('fill', d)
      })
      colorBarG.append('text')
        .text('less')
        .attr('font-size', 14)
        .attr('y', data.length*20)
        .attr('dy', '1em')
        .attr('dx', '-0.3em')
    },
    drawLegend(data){
      this.svg.select('.legend').remove()
      var legendG = this.svg.append('g')
        .attr('class', 'legend')
        .attr('transform', 'translate(25,20)')
      var y = d3
          .scaleBand()
          .rangeRound([0, this.legendHeight])
          .padding(0.3)
      y.domain(data.map(function(d) { return d.type }))
      legendG.selectAll(".circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("class", "circle")
        .attr("cy", function(d) {
          return y(d.type);
        })
        .attr('r', 8)
        .attr("fill", d => this.colorMap[d.type])
      legendG.selectAll('.text')
        .data(data)
        .enter()
        .append('text')
        .attr('class', '.text')
        .attr('y', function(d){
          return y(d.type)
        })
        .attr('dx', 1+'em')
        .attr('dy', 0.35+'em')
        .text(d => d.type+": "+d.num)
        .attr('font-size', 15)
    },
    dataAdapter(){
      let maxDependedVal = 0, maxDependingVal = 0
      this.dependedData = [], this.dependingData = []
      for(let i=0; i< this.filesInfo.length; i++) {
        if(maxDependedVal < this.filesInfo[i].fileInfo.depended.length)
          maxDependedVal = this.filesInfo[i].fileInfo.depended.length
        if(maxDependingVal < this.filesInfo[i].fileInfo.depending.length)
          maxDependingVal = this.filesInfo[i].fileInfo.depending.length
         this.dependedData.push({fileid: this.filesInfo[i].id, depended: this.filesInfo[i].fileInfo.depended.length})
        this.dependingData.push({fileid: this.filesInfo[i].id, depending: this.filesInfo[i].fileInfo.depending.length})
      }
      this.maxDepended = maxDependedVal
      this.maxDepending = maxDependingVal
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
        .attr('transform', 'translate(' + (this.svgWidth / 2 + 35) + ',' + this.svgHeight / 2 + ')')

      // 颜色色卡
      var a = d3.rgb(254,227,145), b = d3.rgb(102,37,6)
      var compute = d3.interpolate(a, b)
      var linear = d3.scaleLinear().domain([1, this.maxDepended]).range([0, 1])
      
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
          if(d.depth === vm.maxDepth){
            let temp = vm.dependedData.find(item => item.fileid === d.data.id)
            if(temp.depended > 0)
              return compute(linear(temp.depended))
            else
              return '#fff7bc'
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
        .text((d) => d.data.name.substr(d.data.name.lastIndexOf('\\')+1))
        // .text((d) => d.data.name.replace(/E:\\Workspace\\Visualization\\srcCodeHelperServer\\data\\d3\\src\\/g,''))
      
      // 重新定义arc用于绘制连线
      let newX = d3.scaleLinear().range([0, 2 * Math.PI]);
      let newY = d3.scaleLinear().range([this.dendrogramR, this.dendrogramR+20]).domain([1, 0]);
      let newArc = d3.arc()
        .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, newX(d.x0))); })
        .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, newX(d.x1))); })
        .innerRadius(function(d) { return Math.max(0, newY(d.y0)); })
        .outerRadius(function(d) { return Math.max(0, newY(d.y1)); })
      var linkG = this.svg.append('g')
        .attr('class','linkG')
        .attr('transform', 'translate(' + (this.svgWidth / 2 + 35) + ',' + this.svgHeight / 2 + ')')
      let sourceColor = '#d8e9f6', targetColor = '#3d7db2'
      node.on('click', d => {
        if(d.depth === this.maxDepth){
          this.$bus.$emit('file-selected', d.data.name)
          drawSourceLinks(d)
        }
    })

    // 添加文字
    node
      .append('text')
      .style('cursor', 'default')
      .style('font-size', 12+'px')
      .attr('id', (d, i) => 'text'+i)
      .attr('dy', function(d, i) { 
        // vue
        return (arc.centroid(d)[1] > 0 ? -4 : 11) 

        // // d3
        // return (arc.centroid(d)[1] > 0 ? -5 : 14) 
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
      
      //绘制被引用的连线
      function drawSourceLinks(d){
        // 添加引用和被引用连线
        vm.svg.selectAll('.linkG path').remove()
        vm.svg.selectAll('defs').remove()
        let selectedFile = vm.filesInfo.filter(file => file.id === d.data.id)
        let source = selectedFile[0].fileInfo.depended
        source.forEach(s => {
          let temp = vm.root.leaves().find(node => node.data.id === s)
          let start = newArc.centroid(temp), end = newArc.centroid(d)
          let linearGradient = vm.svg.append('defs')
            .append('linearGradient')
            .attr('id', s+'linear-gradient')
            .attr('gradientUnits','userSpaceOnUse')
            .attr('x1', start[0])
            .attr('y1', start[1])
            .attr('x2', end[0])
            .attr('y2', end[1])
          linearGradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', sourceColor)
          linearGradient.append('stop')
            .attr('offset', '33%')
            .attr('stop-color', sourceColor)
          linearGradient.append('stop')
            .attr('offset', '66%')
            .attr('stop-color', targetColor)
          linearGradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', targetColor)
          linkG.append('path').attr('d', 'M'+start+'Q'+0+','+ 0+',' +end)
            .attr('fill', 'none').attr('stroke', 'url(#'+s+'linear-gradient)')
            .attr('stroke-width', 1.5)
        })
      }
    },
    drawRadialStack(data) {
      //get StackData from badDeps
      let keys = ['indirect', 'direct'].map(d => `${d}-count`),
        stack = d3.stack().keys(keys)
      this.fileDepInfo = []
      this.root.leaves().forEach(node => {
        let fileid = node.data.id, stackItem = {fileid}
        let stackData = data.find(d => d.fileid === fileid)
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
        .attr('transform', 'translate(' + (this.svgWidth / 2 + 35) + ',' + this.svgHeight / 2 + ')')
        .selectAll("g").data(series).enter().append('g').attr("class", 'seires')
        .attr("fill", (d, i) => {
          let type = keys[i].split('-')[0]
          return this.colorMap[type]
        })
      seiresG.selectAll('g').data(d => d).enter().append('path').attr('d', arc)

    }
  },
  watch: {
  },
  created(){
    const requiredData = ['root', 'filesInfo', 'maxDepth']
    let cnt = 0
    requiredData.forEach(d => {
      this.$watch(d, val => {
        if(val) cnt++
        if(cnt === requiredData.length) {
          this.dataAdapter()
          this.drawHierachy()
          this.drawColorBar(this.colorData)
          this.$axios.get('files/getStackData', {
          }).then(({ data }) => {
            this.drawRadialStack(data)
          })
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
    this.$axios.get('files/getBarData', {
    }).then(({ data }) => {
      this.drawLegend(data)
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
