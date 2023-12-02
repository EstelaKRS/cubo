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

"use strict";

// ==================================================================
// constantes globais
const FUNDO = [0.0, 0.5, 0.5, 1.0];
const EIXO_X = 0;
const EIXO_Y = 1;
const EIXO_Z = 2;

//camara
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
  
  // crea cubo con textura
  crieCubo();

  // interface
  crieInterface();

  // Inicializaciones hechas solo 1 vez
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

// textura: coordenadas (s, t) entre 0 e 1.
//const URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Flower_poster_2.jpg/1200px-Flower_poster_2.jpg"
//const URL = "https://www.canalmascotas.com/wp-content/uploads/files/article/e/etapas-de-vida-del-primer-mes-del-cachorro_5wb3s.jpg"
//const URL = "https://upload.wikimedia.org/wikipedia/commons/6/64/Bichon_Frise_600.jpg"

const URL = "imagen.jpeg"
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


// Obtén referencias a los elementos relevantes
const numeroButton = document.getElementById('numeroButton');
const numeroDropdown = document.getElementById('numeroDropdown');
const colorList = document.getElementById('numeroList');
const imageButton = document.getElementById('imageButton');
const imagenInput = document.getElementById('imagenInput');

// Agrega un evento de clic al botón "Seleccionar Numero"
numeroButton.addEventListener('click', () => {
  // Muestra u oculta el contenedor desplegable al hacer clic en el botón
  numeroDropdown.style.display = numeroDropdown.style.display === 'none' ? 'block' : 'none';
});

// Agrega un evento de cambio al elemento de lista desplegable "Seleccionar Numero"
colorList.addEventListener('change', () => {
  // Obtén el valor seleccionado
  const selectedNumero = colorList.value;

  // Muestra el botón "Seleccionar Imagen" si se ha seleccionado un número
  if (selectedNumero) {
    imageButton.style.display = 'block';
  }
});

// Agrega un evento de clic al botón "Seleccionar Imagen"
imageButton.addEventListener('click', () => {
  // Activa el clic en el input de tipo archivo para abrir el cuadro de diálogo
  imagenInput.click();
});

class Cara {
  constructor(numero) {
    this.numero = numero;
    this.texture = null;
  }

}

// Luego, puedes crear instancias de la clase Cara para cada cara del cubo
const cara1 = new Cara(1);
const cara2 = new Cara(2);
const cara3 = new Cara(3);
const cara4 = new Cara(4);
const cara5 = new Cara(5);
const cara6 = new Cara(6);

class Imagen {
  constructor() {
    this.texture = null;
  }

  async cargarImagen(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          this.configureTextureFromImage(img);
          resolve();
        };
        img.src = e.target.result;
      };

      reader.onerror = (error) => {
        reject(error);
      };

      // Lee el contenido del archivo como una URL de datos
      reader.readAsDataURL(file);
    });
  }
  configureTextureFromImage(img) {
    // Crear una textura WebGL
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    // Configurar la textura con la imagen cargada
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

    // Configurar parámetros de la textura para permitir mipmapping
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // Asignar la textura al sampler en el shader
    gl.activeTexture(gl.TEXTURE0); // Puedes usar otras unidades de textura según sea necesario
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
  }

}

// Uso de la clase Imagen
const imagen = new Imagen();
// Asigna un manejador de eventos al cambio en el input de tipo file
// Agrega un evento de cambio al input de tipo archivo "Seleccionar Imagen"
imagenInput.addEventListener('change', (event) => {
  // Obtén la primera imagen seleccionada (si hay alguna)
  const file = event.target.files[0];

  // Puedes realizar las acciones necesarias con el archivo aquí
  if (file) {
    // Carga la imagen desde el archivo seleccionado
    imagen.cargarImagen(file)
      .then(() => {
        // La imagen se ha cargado correctamente
        render(); // Asegúrate de llamar a render después de cargar la imagen.
      })
      .catch((error) => {
        console.error('Error al cargar la imagen:', error);
      });
  }
});


