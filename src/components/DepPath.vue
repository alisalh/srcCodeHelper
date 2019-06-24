<template>
  <div ref="root" class="dep-path">
    <div ref="root1" class='main-div'></div>
    <div class='sub-div'>
      <div class='info-div'>
        <span>Graph: {{numNodes}} nodes, {{numLinks}} links</span>
        <span>Path: {{path}}</span>
        <span>Type: {{type}}</span>
      </div>
      <div class='subgraph-div'>
        <div class="header">
          <div class="title">Selected Node</div>
          <!-- <i class="el-icon-close"></i> -->
        </div>
        <div class='subgraph-content' id='selected' ref='root2'></div>
      </div>
      <div class='compared-div'>
        <div class="header">
          <div class="title">Compared Node</div>
          <!-- <i class="el-icon-close"></i> -->
        </div>
        <div class='subgraph-content' id='compared'></div>
      </div> 
    </div>
  </div>
</template>
<script type="text/javascript">
import * as d3 from 'd3'

export default {
  data() {
    return {
      svg: null,
      nodes: null,
      numNodes: 0,
      numLinks: 0,
      type: null,
      path: null,
      links: null,
      defaultR: 3,
      depData: null,
      color: 'grey',
      subSvg: null,
      svgWidth: 0,
      svgHeight: 0,
      subSvgWidth: 0,
      subSvgHeight: 0,
      isSelected: false,
      depth: 0,
      directData: null,
      //用于更新相似节点
      num: 10,
      obj: null,
      selectId: null,
      pathSelected: false
    }
  },
  props:['graphData', 'filesDist', 'root', 'filesList', 'maxDepth', 'colorMap', 'libName'],
  methods: {
    drawLinkMark(){
      let markG = this.svg.append('g')
        .attr('class', 'link-mark')
        .attr('transform', 'translate(40,'+(this.svgHeight-40)+')')
      markG.append('circle')
        .attr('r', this.defaultR)
        .style('fill', this.color)
      markG.append('circle')
        .attr('r', this.defaultR)
        .attr('cx', '3em')
        .style('fill', this.color)
      markG.append('circle')
        .attr('r', this.defaultR)
        .attr('cy', '1.2em')
        .style('fill', this.color)
      markG.append('circle')
        .attr('r', this.defaultR)
        .attr('cy', '1.2em')
        .attr('cx', '3em')
        .style('fill', this.color)
      // 绘制箭头
      markG
        .append("defs")
        .append("marker")
        .attr("id", "link-mark-right-arrow")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 0)
        .attr('refY', 0)
        .attr("markerWidth", 5.5)
        .attr("markerHeight", 5.5)
        .attr('orient', 'auto')
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
      markG
        .append("defs")
        .append("marker")
        .attr("id", "link-mark-left-arrow")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 0)
        .attr('refY', 0)
        .attr("markerWidth", 5.5)
        .attr("markerHeight", 5.5)
        .attr('orient', 180)
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
      // 直线颜色渐变
      let linearGradient = markG.append('defs')
        .append('linearGradient')
        .attr('id', 'link-mark-gradient')
        .attr('gradientUnits','userSpaceOnUse')
        .attr('x1', 51)
        .attr('y1', 0)
        .attr('x2', 4)
        .attr('y2', 0)
      linearGradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', '#d9d9d9')
      linearGradient.append('stop')
        .attr('offset', '33%')
        .attr('stop-color', '#d9d9d9')
      linearGradient.append('stop')
        .attr('offset', '66%')
        .attr('stop-color', '#525252')
      linearGradient.append('stop')
        .attr('offset', '100%')
      markG.append('path')
        .attr("d", 'M4,0 L51,0')
        .style('stroke', 'url(#link-mark-gradient)')
        .attr("marker-end","url(#link-mark-right-arrow)")
      markG.append('path')
        .attr("d", 'M8,24 L51,24')
        .style('stroke', '#525252')
        .attr("marker-end","url(#link-mark-right-arrow)")
        .attr('marker-start',"url(#link-mark-left-arrow)")
      // 添加文字
      markG.append('text')
        .text('A').style('font-size', '11px')
        .attr('dy', '0.4em')
        .attr('dx', '-1.2em')
      markG.append('text')
        .text('A').style('font-size', '11px')
        .attr('dy', '2.5em')
        .attr('dx', '-1.2em')
      markG.append('text')
        .text('B').style('font-size', '11px')
        .attr('dy', '0.4em')
        .attr('dx', '5.9em')
      markG.append('text')
        .text('B').style('font-size', '11px')
        .attr('dy', '2.5em')
        .attr('dx', '5.9em')
    },
    updateGraph(depth){
      let newGraphData = {nodes:[], links:[]}
      // 复制node
      this.graphData.nodes.forEach(node => {
        newGraphData.nodes.push({fileid: node.fileid, x: node.x, y: node.y})
      })
      // 复制link
      this.graphData.links.forEach(link =>{
        newGraphData.links.push({
          source: link.source.fileid,
          target: link.target.fileid
        })
      })
      // 查找当前depth的文件夹节点
      let children= d3.partition()(this.root).descendants().slice(1)
      let dirNodes = children.filter(node => node.depth === depth && node.data.type ==='dir')
      let dirSize = {}
      dirNodes.forEach(node => {
        if(node.data.name === 'E:\\Workspace\\Visualization\\srcCodeHelperServer\\data\\vue\\src\\server\\webpack-plugin')
          return
        let fileids = []
        // 查找当前文件夹下的文件
        let files = this.filesList.filter(file => file.indexOf(node.data.name+'\\') > -1)
        files.forEach(file =>{
          let index = this.filesList.indexOf(file)
          fileids.push(index)
        })
        dirSize[node.data.name] = files.length
        // 计算文件夹节点的平均位置
        let x = 0, y = 0, nodes = []
        newGraphData.nodes.forEach(d => {
          if(fileids.indexOf(d.fileid) != -1){
            x = x+d.x
            y = y+d.y
          }
          else{
            nodes.push(d)
          } 
        })
        x = x/fileids.length
        y = y/fileids.length
        nodes.push({fileid: node.data.name, size: fileids.length, x: x, y: y})
        newGraphData.nodes = nodes
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
      this.numNodes = newGraphData.nodes.length
      this.numLinks = newGraphData.links.length
      this.draw(newGraphData)
    },
    draw(data) {
      d3.select('.main-div').selectAll('svg *').remove()
      this.drawLinkMark()
      let vm = this
      var simulation
      if(this.libName === 'vue'){
        if(data.nodes.length > 10)
          simulation = d3.forceSimulation()
            .force("link", d3.forceLink().id(function(d) { return d.fileid; }))
            .force("charge", d3.forceManyBody().strength(-200).distanceMin(30).distanceMax(100))
            .force("center", d3.forceCenter(this.svgHeight  / 2, this.svgWidth/ 2))
            .force('collision', d3.forceCollide().radius(function(d) { return 10 }))
            .stop()
        if(data.nodes.length <= 10)
          simulation = d3.forceSimulation()
            .force("link", d3.forceLink().id(function(d) { return d.fileid; }))
            .force("charge", d3.forceManyBody().strength(-200).distanceMin(100).distanceMax(150))
            .force("center", d3.forceCenter(this.svgHeight  / 2, this.svgWidth/ 2))
            .force('collision', d3.forceCollide().radius(function(d) { return Math.round(Math.random()*20)+30 }))
            .stop()
      }
     if(this.libName === 'd3'){
       if(data.nodes.length > 40)
        simulation = d3.forceSimulation()
          .force("link", d3.forceLink().id(function(d) { return d.fileid }))
          .force("charge", d3.forceManyBody().strength(-90).distanceMin(20).distanceMax(80))
          .force("center", d3.forceCenter(this.svgHeight / 2 - 25, this.svgWidth / 2 - 20))
          .force('collision', d3.forceCollide().radius(function(d) { return 10 }))
          .stop()
      if(data.nodes.length <= 40)
        simulation = d3.forceSimulation()
          .force("link", d3.forceLink().id(function(d) { return d.fileid }))
          .force("charge", d3.forceManyBody().strength(-90).distanceMin(20).distanceMax(80))
          .force("center", d3.forceCenter(this.svgHeight / 2 - 25, this.svgWidth / 2 - 20))
          .force('collision', d3.forceCollide().radius(function(d) { return Math.round(Math.random()*10)+20 }))
          .stop()
      }

      simulation
        .nodes(data.nodes)
        .on("tick", ticked);

      simulation.force("link")
        .links(data.links)

      // 颜色色卡
      var a = d3.rgb(165,0,38), b = d3.rgb(253,174,97)
      var compute = d3.interpolate(a, b)
      function up(x, y) {return x.val -y.val}
      this.links = this.svg.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(data.links)
        .enter().append("line")
        .style("stroke", (d, i) =>{
          if(this.directData.indexOf(d.source.fileid+'|'+d.target.fileid) != -1 && 
            this.directData.indexOf(d.target.fileid+'|'+d.source.fileid) != -1){
            return '#525252'
          }
          else{
            let linearGradient = this.svg.append('defs')
              .append('linearGradient')
              .attr('id', 'linear-gradient'+i)
              .attr('gradientUnits','userSpaceOnUse')
              .attr('x1', boundX(d.source.y))
              .attr('y1', boundY(d.source.x))
              .attr('x2', boundX(d.target.y))
              .attr('y2', boundY(d.target.x))
            linearGradient.append('stop')
              .attr('offset', '0%')
              .attr('stop-color', '#d9d9d9')
            linearGradient.append('stop')
              .attr('offset', '33%')
              .attr('stop-color', '#d9d9d9')
            linearGradient.append('stop')
              .attr('offset', '66%')
              .attr('stop-color', '#525252')
            linearGradient.append('stop')
              .attr('offset', '100%')
              .attr('stop-color', '#525252')
            return 'url(#linear-gradient'+i+')'
          }
        })
        .attr("stroke-width", d => {
          // if(this.directData.indexOf(d.source.fileid+'|'+d.target.fileid) != -1 && 
          //   this.directData.indexOf(d.target.fileid+'|'+d.source.fileid) != -1){
          //   return 0.3
          // }
          return 0.3
        })

      this.nodes = this.svg.append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(data.nodes)
        .enter().append("circle")
        .attr('id', d => 'circle'+d.index)
        .attr("r", d => {
          if(this.depth === this.maxDepth)
            return this.defaultR
          else{
            if(d.size)
              return (d.size/10+2+this.defaultR)
            else
              return this.defaultR
          }
        })
        .attr("fill", this.color)
        .attr('stroke', 'white')
        .on('click', (d) => {
          if(this.depth === this.maxDepth){
            this.$bus.$emit('file-selected', this.filesList[d.fileid])
            if(!this.isSelected && !this.pathSelected){
              this.resetState()
              // 点击节点显示相似节点
              let dist = this.filesDist.filter(dist => parseInt(dist.id) === d.fileid)[0],
                  fileid = [], val = []
              this.obj = []
              for(var key in dist)
                this.obj.push({key: key, val: dist[key]})
              this.obj.sort(up)
              for(let i=0; i<this.num+1; i++){
                fileid.push(parseInt(this.obj[i].key))
                val.push(parseFloat(this.obj[i].val))
              }
              var linear = d3.scaleLinear().domain([Math.min(...val), Math.max(...val)]).range([0, 1])
              fileid.forEach((id, i) =>{
                this.nodes.filter(node => node.fileid === id)
                  .attr('fill', compute(linear(val[i])))
                  .attr('r', 4)
              })
              // 当前点击节点的半径最大
              this.selectId = d.fileid
              this.nodes.filter(node => node.fileid === d.fileid).attr('r', 6)
            }
            else{
              // 比较节点的stroke上色
              if(!this.pathSelected)
                this.nodes.filter(node => node.fileid === d.fileid).attr('stroke', '#4393c3').attr('stroke-width', 2)
            }
            if(!this.pathSelected){
              // 绘制子图
              this.$axios.get('files/getSubGraphData', {
                fileid: d.fileid
              }).then(({ data }) => {
                var subGraphData = data.subGraph
                if(!this.isSelected){
                  // 未选择节点时绘制selected nodes
                  this.drawSubGraph('selected', d.fileid, subGraphData)
                  this.isSelected = true
                }
                else{
                  // 已选中节点时绘制compared nodes
                  this.drawSubGraph('compared', d.fileid, subGraphData)
                }
              })
            }            
            this.type = 'file'
            if(this.libName === 'vue')
              this.path = this.filesList[d.fileid]
                .replace(/E:\\Workspace\\Visualization\\srcCodeHelperServer\\data\\vue\\src\\/g, '')
            if(this.libName === 'd3')
              this.path = this.filesList[d.fileid]
                .replace(/E:\\Workspace\\Visualization\\srcCodeHelperServer\\data\\d3\\src\\/g, '')
            if(this.pathSelected){
              this.svg.append('text')
                .attr('class','path-text')
                .text(this.path.substr(this.path.lastIndexOf('\\')+1))
                .attr('x', d.y).attr('y', d.x)
                .attr('dx','0.5em')
                .attr('dy', '0.4em')
                .attr('font-size', '12px')
            }
          } 
          else{
            if(this.filesList[d.fileid])
              this.svg.append('text')
                .attr('class','node-text')
                .text(this.filesList[d.fileid].substr(this.filesList[d.fileid].lastIndexOf('\\')+1))
                .attr('x', d.y).attr('y', d.x)
                .attr('dx','0.4em')
                .attr('font-size', '12px')
            else
              this.svg.append('text')
                .attr('class','node-text')
                .text(d.fileid.substr(d.fileid.lastIndexOf('\\')+1))
                .attr('x', d.y).attr('y', d.x)
                .attr('dx','0.4em')
                .attr('font-size', '12px')
          }
          d3.event.stopPropagation()
        })
        // .call(d3.drag()
        //   .on("start", dragstarted)
        //   .on("drag", dragged)
        //   .on("end", dragended))
      this.svg.on('click', ()=>{
        this.path = null
        this.type = null
        if(this.depth === this.maxDepth){
          this.resetState()
          this.$bus.$emit('link-clear', null)
        }
        this.svg.selectAll('.node-text').remove()
      })
      this.nodes.append("title")
        .text((d) => {
          if(this.filesList[d.fileid]){
            let name = this.filesList[d.fileid]
            return name.substr(name.lastIndexOf('\\')+1)
          }
          else{
            let name = d.fileid
            return name.substr(name.lastIndexOf('\\')+1)
          }
        })
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
      let n = Math.ceil(Math.log(simulation.alphaMin()) / Math.log(1 - simulation.alphaDecay()))
      for(let i=0; i < n; ++i) {
        simulation.tick()
      }
      simulation.restart()
      function ticked() {
        vm.links
          .attr("x1", function(d) { return boundX(d.source.y) })
          .attr("y1", function(d) { return boundY(d.source.x) })
          .attr("x2", function(d) { return boundX(d.target.y) })
          .attr("y2", function(d) { return boundY(d.target.x) })
          .style("stroke", (d, i) =>{
            if(vm.directData.indexOf(d.source.fileid+'|'+d.target.fileid) != -1 && 
              vm.directData.indexOf(d.target.fileid+'|'+d.source.fileid) != -1){
              return '#525252'
            }
            else{
              vm.svg.select('#linear-gradient'+i)
                .attr('x1', boundX(d.source.y))
                .attr('y1', boundY(d.source.x))
                .attr('x2', boundX(d.target.y))
                .attr('y2', boundY(d.target.x))
              return 'url(#linear-gradient'+i+')'
            }
          })

        vm.nodes
          .attr("cx", function(d) { return boundX(d.y) })
          .attr("cy", function(d) { return boundY(d.x) });
      }

      function dragstarted(d) {
        if (!d3.event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x
        d.fy = d.y
      }

      function dragged(d) {
        d.fx = d3.event.x
        d.fy = d3.event.y
      }

      function dragended(d) {
        if (!d3.event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }
    },
    resetState(){
      this.nodes.attr('fill', this.color)
        .attr('r', this.defaultR)
        .attr('stroke', 'white')
        .attr('stroke-width', 1)
        .attr('opacity', 1)
      this.svg.select('.path-arrow').remove()
      this.links.attr('opacity', 1).attr('stroke-width', 0.3)
      this.isSelected = false
      this.pathSelected = false
      this.type = null
      this.path = null
      this.obj = null
      d3.select('#selected').select('svg').remove()
      d3.select('#compared').select('svg').remove()
      d3.selectAll('.path-text').remove()
    },
    drawSubGraph(divID, fileid, subGraphData){
      let vm = this
      d3.select('#'+divID).select('svg').remove()
      var subSvg = d3.select('#'+divID).append("svg")
        .attr("width", this.subSvgWidth)
        .attr("height", this.subSvgHeight)
      var g = subSvg.append('g')
        .attr('class', 'subgraph')
      var simulation = d3.forceSimulation()
          .force("link", d3.forceLink().id(function(d) { return d.fileid; }))
          .force("center", d3.forceCenter(this.subSvgWidth  / 2, this.subSvgHeight / 2))
          .force("charge", d3.forceManyBody().strength(-200).distanceMin(100).distanceMax(150))
          .force('collision', d3.forceCollide().radius(function(d) { return 10 }))
          .stop()
      simulation
        .nodes(subGraphData.nodes)
        .on("tick", ticked)
      simulation.force("link")
        .links(subGraphData.links)
     
      var links = g.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(subGraphData.links)
        .enter().append("line")
        .style("stroke", (d, i) =>{
          if(this.directData.indexOf(d.source.fileid+'|'+d.target.fileid) != -1 && 
            this.directData.indexOf(d.target.fileid+'|'+d.source.fileid) != -1){
            return '#525252'
          }
          let linearGradient = subSvg.append('defs')
            .append('linearGradient')
            .attr('id', divID+'linear-gradient'+i)
            .attr('gradientUnits','userSpaceOnUse')
            .attr('x1', d.source.x)
            .attr('y1', d.source.y)
            .attr('x2', d.target.x)
            .attr('y2', d.target.y)
          linearGradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', '#d9d9d9')
          linearGradient.append('stop')
            .attr('offset', '33%')
            .attr('stop-color', '#d9d9d9')
          linearGradient.append('stop')
            .attr('offset', '66%')
            .attr('stop-color', '#525252')
          linearGradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', '#525252')
          return 'url(#'+divID+'linear-gradient'+i+')'
        })
      var nodes = g.append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(subGraphData.nodes)
        .enter().append("circle")
        .attr("r", this.defaultR)
        .attr("fill", this.color)
        .attr('stroke', 'white')
      let n = Math.ceil(Math.log(simulation.alphaMin()) / Math.log(1 - simulation.alphaDecay()))
      for(let i=0; i < n; ++i) {
        simulation.tick()
      }
      simulation.restart()
      function ticked() {
        links
          .attr("x1", function(d) { return d.source.x })
          .attr("y1", function(d) { return d.source.y })
          .attr("x2", function(d) { return d.target.x })
          .attr("y2", function(d) { return d.target.y })
          .style("stroke", (d, i) =>{
            if(vm.directData.indexOf(d.source.fileid+'|'+d.target.fileid) != -1 && 
              vm.directData.indexOf(d.target.fileid+'|'+d.source.fileid) != -1){
              return '#525252'
            }
            subSvg.select('#'+divID+'linear-gradient'+i)
              .attr('x1', d.source.x)
              .attr('y1', d.source.y)
              .attr('x2', d.target.x)
              .attr('y2', d.target.y)
            return 'url(#'+divID+'linear-gradient'+i+')'
          })
        nodes
          .attr("cx", function(d) { return d.x })
          .attr("cy", function(d) { return d.y })
      }
    }
  },
  watch: {
  },
  created() {
    const requiredData = ['graphData', 'filesDist', 'root', 'filesList', 'maxDepth']
    let cnt = 0
    requiredData.forEach(d => {
      this.$watch(d, val => {
        if(val) cnt++
        if(cnt === requiredData.length) {
          this.$axios.get('files/getDirect', {
          }).then(({data}) =>{
            this.directData = data
            this.depth = this.maxDepth
            this.draw(this.graphData)
            this.numLinks = this.graphData.links.length
            this.numNodes = this.graphData.nodes.length 
          })
        }
      })
    })
  },
  updated() {
    // console.log('updated')
  },
  mounted() {
    this.svgWidth = Math.floor(this.$refs.root1.clientWidth)
    this.svgHeight = Math.floor(this.$refs.root1.clientHeight)
    this.svg = d3.select('.main-div').append("svg")
      .attr("width", this.svgWidth)
      .attr("height", this.svgHeight)
    this.subSvgWidth = Math.floor(this.$refs.root2.clientWidth)
    this.subSvgHeight = Math.floor(this.$refs.root2.clientHeight)
    this.$bus.$on('path-selected', d=> {
      if(this.depth != this.maxDepth)
        return
      let pathid = parseInt(d)
      this.$axios.get('files/getPathInfoById', {
        id: pathid
      }).then(({ data }) => {
        this.resetState()
        this.pathSelected = true
        this.svg
          .append("defs")
          .append("marker")
          .attr('class', 'path-arrow')
          .attr("id", "detail-path-arrow")
          .attr("viewBox", "5 -5 20 20")
          .attr("refX", 0)
          .attr('refY', 0)
          .attr("markerWidth", 15)
          .attr("markerHeight", 15)
          .attr('orient', 'auto')
          .append("path")
          .attr("d", "M15,-5L15,5L5,0")
        let path = data.path
        if(d.type !== 'long'){
          path.push(path[0])
        }
        this.nodes.attr('opacity', 0.05).attr('r', this.defaultR)
        this.links.attr('opacity', 0.05).attr('stroke-width', 0.3)
          .attr("marker-start",null);
        this.nodes.filter(node =>path.indexOf(node.fileid) !== -1)
          .attr('fill',this.colorMap[data.type])
          .attr('r', 4)
          .attr('opacity', 1)
        for(let i=0; i< path.length - 1; i++){
          this.links.filter(link =>link.source.fileid === path[i] && link.target.fileid === path[i+1])
            .attr('opacity', 1)
            .attr('stroke-width', 1)
            .attr("marker-start","url(#detail-path-arrow)");
        }
      })
    })
    this.$bus.$on('path-restored', () =>{
      if(this.depth != this.maxDepth)
        return
      this.resetState()
    })
    this.$bus.$on('fileid-restored', () => {
      if(this.depth != this.maxDepth)
        return
      this.resetState()
    })
    this.$bus.$on('depth-selected', d =>{
      this.depth = d
      this.updateGraph(this.depth)
      // if(this.depth === 1)
      //   this.links.attr('stroke-width', 1)
    })
    this.$bus.$on('fileid-selected', d =>{
      if(this.depth != this.maxDepth)
        return
      if(this.pathSelected)
        return 
      this.resetState()
      this.isSelected = true
      // 颜色色卡
      var a = d3.rgb(165,0,38), b = d3.rgb(253,174,97)
      var compute = d3.interpolate(a, b)
      function up(x, y) {return x.val -y.val}
      // 显示相似节点
      let dist = this.filesDist.filter(dist => parseInt(dist.id) === d.fileid)[0],
        fileid = [], val = []
      this.obj = []
      for(var key in dist)
        this.obj.push({key: key, val: dist[key]})
      this.obj.sort(up)
      for(let i=0; i<this.num+1; i++){
        fileid.push(parseInt(this.obj[i].key))
        val.push(parseFloat(this.obj[i].val))
      }
      var linear = d3.scaleLinear().domain([Math.min(...val), Math.max(...val)]).range([0, 1])
      fileid.forEach((id, i) =>{
        this.nodes.filter(node => node.fileid === id)
          .attr('fill', compute(linear(val[i])))
          .attr('r', 4)
      })
      // 当前点击节点的半径最大
      this.selectId = d.fileid
      this.nodes.filter(node => node.fileid === d.fileid).attr('r', 6)
      // 绘制子图
      this.$axios.get('files/getSubGraphData', {
        fileid: d.fileid
      }).then(({ data }) => {
        var subGraphData = data.subGraph
        this.drawSubGraph('selected', d.fileid, subGraphData)
      })
      this.type = 'file'
      if(this.libName === 'vue')
        this.path = this.filesList[d.fileid]
          .replace(/E:\\Workspace\\Visualization\\srcCodeHelperServer\\data\\vue\\src\\/g, '')
      if(this.libName === 'd3')
        this.path = this.filesList[d.fileid]
          .replace(/E:\\Workspace\\Visualization\\srcCodeHelperServer\\data\\d3\\src\\/g, '')
    })
    this.$bus.$on('similar-number-selected', d => {
      this.num = d
      if(this.isSelected){
        // 还原初始半径和颜色
        this.nodes.attr('fill', this.color)
          .attr('r', this.defaultR)
        var fileid = [], val = []
        for(let i=0; i<this.num+1; i++){
          fileid.push(parseInt(this.obj[i].key))
          val.push(parseFloat(this.obj[i].val))
        }
        // 颜色色卡
        var a = d3.rgb(165,0,38), b = d3.rgb(253,174,97)
        var compute = d3.interpolate(a, b)
        var linear = d3.scaleLinear().domain([Math.min(...val), Math.max(...val)]).range([0, 1])
        fileid.forEach((id, i) =>{
          this.nodes.filter(node => node.fileid === id)
            .attr('fill', compute(linear(val[i])))
            .attr('r', 4)
        })
        this.nodes.filter(node => node.fileid === this.selectId).attr('r', 6)
      }
    })
  }
}

</script>
<style type="text/css" lang="scss">
.dep-path {
  height: 100%;
  display: flex;
  .main-div{
    flex: 3;
    width: 100%;
  }
  .sub-div{
    flex: 1;
    width: 100%;
    display: flex;
    flex-direction: column;
    .info-div{
      flex: 0.5;
      font-size: 14px;
      margin-top: 10px;
      display: flex;
      flex-direction: column;
      span{ 
        width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-bottom: 3px;
      }
    }
    .compared-div,.subgraph-div{
      flex: 1;
      border: 1px solid lightgray;
      border-radius: 5px;
      margin-right: 5px;
      margin-bottom: 5px;
      display: flex;
      flex-direction: column;
      .header{
        flex: 1;
        background-color:rgb(245, 245, 245);
        font-size: 14px;
        .title{
          text-align: center;
          padding-top: 3px;
        }
      }
      .subgraph-content{
        flex: 9;
      }
    }
  }
}
</style>
