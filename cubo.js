/**
 * Programa que utiliza WebGL para demostrar la animación 3D de un cubo
 * en perspectiva con rotación en cada eje y con textura de cuadrícula.
 *  
 * Bibliotecas utilizadas:
 *  macWebglUtils.js
 *  MVnew.js del libro "Interactive Computer Graphics"
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
// arreglo para almacenar texturas
var gTextures = [];
// variable para rastrear el color actual seleccionado
var gCurrentColor = 'rojo';

/**
 * programa principal.
 */
function main() {
  // Configuración del ambiente WebGL
  gCanvas = document.getElementById("glcanvas");
  gl = gCanvas.getContext('webgl2');
  
  if (!gl) {
    console.error("¡Vaya! No se encontró WebGL 2.0 aquí :-(");
    return;
  }

  console.log("Canvas: ", gCanvas.width, gCanvas.height);

  const fileInput = document.getElementById('fileInput');
  if (fileInput) {
    fileInput.addEventListener('change', handleFileSelect);
  } else {
    console.error("Elemento 'fileInput' no encontrado en el documento.");
  }

  // Crear cubo con textura y numerar las caras
  crieCubo();

  // Inicializar la matriz de texturas (6 caras x N videos por cara)
for (let i = 0; i < 6; i++) {
  gTextures[i] = ['video_url_1', 'video_url_2', 'video_url_3', 'video_url_4', 'video_url_5', 'video_url_6'];
}

  // Configuración de la interfaz
  crieInterface();

  // Inicializaciones realizadas una vez
  gl.viewport(0, 0, gCanvas.width, gCanvas.height);
  gl.clearColor(FUNDO[0], FUNDO[1], FUNDO[2], FUNDO[3]);
  gl.enable(gl.DEPTH_TEST);

  // Configurar shaders y renderizar
  crieShaders();
  render();
  //setupFileInput();
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
  // Manejar el cambio de color seleccionado
  document.getElementById("colorList").addEventListener('change', function() {
    gCurrentColor = this.value;
  
    const indiceDeCara = obtenerIndiceDeCaraPorColor(gCurrentColor);
   
    console.log('Color seleccionado:', gCurrentColor);
    console.log('Índice de cara:', indiceDeCara);
  
    // Obtén el elemento de video
    var video = document.getElementById("video");
  
    // Cargar el video correspondiente a la cara específica
    loadTextureFromVideo(video, indiceDeCara);
  });
  // Nuevo botón para seleccionar video
  const videoInput = document.getElementById('videoInput');
  videoInput.addEventListener('change', handleVideoSelect);
  
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
  
  // Agregar esta línea junto con otros uniformes en la función crieShaders
  gShader.uNumeroCara = gl.getUniformLocation(gShader.program, "uNumeroCara");

  // calcula a matriz de transformação da camera, apenas 1 vez
  gCtx.vista = lookAt(eye, at, up);

  // textura
  var bufTextura = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bufTextura);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(gaTexCoords), gl.STATIC_DRAW);

  var aTexCoord = gl.getAttribLocation(gShader.program, "aTexCoord");
  gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aTexCoord);

  // Para cada cara, crea un uniform para la textura correspondiente
  for (let i = 0; i < 6; i++) {
    gShader[`uTextureMap${i}`] = gl.getUniformLocation(gShader.program, `uTextureMap${i}`);
  }

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
  gl.useProgram(gShader.program);  // Asegúrate de usar el programa de shaders antes de realizar operaciones
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // modelo muda a cada frame da animacion 
  if (!gCtx.pause) gCtx.theta[gCtx.axis] += 1.0;

  let rx = rotateX(gCtx.theta[EIXO_X]);
  let ry = rotateY(gCtx.theta[EIXO_Y]);
  let rz = rotateZ(gCtx.theta[EIXO_Z]);
  let model = mult(rz, mult(ry, rx));

  gl.uniformMatrix4fv(gShader.uModelView, false, flatten(mult(gCtx.vista, model)));
  // Iterar sobre las caras y renderizar cada una con su número
  for (let i = 0; i < 6; i++) {
    // Configurar el número de la cara para el shader
    gl.uniform1i(gShader.uNumeroCara, i + 1);
    // Renderizar la cara
    gl.drawArrays(gl.TRIANGLES, i * 6, 6);
  }
  //gl.drawArrays(gl.TRIANGLES, 0, gCtx.numV);
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
uniform int uNumeroCara;

out vec4 outColor;

