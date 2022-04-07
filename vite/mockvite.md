## 如何模拟一个简易vite呢

首先可以新建一个文件夹

接着npm init，初始化

再建一个minivite的文件

里面放入src/App.vue,src/main.js,minvite.js

具体样子可以长这样

![](https://zero-portal-cdn.hellobike.com/pro/crm/CRPImage/67-CRM_PIC-16381800088713148/baf815dc-5930-42a8-a4c8-2da0bf433eaf.png#crop=0&crop=0&crop=1&crop=1&id=utEju&originHeight=436&originWidth=462&originalType=binary&ratio=1&rotation=0&showTitle=false&status=done&style=none&title=)

### npm i koa 和vue3以上的版本或者直接复制下面代码到package.json 中

```javascript
{
  "name": "dxvite",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "test": "echo \\"Error: no test specified\\" && exit 1"
  },
  "author": "",
  "license": "ISC",
  "dependencies": {
    "koa": "^2.13.4",
    "vue": "^3.0.5"
  }
}
```

### 在index.html 中放入，引入的main.js 需要加个type为module的标识

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
</head>
<body>
  <div id="app"></div>
  <script>
    window.process = {env: {NODE\_ENV: 'dev'}}
  </script>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

### main.js 注册一下app

```javascript
import { createApp } from "vue"
import App from './App.vue'

createApp(App).mount('#app')
```

### App.vue 文件中就随随便便加点东西

```html
<template>
    <div>
      <h1>
        {{title}}
      </h1>
    </div>
</template>
<script>
import {ref} from 'vue'
export default {
  setup() {
    const title = ref('hello, kvite')
    return{ title }
  }
};
</script>
```

### 最重要的是这个minivite.js文件，用koa去起一个服务，然后把vue文件解析成能让浏览器能够识别的文件。顺便对一些类似import {creatApp} from 'vue' 的文件处理，处理成从nodeModule中去取相应的文件。

minivite.js

```javascript
const koa = require('koa')
const app = new koa()
const fs = require('fs')
const path = require('path')
const compilerSfc  = require('@vue/compiler-sfc')
const compilerDom = require("@vue/compiler-dom");



app.use(async (ctx) =>{
  const { url, query } = ctx.request;
  ctx.body = 'dxvite!!!'
  if(url ==='/'){
    ctx.type = 'text/html'
    const p = path.resolve(__dirname,'./index.html')
    // console.log('p',p);
    
    ctx.body = fs.readFileSync(p,'utf8')  
  }else if(url.endsWith('.js')){
    // 相应js请求
    const p = path.join(__dirname,url)
    ctx.type = 'text/javascript'
    ctx.body = rewriteImport(fs.readFileSync(p,'utf8'))
    // console.log('url',url,ctx.body);

  }else if(url.startsWith('/@modules/')){
    // console.log('进入moudles判断',url);
    
    // 获取@modules后面的部分，模块名称
    const moduleName = url.replace('/@modules/','')
    const prefix = path.join(__dirname,'../node_modules',moduleName)
    // console.log('prefix',prefix);
    
    // 要加载文件的地址
    const module = require(prefix + '/package.json').module
    const filePath = path.join(prefix,module)
    const ret = fs.readFileSync(filePath,'utf8')
    ctx.type = 'text/javascript'
    ctx.body = rewriteImport(ret)
  }else if(url.indexOf('.vue') > 1){
    // 读取vue文件内容
    const p = path.join(__dirname,url.split('?')[0])
    // 1，解析SFC，利用compileSfc
    // 2，处理内部的script
    const ret = compilerSfc.parse(fs.readFileSync(p,'utf-8'))
    console.log('ast',ret);
    // console.log('uery.type',query.type);
    
     // 没有query.type，说明是SFC
     if (!query.type) {
        // 获取脚本内容
        const scriptContent = ret.descriptor.script.content
        // console.log('scriptContent',scriptContent);
        
        // 转换默认导出配置对象为常量
        const script = scriptContent.replace('export default','const __script =')
        // console.log('script53',script);
        // 需要rewrite一下，把vue文件中的裸模块去掉
        ctx.type= 'text/javascript'
        ctx.body = `${rewriteImport(script)}
        import {render as __render} from '${url}?type=template'
        __script.render = __render
        export default __script
        `
     }else if(query.type&&query.type === 'template'){
       
      const tpl = ret.descriptor.template.content
      console.log('tpl',tpl);
      // 编译为包含render的模块
      const render = compilerDom.compile(tpl,{mode:'module'}).code
      console.log('render',render);
      ctx.type= 'text/javascript'
      ctx.body = rewriteImport(render)
     }
  }
})


function rewriteImport(content){
  // console.log('content.',content);
  
 return content.replace(/ from ['"](.*)['"]/g,function(s0,s1) {
    // s0是匹配字符串，s1分组内容
    // 看看是不是相对地址
    if(s1.startsWith('.')||s1.startsWith('/')||s1.startsWith('../')){
      return s0
    }else{
      // console.log('module',` from '/@modules/${s1}'`);
      // 裸模块
      return ` from '/@modules/${s1}'`
    }
  })
}

app.listen( 3001,() =>{
  console.log('dxvite start','http://localhost:3001/');
})
```

执行的时候直接node 对应的vite.js文件就行，我这里就可以写node dxvite.js,当然如果安装了nodemon会更好，这样的话方便于调试。

这样我们的一个简易的vite就做好了，解析的过程中用了两个vue3中很重要的东西compilerSfc和compilerDom。

一个是把代码装换成ast语法树

另外一个是对template进行解析
