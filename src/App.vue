<template>
  <div id="app">
    <div class="left-panel">
      <div class='control-panel bl-card-shadow'>
        <div class='slider-wrapper depth'>
          <div class='text-div'>Depth</div>
          <div class='slider-div'>
            <el-slider v-model="curDepth" :step="1" 
              show-stops :min="1" :max="6" size="mini">
            </el-slider>
            <el-input v-model="curDepth" size="mini"></el-input>
          </div>
        </div>
        <div class='slider-wrapper number'>
          <div class='text-div'>Number</div>
          <div class='slider-div'>
            <el-slider v-model="similarNum" :step="1"
              :min="1" :max="20" size="mini">
            </el-slider>
            <el-input v-model="similarNum" size="mini"></el-input>
          </div>
        </div>
        <div class='ratio-wrapper'>
          <div class='text-div'>Type</div>
          <div class='ratio-div'>
            <el-radio v-model="isSelected" label="1">Depended</el-radio>
            <el-radio v-model="isSelected" label="2">Depending</el-radio>
          </div>
        </div>
      </div>
      <dep-hell-wrapper :root="treeRoot" :filesInfo="filesInfo" :maxDepth="maxDepth" :colorMap="colorMap">
      </dep-hell-wrapper>
      <scatter-plot :coordinates="coordinates" :colorMap="colorMap"></scatter-plot>
    </div>
    <div class="center-panel">
      <div class="first-row bl-card-shadow">
        <dep-path :graphData="graphData" :filesDist="filesDist" :root="treeRoot" :filesList="filesList" :maxDepth="maxDepth" :colorMap='colorMap'></dep-path>
      </div>
      <div class="second-row bl-card-shadow">
        <parallel-coordinate :filesInfo="filesInfo" class='parallel-coordinate'></parallel-coordinate>
      </div>
    </div>
    <code-chart class="right-panel bl-card-shadow"></code-chart>
  </div>
</template>
<script>
import * as d3 from 'd3'
import HelloWorld from './components/HelloWorld'
import ChordChart from './components/ChordChart.vue'
import DepHellWrapper from './components/DepHellWrapper.vue'
import DepPath from './components/DepPath.vue'
import ParallelCoordinate from './components/ParallelCoordinate.vue'
import Partition from './components/Partition.vue'
import LineChart from './components/LineChart.vue'
import BarChart from './components/BarChart.vue'
import CodeChart from './components/CodeChart.vue'
import ScatterPlot from './components/ScatterPlot.vue'
import Test from './components/test.vue'

