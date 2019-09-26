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
      codingG: null,
      arc: null,
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
      fileDepInfo: null, // store dep info for each file
      centerSvg: null,
      node: null,
      colorData:['#b90207','#cb181d','#fb6a4a','#fcbba1'],
      selectedNode: []
    }
  },
  props: ['root', 'filesInfo', 'badDependData', 'maxDepth', 'colorMap', 'libName'],
  updated() {
    console.log("dephellwrapper updated")
    console.log('root in dephell updated')
  },
  computed: {
    dendrogramR() { return Math.min(this.svgWidth, this.svgHeight) / 2 - 100 }
  },
  methods: {
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
          .range([this.dendrogramR + 30, this.dendrogramR + this.hierarchyHiehgt]).domain([1, 0]); // d3
      if(this.libName === 'vue')
        y = d3.scaleLinear()
          .range([this.dendrogramR, this.dendrogramR + this.hierarchyHiehgt]).domain([1, 0]); //vue
      var partition = d3.partition();
      this.arc = d3.arc()
        .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x0))); })
        .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x1))); })
        .innerRadius(function(d) { return Math.max(0, y(d.y0)); })
        .outerRadius(function(d) { 
          if(d.data.type === 'file' && d.depth < vm.maxDepth)
            return y(1)
          else 
            return Math.max(0, y(d.y1))
        })
      if(this.libName === 'vue')
        this.arc.padAngle(0.003)

      var hierarchyG = this.svg.append('g')
        .attr('class', 'hierarchy')
        .attr('transform', 'translate(' + this.svgWidth / 2 + ',' + this.svgHeight / 2 + ')')

      // 颜色色卡
      var a = d3.rgb(252,187,161), b = d3.rgb(185,2,7)
      var compute = d3.interpolate(a, b)
      var linear = d3.scaleLinear().domain([1, this.maxDepended]).range([0, 1])
      
      //partition the tree and attach additional attr on root as well as its descendants
      this.node = hierarchyG.selectAll(".hierarchy-node")
        .data(partition(this.root).descendants().slice(1))
        .enter().append("g")
        .attr('class', 'slice')
        .attr('id', (d, i) =>'slice'+i)
      this.node.append("path")
        .attr("class", "hierarchy-node")
        .attr('id', (d, i) => 'hierarchy-node-'+i)
        .attr("d", this.arc)
        .style("stroke", d => {
          return 'white'
        })
        .style("fill", function(d) {
          if (d.data.type === "dir")
            return "#fed9a6"
          else
            return '#eeebe6'
        })
        .each((d, i) => {
          if(d.data.type === 'dir'){
            var firstArcSection = /(^.+?)L/
            let curNode = this.node.select('#hierarchy-node-'+i)
            var newArc = firstArcSection.exec(curNode.attr('d'))[1]
            newArc = newArc.replace(/,/g, ' ')
            if(vm.arc.centroid(d)[1] > 0){
              var startLoc = /M(.*?)A/,
                middleLoc = /A(.*?)0 0 1/,
                endLoc = /0 0 1 (.*?)$/
              var newStart = endLoc.exec(newArc)[1],
                newEnd = startLoc.exec(newArc)[1],
                middleSec = middleLoc.exec(newArc)[1]
              newArc = 'M' + newStart + 'A' + middleSec + '0 0 0' + newEnd 
            }
            this.svg.select('#slice'+i).append('path')
              .attr('class', 'hiddenDonutArcs')
              .attr('id', 'donutArc'+i)
              .attr('d', newArc)
              .style('fill', 'none')
            }
        })
        .append("title")
        .text((d) => d.data.name.substr(d.data.name.lastIndexOf('\\')+1))
     
      // 添加文字
      this.node
        .append('text')
        .style('cursor', 'default')
        .style('font-size', 12+'px')
        .attr('id', (d, i) => 'text'+i)
        .attr('dy', function(d, i) { 
          return (vm.arc.centroid(d)[1] > 0 ? -4 : 11) 
        })
        .append('textPath')
        .attr('startOffset','50%')
        .style('text-anchor','middle')
        .attr('xlink:href', (d, i) => '#donutArc'+i)
        .text(function(d, i){
          if(d.data.type === 'dir'){
            let firstArc = (/(^.+?)L/).exec(vm.arc(d))[1]
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
      // 添加依赖编码
      this.root.descendants().slice(1).forEach((d, i) =>{
        if(d.data.type === 'file'){
          this.arc.innerRadius(y(1)).outerRadius(y(1)+6)
          this.svg.select('#slice'+i).append('path')
            .attr('class', 'coding')
            .attr('d', this.arc(d))
            .style('fill', ()=>{
              let temp = this.dependedData.find(item => item.fileid === d.data.id)
              if(temp.depended > 0)
                return compute(linear(temp.depended))
              else
                return 'none'
            })
          let indirect = this.badDependData[d.data.id].indirect, direct = this.badDependData[d.data.id].direct
          if(indirect !=0){
            this.arc.innerRadius(y(1)+12).outerRadius(y(1)+9)
            this.svg.select('#slice'+i).append('path')
              .attr('class', 'bad-coding')
              .attr('d', this.arc(d))
              .style('fill', '#66c2a5')
          }
          if(direct !=0){
            this.arc.innerRadius(y(1)+15).outerRadius(y(1)+12)
            this.svg.select('#slice'+i).append('path')
              .attr('class', 'bad-coding')
              .attr('d', this.arc(d))
              .style('fill', '#bf812d')
          }
        }  
      })
      // 复原arc的内外半径设置
      this.arc.innerRadius(function(d) { return Math.max(0, y(d.y0)); })
        .outerRadius(function(d) { 
          if(d.data.type === 'file' && d.depth < vm.maxDepth)
            return y(1)
          else 
            return Math.max(0, y(d.y1))
        })
      this.node.on('click', (d,i) => {
        if(d.data.type === 'file'){
          this.$bus.$emit('file-selected', d.data.name)
          this.$bus.$emit('sunburst-fileid-selected', d.data.id)
          this.selectedNode.push(d)
          this.svg.selectAll('.linkG path').remove()
          this.svg.select('.arrow-line').remove()
          if(this.dependType === '1')
            this.drawSourceLinks(d)
          if(this.dependType === '2')
            this.drawTargetLinks(d)
        }
        this.node.attr('opacity', 1)
        d3.event.stopPropagation()
      })
      this.svg.on('click', d=>{
        this.$bus.$emit('sunburst-fileid-selected', null)
        this.svg.selectAll('.linkG path').remove()
        this.selectedNode = []
        this.svg.selectAll('.arrow-line').remove()
      })
    },
    //绘制被引用的连线
    drawSourceLinks(d){
      // 添加引用和被引用连线
      let selectedFile = this.filesInfo.filter(file => file.id === d.data.id)
      let source = selectedFile[0].fileInfo.depended
      source.forEach(s => {
        let temp = this.root.leaves().find(node => node.data.id === s)
        let rTarget= this.arc.outerRadius()(d), rSource = rTarget - 10,
          startAngleSource = this.arc.startAngle()(d), 
          endAngleSource = this.arc.endAngle()(d),
          startAngleTarget = this.arc.startAngle()(temp), 
          endAngleTarget = this.arc.endAngle()(temp)
        let start = this.getCenterOnBorder(rSource, startAngleSource, endAngleSource),
          end = this.getCenterOnBorder(rTarget, startAngleTarget, endAngleTarget)
        this.linkG.append('path').attr('d', 'M'+start+'Q'+0+','+ 0+',' +end)
          .attr('fill', 'none').attr('stroke', '#74adde')
          .attr('stroke-width', 1.2)
      })
      if(source.length === 0) return
      //添加箭头
      let rEnd = this.arc.outerRadius()(d) - 5, rStart = rEnd - 10,
        startAngle = this.arc.startAngle()(d), 
        endAngle = this.arc.endAngle()(d)
      let startPoint = this.getCenterOnBorder(rStart, startAngle, endAngle),
        endPoint = this.getCenterOnBorder(rEnd, startAngle, endAngle)
      this.svg.append('g').attr('class', 'arrow-line')
        .attr('transform', 'translate(' + this.svgWidth / 2 + ',' + this.svgHeight / 2 + ')')
        .append('path')
        .attr('d', d3.line()([startPoint, endPoint]))
        .style('stroke', '#2166ac')
        .attr('stroke-width', 3)
        .attr("marker-end", "url(#triangle)")
    },
    //绘制引用的连线
    drawTargetLinks(d){
      // 添加引用和被引用连线
      let selectedFile = this.filesInfo.filter(file => file.id === d.data.id)
      let source = selectedFile[0].fileInfo.depending
      source.forEach(s => {
        let temp = this.root.leaves().find(node => node.data.id === s)
        let rTarget= this.arc.outerRadius()(d), rSource = rTarget - 10, 
          startAngleSource = this.arc.startAngle()(d), 
          endAngleSource = this.arc.endAngle()(d),
          startAngleTarget = this.arc.startAngle()(temp), 
          endAngleTarget = this.arc.endAngle()(temp)
        let start = this.getCenterOnBorder(rSource, startAngleSource, endAngleSource),
          end = this.getCenterOnBorder(rTarget, startAngleTarget, endAngleTarget)
        this.linkG.append('path').attr('d', 'M'+start+'Q'+0+','+ 0+',' +end)
          .attr('fill', 'none').attr('stroke', '#74adde')
          .attr('stroke-width', 1.2)
      })
      if(source.length === 0) return
      //添加箭头
      let rEnd = this.arc.outerRadius()(d) - 2, rStart = rEnd - 10,
        startAngle = this.arc.startAngle()(d), 
        endAngle = this.arc.endAngle()(d)
      let startPoint = this.getCenterOnBorder(rStart, startAngle, endAngle),
        endPoint = this.getCenterOnBorder(rEnd, startAngle, endAngle)
      this.svg.append('g').attr('class', 'arrow-line')
        .attr('transform', 'translate(' + this.svgWidth / 2 + ',' + this.svgHeight / 2 + ')')
        .append('path')
        .attr('d', d3.line()([endPoint, startPoint]))
        .style('stroke', '#2166ac')
        .attr('stroke-width', 3)
        .attr("marker-end", "url(#triangle)")
    }, 
    getCenterOnBorder(r, startAngle, endAngle){
      let a = (startAngle+endAngle)/2 - Math.PI/2
      return [Math.cos(a)*r, Math.sin(a)*r]
    }
  },
  watch: {
    dependType(val){
      this.svg.selectAll('.linkG path').remove()
      if(val === '1'){
        var a = d3.rgb(252,187,161), b = d3.rgb(185,2,7)
        var compute = d3.interpolate(a, b)
        var linear = d3.scaleLinear().domain([1, this.maxDepended]).range([0, 1])
        this.node.select('.coding').style("fill", d => {
          let temp = this.dependedData.find(item => item.fileid === d.data.id)
          if(temp.depended > 0)
            return compute(linear(temp.depended))
          else
            return 'none'
        })
        this.svg.selectAll('.linkG path').remove()
        this.svg.selectAll('.arrow-line').remove()
        if(this.selectedNode.length > 0) this.selectedNode.forEach(d => this.drawSourceLinks(d))
      }
      if(val === '2'){
        var a = d3.rgb(252,187,161), b = d3.rgb(185,2,7)
        var compute = d3.interpolate(a, b)
        var linear = d3.scaleLinear().domain([1, this.maxDepending]).range([0, 1])
        this.node.select('.coding').style("fill", d => {
          let temp = this.dependingData.find(item => item.fileid === d.data.id)
          if(temp.depending > 0)
            return compute(linear(temp.depending))
          else
            return 'none'
        })
        this.svg.selectAll('.linkG path').remove()
        this.svg.selectAll('.arrow-line').remove()
        if(this.selectedNode.length > 0) this.selectedNode.forEach(d => this.drawTargetLinks(d))
      }
    }
  },
  created(){
    const requiredData = ['root', 'filesInfo', 'badDependData', 'maxDepth']
    let cnt = 0
    requiredData.forEach(d => {
      this.$watch(d, val => {
        if(val) cnt++
        if(cnt === requiredData.length) {
          this.dataAdapter()
          this.drawHierachy()
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
    this.linkG = this.svg.append('g')
      .attr('class','linkG')
      .attr('transform', 'translate(' + this.svgWidth / 2 + ',' + this.svgHeight / 2 + ')')
    this.svg.append("svg:defs").append("svg:marker")
      .attr("id", "triangle")
      .attr("refX", 1.5)
      .attr("refY", 1.5)
      .attr("markerWidth", 5)
      .attr("markerHeight", 5)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M 0 0 3 1.5 0 3 0.75 1.5")
      .style("fill", "#2166ac");
    this.$bus.$on('depend-type-selected', d =>{
      this.dependType = d
    })
    // 节点连接图的文件点击事件
    this.$bus.$on('graph-fileid-selected', d =>{
      this.svg.selectAll('.linkG path').remove()
      this.svg.selectAll('.arrow-line').remove()
      this.node.attr('opacity', 1)
      this.selectedNode = []
      if(d) {
        this.node.filter(node =>node.data.id === d).each(node =>{
          this.selectedNode.push(node)
          if(this.dependType === '1') this.drawSourceLinks(node)
          if(this.dependType === '2') this.drawTargetLinks(node)
        })
      } 
    })
    // 节点连接图的文件夹点击事件
    this.$bus.$on('graph-dirid-selected', d =>{
      this.svg.selectAll('.linkG path').remove()
      this.svg.selectAll('.arrow-line').remove()
      this.selectedNode = []
      if(d){
        this.node.filter(node => node.data.type === 'file' && node.data.name.indexOf(d) != -1).each(node =>{
          this.selectedNode.push(node)
          if(this.dependType === '1') this.drawSourceLinks(node)
          if(this.dependType === '2') this.drawTargetLinks(node)
        })
      } 
    })
    // 平行坐标的选择事件
    this.$bus.$on('parallel-fileid-selected', d =>{
      this.svg.selectAll('.linkG path').remove()
      this.svg.selectAll('.arrow-line').remove()
      this.node.filter(node => node.data.type === 'file').attr('opacity', node =>{
        if(d.indexOf(node.data.id) != -1) return 1
        else return 0.1
      })
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
