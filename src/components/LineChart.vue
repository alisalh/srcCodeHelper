<template>
  <div class="line-chart" ref="root">
  </div>
</template>
<script type="text/javascript">
import * as d3 from 'd3'
export default {
  data() {
    return {
      svgWidth: null,
      svgHeight: null,
      chartData: [],
      tickValues: []
    }
  },
  props: ["lenDis",'lenThreshold','maxLen'],
  mounted() {
    this.svgWidth = Math.floor(this.$refs.root.clientWidth)
    this.svgHeight = Math.floor(this.$refs.root.clientHeight)
    this.$bus.$on('depth-selected', ()=>{
      d3.select('.areaG >*').remove()
    })
  },
  watch: {
    lenDis(val) {
      if (val) {
        this.dataAdapter()
        this.draw()
      }
    }
  },
  methods: {
    // 用0去插值缺失值
    dataAdapter() {
      this.chartData=[]
      let maxLen = d3.max(Object.keys(this.lenDis), d => parseInt(d))
      for (let i = 0; i <= maxLen; i++) {
        if (this.lenDis[i]) this.chartData.push([i, this.lenDis[i]])
        else this.chartData.push([i, 0])
      }
      for(let i=0; i<=maxLen;){
        this.tickValues.push(i)
        i = i+2
      }
      if(this.tickValues.indexOf(maxLen) === -1)
        this.tickValues.push(maxLen)
    },
    filterLongDep(val){
      this.$emit('filterLongDep',val)
    },
    draw() {
      d3.select('.line-chart>svg *').remove()
      var svg = d3.select(this.$refs.root).append('svg')
        .attr('width', this.svgWidth)
        .attr('height', this.svgHeight),
        margin = { top: 10, right: 60, bottom: 35, left: 35 },
        width = this.svgWidth - margin.left - margin.right,
        height = this.svgHeight - margin.top - margin.bottom,
        g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      var y = d3.scaleLinear().range([height, 0]),
        x = d3.scaleLinear().range([0, width])

      var line = d3.line()
        .curve(d3.curveMonotoneX)
        .x(function(d) { return x(d[0]); })
        .y(function(d) { return y(d[1]); });

      x.domain([0, d3.max(this.chartData, d => d[0])])
      y.domain([0, Math.ceil(d3.max(this.chartData, d => d[1])/1000)*1000])
      g.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x).tickValues(this.tickValues).tickSize(4))

      g.append("g")
        .attr("class", "axis axis--y")
        .call(d3.axisLeft(y).ticks(5, 's').tickSize(4))

      g.append("path").datum(this.chartData).attr("d", line)
        .attr("class", "line")

      //坐标轴文字
      g.append('text').text('Length')
        .attr('x', width + 15)
        .attr('y', this.svgHeight - margin.bottom - 5)
        .attr('font-size', 13)
       g.append('text').text('Number of paths')
        .attr('x', margin.left-20)
        .attr('y', margin.top)
        .attr('font-size', 13)
      
      // 添加定位线
      var area = d3.area()
        .x(function(d) { return x(d[0]); })
        .y1(function(d) { return y(d[1]); })
        .y0(height)
        .curve(d3.curveMonotoneX)
      var areaG =  svg.append('g')
            .attr('class', 'areaG')
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
      let xOffset = 0
      var gridLineG = svg.append('g').attr("transform", "translate(" + margin.left + "," + margin.top + ")")
      gridLineG
        .attr('fill', 'none')
        .attr('stroke-width', 3)
        .attr('stroke-linejoin', 'round')
        .attr('stroke-linecap', 'round')
        .attr('stroke', 'black')
        .attr('stroke-dasharray', '5,5')
        .selectAll('.x-grid-line')
        .data(this.chartData)
        .enter()
        .append('path')
        .attr('class', 'x-grid-line')
        .attr('opacity', 0)
        .attr('d', d => {
          return d3.line()([
            [x(d[0]), y(d[1])],
            [x(d[0]), height]
          ])
        })
        .on('mouseenter', function () {
          d3.select(this).attr('opacity', 0.5)
        })
        .on('mouseout', function () {
          d3.select(this).attr('opacity', 0.0)
        })
        .on('click', d =>{
            areaG.select('.areaG >*').remove()
            areaG.append('path')
            .attr('class', 'area-path')
            .attr('d', area(this.chartData.filter(len => len[0] >= d[0])))
            .attr('fill', 'steelblue')
            .attr('opacity', 0.5)
            d3.event.stopPropagation()
            this.$bus.$emit('threshold-selected', d[0])
        })
       svg.on('click', ()=>{
         areaG.select('.areaG >*').remove()
         this.$bus.$emit('threshold-restored', null)
      })
    }
  }
}

</script>
<style type="text/css" lang="scss">
  .line-chart {
    height: 100%;
    svg {
      .line {
        fill: none;
        stroke: steelblue;
        stroke-width: 1.5px;
      }
    }
}

</style>
