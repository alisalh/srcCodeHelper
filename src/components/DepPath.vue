<template>
  <div ref="root" class="dep-path">
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
      color: '#d9d9d9',
      svgWidth: 0,
      svgHeight: 0,
      isSelected: false,
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
    drawLinkMark(){
      let r = 3, color = 'grey'
      let markG = this.svg.append('g')
        .attr('class', 'link-mark')
        .attr('transform', 'translate(40,'+(this.svgHeight-40)+')')
      markG.append('circle')
        .attr('r', r)
        .style('fill', color)
      markG.append('circle')
        .attr('r', r)
        .attr('cx', '3em')
        .style('fill', color)
      markG.append('circle')
        .attr('r', r)
        .attr('cy', '1.2em')
        .style('fill', color)
      markG.append('circle')
        .attr('r', r)
        .attr('cy', '1.2em')
        .attr('cx', '3em')
        .style('fill', color)
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
      // 保留graphData的完整数据, 用于还原grah
      // 复制node
      this.graphData.nodes.forEach(node => {
        newGraphData.nodes.push({fileid: node.fileid, depended: node.depended, depending: node.depending, 
                                badDepNum: node.badDepNum, r: node.r, x: node.x, y: node.y})
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
        // 保留在当前层的文件节点
        newGraphData.nodes = newGraphData.nodes.filter(d => fileids.indexOf(d.fileid) === -1)
        //加入当前文件夹节点
        newGraphData.nodes.push({fileid: node.data.name, size: fileids.length, depended: depended, 
                            depending: depending, r: fileids.length/10+this.defaultR+5, x: x, y: y})
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
      d3.select('.dep-path').selectAll('svg *').remove()
      this.drawLinkMark()
      let vm = this
      var simulation
      if(this.libName === 'vue'){
        simulation = d3.forceSimulation()
          .force("link", d3.forceLink().id(function(d) { return d.fileid; }))
          .force("charge", d3.forceManyBody().strength(-200).distanceMin(50).distanceMax(130))
          .force("center", d3.forceCenter(this.svgHeight  / 2, this.svgWidth/ 2))
          .force('collision', d3.forceCollide().radius(function(d) { return d.r*2 + 10 }))
          .stop()
      }
     if(this.libName === 'd3'){
        simulation = d3.forceSimulation()
          .force("link", d3.forceLink().id(function(d) { return d.fileid }))
          .force("charge", d3.forceManyBody().strength(-90).distanceMin(20).distanceMax(80))
          .force("center", d3.forceCenter(this.svgHeight / 2 - 25, this.svgWidth / 2 - 20))
          .force('collision', d3.forceCollide().radius(function(d) { return 10 }))
      }
      simulation
        .nodes(data.nodes)
        .on("tick", ticked);
      simulation.force("link")
        .links(data.links)

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
              .attr('id', 'link-gradient'+i)
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
            return 'url(#link-gradient'+i+')'
          }
        })
        .attr("stroke-width", d => {
          return 0.3
        })
     
      // 颜色色卡
      var a = d3.rgb(165,0,38), b = d3.rgb(253,174,97)
      var computeNode = d3.interpolate(a, b)
      function up(x, y) {return x.val -y.val}
      this.nodes = this.svg.append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(data.nodes)
        .enter().append("circle")
        .attr('id', d => 'circle'+d.index)
        .attr("r", d => d.r)
        .attr("fill", this.color)
        .attr('stroke', 'white')
        .on('click', (d) => {
          if(this.depth === this.maxDepth){
            this.$bus.$emit('file-selected', this.filesList[d.fileid])
            this.$bus.$emit('graph-fileid-selected', d.fileid)
            // 无选中节点
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
              var linearNode = d3.scaleLinear().domain([Math.min(...val), Math.max(...val)]).range([0, 1])
              fileid.forEach((id, i) =>{
                this.nodes.filter(node => node.fileid === id)
                  .attr('fill', computeNode(linearNode(val[i])))
              })
            }
            if(!this.pathSelected){
              d3.selectAll('.select-marker').remove()
              // 绘制箭头
              this.svg.append('g')
                .attr('class', 'select-marker')
                .attr("viewBox", "5 -5 20 20")
                .attr("refX", 0)
                .attr('refY', 0)
                .attr("markerWidth", 15)
                .attr("markerHeight", 15)
                .attr('orient', 'auto')
                .append("path")
                .attr("d", "M15,-5L15,5L5,0")
                .attr('transform', 'translate('+d.y+','+d.x+') rotate(90)')
            }            
            if(this.pathSelected){
              this.svg.append('text')
                .attr('class','path-text')
                .text(this.filesList[d.fileid].substr(this.filesList[d.fileid].lastIndexOf('\\')+1))
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
        .on('mouseover', d => {
          if(!this.pathSelected)
            this.links.filter(link => link.source.fileid === d.fileid || link.target.fileid === d.fileid)
              .attr('stroke-width', 2)
        })
        .on('mouseout', d => {
          if(!this.pathSelected)
            this.links.attr('stroke-width', 0.3)
        })
     
      // 颜色色卡
      var c = d3.rgb(158,202,225), d = d3.rgb(8,81,156)
      var computeArc = d3.interpolate(c, d)
      var linearArc = d3.scaleLinear().domain([1, this.maxDepended]).range([0, 1])
      // 插入arcs
      var arc = d3.arc()
        .outerRadius(this.defaultR+2.5)
        .innerRadius(this.defaultR-0.5)
        .startAngle(0)
        .endAngle(Math.PI*2)
      this.arcs = this.svg.append('g')
        .attr("class", "arcs")
        .selectAll(".arcs")
        .data(data.nodes.filter(d=>!d.size))
        .enter().append("path")
        .attr('d', arc)
        .attr('fill', d => {
          if(d.depended === 0)
            return '#bdbdbd'
          return computeArc(linearArc(d.depended))
        })
        .attr('transform', d => 'translate('+ d.y + ',' + d.x +')')
      
      this.svg.on('click', ()=>{
        if(this.depth === this.maxDepth){
          this.resetState()
          this.$bus.$emit('graph-fileid-selected', null)
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
     
      // 停止动画
      let n = Math.ceil(Math.log(simulation.alphaMin()) / Math.log(1 - simulation.alphaDecay()))
      for(let i=0; i < n; ++i) {
        simulation.tick()
      }
      simulation.restart()
      function ticked() {
        vm.nodes
          .attr("cx", function(d) { return boundX(d.y) })
          .attr("cy", function(d) { return boundX(d.x) })
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
              vm.svg.select('#link-gradient'+i)
                .attr('x1', boundX(d.source.y))
                .attr('y1', boundY(d.source.x))
                .attr('x2', boundX(d.target.y))
                .attr('y2', boundY(d.target.x))
              return 'url(#link-gradient'+i+')'
            }
          })
        vm.arcs
          .attr('transform', d => 'translate('+ d.y + ',' + d.x +')')
      }
    },
    resetState(){
      this.nodes.attr('fill', this.color)
        .attr('r', this.defaultR)
        .attr('opacity', 1)
        .on('mouseover', d => {
          if(!this.pathSelected)
            this.links.filter(link => link.source.fileid === d.fileid || link.target.fileid === d.fileid)
              .attr('stroke-width', 2)
        })
        .on('mouseout', d => {
          if(!this.pathSelected)
            this.links.attr('stroke-width', 0.3)
        })
      this.svg.select('.path-arrow').remove()
      this.links.attr('opacity', 1).attr('stroke-width', 0.3)
      this.isSelected = false
      this.pathSelected = false
      this.obj = null
      this.arcs.attr('opacity', 1)
      d3.selectAll('.path-text').remove()
      d3.selectAll('.select-marker').remove()
    },
  },
  watch: {
    dependType(val){
      // 颜色色卡
      var c = d3.rgb(158,202,225), d = d3.rgb(8,81,156)
      var computeArc = d3.interpolate(c, d)
      if(val === '1'){
        let linearArc = d3.scaleLinear().domain([1, this.maxDepended]).range([0, 1])
        this.arcs.attr('fill', d =>{
          if(d.depended === 0)
            return '#bdbdbd'
          return computeArc(linearArc(d.depended))
        }) 
      }
      if(val === '2'){
        let linearArc = d3.scaleLinear().domain([1, this.maxDepending]).range([0, 1])
        this.arcs.attr('fill', d => {
          if(d.depending === 0)
            return '#bdbdbd'
          return computeArc(linearArc(d.depending))
        })
      }
    }
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
            let badDepNum = this.badDeps[node.fileid].indirect + this.badDeps[node.fileid].direct
            node['badDepNum'] = badDepNum
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
    this.svg = d3.select('.dep-path').append("svg")
      .attr("width", this.svgWidth)
      .attr("height", this.svgHeight)
    // 圆环编码数据
    this.$bus.$on('dependData', data =>{
      this.depended = data.depended,
      this.depending = data.depending,
      this.maxDepending = data.maxDepending,
      this.maxDepended = data.maxDepended
    })
    // 圆环类型切换
    this.$bus.$on('depend-type-selected', d =>{
      this.dependType = d
    })
    // 获取每个文件的坏依赖数目
    this.$axios.get('files/getStackData', {
    }).then(({ data }) => {
      this.badDeps = data
    })
    this.$bus.$on('path-selected', d=> {
      if(this.depth != this.maxDepth)
        return
      if(d.length === 0) this.resetState()
      else{
        this.$axios.get('files/getPathInfoById', {
          ids: d
        }).then(({ data }) => {
          this.resetState()
          this.pathSelected = true
          this.nodes.attr('opacity', 0.05).attr('r', this.defaultR)
          this.links.attr('opacity', 0.05).attr('stroke-width', 0.3)
          this.arcs.attr('opacity', 0.05)
          for(let i=0; i<data.length; i++){
            let path = data[i].path
            if(d.type !== 'long'){
              path.push(path[0])
            }
            this.nodes.filter(node =>path.indexOf(node.fileid) !== -1)
              .attr('fill',this.colorMap[data[i].type])
              .attr('r', this.defaultR+2)
              .attr('opacity', 1)
              .on('mouseover', d => {
                if(data.length === 1)
                  this.$bus.$emit('bad-fileid-selected', d.fileid)
              })
              .on('mouseout', d => {
                if(data.length === 1)
                  this.$bus.$emit('bad-fileid-selected', null)
              })
            for(let i=0; i< path.length - 1; i++){
              this.links.filter(link =>link.source.fileid === path[i] && link.target.fileid === path[i+1])
                .attr('opacity', 1)
                .attr('stroke-width', 1)
            }
          }
        })
      }
    })
    this.$bus.$on('depth-selected', d =>{
      this.depth = d
      this.updateGraph(this.depth)
    })
    this.$bus.$on('sunburst-fileid-selected', d =>{
      if(this.depth != this.maxDepth)
        return
      if(this.pathSelected)
        return 
      this.resetState()
      if(d){
        let curNode = this.nodes.filter(node=>node.fileid===d)
        this.svg.append('g')
          .attr('class', 'select-marker')
          .attr("viewBox", "5 -5 20 20")
          .attr("refX", 0)
          .attr('refY', 0)
          .attr("markerWidth", 15)
          .attr("markerHeight", 15)
          .attr('orient', 'auto')
          .append("path")
          .attr("d", "M15,-5L15,5L5,0")
          .attr('transform', 'translate('+curNode.attr('cx')+','+curNode.attr('cy')+') rotate(90)')
        this.isSelected = true
        // 颜色色卡
        var a = d3.rgb(165,0,38), b = d3.rgb(253,174,97)
        var compute = d3.interpolate(a, b)
        function up(x, y) {return x.val -y.val}
        // 显示相似节点
        let dist = this.filesDist.filter(dist => parseInt(dist.id) === d)[0],
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
        })
      }
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
        })
      }
    })
  }
}
</script>
<style type="text/css" lang="scss">
.dep-path {
  height: 100%;
}
</style>