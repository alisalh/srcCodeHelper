<template>
  <div id="app">
    <div class="left-panel column">
      <line-chart class="line-chart" :lenDis="lenDis" :lenThreshold='lenThreshold' :maxLen='maxLen'
      @filterLongDep='filterLongDep'>
      </line-chart>
      <bar-chart class="bar-chart" :chartData="barChartData" :colorMap="colorMap"></bar-chart>
      <dep-hell-wrapper :root="treeRoot" :badDeps="badDeps" class="dep-hell-wrapper" :colorMap="colorMap">
      </dep-hell-wrapper>
    </div>
    <div class="center-panel column">
      <div class="first-row bl-card-shadow">
        <dep-path :badDeps="badDeps"></dep-path>
      </div>
      <div class="second-row bl-card-shadow">
        <parallel-coordinate :root="treeRoot" class='parallel-coordinate'></parallel-coordinate>
      </div>
    </div>
    <div class="right-panel column">
      <code-chart class="bl-card-shadow"></code-chart>
    </div>
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
    Test
  },
  data() {
    return {
      selectedFileName: 'None',
      treeRoot: null,
      badDeps: null,
      dependedData: null,
      dependingData: null,
      lenDis: null,
      colorMap: { long: '#e41a1c', indirect: '#4daf4a', direct: '#377eb8' },
      lenThreshold: 24,
      // lenThreshold:16,
      maxLen:9999
    }
  },
  updated() {
    console.log('app updated');
  },
  computed: {
    barChartData() {
      return this.badDeps ? this.badDeps.map(d => ({ type: d.type, num: d.paths.length })) : null
    }
  },
  methods: {
    // 通过slider改变len阈值时，重新向后台请求数据
    filterLongDep(val){
      this.lenThreshold=val
      this.getFolderHierarchy()
    },
    getFolderHierarchy() {
      this.$axios.get('files/getFolderHierarchyAndFileInfo', {
        lenThreshold: this.lenThreshold,
        libName:'vue'
        // libName:'d3'
      }).then(({ data }) => {
        let treeRoot = d3.hierarchy(data.root);
        console.log('leaves num:',treeRoot.leaves().length)
        treeRoot.descendants().forEach((d) => {
          // 提取相对路径
          d.data.name = this.genRelPath(d.data.name)
          if (d.data.type === 'dir') return
          // 若是文件，则提取该文件的依赖文件和被依赖文件的相对路径
          d.data.fileInfo.depended = d.data.fileInfo.depended.map(dep => Object.assign({},
            dep, { src: this.genRelPath(dep.src) }))
          d.data.fileInfo.depending = d.data.fileInfo.depending.map(dep => Object.assign({},
            dep, { src: this.genRelPath(dep.src) }))
        })
        treeRoot.sum(function(d) { return !d.children && d.fileInfo && d.fileInfo.size ? 1 : 0; });
        this.treeRoot = treeRoot

        // 提取所有坏依赖的相对路径
        let badDeps = data.badDeps
        for (let deps of badDeps) {
          for (let { path } of deps.paths) {
            for (let i = 0, len = path.length; i < len; i++) {
              path[i] = this.genRelPath(path[i])
            }
          }
        }
        this.badDeps = badDeps
        this.lenDis = data.lenDis
        this.maxLen=badDeps.find(d=>d.type==='long').maxLen
        console.log('badDeps', this.badDeps)
        console.log('lenDis', this.lenDis)
        console.log('root in app:', this.treeRoot)
      })
    },
    genRelPath(path) {
      let match = path.match(/E:\/Workspace\/Visualization\/srcCodeHelperServer\/data\/vue\/src\/(.*)/)
      // let match = path.match(/(.*)src(.*)/)
      return match ? match[2] : path
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
      // this.dependedData=this.buildHierarchy(data.fileInfo.depended)
    },
    buildHierarchy(depends) {
      console.log(depends)
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
    this.$bus.$on('file-select', d => this.selectedFileName = d)
    this.$bus.$on('draw-partition', (selectedFile) => {
      this.partitionDataAdapter(selectedFile)
      // this.draw()
    })
    this.getFolderHierarchy()
  }
}

</script>
<style lang="scss" type="text/css">
html {
  height: 100%;
  body {
    height: 95%;
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
    margin-right: 5px;
    flex: 1.1;
    display: flex;
    flex-direction: column;
    .line-chart {
      flex: 1;
      margin-bottom: 5px;
    }
    .bar-chart {
      flex: 1;
      margin-bottom: 5px;
    }
    .dep-hell-wrapper {
      flex: 5;
    }
  }
  .center-panel {
    flex: 2;
    display: flex;
    flex-direction: column;
    margin-right: 5px;
    .first-row {
      flex: 3;
      margin-bottom: 5px;
    }
    .second-row {
      flex: 1.3;
    } 
  }
  .right-panel{
    flex: 1;
  }
}

</style>
