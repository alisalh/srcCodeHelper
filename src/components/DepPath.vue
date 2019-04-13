<template>
  <div ref="root" class="dep-path">
  </div>
</template>
<script type="text/javascript">
import * as d3 from 'd3'

export default {
  data() {
    return {
      graphData: {},
      svg: null,
      nodes: null,
      links: null,
      defaultR: 5,
      svgWidth: 0,
      svgHeight: 0,
      depData: null,
      color: '#fff5e2'
    }
  },
  props:['badDeps', 'filesInfo', 'filesDist'],
  methods: {
    dataAdapter() {
      this.depData = []
      let longPaths = this.badDeps[0].paths,
        indirectPaths = this.badDeps[1].paths,
        directPaths = this.badDeps[2].paths
      let num = 0
      longPaths.forEach(item => {
        item.id = num
        this.depData.push(item)
        num += 1
      })
      indirectPaths.forEach(item => {
        item.id = num
        this.depData.push(item)
        num += 1
      })
      directPaths.forEach(item => {
        item.id = num
        this.depData.push(item)
        num += 1
      })
      let nodes = new Set(),
        links = new Set()
      this.depData.forEach(d => {
        for (let i = 0; i < d.path.length - 1; i++) {
          nodes.add(d.path[i]) //add node
          links.add(d.path[i] + '|' + d.path[i + 1]) //add link('|' is used as conjunction to connect the two nodes)
        }
        //we need to connect the last node and the first node in type 'indirect'
        if (d.type === 'indirect')
          links.add(d.path[d.path.length - 1] + '|' + d.path[0])
        nodes.add(d.path[d.path.length - 1]) // do not miss the last node
      })
      this.graphData.nodes = [...nodes].map(d => ({ 
        id: d, 
        fileid: this.filesInfo.filter(file => file.name === d)[0].id}))
      this.graphData.links = [...links].map(function(d) {
      let parts = d.split('|')
        return { source: parts[0], target: parts[1] }
      })
    },
    resetAllStyle() {
      this.nodes.attr("stroke-dasharray", null).attr("r", this.defaultR)
      this.links.attr("stroke-dasharray", null)
    },
    draw() {
      d3.select(this.$refs.root).selectAll('svg *').remove()
      // console.log(d3.select(this.$refs.root).selectAll('svg *'))
      let vm = this

      var simulation
      // 小于200表示vue
      if(this.graphData.nodes.length < 200){
        simulation = d3.forceSimulation()
          .force("link", d3.forceLink().id(function(d) { return d.id; }))
          .force("charge", d3.forceManyBody().strength(-200).distanceMin(30).distanceMax(100))
          .force("center", d3.forceCenter(this.svgHeight  / 2, this.svgWidth/ 2 - 140))
          .force('collision', d3.forceCollide().radius(function(d) { return 10 }))
      }
      else{
        simulation = d3.forceSimulation()
          .force("link", d3.forceLink().id(function(d) { return d.id }))
          .force("charge", d3.forceManyBody().strength(-100).distanceMin(20).distanceMax(80))
          .force("center", d3.forceCenter(this.svgHeight / 2 - 20, this.svgWidth / 2 - 140  ))
          .force('collision', d3.forceCollide().radius(function(d) { return 10 }))
      }

      simulation
        .nodes(this.graphData.nodes)
        .on("tick", ticked);

      simulation.force("link")
        .links(this.graphData.links)

      // 颜色色卡
      var a = d3.rgb(165,0,38), b = d3.rgb(253,174,97)
      var compute = d3.interpolate(a, b)
      function up(x, y) {return x.val -y.val}

      this.links = this.svg.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(this.graphData.links)
        .enter().append("line")
        .style("stroke", (d, i) =>{
          let linearGradient = this.svg.append('defs')
            .append('linearGradient')
            .attr('id', 'linear-gradient'+i)
            .attr('gradientUnits','userSpaceOnUse')
            .attr('x1', boundX(d.source.y))
            .attr('y1', boundY(d.source.x))
            .attr('x2', boundX(d.target.y))
            .attr('y2', boundY(d.target.x))
          // for(let i=0; i< this.graphData.links.length; i++){
          //   if((this.graphData.links[i].source === d.target)
          //     &&(this.graphData.links[i].target === d.source)){
          //      return '#525252'
          //   }
          // }
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
        })
        .attr('stroke-opacity', 0.5)
        .attr("stroke-width", d => {
          // for(let i=0; i< this.graphData.links.length; i++){
          //   if((this.graphData.links[i].source === d.target)
          //     &&(this.graphData.links[i].target === d.source))
          //       return 3
          // }
          return 1
        })

      this.nodes = this.svg.append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(this.graphData.nodes)
        .enter().append("circle")
        .attr("r", this.defaultR)
        .attr("fill", this.color)
        .attr('stroke', '#bdbdbd')
        .on('click', (d) => {
          resetState()
          // 点击节点显示相似节点
          let dist = this.filesDist.filter(dist => parseInt(dist.id) === d.fileid)[0],
                obj = [], fileid = [], val = []
          for(var key in dist)
            obj.push({key: key, val: dist[key]})
          obj.sort(up)
          for(let i=0; i<obj.length/2; i++){
            fileid.push(parseInt(obj[i].key))
            val.push(parseFloat(obj[i].val))
          }
          var linear = d3.scaleLinear().domain([Math.min(...val), Math.max(...val)]).range([0, 1])
          fileid.forEach((d, i) =>{
            this.nodes.filter(node => node.fileid === d)
              .attr('fill', compute(linear(val[i])))
          })
          d3.event.stopPropagation()
        })
        // .call(d3.drag()
        //   .on("start", dragstarted)
        //   .on("drag", dragged)
        //   .on("end", dragended))
      
      this.svg.on('click', ()=>{
        resetState()
      })
      this.nodes.append("title")
        .text(function(d) { return d.id; })

      function boundX(d){
        if(d < 0)
          d = 10
        if(d > vm.svgWidth)
          d = vm.svgWidth - 10
        return d
      }
      function boundY(d){
        if(d < 0)
          d = 10
        if(d > vm.svgHeight)
          d = vm.svgHeight - 10
        return d
      }
      function ticked() {
        vm.links
          .attr("x1", function(d) { return boundX(d.source.y) })
          .attr("y1", function(d) { return boundY(d.source.x) })
          .attr("x2", function(d) { return boundX(d.target.y) })
          .attr("y2", function(d) { return boundY(d.target.x) })
          .style("stroke", (d, i) =>{
            // for(let i=0; i< vm.graphData.links.length; i++){
            //   if((vm.graphData.links[i].source === d.target)
            //     &&(vm.graphData.links[i].target === d.source)){
            //     return '#525252'
            //   }
            // }
            vm.svg.select('#linear-gradient'+i)
              .attr('x1', boundX(d.source.y))
              .attr('y1', boundY(d.source.x))
              .attr('x2', boundX(d.target.y))
              .attr('y2', boundY(d.target.x))
            return 'url(#linear-gradient'+i+')'
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

      function resetState(){
        vm.nodes.attr('fill', vm.color)
      }

    }
  },
  watch: {
    // badDeps() {
    //   // console.log('depData update')
    //   this.dataAdapter()
    //   this.draw()
    // }
  },
  created() {
    const requiredData = ['badDeps', 'filesInfo', 'filesDist']
    let cnt = 0
    requiredData.forEach(d => {
      this.$watch(d, val => {
        if(val) cnt++
        if(cnt === requiredData.length) {
          console.log('filesInfo', this.filesInfo)
          console.log('filesDist', this.filesDist)
          this.dataAdapter()
          this.draw()
        }
      })
    })
  },
  updated() {
    // console.log('updated')
  },
  mounted() {
    this.svgWidth = Math.floor(this.$refs.root.clientWidth)
    this.svgHeight = Math.floor(this.$refs.root.clientHeight)
    this.svg = d3.select(this.$refs.root).append("svg")
      .attr("width", this.svgWidth)
      .attr("height", this.svgHeight)
    // this.$bus.$on('highlight-dep', dep => {
    //   if (dep.type !== this.type) return
    //   this.resetAllStyle()
    //   let path = dep.path,
    //     nodes = [],
    //     links = []
    //   //nodes and links are extracted from path to highlight the coresponding links and nodes svg
    //   for (let i = 0, len = path.length; i < len - 1; i++) {
    //     nodes.push(path[i])
    //     links.push({ source: path[i], dep: path[i + 1] })
    //   }
    //   //we need to connect the last node and the first node in type 'indirect'
    //   if (this.type === 'indirect')
    //     links.push({ source: path[path.length - 1], dep: path[0] })
    //   nodes.push(path[path.length - 1])

    //   // console.log(nodes,links,this.nodes)

    //   //highlight nodes
    //   this.nodes.filter(function(node) {
    //     return nodes.find(d => d === node.id) !== undefined
    //   }).attr('stroke-dasharray', '2')

    //   //highlight the first and last nodes
    //   this.nodes.filter(node => nodes.findIndex(d => d === node.id) === 0).attr("r", 10)
    //   this.nodes.filter(node => nodes.findIndex(d => d === node.id) === nodes.length - 1).attr("r", 4)

    //   //highlight links
    //   this.links.filter(link => links.find(d => link.source.id === d.source && link.target.id === d.dep) !== undefined)
    //     .attr("stroke-dasharray", '3')
    // })
    // this.dataAdapter()
    // console.log(this.color,this.type,this.depData)
  }
}

</script>
<style type="text/css" lang="scss" scoped>
.dep-path {
  height: 100%;
}
</style>
