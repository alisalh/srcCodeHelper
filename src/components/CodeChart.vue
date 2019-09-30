<template>
  <div class="code-chart">
    <div class='file'>{{filename}}</div>
    <div class='content' v-highlight v-html="content"></div>
  </div>
</template>
<script type="text/javascript">
export default {
  data() {
    return {
      filename: null,
      content: '',
      isPathSelected: false,
      badPath: []
    }
  },
  props: ['referenceName', 'filesList'],
 
  mounted() {
    this.$bus.$on('file-selected', (selectedFile) => {
      let id = this.filesList.indexOf(selectedFile)
      this.filename = selectedFile.replace(/E:\\Workspace\\Visualization\\srcCodeHelperServer\\data\\/g,'')
      this.$axios.get('files/getFileContent', {
        filename: selectedFile
      }).then(({ data }) => {
        let code = data.content
        if(this.isPathSelected){
          let preFile = new Set()
          this.badPath.forEach(p =>{
            let i = p.path.indexOf(id)
            if(i === p.path.length-1){
              preFile.add(p.path[0])
            }
            if(i >= 0 && i < p.path.length-1){
              preFile.add(p.path[i+1])
            }
          })
          preFile = [...preFile].map(d =>this.filesList[d])

          let names = this.referenceName.find(file => file.filename === selectedFile).referenceName
          let preNames = []
          preFile.forEach(file =>{
            names.forEach(name => {
              if(name[file]) name[file].map(d => preNames.push(d))
            })
          })
          
          if(preNames.length >= 1){
            preNames.forEach(name => {
              code = code.replace(new RegExp("\\b"+name+"\\b", 'g'), `<mark>${name}</mark>` )
            });
          }
        }
        this.content =`<pre><code>${code}</code></pre>`
      })
    })
    this.$bus.$on('path-selected', d=> {
      if(d.length > 0){
        this.isPathSelected = true
        this.$axios.get('files/getPathInfoById', {
          ids: d
        }).then(({data}) =>{
          this.badPath = data.subPaths
        })
      }
      else{
        this.isPathSelected = false
        this.badPath = []
      }
    })
  }
}

</script>
<style type="text/css" lang="scss">
.code-chart {
  height: 100%;
  overflow: auto;
  display: flex;
  flex-direction: column;
  .file{
    flex: 0.4;
    background-color:rgb(245, 245, 245);
    font-size: 16px;
    padding-top: 3px;
    text-align: center;
  }
  .content{
    overflow: auto;
    flex: 15;
    font-weight: bold;
    font-size: 16px;
  }
}
.hljs{
  overflow-x: unset;
}
</style>
