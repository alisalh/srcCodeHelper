<template>
  <div class="dep-hell-wrapper bl-card-shadow" ref="root">
    <svg ref="svg">
      <!-- <g class="legend-wrapper" :style="{transform:`translateX(${(svgWidth-legendWrapperWidth)/2}px)`}">
        <g :style="{transform:`translate(${idx*(legend.width+legendLabelLen+20)}px,20px)`}" v-for="(val,key,idx) in colorMap">
          <rect :width="legend.width" :height="legend.height" :fill="val" rx="5" ry="5" @click="toggleType(idx)" :class="{'disabled-type':!typeStatus[idx]}"></rect>
          <text :textLength="legendLabelLen" :x="legend.width+3" :y="legend.height/2" lengthAdjust="spacingAndGlyphs" alignment-baseline="central">{{key}}</text>
        </g>
      </g> -->
    </svg>
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
      legendLabelLen: 60,
      legend: {
        width: 50,
        height: 20,
      },
      legendInnerPadding: 3,
      legendOuterPadding: 20,
      lenTreshold: 0,
      typeStatus: [true, true, true], //indicates whether corresponding type(dep link and rect style) is visible or not
      depLinkGroupG: null,
      longestDepLen: 99999,
      hierarchyHiehgt: 110,
      stackHeight: 30,
      fileDepInfo: null // store dep info for each file
    }
  },
  props: ['root', 'colorMap'],
  updated() {
    console.log("dephellwrapper updated")
    console.log('root in dephell updated')
  },
  computed: {
    dendrogramR() { return Math.min(this.svgWidth, this.svgHeight) / 2 - 130 },
    legendWrapperWidth() {
      let num = Object.keys(this.colorMap).length
      return (this.legend.width + this.legendInnerPadding + this.legendLabelLen) * num + (this.legendOuterPadding) * (num - 1)
    }
  },
  methods: {
    toggleType(idx) {
      // splice替换元素值
      this.typeStatus.splice(idx, 1, !this.typeStatus[idx])
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

      var svg = this.centerSvg.append("g")

      //partition the tree and attach additional attr on root as well as its descendants
      var node = svg.selectAll(".hierarchy-node").data(partition(this.root).descendants().slice(1)).enter().append("g")
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
          return '#e5d8bd' 
        })
        .each((d, i) => {
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
    drawDendrogram() {
      let vm = this
      let svg=this.centerSvg.append("g")
      var cluster = d3.cluster()
        .size([360, this.dendrogramR]).separation(() => 1);
      cluster(this.root)
      return 
           var link = svg.append("g").attr("class", "dendrogram-links").selectAll(".link")
              .data(this.root.descendants().slice(1))
              .enter().append("path")
              .attr("class", "link")
              .attr("d", function(d) {
                return "M" + project(d.x, d.y) +
                  "C" + project(d.x, (d.y + d.parent.y) / 2) +
                  " " + project(d.parent.x, (d.y + d.parent.y) / 2) +
                  " " + project(d.parent.x, d.parent.y);
              });

            var node = svg.append("g").attr("class", "dendrogram-nodes").selectAll(".node")
              .data(this.root.descendants())
              .enter().append("g")
              .attr("class", function(d) { return "node" + (d.children ? " node--internal" : " node--leaf"); })
              .attr("transform", function(d) { return "translate(" + project(d.x, d.y) + ")"; });

           node.append("circle")
              .attr("r", 2.5)

            node.append("title").text(d => d.data.name)
            node.append("text")
              .attr("dy", "0.31em")

      function project(x, y) {
        var angle = (x - 90) / 180 * Math.PI,
          radius = y;
        return [radius * Math.cos(angle), radius * Math.sin(angle)];
      }
    },
    drawDepLinks() {
      let data = this.badDeps.slice()
      let longGroup = data.find(d => d.type === 'long'),
        svg = this.centerSvg.append("g")
        .attr("class", "dep-link-wrapper"),
        vm = this
      let depLink = svg.append("g").attr("class", "dep-links-group").selectAll(".dep-links-group")
      var line = d3.radialLine()
        .curve(d3.curveBundle.beta(0.85))
        .radius(function(d) { return d.y; })
        .angle(function(d) { return d.x / 180 * Math.PI; });

      this.depLinkGroupG = depLink.data(data).enter().append("g")
        .attr("class", d => `dep-links-group__${d.type}`)
      this.depLinkGroupG.selectAll(".dep-link")
        .data(d => extractShortesPath(d.paths))
        .enter().append("path")
        .each(function(d) { d.source = d[0], d.target = d[d.length - 1]; })
        .attr("class", "dep-link")
        .attr("d", line)
      //extract shortest paht between each node in paths to achieve edge bundling
      function extractShortesPath(paths) {
        let nodes = vm.root.leaves()
        var map = {},
          shortestPathArr = [];
        // Compute a map from name to node.
        nodes.forEach(function(d) {
          map[d.data.name] = d;
        });

        // For each path, construct a link from the source to target node.
        paths.forEach(function({ path }) {
          path.reduce(function(a, b) {
              try{
                shortestPathArr.push(map[a].path(map[b]))
              }
              catch(e){
                console.log(path)
              }
              // shortestPathArr.push(map[a].path(map[b]))
            return b
          })
        })
        return shortestPathArr
      }
    },
    drawRadialStack() {
      //get StackData from badDeps
      let keys = ['long', 'indirect', 'direct'].map(d => `${d}-count`),
        stack = d3.stack().keys(keys)
      this.fileDepInfo = []
      this.root.leaves().forEach(node => {
        let fileName = node.data.name,
          stackItem = { fileName }
        for (let dep of this.badDeps) {
          let type = dep.type,
            paths = dep.paths,
            filteredDeps = paths.filter(d => d.path.indexOf(fileName) !== -1 && d.path.length >= this.lenTreshold)  //筛选包含此文件的路径
          stackItem[`${type}-paths`] = filteredDeps
          stackItem[`${type}-count`] = Math.log(filteredDeps.length+1)
        }
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

      this.centerSvg.select('.radial-stack').remove()
      let seiresG = this.centerSvg.append("g")
        .attr("class", "radial-stack")
        .selectAll("g").data(series).enter().append('g').attr("class", 'seires')
        .attr("fill", (d, i) => {
          let type = keys[i].split('-')[0]
          return this.colorMap[type]
        })
      seiresG.selectAll('g').data(d => d).enter().append('path').attr('d', arc)

    },
    initSvg() {
      this.svg = d3.select(".dep-hell-wrapper svg")
      this.centerSvg = d3.select(".dep-hell-wrapper svg .center-g")
    }
  },
  watch: {
    //show whether particular dep-link-group is visible according to status
    typeStatus(status) {
      this.depLinkGroupG.attr('stroke-opacity', (d, idx) => {
        if (status[idx])
          return 0.3
        else
          return 0
      })
    },
    // badDeps(val) {
    //   if (val) {
    //     this.initSvg()
    //     // this.drawDendrogram()
    //     this.drawHierachy()
    //     // this.drawRadialStack()
    //     // this.drawDepLinks()
    //   }
    // }
  },
  mounted() {
    this.svgWidth = Math.floor(this.$refs.root.clientWidth)
    this.svgHeight = Math.floor(this.$refs.root.clientHeight)
    // Todo:目前需要手动减10
    d3.select(".dep-hell-wrapper svg").attr("width", this.svgWidth).attr("height", this.svgHeight)
      .append("g").attr("class", "center-g")
      .attr("transform", "translate(" + this.svgWidth / 2 + "," + (this.svgHeight / 2) + ")")
    this.$bus.$on('threshold-selected', d =>{
      this.lenTreshold = d
      // this.drawRadialStack()
    })
  }
}

</script>
<style type="text/css" lang="scss">
.dep-hell-wrapper {
  .legend-wrapper {
    rect.disabled-type {
      fill: grey;
    }
  }
  .hierarchy-node {
    &:hover {
      transform: translate(20);
    }
  }
  .dendrogram-links {
    path {
      stroke: steelblue;
      stroke-opacity: 1.0;
      fill: none;
      pointer-events: none;
    }
  }
  .dendrogram-nodes {
    opacity: 1.0;
  }
  /*   .dep-link {
    stroke: red;
    stroke-opacity: 0.4;
    fill: none;
    pointer-events: none;
  } */
  .dep-links-group {
    stroke-width: 4px;
    fill: none; 
    .dep-links-group__indirect {
      path {
        stroke: #66c2a5;
      }
    }
    .dep-links-group__direct {
      path {
        stroke: #377eb8;
      }
    }
    .dep-links-group__long {
      path {
        stroke: #d53e4f;
      }
    }
  }
}

</style>
