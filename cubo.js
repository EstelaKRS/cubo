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
 //var gTextures = [];
 //var gTextures = Array(6).fill(null);
// variable para rastrear el color actual seleccionado
var gCurrentColor = 'rojo';
//const colores = ['rojo', 'verde', 'azul', 'amarillo', 'magenta', 'cian'];


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
  //gTextures[i] = ['video_url_1', 'video_url_2', 'video_url_3', 'video_url_4', 'video_url_5', 'video_url_6'];
  gTextures[i] = videos[i];
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
  loadAllVideos(videoUrls)
    .then(() => {
        // Renderizar tu cubo con los videos
        render();
    })
    .catch((error) => {
        console.error('Error cargando videos:', error);
    });

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
  
    const faceIndex = obtenerIndiceDeCaraPorColor(gCurrentColor);
    console.log('Índice de cara:', faceIndex);
  
    // Obtén el elemento de video
    var video = document.getElementById("video");
  
    // Cargar el video correspondiente a la cara específica
    console.log('Valor de faceIndex en crieInterface:', faceIndex);
    //loadVideoToTexture(videoUrls, currentFaceIndex);
    colorList.addEventListener('change', () => {
      // Obtener el color seleccionado
      const selectedColor = colorList.value;
      // Obtener el índice del color seleccionado
      const colorIndex = obtenerIndiceDeCaraPorColor(selectedColor);
      // Obtener la URL del video asociado al color utilizando el índice
      const videoUrl = videoUrls[colorIndex];
      const videoTexture = gTextures[colorIndex];
    
      // Mostrar el botón de seleccionar video
      videoButton.style.display = 'block';
    
      // Cargar el video en el reproductor
      loadVideoToTexture(videoUrl, videoTexture);
    });
    configureTextureFromVideo(video, faceIndex);
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
  gl.useProgram(gShader.program);  // Asegúrate de usar el programa de shaders antes de realizar operaciones
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // modelo muda a cada frame da animacion 
  if (!gCtx.pause) gCtx.theta[gCtx.axis] += 0.5;

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
// Función para cargar texturas
// Definir las URL de los videos
const videoUrls = [
  "video_url_rojo.mp4",
  "video_url_verde.mp4",
  "video_url_azul.mp4",
  "video_url_amarillo.mp4",
  "video_url_magenta.mp4",
  "video_url_cian.mp4",
];
// Crear un array para almacenar las texturas
//const gTextures = Array(6).fill(null);

// Crear un array para almacenar las caras del cubo
//const gCaras = [];
function crieCubo() {
  quad(1, 0, 3, 2);
  quad(2, 3, 7, 6);   
  quad(3, 0, 4, 7);
  quad(6, 5, 1, 2);
  quad(4, 5, 6, 7);
  quad(5, 4, 0, 1);

  // Llenar gCaras con las caras del cubo
  for (let i = 0; i < 6; i++) {
    const videoUrl = videoUrls[i];
    //gTextures.push(loadVideoToTexture(videoUrl, i));
    //numerarCara(i);
    const texture = loadVideoToTexture(videoUrl, i);
    gTextures.push(texture);
    numerarCara(i);
}
}

function numerarCara(faceIndex) {
    const baseIndex = faceIndex * 4;

    // Configurar el número de cara para el shader
    setNumeroCara(faceIndex + 1);

    // Llamar a la función quad una vez para cada cara
    quad(baseIndex, baseIndex + 1, baseIndex + 2, baseIndex + 3);
}


// Modifica la función configureTextureFromVideo
function configureTextureFromVideo(video, faceIndex) {
  console.log('Configurando textura para la cara:', faceIndex);
  // Verificar que el índice de cara sea válido
  if (faceIndex >= 0 && faceIndex < gTextures.length) {
      // Crear una textura WebGL
      var texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);

      // Configurar la textura con el video
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);

      // Verificar si las dimensiones del video son potencias de 2
      if (!isPowerOf2(video.width) || !isPowerOf2(video.height)) {
          // Si no son potencias de 2, configurar la textura sin mipmapping
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      } else {
          // Configurar parámetros de la textura para permitir mipmapping
          gl.generateMipmap(gl.TEXTURE_2D);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      }

      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

      // Asignar la textura al sampler en el shader
      gl.activeTexture(gl.TEXTURE0 + faceIndex);
      gl.uniform1i(gShader[`uTextureMap${faceIndex}`], faceIndex);

      // Asegúrate de que render() se llame después de cargar la textura
      render();
  } else {
      console.error("Índice de cara fuera de rango:", faceIndex);
  }
}
// Función para verificar si un número es potencia de 2
function isPowerOf2(value) {
  return (value & (value - 1)) === 0;
}

// Función para cargar texturas
let cv;
let isOpencvReady = false;

