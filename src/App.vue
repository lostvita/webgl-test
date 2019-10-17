<template>
  <div id="app">
    <img alt="Vue logo" src="./assets/logo.png">
    <canvas id="webgl" ref="webgl" width="500" height="300" @click="handleClick"></canvas>
  </div>
</template>

<script>
import { randomColor } from './js/utils'
export default {
  name: 'app',
  methods: {
    vertexShader () { // 顶点着色器源码
      return `
        precision mediump float; // 浮点设置为中等精度
        attribute vec2 a_Position; // 接收JS的顶点坐标
        attribute vec2 a_Screen_Size; // 接收canvas尺寸
        attribute vec4 a_Color; // 接收rbga颜色值
        varying vec4 v_Color;  // 传递变量给片元着色器
        
        void main(){
          vec2 position = (a_Position / a_Screen_Size) * 2.0 - 1.0; // 将canvas坐标值转换为NDC坐标，范围在[-1.0, 1.0]
          position = position * vec2(1.0, -1.0); // 矩阵乘法，canvas的Y轴坐标和NDC坐标系相反
          gl_Position = vec4(position, 0.0, 1.0); // 最终顶点坐标，0.0为深度坐标（Z轴），1.0为W分量
          v_Color = a_Color; // 顶点颜色传给片元着色器
        }`
    },

    fragmentShader () { // 片元着色器源码
      return `
        precision mediump float;
        varying vec4 v_Color; // 全局变量，用于接收顶点着色器传递的颜色

        void main(){
          vec4 color = v_Color / vec4(255, 255, 255, 1); // 将颜色处理成GLSL允许的范围[0,1]
          gl_FragColor = color; // 点的最终颜色
        }
      `
    },
    createSimpleProgram (gl) {
      // 创建着色器对象
      const vertexShaderSource = this.vertexShader() // 获取顶点着色器源码
      const vertexShader = gl.createShader(gl.VERTEX_SHADER) // 创建顶点着色器对象
      gl.shaderSource(vertexShader, vertexShaderSource) // 源码分配给顶点着色器对象
      gl.compileShader(vertexShader) // 编译顶点着色器程序

      // 检测着色器的编译状态
      let success = gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)
      if(!success) {
        console.log(gl.getShaderInfoLog(vertexShader))
        gl.deleteShader(vertexShader)
      }

      const fragmentShaderSource = this.fragmentShader() // 获取片元着色器源码
      const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER) // 创建片元着色器源码
      gl.shaderSource(fragmentShader, fragmentShaderSource)
      gl.compileShader(fragmentShader)

      success = gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)
      if(!success) {
        console.log(gl.getShaderInfoLog(fragmentShader))
        gl.deleteShader(fragmentShader)
      }

      // 创建着色器程序
      const program = gl.createProgram()
      // 将顶点着色器对象和片元着色器对象挂在在着色器程序上
      gl.attachShader(program, vertexShader)
      gl.attachShader(program, fragmentShader)
      gl.linkProgram(program) // 链接着色器程序

      return program
    },

    handleClick (evt) {
      console.log(evt)
    }
  },
  mounted () {
    const $webgl = this.$refs.webgl
    const gl = $webgl.getContext('webgl')
    
    //存储顶点信息的数组：坐标+颜色
    const positions = [
      30, 30, 255, 0, 0, 1,    //V0
      30, 200, 255, 0, 0, 1,   //V1
      200, 200, 255, 0, 0, 1,  //V2
      200, 30, 0, 255, 0, 1    //V3
    ]
    //存储顶点索引的数组
    const indices = [
      0, 1, 2, //第一个三角形
      0, 2, 3  //第二个三角形
    ]
    // 创建着色器程序
    const program = this.createSimpleProgram(gl)
    // 使用着色器
    gl.useProgram(program)

    const color = randomColor()
    const u_Color = gl.getUniformLocation(program, 'u_Color')  // 获取着色器程序中的全局变量u_Color
    gl.uniform4f(u_Color, color.r, color.g, color.b, color.a) // 将颜色传递给全局变量
    const a_Screen_Size = gl.getAttribLocation(program, 'a_Screen_Size') // 获取着色器程序中定义的a_Screen_Size变量
    gl.vertexAttrib2f(a_Screen_Size, $webgl.width, $webgl.height) // 将canvas尺寸传递给顶点着色器

    const a_Position = gl.getAttribLocation(program, 'a_Position')
    const a_Color = gl.getAttribLocation(program, 'a_Color')

    // 启用属性
    gl.enableVertexAttribArray(a_Position)
    gl.enableVertexAttribArray(a_Color)

    const positionBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer) // 绑定缓冲区
    // 设置a_Position属性从缓冲区读取数据的方式
    // 2表示一次读取2个数据，FLOAT为数据类型，
    // 是否需要将浮点数类型数据单位化到[-1,1]区间，这里是false；
    // 24为读取步长，即每个顶点的字节数（一个顶点包含6个数，一个数4个字节(跟定义顶点的类型有关, 与下面Float32Array对应)：6*4）
    // 0表示读取偏移值
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 24, 0)
    gl.vertexAttribPointer(a_Color, 4, gl.FLOAT, false, 24, 8)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW)
    
    // 创建索引缓冲区
    const indicesBuffer = gl.createBuffer()
    // 缓冲区绑定索引
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer)
    // 将顶点索引复制到buffer中
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW)

    gl.clearColor(0,0,0,1) // 设置清屏颜色为黑色

    // 绘制
    gl.clear(gl.COLOR_BUFFER_BIT)
    // 利用索引方式绘制(另一种是数据方式绘制),指定索引缓冲区中值的类型：无符号16为整数，与上面Uint16Array对应
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0)
  }
}
</script>

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