export default {
  name: 'App',
  components: {
    HelloWorld,
    ChordChart,
    DepHellWrapper,
    DepPath,
    ParallelCoordinate,
    Partition,
    LineChart,
    BarChart,
    CodeChart,
    ScatterPlot,
    Test
  },
  data() {
    return {
      selectedFileName: 'None',
      treeRoot: null,
      maxDepth: 0,
      curDepth: 6, //vue: 1~6, d3: 2~4
      similarNum: 10,
      isSelected: '1',
      filesInfo: null,
      filesDist: null,
      filesList: null,
      graphData: null,
      coordinates: null,
      dependedData: null,
      dependingData: null,
      colorMap: { long: '#377eb8', indirect: '#66c2a5', direct: '#d53e4f' },
    }
  },
  updated() {
    console.log('app updated');
  },
  watch: {
    curDepth(val){
      if(val)
        this.$bus.$emit('depth-selected', val)
    },
    isSelected(val){
      if(val)
        this.$bus.$emit('depend-type-selected', val)
    },
    similarNum(val){
      if(val)
        this.$bus.$emit('similar-number-selected', val)
    }
  },
  methods: {
    getFilesList(){
      this.$axios.get('files/getFileList', {
        // 暂无参数
      }).then(({data}) => {
        this.filesList = data
      })
    },
    getFolderHierarchy() {
      this.$axios.get('files/getFolderHierarchy', {
        // 暂无参数
      }).then(({ data }) => {
        this.maxDepth = data.maxDepth
        let treeRoot = d3.hierarchy(data.root);
        treeRoot.sum(function(d) {return !d.children && d.type==='file' ? 1 : 0;})
        this.treeRoot = treeRoot
      })
    },
    getFilesInfo(){
       this.$axios.get('files/getFilesInfo', {
        // 暂无参数
      }).then(({ data }) => {
        this.filesInfo = data
      })
    },
    getFilesDist(){
      this.$axios.get('files/getDistance', {
        // 暂无参数
      }).then(({ data }) => {
        this.filesDist = data
      })
    },
    getGraphData(){
      this.$axios.get('files/getGraphData', {
        // 暂无参数
      }).then(({data}) =>{
        this.graphData = data
      })
    },
    partitionDataAdapter(selectedFile) {
      // 深搜查找节点
      function dfs(root) {
        if (root.data.type === 'file') {
          if (root.data.name === selectedFile)
            return root
          else return null
        }
        for (let i = 0, len = root.children.length; i < len; i++) {
          let res = dfs(root.children[i])
          if (res !== null) return res
        }
        return null
      }
      let fileNode = dfs(this.treeRoot)
      this.dependedData = this.buildHierarchy(fileNode.data.fileInfo.depended)
      this.dependingData = this.buildHierarchy(fileNode.data.fileInfo.depending)
    },
    buildHierarchy(depends) {
      let root = { children: [] }
      depends.forEach((dep) => {
        let child = {
          name: dep.src,
          children: []
        }
        dep.specifiers.forEach((d) => {
          child.children.push({
            name: d.name,
            type: d.type
          })
        })
        root.children.push(child)
      })
      let treeRoot = d3.hierarchy(root)
      treeRoot.sum(function(d) { return !d.children ? 1 : 0; });
      return d3.partition()(treeRoot)
    }
  },
  mounted() {
    this.getFilesList()
    this.getFolderHierarchy()
    this.getFilesInfo()
    this.getFilesDist()
    this.getGraphData()
  }
}

</script>
<style lang="scss" type="text/css">
html {
  height: 100%;
  body {
    height: 92%;
  }
}

#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  display: flex;
  height: 100%;
  .left-panel {
    margin-right: 3px;
    flex: 1.3;
    display: flex;
    flex-direction: column;
    .control-panel{
      flex: 1.2;
      margin-bottom: 3px;
      display: flex;
      flex-direction: column;
      font-size: 14px;
      .slider-wrapper{
        padding: 25px 20px 0px;
        flex: 1;
        display: flex;
        .text-div{
          flex: 1;
        }
        .slider-div{
          flex: 4;
          display: flex;
          margin-right: 50px;
          .el-slider{
            margin-right: 10px;
            flex: 3;
            .el-slider__runway{
              margin-top: 5px;
              height: 5px;
            }
            .el-slider__bar {
              height: 5px;
              background-color: #abadaf;
            }
            .el-slider__button{
              border: 2px solid #b8b9bc;
              height: 13px;
              width: 13px;
            }
            .el-slider__stop {
              height: 5px;
              width: 5px;
            }
          }
          .el-input{
            flex: 0.5;
            margin-top: -8px;
            margin-right: 5px;
          }
        }
      }
      .number{
        padding-top: 2px;
        .el-input__inner{
          padding-left: 12px;
        }
      }
      .ratio-wrapper{
        flex: 1;
        padding: 0px 20px 0px;
        display: flex;
        .text-div{
          flex: 0.99;
        }
        .ratio-div{
          flex: 5;
          .el-radio__inner {            
            width: 12px;
            height: 12px;
          }
          .el-radio__input.is-checked .el-radio__inner {
            border-color:#abadaf;
            background: #abadaf;
          }
          .el-radio__input.is-checked+.el-radio__label {
            color: #606266;
          }
        }
      }
      .others{
        flex: 1;
      }
    }
    .dep-hell-wrapper {
      flex: 4.5;
      margin-bottom: 3px;
    }
    .scatter-plot{
      flex: 2.2;
    }
  }
  .center-panel {
    flex: 3;
    display: flex;
    flex-direction: column;
    margin-right: 3px;
    .first-row {
      flex: 3;
      margin-bottom: 3px;
    }
    .second-row {
      flex: 1.19;
    } 
  }
  .right-panel{
    flex: 1.2;
  }
}

</style>
