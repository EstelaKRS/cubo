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
// variables locales
var gl;
var gCanvas;
var gShader = {};  // encapsula globais do shader

//let gTextures = [];
//let gVideos = [];
let videoTextures = [];  // ¡Declarar videoTextures como una variable global!
let faceIndex = [];


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
 //var gTextures = [];
 //var gTextures = Array(6).fill(null);
// variable para rastrear el color actual seleccionado
var gCurrentColor = ['rojo', 'verde', 'azul', 'amarillo', 'magenta', 'cian'];
//const colores = ['rojo', 'verde', 'azul', 'amarillo', 'magenta', 'cian'];


/**
 * programa principal.
 */
//let fileInput;
function main() {
  // Configuración del ambiente WebGL
  console.log('Antes de crear el contexto WebGL');
  gCanvas = document.getElementById("glcanvas");
  gl = gCanvas.getContext('webgl2');
  if (!gl) {
    console.error('Error en la carga de videos: Contexto WebGL no definido');
    return;
  }
  console.log('Contexto WebGL inicializado correctamente');
  console.log("Canvas: ", gCanvas.width, gCanvas.height);
  console.log('Contexto WebGL:', gl);

  // Manejar el evento de cambio en el input de tipo file
  const fileInput = document.getElementById('videoInput');

  if (fileInput) {
    fileInput.addEventListener('change', handleVideoSelect); 
  } else {
    console.error("Elemento 'videoInput' no encontrado en el documento.");
  }
  scene = new THREE.Scene();

  // Crear cubo con textura y numerar las caras
  crieCubo();  

 // Inicializar la matriz de texturas (6 caras x N videos por cara)
 for (let i = 0; i < 6; i++) {
  let texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0])); // Puedes ajustar estos valores según tus necesidades
  gTextures.push(texture);
}

  // Configuración de la interfaz
  crieInterface();

  // Inicializaciones realizadas una vez
  gl.viewport(0, 0, gCanvas.width, gCanvas.height);
  gl.clearColor(FUNDO[0], FUNDO[1], FUNDO[2], FUNDO[3]);
  gl.enable(gl.DEPTH_TEST);

  // Configurar shaders y renderizar
  
  crieShaders();
  //render();
  //cargarTexturas();
 
  loadAllVideos()
  .then((loadedVideos) => {
    console.log('Videos cargados:', loadedVideos);
    gTextures = loadedVideos;
    render(); // Intenta renderizar después de cargar los videos
  })
  .catch((error) => {
    console.error('Error cargando videos:', error);
  });
  //numerarCara(gl, 0);
  numerarCara(faceIndex,videoTextures);

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

  document.getElementById("colorList").addEventListener('change', function () {
    let gTextures = [];
    gCurrentColor = this.value;
    const faceIndex = obtenerIndiceDeCaraPorColor(gCurrentColor);
    console.log('Índice de cara:', faceIndex);
  
    // Obtén el elemento de video
    var video = document.getElementById("video");
  
    // Asegúrate de que faceIndex esté dentro de los límites
  if (faceIndex >= 0 && faceIndex < gTextures.length) {
    // Asegúrate de que gTextures[faceIndex] esté definido
    if (gTextures[faceIndex]) {
      // Suponiendo que gTextures es un array que contiene las texturas
      gl.bindTexture(gl.TEXTURE_2D, gTextures[faceIndex]);
      configureTextureFromVideo(gl, gTextures[faceIndex], video, faceIndex);

    } else {
      console.error('Error: La textura para la cara especificada no está definida.');
    }
  } else {
    console.error('Error: Índice de cara fuera de rango');
  }
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
 * Usa o shader para diseñar.
 * Assume que os dados já foram carregados e são estáticos.
 */
function render() {
  console.log('Texturas:', gTextures);
    //console.log('Videos cargados:', gVideos);
  //console.log('Renderizando...');
  gl.useProgram(gShader.program);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  if (!gCtx.pause) gCtx.theta[gCtx.axis] += 0.5;
  let rx = rotateX(gCtx.theta[EIXO_X]);
  let ry = rotateY(gCtx.theta[EIXO_Y]);
  let rz = rotateZ(gCtx.theta[EIXO_Z]);
  let model = mult(rz, mult(ry, rx));

  gl.uniformMatrix4fv(gShader.uModelView, false, flatten(mult(gCtx.vista, model)));

  // Iterar sobre las caras y renderizar cada una con su número
  for (let i = 0; i < 6; i++) {
    gl.uniform1i(gShader.uNumeroCara, i + 1);
    //gl.bindTexture(gl.TEXTURE_2D, gCaras[i]);  // Usa gCaras en lugar de gTextures
    gl.drawArrays(gl.TRIANGLES, i * 6, 6);
  }

  window.requestAnimationFrame(render);
}

function renderLoop() {
  try {
    render();
    window.requestAnimationFrame(renderLoop);
  } catch (error) {
    console.error('Error en el bucle de renderización:', error);
    // Puedes detener el bucle o manejar el error de otra manera
  }
  // Renderiza solo si todos los videos se han cargado correctamente
  if (gTextures.every(texture => texture instanceof HTMLVideoElement && !texture.error)) {
    window.requestAnimationFrame(render);
  } else {
    console.log('Esperando que todos los videos se carguen...');
    // Espera antes de volver a intentar renderizar
    setTimeout(renderLoop, 100);
  }
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
    // Obtener el color de la textura
    vec4 texColor = texture(uTextureMap, vTexCoord);

    // Si no hay textura, establecemos un color de fondo negro
    if (texColor.a == 0.0) {
        outColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }

    // Asignar el color de la textura
    outColor = texColor;
}
`;

// posiciones de los 8 vértices de un cubo de lado 1
// centrado en el origen
var gaPosicoes  = []; 
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
//const URL = "lluvia.mp4"
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
//let gCaras = Array(6).fill(null);
// Función para cargar texturas
// Definir las URL de los videos
/*const videoUrls = [
  "video_url_rojo.mp4",
  "video_url_verde.mp4",
  "video_url_azul.mp4",
  "video_url_amarillo.mp4",
  "video_url_magenta.mp4",
  "video_url_cian.mp4",
];*/

// Esta función cargará todos los videos y configurará las texturas
async function cargarVideos(files) {
  const videos = await Promise.all(Array.from(files).map((file, index) => cargarVideo(file, index)));

  // Asegurémonos de que todos los videos se cargaron correctamente
  if (videos.every(video => video instanceof HTMLVideoElement && !video.error)) {
    console.log('Todos los videos cargados');
    gVideos.push(...videos);  // Añadir los videos al array gVideos
    console.log('Videos cargados:', gVideos);
    console.log("Longitud de videoTextures después de cargar:", videoTextures.length);
    console.log("Longitud de gVideos después de cargar:", gVideos.length);
  } else {
    console.log('Al menos un video no se cargó correctamente');
  }
}



// Llamamos a la función para cargar los videos al cargar la página
document.addEventListener('DOMContentLoaded', cargarVideos);
// Crear un array para almacenar las caras del cubo
//const gCaras = [];
let scene;
function crieCubo() {
  // Crear las caras del cubo
  quad(1, 0, 3, 2);
  quad(2, 3, 7, 6);
  quad(3, 0, 4, 7);
  quad(6, 5, 1, 2);
  quad(4, 5, 6, 7);
  quad(5, 4, 0, 1);

  // Crear las caras 3D del cubo
  for (let i = 0; i < 6; i++) {
    console.log("Creando cara:", i);
    numerarCara(i,videoTextures);

  }
}

// Modifica la función numerarCara para que funcione con las nuevas incorporaciones
const texturasConfiguradas = new Array(6).fill(false);

// En tu función numerarCara, actualiza la llamada a configureTextureFromVideo
function numerarCara(faceIndex, videoTextures) {
  console.log("Calculando índice de cara para el color:", faceIndex);

  if (faceIndex >= 0 && faceIndex < videoTextures.length) {
    var baseIndex = faceIndex * 4;

    if (!texturasConfiguradas[faceIndex]) {
      setNumeroCara(faceIndex + 1);
      quad(baseIndex, baseIndex + 1, baseIndex + 2, baseIndex + 3);
      console.log("Configurando textura desde el video para la cara", faceIndex);
      configureTextureFromVideo(gl, videoTextures[faceIndex], gVideos[faceIndex], faceIndex);

      // Marcar la textura como configurada para esta cara
      texturasConfiguradas[faceIndex] = true;
    }
  } else {
    console.error("Índice de cara fuera de rango:", faceIndex);
  }
  console.log("Configurando textura desde el video para la cara", faceIndex);
configureTextureFromVideo(gl, videoTextures[faceIndex], gVideos[faceIndex], faceIndex);

}





// Asegúrate de que el video esté completamente cargado antes de usar la textura
video.addEventListener('loadeddata', function loadedDataHandler() {
  // Crear una textura
  const videoTexture = gl.createTexture();

  // Llamada a configureTextureFromVideo con gl como argumento
  configureTextureFromVideo(gl, videoTexture, video);

  // Aquí puedes realizar cualquier operación adicional después de que el video se ha cargado completamente
});

// Función para configurar la textura desde el video
function configureTextureFromVideo(gl, texture, video, faceIndex) {
  console.log('Texturas después de configurar:', gTextures);
  console.log('Configurando textura desde el video para la cara', faceIndex);


  // Asegúrate de que haya un video y tenga dimensiones válidas
  if (!video || !video.videoWidth || !video.videoHeight) {
    console.error(`Error: Video no válido para la cara ${faceIndex}`);
    return null;
  }

  // Si no se proporciona una textura, crea una nueva
  if (!texture) {
    texture = gl.createTexture();
  }

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  try {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
  } catch (error) {
    console.error(`Error cargando la textura para la cara ${faceIndex}:`, error);
    return null;
  }

  // Configurar la textura para cargar el video
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.generateMipmap(gl.TEXTURE_2D);

  // Manejador de error durante la carga del video
  function errorHandler() {
    console.error(`Error cargando el video para la cara ${faceIndex}:`, video.error);
    video.removeEventListener('error', errorHandler);
  }

  video.addEventListener('error', errorHandler);

  gl.bindTexture(gl.TEXTURE_2D, null);

  return texture;
}
// Función para verificar si un número es potencia de 2
function isPowerOf2(value) {
  return (value & (value - 1)) === 0;
}

// Función para cargar texturas
/*let cv;
let isOpencvReady = false;

// Función para verificar y llamar a onOpenCvReady
function onOpenCvReady() {
  console.log('OpenCV.js está listo');

  // Verificar si OpenCV.js está listo
  if (cv) {
    isOpencvReady = true;

    // La función a ejecutar cuando OpenCV.js esté listo
    loadAllVideos(videoUrls)
      .then((loadedVideos) => {
        console.log('Videos cargados:', loadedVideos);
        gTextures = loadedVideos;
        render(); // Intenta renderizar después de cargar los videos
        handleVideoSelect('tuColor'); // Puedes pasar el color que necesites
      })
      .catch((error) => {
        console.error('Error cargando videos:', error);
      });
  } else {
    console.error('OpenCV.js no está cargado correctamente o el elemento de color no se encontró');
  }
}*/


// configuración de las texturas
// Esta función acepta un objeto File y el índice de la cara
let gTextures = []; // Asegúrate de que gTextures esté definido
let gVideos = [];   // Asegúrate de que gVideos esté definido
let videoTexture = [];
let videoUrls = [];

function cargarVideo(file, faceIndex) {
  gVideos[index] = video;

  console.log(`Cargando video para la cara ${faceIndex}`);

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.autoplay = true;
    video.muted = true;
    video.loop = true;

    if (URL.createObjectURL && file.type.startsWith('video')) {
      const videoUrl = URL.createObjectURL(file);
      video.src = videoUrl;

      video.addEventListener('error', (event) => {
        console.error(`Error cargando el video para la cara ${faceIndex}:`, event);
        URL.revokeObjectURL(videoUrl);
        reject(`Error cargando video para la cara ${faceIndex}`, event);
      });
      

      video.addEventListener('loadeddata', function loadedDataHandler() {
        console.log(`Video cargado para la cara ${faceIndex}`);
         // Configurar la textura WebGL aquí
        try {
          const videoTexture = configureTextureFromVideo(gl, null, video, faceIndex);
          gVideos[faceIndex] = video; // Agregar el video al array
          resolve({ video, videoTexture });
        } catch (error) {
          console.error(`Error configurando textura para la cara ${faceIndex}:`, error);
          reject(`Error configurando textura para la cara ${faceIndex}`);
        } finally {
          video.removeEventListener('loadeddata', loadedDataHandler);
          URL.revokeObjectURL(videoUrl);
        }
      });
      video.addEventListener('error', function errorHandler() {
        console.error(`Error cargando el video para la cara ${faceIndex}`);
    });

    } else {
      console.error(`Error: La URL del objeto File no es válida para la cara ${faceIndex}`);
      reject(`Error: La URL del objeto File no es válida para la cara ${faceIndex}`);
    }
  });
}


// Función para cargar todos los videos
function loadAllVideos() {
  const loadPromises = videoUrls.map((videoUrl, i) => {
    return cargarVideo(videoUrl, i) // Pasar la textura WebGL como argumento
      .then((video) => {
        if (video) {
          // No necesitas configurar la textura aquí, ya que se hace en cargarVideo
          gVideos[i] = video;
          console.log(`Video cargado para la cara ${i}`);
          console.log('Longitud de videoTextures después de cargar:', gTextures.filter(t => t !== null).length);
          console.log('Longitud de gVideos después de cargar:', gVideos.filter(v => v !== null).length);
        } else {
          console.error(`Error cargando el video desde ${videoUrl}`);
        }
      })
      .catch((error) => {
        console.error(`Error cargando el video desde ${videoUrl}:`, error);
      });
  });

  return Promise.all(loadPromises)
    .then(function () {
      console.log('Todos los videos cargados');
      console.log('Texturas: ', gTextures);
      console.log('Videos cargados: ', gVideos);
      console.log('Renderizando...');
      render();
    })
    .catch(function (error) {
      console.error('Error al cargar videos:', error);
    });
}



// Obtener el botón y agregar un evento de clic
const playButton = document.getElementById('playButton');
playButton.addEventListener('click', playAllVideos);

function playAllVideos() {
  console.log('Botón de reproducción clickeado');

  // Pausar todos los videos antes de intentar reproducirlos
  videoTextures.forEach(video => video.pause());

  // Reproducir videos cuando estén listos
  videoTextures.forEach((video, index) => {
    video.addEventListener('loadedmetadata', () => {
      console.log(`Video en la cara ${index} cargado completamente`);
      video.play().catch(error => {
        console.error(`Error al reproducir el video en la cara ${index}:`, error);
      });
    });
  });
}



// Obtener referencias a elementos HTML
const colorButton = document.getElementById('colorButton');
const colorDropdown = document.getElementById('colorDropdown');
const fileInput = document.getElementById('videoInput');
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

// Función para obtener el índice de cara por color
function obtenerIndiceDeCaraPorColor(color) {
  const colores = ['rojo', 'verde', 'azul', 'amarillo', 'magenta', 'cian'];
  const indice = colores.indexOf(color);
  return indice !== -1 ? indice : 0;
}

// Asignar videos a cada cara
let videoReady = false;
let currentFaceIndex = 0;
const videos = [];
//var gTextures = Array(6).fill(null);
//const gTextures = [];
// Inicializa los videos y añádelos al array
for (let i = 0; i < 6; i++) {
  videos[i] = document.createElement('video');
  // Configura los eventos y demás, si es necesario
}
// Al cargar suficientes datos, intentar reproducir el video
videos.forEach((video, faceIndex) => {
  video.addEventListener('loadeddata', function () {
    video.play();
    videoReady = true; // Marcar el video como listo

    // Llama a render solo cuando todos los videos están listos
    if (videoReady) {
      render();
    }
  });
});
// Texturas para cada cara
// Actualizar la textura en cada frame
for (let i = 0; i < gTextures.length; i++) {
  if (gTextures[i] !== null) {
    gTextures[i].update();
  }
}


// Modifica la función handleVideoSelect para cargar el video usando cargarVideo
function handleVideoSelect(color) {
  console.log('handleVideoSelect llamada');
  console.log('currentColor:', color);
  const files = event.target.files;

  // Obtén las URLs de los videos seleccionados
  const videoUrls = Array.from(files).map(file => URL.createObjectURL(file));
   // Cargar todos los videos
  loadAllVideos(videoUrls).then(videos => {
    // Asegúrate de que gTextures esté definida antes de usarla
  if (gTextures && gTextures.length > 0) {
    const currentFaceIndex = calculateFaceIndexForColor(color);
    console.log('currentFaceIndex:', currentFaceIndex);

    render();
  } else {
    console.error('gTextures no está definida o es un array vacío');
  }
  });
  
}


function handleFileSelect(event) {
  const files = event.target.files;

  // Obtener las URL de los videos desde los archivos seleccionados
  const videoUrls = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const videoUrl = URL.createObjectURL(file);
    videoUrls.push(videoUrl);
  }

  // Llamada a loadAllVideos con las texturas y videos correspondientes
  loadAllVideos(videoUrls, gTextures, gVideos);
}

function animate() {
  requestAnimationFrame(animate);

  // Actualizar la textura en cada frame
  for (let i = 0; i < videoTextures.length; i++) {
    const texture = videoTextures[i];

    if (texture instanceof HTMLVideoElement && texture.readyState === texture.HAVE_ENOUGH_DATA) {
      caras[i].material.map.needsUpdate = true;
      console.log('Textura actualizada para cara:', i);
    }
  }

  // Renderizar tu escena
  renderer.render(scene, camera);
}
