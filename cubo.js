/**
 * Programa usando WegGL para demonstrar a animação 3D de um cubo
 * em perspectiva com rotação em cada eixo e com textura quadriculada.
 *  
 * Bibliotecas utilizadas
 * macWebglUtils.js
 * MVnew.js do livro -- Interactive Computer Graphics
 * 
 * Esse programa foi baseado em um exemplo do capítulo 7 do livro 
 * Interactive Computer Graphics - Angel & Shreiner.
 *
 */

//"use strict";

//import { pseudoRandomBytes } from "crypto";
//import { notDeepEqual } from "assert";

// ==================================================================
// constantes globais

const FUNDO = [0.0, 0.5, 0.5, 1.0];
const EIXO_X = 0;
const EIXO_Y = 1;
const EIXO_Z = 2;

//camera
const eye = vec3(1.25, 1.25, 1.25);
const at = vec3(0, 0, 0);
const up = vec3(0, 1, 0);
const FOVY = 60;
const ASPECT = 1;
const NEAR = 0.1;
const FAR = 50;

// ==================================================================
// variáveis globais
var gl;
var gCanvas;
var gShader = {};  // encapsula globais do shader

// guarda dados da interface e contexto do desenho
var gCtx = {
  axis: 0,   // eixo rodando
  theta: [0, 0, 0],  // angulos por eixo
  pause: false,        // 
  numV: 36,          // número de vertices
  vista: mat4(),     // view matrix, inicialmente identidade
  perspectiva: mat4(), // projection matrix
};

  // ==================================================================
  // chama a main quando terminar de carregar a janela
  window.onload = main;

  /**
  * programa principal.
  */
  function main() {
   // Cargar biblioteca MVnew.js
  var MVnewScript = document.createElement('script');
  MVnewScript.src = 'libs/MVnew.js';
  MVnewScript.onload = function() {
      // Lógica que depende de MVnew.js
      // Puedes cargar la siguiente biblioteca aquí o llamar a una función que lo haga.
  };
  document.head.appendChild(MVnewScript);

  // Cargar biblioteca macWebglUtils.js
  var macWebglUtilsScript = document.createElement('script');
  macWebglUtilsScript.src = 'libs/macWebglUtils.js';
  macWebglUtilsScript.onload = function() {
      // Lógica que depende de macWebglUtils.js
      // Puedes iniciar tu aplicación aquí
  };
  document.head.appendChild(macWebglUtilsScript);

  // ambiente
  gCanvas = document.getElementById("glcanvas");
  gl = gCanvas.getContext('webgl2');
  if (!gl) {
      console.error("¡Error al inicializar el contexto WebGL!");
      alert("Vixe! Não achei WebGL 2.0 aqui :-(");
  } else {
      console.log("¡Contexto WebGL inicializado correctamente!");
  }

console.log("Canvas: ", gCanvas.width, gCanvas.height);


  // cria cubo com textura
  crieCubo();

  // interface
  crieInterface();

  // Inicializações feitas apenas 1 vez
  gl.viewport(0, 0, gCanvas.width, gCanvas.height);
  gl.clearColor(FUNDO[0], FUNDO[1], FUNDO[2], FUNDO[3]);
  gl.enable(gl.DEPTH_TEST);

  // shaders
  crieShaders();

  // finalmente...
  render();
}

// ==================================================================
/**
 * Cria e configura os elementos da interface e funções de callback
 */
function crieInterface() {
  document.getElementById("xButton").onclick = function () {
    gCtx.axis = EIXO_X;
  };
  document.getElementById("yButton").onclick = function () {
    gCtx.axis = EIXO_Y;
  };
  document.getElementById("zButton").onclick = function () {
    gCtx.axis = EIXO_Z;
  };
  document.getElementById("pButton").onclick = function () {
    gCtx.pause = !gCtx.pause;
  };
}

// ==================================================================
/**
 * cria e configura os shaders
 */
function crieShaders() {
  //  cria o programa
  gShader.program = makeProgram(gl, gVertexShaderSrc, gFragmentShaderSrc);
  gl.useProgram(gShader.program);

  // buffer dos vértices
  var bufVertices = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bufVertices);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(gaPosicoes), gl.STATIC_DRAW);

  var aPosition = gl.getAttribLocation(gShader.program, "aPosition");
  gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aPosition);

  // resolve os uniforms
  gShader.uModelView = gl.getUniformLocation(gShader.program, "uModelView");
  gShader.uPerspective = gl.getUniformLocation(gShader.program, "uPerspective");
  // calcula a matriz de transformação perpectiva (fovy, aspect, near, far)
  // que é feita apenas 1 vez
  gCtx.perspectiva = perspective(FOVY, ASPECT, NEAR, FAR);
  gl.uniformMatrix4fv(gShader.uPerspective, false, flatten(gCtx.perspectiva));

  // calcula a matriz de transformação da camera, apenas 1 vez
  gCtx.vista = lookAt(eye, at, up);

  // textura
  var bufTextura = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bufTextura);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(gaTexCoords), gl.STATIC_DRAW);

  var aTexCoord = gl.getAttribLocation(gShader.program, "aTexCoord");
  gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aTexCoord);

  configureTexturaDaURL(URL);
  gl.uniform1i(gl.getUniformLocation(gShader.program, "uTextureMap"), 0);


  //var textureLocation = gl.getUniformLocation(program, "uTextureMap");
  //gl.uniform1i(textureLocation, 0);
};

