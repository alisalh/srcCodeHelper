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
      linkG: null,
      newArc: null,
      svgWidth: null,
      svgHeight: 0,
      dependedData: null,
      dependingData: null,
      maxDepended: 0, 
      maxDepending: 0,
      dependType: '1', // '1'表示被其他文件引用，'2'表示引用其他文件
      hierarchyHiehgt: 100,
      legendHeight: 60,
      legendData: [{type: 'indirect'}, {type: 'direct'}],
      stackHeight: 30,
      fileDepInfo: null, // store dep info for each file
      centerSvg: null,
      node: null,
      colorData:['#b90207','#cb181d','#fb6a4a','#fcbba1'],
      selectedNode: null
    }
  },
  props: ['root', 'filesInfo', 'maxDepth', 'colorMap', 'libName'],
  updated() {
    console.log("dephellwrapper updated")
    console.log('root in dephell updated')
  },
  computed: {
    dendrogramR() { return Math.min(this.svgWidth, this.svgHeight) / 2 - 130 }
  },
  methods: {
    drawColorBar(data){
      let linearGradient = this.svg.append('defs')
        .append('linearGradient')
        .attr('class', 'bar-linear')
        .attr('id', 'bar-linear-gradient')
        .attr('gradientUnits','userSpaceOnUse')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', 200)
        .attr('y2', 18)
      linearGradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', data[0])
      linearGradient.append('stop')
        .attr('offset', '33%')
        .attr('stop-color', data[1])
      linearGradient.append('stop')
        .attr('offset', '66%')
        .attr('stop-color', data[2])
      linearGradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', data[3])
      var colorBarG = this.svg.append('g')
        .attr('class', 'bar')
        .attr('transform', 'translate(225, 22)')
      colorBarG.append('text')
        .text('More')
        .attr('font-size', 14)
        .attr('dy', '1em')
        .attr('dx', '-2.5em')
      colorBarG.append('rect')
        .attr('width', 200)
        .attr('height', 18)
        .style('fill', 'url(#bar-linear-gradient)')
      colorBarG.append('text')
        .text('Less')
        .attr('font-size', 14)
        .attr('x', 200)
        .attr('dy', '1em')
        .attr('dx', '0.3em')
    },
    drawLegend(data){
      this.svg.select('.legend').remove()
      var legendG = this.svg.append('g')
        .attr('class', 'legend')
        .attr('transform', 'translate(25,10)')
      var y = d3
          .scaleBand()
          .rangeRound([0, this.legendHeight])
          .padding(0.5)
      y.domain(data.map(function(d) { return d.type }))
      legendG.selectAll(".circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("class", "circle")
        .attr("cy", function(d) {
          return y(d.type);
        })
        .attr('r', 7)
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
        .text(d => {
          if(d.type === 'indirect')
            return "Indirect: "+d.num
          else
            return "Direct: "+d.num
        })
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
      this.$bus.$emit('dependData', 
        {depended: this.dependedData, depending: this.dependingData, maxDepended: this.maxDepended, maxDepending: this.maxDepending})
    },
    drawHierachy() {
      let vm = this
      var formatNumber = d3.format(",d");
      var x = d3.scaleLinear()
        .range([0, 2 * Math.PI]);
      var y
      if(this.libName === 'd3')
        y = d3.scaleLinear()
          .range([this.dendrogramR + this.stackHeight + 20, this.dendrogramR + this.stackHeight + this.hierarchyHiehgt]).domain([1, 0]); // d3
      if(this.libName === 'vue')
        y = d3.scaleLinear()
          .range([this.dendrogramR + this.stackHeight, this.dendrogramR + this.stackHeight + this.hierarchyHiehgt]).domain([1, 0]); //vue
      var partition = d3.partition();
      var arc = d3.arc()
        .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x0))); })
        .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x1))); })
        .innerRadius(function(d) { return Math.max(0, y(d.y0)); })
        .outerRadius(function(d) { return Math.max(0, y(d.y1)); })
      if(this.libName === 'vue')
        arc.padAngle(0.003)

      var hierarchyG = this.svg.append('g')
        .attr('transform', 'translate(' + this.svgWidth / 2 + ',' + (this.svgHeight / 2 + 30) + ')')

      // 颜色色卡
      var a = d3.rgb(252,187,161), b = d3.rgb(185,2,7)
      var compute = d3.interpolate(a, b)
      var linear = d3.scaleLinear().domain([1, this.maxDepended]).range([0, 1])
      
      //partition the tree and attach additional attr on root as well as its descendants
      this.node = hierarchyG.selectAll(".hierarchy-node").data(partition(this.root).descendants().slice(1)).enter().append("g")
      this.node.append("path")
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
            // else
            //   return '#fff7bc'
          }
          // return '#e5d8bd' 
          return '#eeebe6'
        })
        .each((d, i) => {
          if(d.data.type === 'dir'){
            var firstArcSection = /(^.+?)L/
            let curNode = this.node.select('#hierarchy-node-'+i)
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
            this.node.append('path')
              .attr('class', 'hiddenDonutArcs')
              .attr('id', 'donutArc'+i)
              .attr('d', newArc)
              .style('fill', 'none')
            }
        })
        .append("title")
        .text((d) => d.data.name.substr(d.data.name.lastIndexOf('\\')+1))
      
      // 重新定义arc用于绘制连线
      let newX = d3.scaleLinear().range([0, 2 * Math.PI]);
      let newY 
      if(this.libName === 'd3')
        newY = d3.scaleLinear().range([this.dendrogramR+20, this.dendrogramR+40]).domain([1, 0]);
      if(this.libName === 'vue')
        newY = d3.scaleLinear().range([this.dendrogramR, this.dendrogramR+20]).domain([1, 0]);
      this.newArc = d3.arc()
        .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, newX(d.x0))); })
        .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, newX(d.x1))); })
        .innerRadius(function(d) { return Math.max(0, newY(d.y0)); })
        .outerRadius(function(d) { return Math.max(0, newY(d.y1)); })
      this.linkG = this.svg.append('g')
        .attr('class','linkG')
        .attr('transform', 'translate(' + this.svgWidth / 2 + ',' + (this.svgHeight / 2 + 30) + ')')
      let sourceColor = '#d8e9f6', targetColor = '#3d7db2'
      this.node.on('click', (d,i) => {
        this.node.select('.hierarchy-node')
          .style('stroke','white')
        if(d.depth === this.maxDepth){
          this.$bus.$emit('file-selected', d.data.name)
          this.$bus.$emit('sunburst-fileid-selected', d.data.id)
          this.selectedNode = d
          if(this.dependType === '1')
            this.drawSourceLinks(d)
          if(this.dependType === '2')
            this.drawTargetLinks(d)
          this.node.select('#hierarchy-node-'+i)
            .style('stroke','#081d58')
        }
        d3.event.stopPropagation()
      })
      this.svg.on('click', d=>{
        this.$bus.$emit('sunburst-fileid-selected', null)
        this.svg.selectAll('.linkG path').remove()
        this.svg.selectAll('.link-linear').remove()
        this.node.select('.hierarchy-node')
          .style('stroke','white')
        this.selectedNode = null
      })

    // 添加文字
    this.node
      .append('text')
      .style('cursor', 'default')
      .style('font-size', 12+'px')
      .attr('id', (d, i) => 'text'+i)
      .attr('dy', function(d, i) { 
        return (arc.centroid(d)[1] > 0 ? -4 : 11) 
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
    //绘制被引用的连线
    drawSourceLinks(d){
      // 添加引用和被引用连线
      let sourceColor = '#d8e9f6', targetColor = '#3d7db2'
      this.svg.selectAll('.linkG path').remove()
      this.svg.selectAll('.link-linear').remove()
      let selectedFile = this.filesInfo.filter(file => file.id === d.data.id)
      let source = selectedFile[0].fileInfo.depended
      // vm.$bus.$emit('fileid-selected', {fileid: d.data.id, nodes: source})
      source.forEach(s => {
        let temp = this.root.leaves().find(node => node.data.id === s)
        let start = this.newArc.centroid(temp), end = this.newArc.centroid(d)
        let linearGradient = this.svg.append('defs')
          .append('linearGradient')
          .attr('class', 'link-linear')
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
        this.linkG.append('path').attr('d', 'M'+start+'Q'+0+','+ 0+',' +end)
          .attr('fill', 'none').attr('stroke', 'url(#'+s+'linear-gradient)')
          .attr('stroke-width', 1.5)
      })
    },
    //绘制引用的连线
    drawTargetLinks(d){
      // 添加引用和被引用连线
      let sourceColor = '#d8e9f6', targetColor = '#3d7db2'
      this.svg.selectAll('.linkG path').remove()
      this.svg.selectAll('.link-linear').remove()
      let selectedFile = this.filesInfo.filter(file => file.id === d.data.id)
      let source = selectedFile[0].fileInfo.depending
      // vm.$bus.$emit('fileid-selected', {fileid: d.data.id, nodes: source})
      source.forEach(s => {
        let temp = this.root.leaves().find(node => node.data.id === s)
        let start = this.newArc.centroid(temp), end = this.newArc.centroid(d)
        let linearGradient = this.svg.append('defs')
          .append('linearGradient')
          .attr('class', 'link-linear')
          .attr('id', s+'linear-gradient')
          .attr('gradientUnits','userSpaceOnUse')
          .attr('x1', start[0])
          .attr('y1', start[1])
          .attr('x2', end[0])
          .attr('y2', end[1])
        linearGradient.append('stop')
          .attr('offset', '0%')
          .attr('stop-color', targetColor)
        linearGradient.append('stop')
          .attr('offset', '33%')
          .attr('stop-color', targetColor)
        linearGradient.append('stop')
          .attr('offset', '66%')
          .attr('stop-color', sourceColor)
        linearGradient.append('stop')
          .attr('offset', '100%')
          .attr('stop-color', sourceColor)
        this.linkG.append('path').attr('d', 'M'+start+'Q'+0+','+ 0+',' +end)
          .attr('fill', 'none').attr('stroke', 'url(#'+s+'linear-gradient)')
          .attr('stroke-width', 1.5)
      })
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
      var y 
      if(this.libName === 'd3')
        y = d3.scaleLinear()
          .range([this.dendrogramR + 20 + 5, this.dendrogramR + this.stackHeight + 20]).domain([maxVal, 0]);
      if(this.libName === 'vue')
        y= d3.scaleLinear()
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
        .attr('transform', 'translate(' + this.svgWidth / 2 + ',' + (this.svgHeight / 2 + 30) + ')')
        .selectAll("g").data(series).enter().append('g').attr("class", 'seires')
        .attr("fill", (d, i) => {
          let type = keys[i].split('-')[0]
          return this.colorMap[type]
        })
      seiresG.selectAll('g').data(d => d).enter().append('path').attr('d', arc)

    }
  },
  watch: {
    dependType(val){
      this.svg.selectAll('.linkG path').remove()
      this.svg.selectAll('.link-linear').remove()
      // this.node.select('.hierarchy-node')
      //     .style('stroke','white')
      if(val === '1'){
        var a = d3.rgb(252,187,161), b = d3.rgb(185,2,7)
        var compute = d3.interpolate(a, b)
        var linear = d3.scaleLinear().domain([1, this.maxDepended]).range([0, 1])
        this.node.select('.hierarchy-node').style('fill', () => '#fff7bc')
        this.node.select('.hierarchy-node').style("fill", d => {
          if (d.data.type === "dir")
            return "#fed9a6"
          if(d.depth === this.maxDepth){
            let temp = this.dependedData.find(item => item.fileid === d.data.id)
            if(temp.depended > 0)
              return compute(linear(temp.depended))
          }
          return '#eeebe6'
        })
        if(this.selectedNode) this.drawSourceLinks(this.selectedNode)
        
      }
      if(val === '2'){
        var a = d3.rgb(252,187,161), b = d3.rgb(185,2,7)
        var compute = d3.interpolate(a, b)
        var linear = d3.scaleLinear().domain([1, this.maxDepending]).range([0, 1])
        this.node.select('.hierarchy-node').style('fill', () => '#fff7bc')
        this.node.select('.hierarchy-node').style("fill", d => {
          if (d.data.type === "dir")
            return "#fed9a6"
          if(d.depth === this.maxDepth){
            let temp = this.dependingData.find(item => item.fileid === d.data.id)
            if(temp.depending > 0)
              return compute(linear(temp.depending))
          }
          return '#eeebe6'
        })
        if(this.selectedNode) this.drawTargetLinks(this.selectedNode)
      }
    }
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
    this.$bus.$on('depend-type-selected', d =>{
      this.dependType = d
    })
    this.$bus.$on('files-selected', d =>{
      this.node.filter(node => node.depth === this.maxDepth)
        .attr('opacity', 0.1)
      this.node.filter(node => node.depth === this.maxDepth && d.indexOf(node.data.id) != -1)
        .attr('opacity', 1)
    })
    this.$bus.$on('graph-fileid-selected', d =>{
      if(!d){
        // 点击graph svg的时候还原状态
        this.svg.selectAll('.linkG path').remove()
        this.svg.selectAll('.link-linear').remove()
        this.node.select('.hierarchy-node')
          .style('stroke','white')
        this.selectedNode = null
      }else{
        this.node.select('.hierarchy-node')
        .style('stroke','white')
        this.node.each((node,i)=> {
          if(node.depth === this.maxDepth && node.data.id === d){
            this.node.select('#hierarchy-node-'+i)
              .style('stroke','#081d58')
            this.selectedNode = node
            if(this.dependType === '1') this.drawSourceLinks(node)
            if(this.dependType === '2') this.drawTargetLinks(node)
          } 
        })
      }
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
