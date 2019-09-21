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
      content: ''
    }
  },
  mounted() {
    this.$bus.$on('file-selected', (selectedFile) => {
      this.filename = selectedFile.replace(/E:\\Workspace\\Visualization\\srcCodeHelperServer\\data\\/g,'')
      this.$axios.get('files/getFileContent', {
        filename: selectedFile
      }).then(({ data }) => {
        this.content =`<pre><code>${data.content}</code></pre>`
      })
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
