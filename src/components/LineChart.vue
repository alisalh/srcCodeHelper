<template>
  <div id='line-chart-wrapper' class="bl-card-shadow">
    <div class="line-chart" ref="root">
      <svg></svg>
    </div>
    <!-- <div class="control-panel">
      <div class="control-len-threshold">
        <span class="label">Length Treshold</span>
        <el-slider v-model="lenThreshold" :min="0" :max='maxLen' @change="filterLongDep" show-input :show-input-controls="false">
        </el-slider>
      </div>
    </div> -->
  </div>
</template>
<script type="text/javascript">
import * as d3 from 'd3'
export default {
  data() {
    return {
      svgWidth: null,
      svgHeight: null,
      chartData: []
    }
  },
  props: ["lenDis",'lenThreshold','maxLen'],
  mounted() {
    this.svgWidth = Math.floor(this.$refs.root.clientWidth)
    this.svgHeight = Math.floor(this.$refs.root.clientHeight)
    // d3.select(this.$refs.root).attr("width", this.svgWidth).attr("height", this.svgHeight)
    console.log(this.svgWidth, this.svgHeight, this.lenDis)
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
    },
    filterLongDep(val){
      this.$emit('filterLongDep',val)
    },
    draw() {
      d3.select('.line-chart>svg *').remove()
      var svg = d3.select(".line-chart svg"),
        margin = { top: 20, right: 30, bottom: 30, left: 50 },
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
        .call(d3.axisBottom(x));

      g.append("g")
        .attr("class", "axis axis--y")
        .call(d3.axisLeft(y).ticks(5, 's'))

      g.append("path").datum(this.chartData).attr("d", line)
        .attr("class", "line")
      
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
        })
    }
  }
}

</script>
<style type="text/css" lang="scss">
@import "../assets/reset.scss";
#line-chart-wrapper {
  .line-chart {
    flex: auto;
    svg {
      width: 100%;
      height: 100%;
      // .axis--y path {
      //   display: none;
      // }
      .line {
        fill: none;
        stroke: steelblue;
        stroke-width: 1.5px;
      }
    }
  }
  // .control-panel {
  //   flex: none;
  //   padding: 0 20px;
  //   border-top:1px solid #ebeef5;
  //   .control-len-threshold {
  //     .label {
  //       line-height: 40px;
  //       font-weight: bold;
  //     }
  //     .el-slider {
  //       width: 70%;
  //       float: right;
  //     }
  //   }
  // }
}

</style>
