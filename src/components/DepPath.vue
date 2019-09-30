<template>
  <div class="dep-path">
  <div ref="sub" class="legend"></div>
  <div ref="root" class="node-link"></div>
  </div>
</template>
<script type="text/javascript">
import * as d3 from 'd3'
export default {
  data() {
    return {
      svg: null,
      nodes: null,
      links: null,
      defaultR: 4,
      depData: null,
      nodeColor: '#bababa',
      linkColor: '#bababa',
      selectColor: '#e31a1c',
      sourceColor: '#fb9a99',
      targetColor: '#b2df8a',
      svgWidth: 0,
      svgHeight: 0,
      isSelected: false,
      selectID: null,
      depth: 0,
      directData: null,
      //用于更新相似节点
      num: 10,
      obj: null,
      pathSelected: false,
      arcs: null,
      depended: null,
      depending: null,
      maxDepended: 0,
      maxDepending: 0,
      dependType: '1', // '1'表示被其他文件引用，'2'表示引用其他文件
      badDeps: null
    }
  },
  props:['graphData', 'filesDist', 'root', 'filesList', 'dirs', 'maxDepth', 'colorMap', 'libName'],
  methods: {
    drawLegend(){
      let legendG = this.subsvg.append('g').attr('class', 'legendG')
      let startY = 50, endX = 73, startX = 20
      legendG.append('text').attr('class', 'lt').attr('x', startX).attr('y', startY+5).text('The encoding of links')
      legendG.append('path').attr('class', 'l1').attr('d', d3.line()([[startX, startY+20], [65, startY+20]])).attr('stroke', this.linkColor).attr('stroke-width', 2)
      legendG.append('text').attr('class', 'l1 l2').attr('x', endX).attr('y', startY+30).text('unidirection')
      legendG.append('path').attr('class', 'l2').attr('d', d3.line()([[startX, startY+35], [60, startY+35]])).attr('stroke', this.linkColor).attr('stroke-width', 2).attr("marker-end", "url(#legend-arrow)")

      legendG.append('path').attr('class', 'l3').attr('d', d3.line()([[startX, startY+60], [65, startY+60]])).attr('stroke', '#1a1a1a').attr('stroke-width', 2)
      legendG.append('path').attr('class', 'l4').attr('d', d3.line()([[startX, startY+75], [43, startY+75]])).attr('stroke', this.sourceColor).attr('stroke-width', 2)
      legendG.append('path').attr('class', 'l4').attr('d', d3.line()([[43, startY+75], [65, startY+75]])).attr('stroke', this.targetColor).attr('stroke-width', 2)
      legendG.append('text').attr('class', 'l3 l4').attr('x', endX).attr('y', startY+70).text('bidirection')
      
      legendG.append('path').attr('class', 'l5').attr('d', d3.line()([[startX, startY+100], [65, startY+100]])).attr('stroke', this.sourceColor).attr('stroke-width', 2)
      legendG.append('text').attr('class', 'l5').attr('x', endX).attr('y', startY+103).text('outgoing')
      legendG.append('path').attr('class', 'l5').attr('d', d3.line()([[startX, startY+120], [65, startY+120]])).attr('stroke', this.targetColor).attr('stroke-width', 2)
      legendG.append('text').attr('class', 'l5').attr('x', endX).attr('y', startY+123).text('incoming')
      
      
      legendG.append('text').attr('class', 'lt').attr('x', startX).attr('y', startY+150).text('The encoding of nodes')
      legendG.append('circle').attr('class', 'l6').attr('r', this.defaultR*2).attr('cx', 40).attr('cy', startY+170).attr('fill', this.nodeColor)
      legendG.append('text').attr('class', 'l6').attr('x', endX).attr('y', startY+174).text('file')
      legendG.append('circle').attr('class', 'l6').attr('r', this.defaultR*1.8).attr('cx', 40).attr('cy', startY+190).attr('fill', 'white').attr('stroke', this.nodeColor).attr('stroke-width', 3)
      legendG.append('text').attr('class', 'l6').attr('x', endX).attr('y', startY+194).text('dir')

      legendG.append('circle').attr('class', 'l7').attr('r', this.defaultR*2).attr('cx', 40).attr('cy', startY+215).attr('fill', this.selectColor)
      legendG.append('text').attr('class', 'l7').attr('x', endX).attr('y', startY+219).text('selected')

      legendG.append('circle').attr('class', 'l8').attr('r', this.defaultR*2).attr('cx', 40).attr('cy', startY+240).attr('fill', '#762a83')
      legendG.append('text').attr('class', 'l8').attr('x', endX).attr('y', startY+244).text('similar')

      legendG.append('circle').attr('class', 'l5').attr('r', this.defaultR*2).attr('cx', 40).attr('cy', startY+265).attr('fill', this.sourceColor)
      legendG.append('text').attr('class', 'l5').attr('x', endX).attr('y', startY+269).text('depending')
      legendG.append('circle').attr('class', 'l5').attr('r', this.defaultR*2).attr('cx', 40).attr('cy', startY+285).attr('fill', this.targetColor)
      legendG.append('text').attr('class', 'l5').attr('x', endX).attr('y', startY+289).text('depended')
      legendG.append('circle').attr('class', 'l5').attr('r', this.defaultR*2).attr('cx', 40).attr('cy', startY+305).attr('fill', this.getGredientNode(this.subsvg, {index: -1}))
      legendG.append('text').attr('class', 'l5').attr('x', endX).attr('y', startY+309).text('interdependent')

      legendG.append('circle').attr('class', 'l9').attr('r', this.defaultR*2).attr('cx', 40).attr('cy', startY+330).attr('fill', this.colorMap['direct'])
      legendG.append('text').attr('class', 'l9').attr('x', endX).attr('y', startY+334).text('direct')
      legendG.append('circle').attr('class', 'l9').attr('r', this.defaultR*2).attr('cx', 40).attr('cy', startY+350).attr('fill', this.colorMap['indirect'])
      legendG.append('text').attr('class', 'l9').attr('x', endX).attr('y', startY+354).text('indirect')


    },
    updateGraph(depth){
      let newGraphData = {nodes:[], links:[]}
      // 保留graphData的完整数据, 用于还原grah
      // 复制node
      this.graphData.nodes.forEach(node => {
        newGraphData.nodes.push({fileid: node.fileid, filename: node.filename, 
          depended: node.depended, depending: node.depending, r: node.r, x: node.x, y: node.y})
      })
      // 复制link
      this.graphData.links.forEach(link =>{
        newGraphData.links.push({
          source: link.source.fileid,
          target: link.target.fileid
        })
      })
      // 查找当前depth的文件夹节点
      let children= this.root.descendants().slice(1)
      let dirNodes = children.filter(node => node.depth === depth && node.data.type ==='dir')
      let dirSize = {}
      var compute = d3.interpolate(4, 15) 
      var linear = d3.scaleLinear().domain([1, Math.sqrt(88)]).range([0, 1])
      dirNodes.forEach(node => {
        //无任何依赖的文件夹
        if(node.data.name === 'E:\\Workspace\\Visualization\\srcCodeHelperServer\\data\\vue\\src\\server\\webpack-plugin')
          return 
        let fileids = []
        // 查找当前文件夹下的文件
        let files = this.filesList.filter(file => file.indexOf(node.data.name+'\\') > -1)
        files.forEach(file =>{
          let index = this.filesList.indexOf(file)
          fileids.push(index)
        })
        // 利用平均位置初始化
        let x = 0, y = 0, depended = 0, depending = 0
        newGraphData.nodes.forEach(d => {
          if(fileids.indexOf(d.fileid) != -1){
            x = x+d.x
            y = y+d.y
            depended = depended+d.depended
            depending = depending+ d.depending
          }
        })
        x = x/fileids.length
        y = y/fileids.length
        let r = node.leaves().length, dirname = node.data.name.substr(node.data.name.lastIndexOf('\\')+1)
        // 保留在当前层的文件节点
        newGraphData.nodes = newGraphData.nodes.filter(d => fileids.indexOf(d.fileid) === -1)
        //加入当前文件夹节点
        newGraphData.nodes.push({type: 'dir', fileid: node.data.name, filename: dirname, size: fileids.length, depended: depended, 
                            depending: depending, r: compute(linear(Math.sqrt(r)))*3, x: x, y: y})
        // 更新link
        let links = new Set()
        newGraphData.links.forEach(link =>{
          if(fileids.indexOf(parseInt(link.source)) === -1){
            if(fileids.indexOf(parseInt(link.target)) === -1){
              links.add(link.source + '|' + link.target)
            }
            else{
              link.target = node.data.name
              links.add(link.source + '|' + link.target)
            }  
          }
          else{
            if(fileids.indexOf(parseInt(link.target)) === -1){
              link.source = node.data.name
              links.add(link.source + '|' + link.target)
            }
          }
        })
        newGraphData.links = [...links].map(d => {
          let parts = d.split('|')
          return { source: parts[0], target: parts[1] }
        })
      })
      // 添加文件夹的直接连接
      for(let i=0; i<newGraphData.links.length; i++){
        for(let j=0; j<newGraphData.links.length; j++){
          if(i === j) continue
          if((newGraphData.links[i].source===newGraphData.links[j].target) &&
            (newGraphData.links[i].target===newGraphData.links[j].source)){
              let s1 = newGraphData.links[i].source+'|'+newGraphData.links[i].target,
                s2 = newGraphData.links[j].source+'|'+newGraphData.links[j].target
              if(this.directData.indexOf(s1) === -1)
                this.directData.push(s1)
              if(this.directData.indexOf(s2) === -1)
                this.directData.push(s2)
              break
            }
        }
      }
      this.draw(newGraphData)
    },
    draw(data) {
      d3.select('.node-link').selectAll('svg *').remove()
      let vm = this
      var simulation
      if(this.libName === 'vue'){
        simulation = d3.forceSimulation()
          .force("link", d3.forceLink().id(function(d) { return d.fileid; }))
          .force("charge", d3.forceManyBody().strength(-200).distanceMin(50).distanceMax(130))
          .force("center", d3.forceCenter(this.svgHeight  / 2, this.svgWidth/ 2))
          .force('collision', d3.forceCollide().radius(function(d) { return d.r + 10 }))
        if(this.depth === 3)
          simulation.force('collision', d3.forceCollide().radius(function(d) { return d.r*1.5 + 10}))
        if(this.depth === 2)
          simulation.force('collision', d3.forceCollide().radius(function(d) { return d.r*1.5 + 15}))
        if(this.depth === 1)
          simulation.force('collision', d3.forceCollide().radius(function(d) { return d.r*1.5 + 30}))
      }
     if(this.libName === 'd3'){
        simulation = d3.forceSimulation()
          .force("link", d3.forceLink().id(function(d) { return d.fileid }))
          .force("charge", d3.forceManyBody().strength(-120).distanceMin(30).distanceMax(70))
          .force("center", d3.forceCenter(this.svgHeight / 2, this.svgWidth / 2))
          .force('collision', d3.forceCollide().radius(function(d) { return d.r + 5}))
        if(this.depth === 1)
          simulation.force('collision', d3.forceCollide().radius(function(d) { return d.r*1.5 + 5}))
      }
      simulation
        .nodes(data.nodes)
        .on("tick", ticked)
        // .on("end", this.drawArc)
      simulation.force("link")
        .links(data.links)

      this.links = this.svg.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(data.links)
        .enter().append("line")
        .attr('stroke', d=>{
          if(this.directData.indexOf(d.source.fileid+'|'+d.target.fileid) != -1 && 
            this.directData.indexOf(d.target.fileid+'|'+d.source.fileid) != -1){
            return '#1a1a1a'
          }
          return this.linkColor
        })
        .attr("stroke-width", 0.4)
     
      this.nodes = this.svg.append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(data.nodes)
        .enter().append("circle")
        .attr('id', d => 'circle'+d.index)
        .attr("r", d => d.r)
        .attr("fill", d =>{
          if(d.type === 'dir') return 'white'
          else return this.nodeColor
        })
        .attr('stroke', d=>{
          if(d.type === 'dir') return this.nodeColor
          else return 'white'
        })
        .attr('stroke-width', d=>{
          if(d.type === 'dir') return 3
          else return 1
        })
        .on('click', d=>{
          d3.event.stopPropagation()

          this.subsvg.select('.legendG').selectAll('path').attr('opacity', 0.1)
          this.subsvg.select('.legendG').selectAll('circle').attr('opacity', 0.1)
          this.subsvg.select('.legendG').selectAll('text').attr('opacity', 0.1)
          this.subsvg.select('.legendG').selectAll('.lt').attr('opacity', 1)
          this.subsvg.select('.legendG').selectAll('.l4').attr('opacity', 1)
          this.subsvg.select('.legendG').selectAll('.l5').attr('opacity', 1)
          this.subsvg.select('.legendG').selectAll('.l7').attr('opacity', 1)

          if(!this.isSelected && !this.pathSelected)
            this.changeColor(data, d)
          if(d.type != 'dir'){
            this.$bus.$emit('file-selected', this.filesList[d.fileid])
            this.$bus.$emit('graph-fileid-selected', d.fileid)
          }
          else{
            this.$bus.$emit('graph-dirid-selected', d.fileid)
          }
          this.isSelected = true         
        })
      this.nodes.append('title').text(d => d.filename)

      function boundX(d){
        if(d < 0)
          d = 10
        if(d > vm.width)
          d = vm.width - 10
        return d
      }
      function boundY(d){
        if(d < 0)
          d = 10
        if(d > vm.height)
          d = vm.height - 10
        return d
      }
      // 停止动画
      let n = Math.ceil(Math.log(simulation.alphaMin()) / Math.log(1 - simulation.alphaDecay()))
      for(let i=0; i < n; ++i) {
        simulation.tick()
      }
      simulation.restart()

      this.subsvg.select('.legendG').selectAll('path').attr('opacity', 0.1)
      this.subsvg.select('.legendG').selectAll('circle').attr('opacity', 0.1)
      this.subsvg.select('.legendG').selectAll('text').attr('opacity', 0.1)
      this.subsvg.select('.legendG').selectAll('.lt').attr('opacity', 1)
      this.subsvg.select('.legendG').selectAll('.l1').attr('opacity', 1)
      this.subsvg.select('.legendG').selectAll('.l3').attr('opacity', 1)
      this.subsvg.select('.legendG').selectAll('.l6').attr('opacity', 1)

      this.drawArc()
      this.svg.on('click', () =>{
        this.selectID = null
        this.isSelected = false
        this.resetState()
        this.$bus.$emit('graph-fileid-selected', null)
        this.$bus.$emit('graph-dirid-selected', null)
        this.subsvg.select('.legendG').selectAll('path').attr('opacity', 0.1)
        this.subsvg.select('.legendG').selectAll('circle').attr('opacity', 0.1)
        this.subsvg.select('.legendG').selectAll('text').attr('opacity', 0.1)
        this.subsvg.select('.legendG').selectAll('.lt').attr('opacity', 1)
        this.subsvg.select('.legendG').selectAll('.l1').attr('opacity', 1)
        this.subsvg.select('.legendG').selectAll('.l3').attr('opacity', 1)
        this.subsvg.select('.legendG').selectAll('.l6').attr('opacity', 1)
      })
     
      function ticked() {
        vm.nodes
          .attr("cx", function(d) { return boundX(d.y) })
          .attr("cy", function(d) { return boundX(d.x) })
        vm.links
          .attr("x1", function(d) { return boundX(d.source.y) })
          .attr("y1", function(d) { return boundY(d.source.x) })
          .attr("x2", function(d) { return boundX(d.target.y) })
          .attr("y2", function(d) { return boundY(d.target.x) })
      }
    },
    changeColor(data, d){
      this.resetState()
      this.nodes.attr('opacity', 0.1)
      this.links.attr('opacity', 0.05)
      this.svg.select('.arcG').selectAll('.dirNode').attr('opacity', 0.05)
      //当前节点颜色
      let curNode = this.nodes.filter(node =>node.fileid === d.fileid)
      if(d.type === 'dir') {
        curNode.attr('stroke', this.selectColor).attr('opacity', 1)
        this.svg.select('#dirNode'+d.index).attr('opacity', 1)
      }
      else curNode.attr('fill', this.selectColor).attr('opacity', 1)
      // 引用连线和被引用连线(source是引用)
      let sourceLink = this.links.filter(link => link.source.fileid === d.fileid),
        targetLink = this.links.filter(link => link.target.fileid === d.fileid)
      sourceLink.attr('stroke', d=>{
        if(this.directData.indexOf(d.source.fileid+'|'+d.target.fileid) != -1 && 
          this.directData.indexOf(d.target.fileid+'|'+d.source.fileid) != -1)
            return this.getGredientLink(d)
        return this.sourceColor})
        .attr('stroke-width', 2).attr('opacity', 1)
      targetLink.attr('stroke', d=>{
        if(this.directData.indexOf(d.source.fileid+'|'+d.target.fileid) != -1 && 
          this.directData.indexOf(d.target.fileid+'|'+d.source.fileid) != -1)
            return this.getGredientLink(d)
        return this.targetColor}).attr('stroke-width', 2).attr('opacity', 1)
      // 引用节点和被引用节点
      let targetNodeID = data.links.filter(link => link.source.fileid === d.fileid).map(link => link.target.fileid),
        sourceNodeID = data.links.filter(link => link.target.fileid === d.fileid).map(link => link.source.fileid)
      let directNodeID = targetNodeID.filter(id => sourceNodeID.indexOf(id) != -1)
      this.nodes.filter(node => targetNodeID.indexOf(node.fileid) != -1 && directNodeID.indexOf(node.fileid) === -1)
        .attr('stroke', d =>{ if(d.type === 'dir') return this.sourceColor; else return 'white' })
        .attr('fill', d =>{ if(d.type === 'dir') return 'white'; else return this.sourceColor})
        .attr('opacity', 1)
        .each(d =>{ if(d.type === 'dir') this.svg.select('#dirNode'+d.index).attr('opacity', 1) })
      this.nodes.filter(node => sourceNodeID.indexOf(node.fileid) != -1 && directNodeID.indexOf(node.fileid) === -1)
        .attr('stroke', d =>{ if(d.type === 'dir') return this.targetColor; else return 'white' })
        .attr('fill', d =>{ if(d.type === 'dir') return 'white'; else return this.targetColor })
        .attr('opacity', 1)
        .each(d =>{ if(d.type === 'dir') this.svg.select('#dirNode'+d.index).attr('opacity', 1) })
      // 相互引用的节点
      this.nodes.filter(node => directNodeID.indexOf(node.fileid) != -1)
        .attr('stroke', d =>{ if(d.type === 'dir') return this.getGredientNode(this.svg, d); else return 'white' })
        .attr('fill', d =>{ if(d.type === 'dir') return 'white'; else return this.getGredientNode(this.svg, d)})
        .attr('opacity', 1)
        .each(d =>{ if(d.type === 'dir') this.svg.select('#dirNode'+d.index).attr('opacity', 1) })
    },
    getGredientLink(d){
      let linearGradient = this.svg.append('defs')
        .append('linearGradient')
        .attr('id', 'link-gradient'+d.index)
        .attr('gradientUnits','userSpaceOnUse')
        .attr('x1', d.source.y)
        .attr('y1', d.source.x)
        .attr('x2', d.target.y)
        .attr('y2', d.target.x)
        linearGradient.append('stop')
          .attr('offset', '0%')
          .attr('stop-color', this.sourceColor)
        linearGradient.append('stop')
          .attr('offset', '50%')
          .attr('stop-color', this.sourceColor)
        linearGradient.append('stop')
          .attr('offset', '51%')
          .attr('stop-color', this.targetColor)
        linearGradient.append('stop')
          .attr('offset', '100%')
          .attr('stop-color', this.targetColor)
        return 'url(#link-gradient'+d.index+')'
    },
    getGredientNode(appendObject, d){                  
      let linearGradient = appendObject.append('defs')
        .append('linearGradient')
        .attr('id', 'node-gradient'+d.index)
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '100%')
        .attr('y2', '100%')
        linearGradient.append('stop')
          .attr('offset', '0%')
          .attr('stop-color', this.sourceColor)
        linearGradient.append('stop')
          .attr('offset', '50%')
          .attr('stop-color', this.sourceColor)
        linearGradient.append('stop')
          .attr('offset', '51%')
          .attr('stop-color', this.targetColor)
        linearGradient.append('stop')
          .attr('offset', '100%')
          .attr('stop-color', this.targetColor)
        return 'url(#node-gradient'+d.index+')'
    },
    drawArc(){
      this.svg.append('g').attr('class', 'arcG')
      this.nodes.filter(node => node.type === 'dir')
        .each(node =>{
          let curNode = this.root.descendants().slice(1).filter(d => d.data.name === node.fileid)[0]
          let children = curNode.children
          let cx = node.x, cy = node.y, r = node.r
          let arc = d3.arc().innerRadius(r-8).outerRadius(r-3)
          let per = 2*Math.PI/curNode.leaves().length
          let arcG = this.svg.select('.arcG').append('g').attr('class', 'dirNode').attr('id', 'dirNode'+node.index).attr('transform', 'translate(' + cy + ',' + cx + ')')
          let startAngle = 0, endAngle = 0, midAngle = new Array(children.length)
          let matrix = this.getMatrix(children)
          children.forEach((d, i) =>{
            if(d.children)
              endAngle = startAngle + d.leaves().length*per
            else
              endAngle = startAngle + per
            arc.startAngle(startAngle).endAngle(endAngle)
            arcG.append('path').attr('class', 'arc').attr('id', 'arc'+i).attr('d', arc)
              .style('fill', function(){if(d.children) return '#fed9a6'; else return '#eeebe6'}).attr('stroke', 'white')
            midAngle[i] = (startAngle+endAngle)/2 - Math.PI/2
            startAngle = endAngle
          })
          for(let i=0; i<matrix.length; i++){
            let start = [Math.cos(midAngle[i])*(r-8), Math.sin(midAngle[i])*(r-8)]
            for(let j=0; j<matrix[i].length; j++){
              if(i === j) continue
              if(matrix[i][j] != 0){
                let end = [Math.cos(midAngle[j])*(r-8), Math.sin(midAngle[j])*(r-8)]
                arcG.append('path').attr('d', 'M'+start+'Q'+0+','+ 0+',' +end)
                  .attr('fill', 'none').attr('stroke', '#74adde').attr('stroke-width', 0.7)
              }
            }
          }
        })
    },
    resetState(){
      this.nodes.attr("fill", d =>{ if(d.type === 'dir') return 'white'; else return this.nodeColor; })
        .attr('stroke', d=>{ if(d.type === 'dir') return this.nodeColor; else return 'white'; })
        .attr('stroke-width', d=>{ if(d.type === 'dir') return 3; else return 1; })
        .attr('opacity', 1)
      this.links.attr('stroke', d=>{
         if(this.directData.indexOf(d.source.fileid+'|'+d.target.fileid) != -1 && 
            this.directData.indexOf(d.target.fileid+'|'+d.source.fileid) != -1){
            return '#1a1a1a'
          }
          return this.linkColor
      }).attr("stroke-width", 0.4).attr('opacity', 1)
      this.svg.select('.arcG').selectAll('.dirNode').attr('opacity', 1)
      this.svg.selectAll('defs').remove()
      this.svg.select('.badLinks').remove()
      this.svg.select('.badNodes').remove()
    },
    getMatrix(children){
      let matrix = new Array(children.length)
      for(let i=0; i<children.length; i++){
        matrix[i] = new Array(children.length)
        let sourceLink
        if(children[i].data.type === 'dir'){
          let files = children[i].leaves().map(d => d.data.id)
          sourceLink = this.graphData.links.filter(link => files.indexOf(link.source.fileid) != -1)
        }
        else{
          sourceLink = this.graphData.links.filter(link => link.source.fileid === children[i].data.id)
        }
        for(let j=0; j<children.length; j++){
          if(i === j){
            matrix[i][j] = 0
            continue
          }
          let targetLink
          if(children[j].data.type === 'dir'){
            let files = children[j].leaves().map(d => d.data.id)
            targetLink = sourceLink.filter(link => files.indexOf(link.target.fileid) != -1)
          }
          else{
            targetLink = sourceLink.filter(link => link.target.fileid === children[j].data.id)
          }
          matrix[i][j] = targetLink.length
        }
      }
      return matrix
    }
  },
  watch: {
  },
  created() {
    const requiredData = ['graphData', 'filesDist', 'root', 'filesList','dirs', 'maxDepth']
    let cnt = 0
    requiredData.forEach(d => {
      this.$watch(d, val => {
        if(val) cnt++
        if(cnt === requiredData.length) {
          this.graphData.nodes.forEach(node=>{
            node['r'] = this.defaultR
            node['depended'] = this.depended.filter(item => item.fileid === node.fileid)[0].depended
            node['depending'] = this.depending.filter(item => item.fileid === node.fileid)[0].depending
          })
          this.$axios.get('files/getDirect', {
          }).then(({data}) =>{
            this.directData = data     //直接循环依赖
            this.depth = this.maxDepth
            this.draw(this.graphData)
          })
        }
      })
    })
  },
  updated() {
  },
  mounted() {
    // 获取高度, 添加svg
    this.svgWidth = Math.floor(this.$refs.root.clientWidth)
    this.svgHeight = Math.floor(this.$refs.root.clientHeight)
    this.subsvgWidth = Math.floor(this.$refs.sub.clientWidth)
    this.subsvgHeight = Math.floor(this.$refs.sub.clientHeight)
    this.svg = d3.select('.node-link').append("svg")
      .attr("width", this.svgWidth)
      .attr("height", this.svgHeight)
    this.subsvg = d3.select('.legend').append("svg")
      .attr("width", this.subsvgWidth)
      .attr("height", this.subsvgHeight)
    this.subsvg.append("defs")
      .append("marker")
      .attr('class', 'path-arrow')
      .attr("id", "legend-arrow")
      .attr("viewBox", "0 -5 20 20")
      .attr("refX", 0)
      .attr('refY', 0)
      .attr("markerWidth", 10)
      .attr("markerHeight", 10)
      .attr('orient', 'auto')
      .append("path")
      .attr("d", "M0,-5L8,0L0,5")
      .attr('fill', this.linkColor)
    this.drawLegend()
    // 圆环编码数据
    this.$bus.$on('dependData', data =>{
      this.depended = data.depended,
      this.depending = data.depending,
      this.maxDepending = data.maxDepending,
      this.maxDepended = data.maxDepended
    })    
    this.$bus.$on('depth-selected', d =>{
      this.depth = d
      this.updateGraph(this.depth)
    })
    // sunburst点击事件
    this.$bus.$on('sunburst-fileid-selected', d =>{
      if(this.depth != this.maxDepth)
        return
      if(this.pathSelected)
        return 
      this.resetState()
      if(d){
        this.subsvg.select('.legendG').selectAll('path').attr('opacity', 0.1)
        this.subsvg.select('.legendG').selectAll('circle').attr('opacity', 0.1)
        this.subsvg.select('.legendG').selectAll('text').attr('opacity', 0.1)
        this.subsvg.select('.legendG').selectAll('.lt').attr('opacity', 1)
        this.subsvg.select('.legendG').selectAll('.l1').attr('opacity', 1)
        this.subsvg.select('.legendG').selectAll('.l3').attr('opacity', 1)
        this.subsvg.select('.legendG').selectAll('.l6').attr('opacity', 1)
        this.subsvg.select('.legendG').selectAll('.l7').attr('opacity', 1)
        this.subsvg.select('.legendG').selectAll('.l8').attr('opacity', 1)

        let curNode = this.nodes.filter(node=>node.fileid===d)
        this.isSelected = true
        this.selectID = d
        // 颜色色卡
        var a = d3.rgb(118, 42, 131), b = d3.rgb(153, 112, 171)
        var compute = d3.interpolate(a, b)
        function up(x, y) {return x.val -y.val}
        // 显示相似节点
        let dist = this.filesDist.filter(dist => parseInt(dist.id) === d)[0],
          fileid = [], val = []
        this.obj = []
        for(var key in dist)
          this.obj.push({key: key, val: dist[key]})
        this.obj.sort(up)
        for(let i=1; i <= this.num; i++){
          fileid.push(parseInt(this.obj[i].key))
          val.push(parseFloat(this.obj[i].val))
        }
        var linear = d3.scaleLinear().domain([Math.min(...val), Math.max(...val)]).range([0, 1])
        fileid.forEach((id, i) =>{
          this.nodes.filter(node => node.fileid === id)
            .attr('fill', compute(linear(val[i])))
        })
        curNode.attr('fill', this.selectColor)
      }
    })
    // 相似节点数调整
    this.$bus.$on('similar-number-selected', d => {
      this.num = d
      if(this.depth != this.maxDepth) return
      if(this.isSelected){
        // 还原初始半径和颜色
        this.nodes.filter(node => node.fileid != this.selectID).attr('fill', this.nodeColor)
        var fileid = [], val = []
        for(let i=1; i <= this.num; i++){
          fileid.push(parseInt(this.obj[i].key))
          val.push(parseFloat(this.obj[i].val))
        }
        // 颜色色卡
        var a = d3.rgb(118, 42, 131), b = d3.rgb(153, 112, 171)
        var compute = d3.interpolate(a, b)
        var linear = d3.scaleLinear().domain([Math.min(...val), Math.max(...val)]).range([0, 1])
        fileid.forEach((id, i) =>{
          this.nodes.filter(node => node.fileid === id)
            .attr('fill', compute(linear(val[i])))
        })
      }
    })
    // 平行坐标选择事件
    this.$bus.$on('parallel-fileid-selected', d =>{
      if(this.depth != this.maxDepth) return
      if(d.length === this.filesList.length){
        this.nodes.attr('fill', this.nodeColor)
        this.subsvg.select('.legendG').selectAll('path').attr('opacity', 0.1)
        this.subsvg.select('.legendG').selectAll('circle').attr('opacity', 0.1)
        this.subsvg.select('.legendG').selectAll('text').attr('opacity', 0.1)
        this.subsvg.select('.legendG').selectAll('.lt').attr('opacity', 1)
        this.subsvg.select('.legendG').selectAll('.l1').attr('opacity', 1)
        this.subsvg.select('.legendG').selectAll('.l3').attr('opacity', 1)
        this.subsvg.select('.legendG').selectAll('.l6').attr('opacity', 1)
      }
      else this.nodes.attr('fill', node => {
        this.subsvg.select('.legendG').selectAll('path').attr('opacity', 0.1)
        this.subsvg.select('.legendG').selectAll('circle').attr('opacity', 0.1)
        this.subsvg.select('.legendG').selectAll('text').attr('opacity', 0.1)
        this.subsvg.select('.legendG').selectAll('.lt').attr('opacity', 1)
        this.subsvg.select('.legendG').selectAll('.l1').attr('opacity', 1)
        this.subsvg.select('.legendG').selectAll('.l3').attr('opacity', 1)
        this.subsvg.select('.legendG').selectAll('.l6').attr('opacity', 1)
        this.subsvg.select('.legendG').selectAll('.l7').attr('opacity', 1)
        if(d.indexOf(node.fileid) != -1) return this.selectColor
        else return this.nodeColor
      })
    })
    // 坏依赖选择事件
    this.$bus.$on('path-selected', d=> {
      if(this.depth != this.maxDepth) return
      this.svg.select('.badLinks').remove()
      this.svg.select('.badNodes').remove()
      if(d.length === 0) {
        this.nodes.attr('opacity', 1)
        this.links.attr('opacity', 1)
        this.pathSelected = false
        this.subsvg.select('.legendG').selectAll('path').attr('opacity', 0.1)
        this.subsvg.select('.legendG').selectAll('circle').attr('opacity', 0.1)
        this.subsvg.select('.legendG').selectAll('text').attr('opacity', 0.1)
        this.subsvg.select('.legendG').selectAll('.lt').attr('opacity', 1)
        this.subsvg.select('.legendG').selectAll('.l1').attr('opacity', 1)
        this.subsvg.select('.legendG').selectAll('.l3').attr('opacity', 1)
        this.subsvg.select('.legendG').selectAll('.l6').attr('opacity', 1)
      }
      else{
        this.$axios.get('files/getPathInfoById', {
          ids: d
        }).then(({ data }) => {
          this.nodes.attr('opacity', 0.1)
          this.links.attr('opacity', 0.05)
          this.subsvg.select('.legendG').selectAll('path').attr('opacity', 0.1)
          this.subsvg.select('.legendG').selectAll('circle').attr('opacity', 0.1)
          this.subsvg.select('.legendG').selectAll('text').attr('opacity', 0.1)
          this.subsvg.select('.legendG').selectAll('.lt').attr('opacity', 1)
          this.subsvg.select('.legendG').selectAll('.l2').attr('opacity', 1)
          this.subsvg.select('.legendG').selectAll('.l3').attr('opacity', 1)
          this.subsvg.select('.legendG').selectAll('.l9').attr('opacity', 1)

          this.pathSelected = true
          let badNodes = new Set(), badLinks = new Set(), 
              directNodes = new Set(),directLinks = new Set()
          for(let i=0; i<data.subPaths.length; i++){
            // 直接依赖数据
            if(data.subPaths[i].type === 'direct'){
              directNodes.add(data.subPaths[i].path[0])
              directNodes.add(data.subPaths[i].path[1])
              directLinks.add(data.subPaths[i].path[0]+'|'+data.subPaths[i].path[1])
              directLinks.add(data.subPaths[i].path[1]+'|'+data.subPaths[i].path[0])
            }
            let path = data.subPaths[i].path
            path.push(path[0])
            for(let j=0; j<path.length-1; j++){
              badNodes.add(path[j])
              badLinks.add(path[j]+'|'+path[j+1])
            }
          }
          badNodes = [...badNodes].map(d =>{
            let curNode = this.nodes.filter(node => node.fileid === d)
            return {fileid: d, x: curNode.attr('cx'), y: curNode.attr('cy'), 
                    filename: this.filesList[d].substr(this.filesList[d].lastIndexOf('\\')+1)}
          })
          badLinks = [...badLinks].map(d =>{
            let parts = d.split('|')
            return { source: parseInt(parts[0]), target: parseInt(parts[1]) }
          })
          // 获取多个间接依赖中的直接依赖
          for(let i=0; i<badLinks.length; i++){
            for(let j=0; j<badLinks.length; j++){
              if(i === j) continue
              if((badLinks[i].source===badLinks[j].target) && (badLinks[i].target===badLinks[j].source)){
                let s1 = badLinks[i].source+'|'+badLinks[i].target,
                  s2 = badLinks[j].source+'|'+badLinks[j].target
                directLinks.add(s1)
                directLinks.add(s2)
                break
              }
            }
          }
          directNodes = [...directNodes]
          directLinks = [...directLinks]

          this.svg.append("defs")
            .append("marker")
            .attr('class', 'path-arrow')
            .attr("id", "bad-path-arrow")
            .attr("viewBox", "5 -5 20 20")
            .attr("refX", 0)
            .attr('refY', 0)
            .attr("markerWidth", 15)
            .attr("markerHeight", 15)
            .attr('orient', 'auto')
            .append("path")
            .attr("d", "M15,-5L15,5L5,0")
            .attr('fill', this.linkColor)
          
          //先绘制node再绘制link
          this.svg.append('g').attr('class', 'badLinks')
            .selectAll('path').data(badLinks)
            .enter().append('path')
            .attr('d', d =>{
              let start = badNodes.filter(node => node.fileid === d.source)[0],
                end = badNodes.filter(node => node.fileid === d.target)[0]
              return d3.line()([[start.x, start.y], [end.x, end.y]])
            })
            
            .attr('stroke', (d, i) => {
              if(directLinks.indexOf(d.source+'|'+d.target) != -1 && 
                directLinks.indexOf(d.target+'|'+d.source) != -1){
                return '#1a1a1a'
              }
              else return this.linkColor
            })
            .attr("marker-start", d=> {
              if(directLinks.indexOf(d.source+'|'+d.target) === -1 || 
                directLinks.indexOf(d.target+'|'+d.source) === -1)
              return "url(#bad-path-arrow)"
            })

          this.svg.append('g').attr('class', 'badNodes')
            .selectAll('circle').data(badNodes)
            .enter().append('circle')
            .attr('r', d=>{
              if(data.subPaths.length === 1 && data.subIDs.length > 0){
                return data.subIDs.filter(item => item.fileid === d.fileid)[0].ids.length/10+this.defaultR
              }
              else return this.defaultR
            })
            .attr('cx', d => d.x)
            .attr('cy', d => d.y)
            .attr('fill', d => {
              if(directNodes.indexOf(d.fileid) === -1)
                return this.colorMap['indirect']
              else
                return this.colorMap['direct']
            })
            .on('click', d =>{
              d3.event.stopPropagation()
              this.$bus.$emit('file-selected', this.filesList[d.fileid])
              this.$bus.$emit('graph-fileid-selected', d.fileid)
            })
            .append('title').text(d => d.filename)   
        })
      }
    })
  }
}
</script>
<style type="text/css" lang="scss">
.dep-path {
  height: 100%;
  display: flex;
  .node-link{
    flex: 5;
  }
  .legend{
    flex: 1;
    font-size: 14px;
  }
}
</style>