// ==================================================================
/**
 * Usa o shader para desenhar.
 * Assume que os dados já foram carregados e são estáticos.
 */
function render() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // modelo muda a cada frame da animação
  if (!gCtx.pause) gCtx.theta[gCtx.axis] += 2.0;

  let rx = rotateX(gCtx.theta[EIXO_X]);
  let ry = rotateY(gCtx.theta[EIXO_Y]);
  let rz = rotateZ(gCtx.theta[EIXO_Z]);
  let model = mult(rz, mult(ry, rx));

  gl.uniformMatrix4fv(gShader.uModelView, false, flatten(mult(gCtx.vista, model)));

  gl.drawArrays(gl.TRIANGLES, 0, gCtx.numV);

  window.requestAnimationFrame(render);
}
// ========================================================
// Código fonte dos shaders em GLSL
// a primeira linha deve conter "#version 300 es"
// para WebGL 2.0

// Vertex Shader
var gVertexShaderSrc = `#version 300 es
// buffers de entrada
in vec3 aPosition;
in vec2 aTexCoord;

uniform mat4 uModelView;
uniform mat4 uPerspective;

out vec2 vTexCoord; // Coordenadas de textura que se pasan al Fragment Shader

void main() {
    gl_Position = uPerspective * uModelView * vec4(aPosition, 1);
    vTexCoord = aTexCoord;  // Pasa las coordenadas de textura al Fragment Shader
}
`;

// Fragment Shader
var gFragmentShaderSrc = `#version 300 es
precision highp float;

in vec2 vTexCoord; // Coordenadas de textura recibidas desde el Vertex Shader
uniform sampler2D uTextureMap;

out vec4 outColor;

void main() {
  outColor = texture(uTextureMap, vTexCoord);
}
`;



// posições dos 8 vértices de um cubo de lado 1
// centrado na origem
var gaPosicoes = [];
var vCubo = [
  vec3(-0.5, -0.5, 0.5),
  vec3(-0.5, 0.5, 0.5),
  vec3(0.5, 0.5, 0.5),
  vec3(0.5, -0.5, 0.5),
  vec3(-0.5, -0.5, -0.5),
  vec3(-0.5, 0.5, -0.5),
  vec3(0.5, 0.5, -0.5),
  vec3(0.5, -0.5, -0.5)
];

const URL = "/home/estela/Videos-Estela/cubo/imagen.jpeg";

var gaTexCoords = [];
var vTextura = [      // valores escolhidos para recortar a parte desejada
  vec2(0.05, 0.05),
  vec2(0.05, 0.75),
  vec2(0.95, 0.75),
  vec2(0.95, 0.05)
];

/**
 * recebe 4 indices de vertices de uma face
 * monta os dois triangulos voltados para "fora"
 * 
 * @param {Number} a 
 * @param {Number} b 
 * @param {Number} c 
 * @param {Number} d 
 */
function quad(a, b, c, d) {
  gaPosicoes.push(vCubo[a]);
  gaTexCoords.push(vTextura[0]);

  gaPosicoes.push(vCubo[b]);
  gaTexCoords.push(vTextura[1]);

  gaPosicoes.push(vCubo[c]);
  gaTexCoords.push(vTextura[2]);

  gaPosicoes.push(vCubo[a]);
  gaTexCoords.push(vTextura[0]);

  gaPosicoes.push(vCubo[c]);
  gaTexCoords.push(vTextura[2]);

  gaPosicoes.push(vCubo[d]);
  gaTexCoords.push(vTextura[3]);
};

/**
 *  define as seis faces de um cubo usando os 8 vértices
 */
function crieCubo() {
  quad(1, 0, 3, 2);
  quad(2, 3, 7, 6);
  quad(3, 0, 4, 7);
  quad(6, 5, 1, 2);
  quad(4, 5, 6, 7);
  quad(5, 4, 0, 1);
};
/**
 * Recibe la URL de la imagen y configura la textura.
 * @param {URL} url - URL de la imagen.
 */
function configureTexturaDaURL(url) {
  console.log("opencv.js cargando correctamente");
  // Crear una nueva promesa para cargar la imagen con opencv.js
  return new Promise((resolve, reject) => {
      // Cargar la imagen usando opencv.js
      cv.imread(url, (image) => {
          if (image.data) {
              // Configurar la textura como antes
              var texture = gl.createTexture();
              gl.activeTexture(gl.TEXTURE0);
              gl.bindTexture(gl.TEXTURE_2D, texture);
              gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(image.data));
              gl.generateMipmap(gl.TEXTURE_2D);
              gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

              // Resolver la promesa con la imagen cargada
              resolve(image);
          } else {
            console.error('Error loading image:', url);
              // Rechazar la promesa si hay un error al cargar la imagen
              reject(new Error("Error al cargar la imagen con opencv.js"));
          }
      });
  });
}

configureTexturaDaURL(URL)
    .then((image) => {
        // Tu lógica aquí
        // image es la imagen cargada con opencv.js
        console.log("Imagen cargada con éxito:", image);
    })
    .catch((error) => {
        console.error("Error al cargar la imagen:", error);
    });