function onOpenCvReady() {
  console.log('OpenCV.js está listo');
  // Verificar si OpenCV.js está listo
  if (cv) {
    isOpencvReady = true;

    // La función a ejecutar cuando OpenCV.js esté listo
    loadAllVideos(videoUrls)
        .then(() => {
            // Renderizar tu cubo con los videos
            render();
        })
        .catch((error) => {
            console.error('Error cargando videos:', error);
        });
  }
}

 
function loadVideoToTexture(videoUrl, texture, faceIndex) {
  const video = document.createElement('video');
  video.crossOrigin = 'anonymous';
  video.autoplay = true;
  video.muted = true;
  video.loop = true;

  // Asigna el evento para manejar el error de carga del video
  video.addEventListener('error', function () {
    console.error('Error cargando el video:', videoUrl);
  });

  // Asigna el evento que se ejecuta cuando el video se carga correctamente
  video.addEventListener('loadeddata', function () {
    // Configura la textura con el video
    configureTextureFromVideo(video, faceIndex);

    // Elimina el evento de carga, ya que ya se cargó el video
    video.removeEventListener('loadeddata', this);
  });

  // Establece la fuente del video y comienza la carga
  video.src = videoUrl;
}


// Función para cargar todos los videos
function loadAllVideos(videoUrls) {
  const videoTextures = [];

  // Iteramos sobre las URL de los videos
  const loadPromises = videoUrls.map((videoUrl, i) => {
    return loadVideoToTexture(videoUrl, i)
      .then((video) => {
        videoTextures.push(video);
      })
      .catch((error) => {
        console.error(`Error cargando el video desde ${videoUrl}:`, error);
        // Puedes decidir cómo manejar el error, como cargar una textura de error o simplemente ignorarlo
      });
  });

  // Resuelve la promesa cuando todas las texturas de video se han cargado (o han fallado)
  return Promise.all(loadPromises).then(() => videoTextures);
}




// Obtener el botón y agregar un evento de clic
const playButton = document.getElementById('playButton');
playButton.addEventListener('click', playAllVideos);

// Función para reproducir todos los videos
function playAllVideos() {
  // Iterar sobre todos los videos y reproducirlos
  gTextures.forEach((video, index) => {
    video.play().catch(error => {
      // Manejar cualquier error de reproducción
      console.error(`Error al reproducir el video en la cara ${index}:`, error);
    });
  });
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
var gTextures = Array(6).fill(null);
//const gTextures = [];

// Al cargar suficientes datos, intentar reproducir el video
videos[currentFaceIndex].addEventListener('loadeddata', function () {
  videos[currentFaceIndex].play();
  videoReady = true; // Marcar el video como listo

  // Llama a render solo cuando el video está listo
  if (videoReady) {
      render();
  }
});

// Crear un array para almacenar las texturas
//Texturas para cada cara
// Verifica cómo estás asignando las texturas a las caras del cubo
for (let i = 0; i < gCaras.length; i++) {
  const cara = gCaras[i];
  // Crear textura vacía y asignarla a la cara
  const texture = new THREE.Texture();
  cara.material.map = texture;
  gTextures.push(texture);
}



//loadVideoToTexture(videoUrls[currentFaceIndex], currentFaceIndex);
loadVideoToTexture(videoUrl, gTextures[faceIndex], faceIndex);

// Modifica la función handleVideoSelect para cargar el video usando loadVideoToTexture

function handleVideoSelect(event) {
  console.log("Evento de cambio activado");
  const selectedVideo = event.target.files[0];

  if (selectedVideo && isOpencvReady) {
    const videoUrl = URL.createObjectURL(selectedVideo);

    // Obtén el índice de la cara actualmente seleccionada
    const currentColor = colorList.value;
    const currentFaceIndex = obtenerIndiceDeCaraPorColor(currentColor);

    console.log("Color seleccionado:", currentColor);
    console.log("Índice de cara:", currentFaceIndex);

    // Verifica que el índice de cara sea válido
    if (currentFaceIndex !== undefined && currentFaceIndex >= 0 && currentFaceIndex < gTextures.length) {
      // Cargar el video en el contexto WebGL y actualizar la textura
      loadVideoToTexture(videoUrl, gTextures[currentFaceIndex], currentFaceIndex);
    } else {
      console.error("Índice de cara no válido:", currentFaceIndex);
    }
  }
}


function animate() {
  requestAnimationFrame(animate);

  // Actualizar la textura en cada frame
  for (let i = 0; i < caras.length; i++) {
      if (videos[i].readyState === videos[i].HAVE_ENOUGH_DATA) {
          caras[i].material.map.needsUpdate = true;
          console.log('Textura actualizada para cara:', i);
      }
  }

  // Renderizar tu escena
  renderer.render(scene, camera);
}
