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
      defaultR: 4,
      svgWidth: 0,
      svgHeight: 0,
      depData: null,
      color: 'grey'
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

      // 小于200表示vue
      if(this.graphData.nodes.length < 200){
        var simulation = d3.forceSimulation()
        .force("link", d3.forceLink().id(function(d) { return d.id; }))
        .force("charge", d3.forceManyBody().strength(-300).distanceMin(20).distanceMax(100))
        .force("center", d3.forceCenter(this.svgWidth / 2, this.svgHeight / 2))
      }
      else{
         var simulation = d3.forceSimulation()
        .force("link", d3.forceLink().id(function(d) { return d.id; }))
        .force("charge", d3.forceManyBody().strength(-110).distanceMin(20).distanceMax(50))
        .force("center", d3.forceCenter(this.svgWidth / 2, this.svgHeight / 2))
      }

      // 颜色色卡
      var a = d3.rgb(0,68,27), b = d3.rgb(199,233,192)
      var compute = d3.interpolate(a, b)
      
      this.links = this.svg.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(this.graphData.links)
        .enter().append("line")
        .attr("stroke", d => this.color)
        .attr('stroke-opacity', 0.3)
        .attr("stroke-width", function(d) { return 1.5 });

      this.nodes = this.svg.append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(this.graphData.nodes)
        .enter().append("circle")
        .attr("r", this.defaultR)
        .attr("fill", d => {
          // if (d.id === this.fileName)
          //   return '#636363'
          return 'grey'
        })
        .attr('opacity', 0.9)
        // .attr("stroke", "grey")
        // .attr('stroke-opacity',0.2)
        .on('click', (d) => {
          let dist = this.filesDist.filter(dist => parseInt(dist.id) === d.fileid)[0]
          let fileid = [], val = []
          for(var key in dist){
            if(key !== 'id'){
              fileid.push(parseInt(key))
              val.push(parseFloat(dist[key])) 
            }
          }
          var linear = d3.scaleLinear().domain([Math.min(...val), Math.max(...val)]).range([0, 1])
          fileid.forEach((d, i) =>{
            this.nodes.filter(node => node.fileid === d)
              .attr('fill', compute(linear(val[i])))
          })
          d3.event.stopPropagation()
        })
        .call(d3.drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended));
      
      this.svg.on('click', ()=>{
        this.nodes.attr('fill', 'grey')
      })
      this.nodes.append("title")
        .text(function(d) { return d.id; })

      simulation
        .nodes(this.graphData.nodes)
        .on("tick", ticked);

      simulation.force("link")
        .links(this.graphData.links);

      function ticked() {
        vm.links
          .attr("x1", function(d) { return d.source.x; })
          .attr("y1", function(d) { return d.source.y; })
          .attr("x2", function(d) { return d.target.x; })
          .attr("y2", function(d) { return d.target.y; });

        vm.nodes
          .attr("cx", function(d) { return d.x; })
          .attr("cy", function(d) { return d.y; });
      }

      function dragstarted(d) {
        if (!d3.event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      }

      function dragged(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
      }

      function dragended(d) {
        if (!d3.event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
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