void main() {
    // Obtener el color de la textura
    vec4 texColor = texture(uTextureMap, vTexCoord);

    // Si no hay textura, establecemos un color de fondo negro
    if (texColor.a == 0.0) {
        outColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }

    // Calcular la distancia al centro de la cara
    float distanciaAlCentro = length(vTexCoord - vec2(0.5, 0.5));

    // Ajustar el tamaño del número
    float tamanoNumero = 0.2;

    // Verificar si estamos en el centro de la cara y asignar el color del número
    if (distanciaAlCentro < tamanoNumero) {
        // Asignar un color sólido para cada número de cara
        if (uNumeroCara == 1) {
            outColor = vec4(1.0, 0.0, 0.0, 1.0); // Rojo
        } else if (uNumeroCara == 2) {
            outColor = vec4(0.0, 1.0, 0.0, 1.0); // Verde
        } else if (uNumeroCara == 3) {
            outColor = vec4(0.0, 0.0, 1.0, 1.0); // Azul
        } else if (uNumeroCara == 4) {
            outColor = vec4(1.0, 1.0, 0.0, 1.0); // Amarillo
        } else if (uNumeroCara == 5) {
            outColor = vec4(1.0, 0.0, 1.0, 1.0); // Magenta
        } else if (uNumeroCara == 6) {
            outColor = vec4(0.0, 1.0, 1.0, 1.0); // Cian
        }
    } else {
        // Si no estamos en el centro de la cara, establecer el color al de la textura
        outColor = texColor;
    }
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

const URL = "video.jpeg"
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
// Agrega la siguiente función para establecer el número de cara en el shader
function setNumeroCara(numeroCara) {
  gl.uniform1i(gShader.uNumeroCara, numeroCara);
}

// Modifica la función numerarCara para que funcione con las nuevas incorporaciones
function numerarCara(faceIndex) {
  // Asegurarse de que el índice de la cara sea válido
  if (faceIndex >= 0 && faceIndex < vCubo.length / 4) {
    var baseIndex = faceIndex * 4;

    // Configurar el número de cara para el shader
    setNumeroCara(faceIndex + 1);

    // Llamar a la función quad una vez para cada cara
    quad(baseIndex, baseIndex + 1, baseIndex + 2, baseIndex + 3);
  } else {
    console.error("Índice de cara fuera de rango:", faceIndex);
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
let gCaras = [];  // Agrega esta línea para definir gCaras

function crieCubo() {
  quad(1, 0, 3, 2);
  quad(2, 3, 7, 6);
  quad(3, 0, 4, 7);
  quad(6, 5, 1, 2);
  quad(4, 5, 6, 7);
  quad(5, 4, 0, 1);

  // Llenar gCaras con las caras del cubo
  for (let i = 0; i < 6; i++) {
    const cara = {
      puntos: [i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 3],
      indice: i,
    };
    gCaras.push(cara);
    numerarCara(i);
  }
}


// Llama a esta función al cargar tu script
function setupFileInput() {
  var fileInput = document.getElementById('fileInput');

  // Verificar si el elemento existe antes de agregar el evento
  if (fileInput) {
    fileInput.addEventListener('change', handleFileSelect);
  } else {
    console.error("Elemento 'fileInput' no encontrado en el documento.");
  }
}

// Modifica la función configureTextureFromVideo
function configureTextureFromVideo(video, faceIndex) {
  // Verificar que el índice de cara sea válido
  if (faceIndex >= 0 && faceIndex < gTextures.length) {
    // Crear una textura WebGL
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Configurar la textura con el video
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);

    // Configurar parámetros de la textura para permitir mipmapping
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // Asignar la textura al sampler en el shader
    gl.activeTexture(gl.TEXTURE0 + faceIndex);  // Utiliza unidades de textura diferentes para cada cara
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Asegúrate de que render() se llama después de cargar la textura
    render();
  } else {
    console.error("Índice de cara fuera de rango:", faceIndex);
  }
}

// Función para cargar el video en el reproductor
function loadVideo(videoUrl) {
  const video = document.getElementById('video');
  
  // Configurar el source del elemento de video
  video.src = videoUrl;
  
  // Asignar el video al elemento de video
  video.load();
  
  // Reproducir el video
  video.play();
}

// Manejar la selección de video
function handleVideoSelect() {
  const selectedVideo = videoInput.files[0];
  if (selectedVideo) {
    const fileReader = new FileReader();
    fileReader.onload = function (event) {
      const videoUrl = event.target.result;
      loadTextureFromVideo(videoUrl, obtenerIndiceDeCaraPorColor(gCurrentColor));
    };
    fileReader.readAsDataURL(selectedVideo);
  }
}


// Obtener referencias a elementos HTML
const colorButton = document.getElementById('colorButton');
const colorDropdown = document.getElementById('colorDropdown');
const fileInput = document.getElementById('fileInput');
const videoButton = document.getElementById('videoButton');  // Nuevo botón de video
const videoInput = document.getElementById('videoInput');

// Agregar evento de clic al botón de color
colorButton.addEventListener('click', () => {
    // Mostrar la lista de colores
    colorDropdown.style.display = 'block';
});

// Manejar la selección de color
const colorList = document.getElementById('colorList');
colorList.addEventListener('change', () => {
    // Obtener el color seleccionado
    const selectedColor = colorList.value;
    // Mostrar el botón de seleccionar video
    videoButton.style.display = 'block';
    // Hacer lo que necesites con el color seleccionado (puedes llamar a una función, etc.)
    console.log('Color seleccionado:', selectedColor);
    // Ocultar la lista de colores después de seleccionar uno
    colorDropdown.style.display = 'none';
});

// Manejar la selección de video
videoButton.addEventListener('click', () => {
    videoInput.click();
});

// Manejar la selección de video desde el campo de entrada
videoInput.addEventListener('change', handleVideoSelect);


// Manejar la selección del video
if (videoButton && fileInput && videoInput) {
  // Botón de video
  videoButton.addEventListener('click', () => {
      fileInput.click();
  });

  // Selector de archivo
  fileInput.addEventListener('change', handleFileSelect);

  // Selector de video
  videoInput.addEventListener('change', handleVideoSelect);
} else {
  console.error("Elemento 'videoButton', 'fileInput' o 'videoInput' no encontrado en el documento.");
}
// Definir un mapa de colores a arreglos de URLs de videos
const colorVideoMap = {
  rojo: ['url_rojo_1.mp4', 'url_rojo_2.mp4', 'url_rojo_3.mp4', 'url_rojo_4.mp4', 'url_rojo_5.mp4', 'url_rojo_6.mp4'],
  verde: ['url_verde_1.mp4', 'url_verde_2.mp4', 'url_verde_3.mp4', 'url_verde_4.mp4', 'url_verde_5.mp4', 'url_verde_6.mp4'],
  azul: ['url_azul_1.mp4', 'url_azul_2.mp4', 'url_azul_3.mp4', 'url_azul_4.mp4', 'url_azul_5.mp4', 'url_azul_6.mp4'],
  amarillo: ['url_amarillo_1.mp4', 'url_amarillo_2.mp4', 'url_amarillo_3.mp4', 'url_amarillo_4.mp4', 'url_amarillo_5.mp4', 'url_amarillo_6.mp4'],
  magenta: ['url_magenta_1.mp4', 'url_magenta_2.mp4', 'url_magenta_3.mp4', 'url_magenta_4.mp4', 'url_magenta_5.mp4', 'url_magenta_6.mp4'],
  cian: ['url_cian_1.mp4', 'url_cian_2.mp4', 'url_cian_3.mp4', 'url_cian_4.mp4', 'url_cian_5.mp4', 'url_cian_6.mp4'],
};


// Maneja la selección de color
colorList.addEventListener('change', () => {
  // Obtener el color seleccionado
  const selectedColor = colorList.value;
  // Obtener la URL del video asociado al color
  const videoUrl = colorVideoMap[selectedColor];
  // Mostrar el botón de seleccionar video
  videoButton.style.display = 'block';
  // Cargar el video en el reproductor
  loadVideo(videoUrl);
  // Hacer lo que necesites con el color seleccionado
  console.log('Color seleccionado:', selectedColor);
});

// Función para cargar la textura desde un video
function loadTextureFromVideo(videoUrl, faceIndex) {
  // Verificar que el índice de cara sea válido
  if (faceIndex >= 0 && faceIndex < gTextures.length) {
    // Crear una textura WebGL
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Crear un elemento de video
    var video = document.createElement('video');
    video.crossOrigin = 'anonymous';  // Si los videos están en otro dominio

    // Configurar el source del elemento de video
    video.src = videoUrl;
    video.load(); // Cargar el video

    // Esperar a que el video esté cargado para configurar la textura
    video.onloadeddata = function() {
      // Configurar la textura con el video
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);

      // Configurar parámetros de la textura para permitir mipmapping
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

      // Asignar la textura al sampler en el shader
      gl.activeTexture(gl.TEXTURE0 + faceIndex);  // Utiliza unidades de textura diferentes para cada cara
      gl.bindTexture(gl.TEXTURE_2D, texture);

      // Asegúrate de que render() se llame después de cargar la textura
      render();
    };
    // Reproducir el video
    video.src = videoUrl;
    video.load();
    video.play();

  } else {
    console.error("Índice de cara fuera de rango:", faceIndex);
  }
}

// Función para obtener el índice de cara por color
function obtenerIndiceDeCaraPorColor(color) {
  const colores = ['rojo', 'verde', 'azul', 'amarillo', 'magenta', 'cian'];
  const indice = colores.indexOf(color);
  return indice !== -1 ? indice : 0;
}

