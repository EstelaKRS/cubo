/**
 * Programa que utiliza WebGL para demostrar la animación 3D de un cubo
 * en perspectiva con rotación en cada eje y con textura de cuadrícula.
 *  
 * Bibliotecas utilizadas:
 *  macWebglUtils.js
 *  MVnew.js del libro "Interactive Computer Graphics"
 * 
 * Este programa se basó en un ejemplo del capítulo 7 del libro 
 * "Interactive Computer Graphics" de Angel & Shreiner.
 */

"use strict";

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
  // ambiente
  gCanvas = document.getElementById("glcanvas");
  gl = gCanvas.getContext('webgl2');
  if (!gl) alert("Vixe! Não achei WebGL 2.0 aqui :-(");

  console.log("Canvas: ", gCanvas.width, gCanvas.height);
  const fileInput = document.getElementById('fileInput');
    fileInput.addEventListener('change', handleFileSelect);

  // cria cubo com textura
  crieCubo();
  // llama a numerarCara después de crear el cubo
  for (let i = 0; i < 6; i++) {
    numerarCara(i);
  }

  // interface
  crieInterface();

  // Inicializações feitas apenas 1 vez
  gl.viewport(0, 0, gCanvas.width, gCanvas.height);
  gl.clearColor(FUNDO[0], FUNDO[1], FUNDO[2], FUNDO[3]);
  gl.enable(gl.DEPTH_TEST);

  // shaders
  crieShaders();
  // configureTextureFromImage debe llamarse después de numerarCara
  //configureTextureFromImage(img);

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

  //configureTexturaDaURL(URL);
  //configureTextureFromImage(img);
  //gl.uniform1i(gl.getUniformLocation(gShader.program, "uTextureMap"), 0);

};

// ==================================================================
/**
 * Usa o shader para desenhar.
 * Assume que os dados já foram carregados e são estáticos.
 */
function render() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // modelo muda a cada frame da animação
  if (!gCtx.pause) gCtx.theta[gCtx.axis] += 1.0;

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

var gVertexShaderSrc = `#version 300 es
// buffers de entrada
in vec3 aPosition;
in vec2 aTexCoord;

uniform mat4 uModelView;
uniform mat4 uPerspective;

out vec2 vTexCoord;

void main() {
    gl_Position = uPerspective * uModelView * vec4(aPosition, 1);
    // Experimento: corrección de perspectiva manual. 
    // Remova o comentário da linha abaixo para ver o que acontece.
    // gl_Position /= gl_Position.w;
    vTexCoord = aTexCoord; 
}
`;

var gFragmentShaderSrc = `#version 300 es
precision highp float;

in vec2 vTexCoord;
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
console.log('vCubo:', vCubo);

// textura: coordenadas (s, t) entre 0 e 1.
//const URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Flower_poster_2.jpg/1200px-Flower_poster_2.jpg"
//const URL = "https://www.canalmascotas.com/wp-content/uploads/files/article/e/etapas-de-vida-del-primer-mes-del-cachorro_5wb3s.jpg"
//const URL = "https://upload.wikimedia.org/wikipedia/commons/6/64/Bichon_Frise_600.jpg"

const URL = "imagen.jpeg"
var gaTexCoords = [];
// valores escolhidos para recortar a parte desejada
var vTextura = [      
  vec2(0.05, 0.05),
  vec2(0.05, 0.75),
  vec2(0.95, 0.75),
  vec2(0.95, 0.05),
  
];
// Coordenadas de textura para enumerar las esquinas
var vNumeros = [
  vec2(0.0, 0.0),  // Esquina inferior izquierda
  vec2(0.0, 1.0),  // Esquina superior izquierda
  vec2(1.0, 1.0),  // Esquina superior derecha
  vec2(1.0, 0.0)   // Esquina inferior derecha
];
/**
 * Numerar las caras del cubo.
 * @param {Number} faceIndex Índice de la cara.
 * @param {Number} textureIndex Índice de la textura a asignar.
 */
function numerarCara(faceIndex) {

  var red = vec3(1.0, 0.0, 0.0);

  // Asegurarse de que el índice de la cara sea válido
  if (faceIndex >= 0 && faceIndex < vCubo.length / 4) {
    var baseIndex = faceIndex * 4;

    for (let i = 0; i < 4; i++) {
      var vertexIndex = baseIndex + i;
      var v = vec3(vCubo[vertexIndex][0], vCubo[vertexIndex][1], vCubo[vertexIndex][2]);
    
      gaPosicoes.push(0.8 * v);
      gaTexCoords.push(vNumeros[i]);
      console.log('Face:', faceIndex, 'Vertex:', vertexIndex, 'TexCoord:', vNumeros[i]);
    }
  } else {
    console.error('Índice de cara fuera de rango:', faceIndex);
  }
}

/**
 * Función lineal personalizada para interpolar entre dos valores.
 * @param {Number|Array} u - Primer valor o vector.
 * @param {Number|Array} v - Segundo valor o vector.
 * @param {Number} s - Factor de interpolación.
 * @returns {Number|Array} - Valor o vector interpolado.
 */
function interpolar(u, v, s) {
  if (typeof u === 'number' && typeof v === 'number') {
    return (1.0 - s) * u + s * v;
  }

  if (u.length != v.length) {
    throw "Vector dimension mismatch";
  }

  var result = new Array(u.length);
  for (var i = 0; i < u.length; ++i) {
    result[i] = (1.0 - s) * u[i] + s * v[i];
  }
  result.type = u.type;
  return result;
}

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
  if (
    a >= 0 && a < vCubo.length &&
    b >= 0 && b < vCubo.length &&
    c >= 0 && c < vCubo.length &&
    d >= 0 && d < vCubo.length
  ) {
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
  } 
  //else {
    //console.error("Índice de cara fuera de rango:", a, b, c, d);
  //}
}


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

  for (let i = 0; i < 6; i++) {
    quad(i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 3);
    numerarCara(i);
  }
}

// Llama a esta función al cargar tu script
function setupFileInput() {
  var fileInput = document.getElementById('fileInput');
  fileInput.addEventListener('change', handleFileSelect);
}
function configureTextureFromImage(img) {
  // Crear una textura WebGL
  var texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Configurar la textura con la imagen cargada
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

  // Configurar parámetros de la textura para permitir mipmapping
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  // Asignar la textura al sampler en el shader
  gl.activeTexture(gl.TEXTURE0); // Puedes usar otras unidades de textura según sea necesario
  gl.bindTexture(gl.TEXTURE_2D, texture);
}


function handleFileSelect(event) {
  var file = event.target.files[0];
  if (file) {
    var reader = new FileReader();
    reader.onload = function(e) {
      var img = new Image();
      img.onload = function() {
        configureTextureFromImage(img);
        render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
}

setupFileInput();
main();