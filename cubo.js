document.addEventListener('DOMContentLoaded', function () {
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
  camera.position.z = 5;

  var renderer = new THREE.WebGLRenderer();
  document.body.appendChild(renderer.domElement);

  var canvasSize = Math.min(400, window.innerWidth, window.innerHeight);

  renderer.setSize(canvasSize, canvasSize);
  renderer.setClearColor(0x4682B4);

  var canvasLeft = (window.innerWidth - canvasSize) / 2;
  var canvasTop = (window.innerHeight - canvasSize) / 2;

  renderer.domElement.style.position = 'absolute';
  renderer.domElement.style.left = canvasLeft + 'px';
  renderer.domElement.style.top = canvasTop + 'px';

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  var geometry = new THREE.BoxGeometry();

  // Arreglo para almacenar las texturas o videos de cada cara
  var textures = Array(6).fill(null);

  // Crear materiales con las texturas o videos asignados
  var materials = Array(6).fill(null).map(function (_, index) {
      return new THREE.MeshBasicMaterial({ map: textures[index], side: THREE.DoubleSide });
  });

  // Asignar los materiales al cubo
  var cube = new THREE.Mesh(geometry, materials);
  cube.scale.set(3, 3, 3);
  scene.add(cube);

  // Seguir el mouse
  document.addEventListener('mousemove', function (event) {
      var mouse = new THREE.Vector2();
      mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
      mouse.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;

      var raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      var intersects = raycaster.intersectObject(cube);

      if (intersects.length > 0) {
          var intersection = intersects[0];
          ball.position.copy(intersection.point);
      }
  });
 // Bolita desenfocada
  var ballGeometry = new THREE.SphereGeometry(0.2, 32, 32);

  // Ajusta el material para que sea transparente
  var ballMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.3 });

  var ball = new THREE.Mesh(ballGeometry, ballMaterial);
  scene.add(ball);


 var isRotating = true;

  function rotateCube(axis) {
      if (isRotating) {
          var rotationAmount = 2.5;
          switch (axis) {
              case 'x':
                  cube.rotation.x += rotationAmount;
                  break;
              case 'y':
                  cube.rotation.y += rotationAmount;
                  break;
              case 'z':
                  cube.rotation.z += rotationAmount;
                  break;
              default:
                  break;
          }
      }
  }

  function pauseRotateCube() {
      isRotating = !isRotating;
  }
  // Variables para el seguimiento del mouse
  var raycaster = new THREE.Raycaster();
  var mouse = new THREE.Vector2();
  var intersection = new THREE.Vector3();

  var animate = function () {
      requestAnimationFrame(animate);

      if (isRotating) {
          cube.rotation.x += 0.01;
          cube.rotation.y += 0.01;
      }

      renderer.render(scene, camera);
  };

  animate();
  
  // Evento de movimiento del mouse
  document.addEventListener('mousemove', function (event) {
    // Calcula las coordenadas normalizadas del mouse
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

    // Actualiza el rayo para el seguimiento del mouse
    raycaster.setFromCamera(mouse, camera);

    // Encuentra la intersección con el cubo
    var intersects = raycaster.intersectObject(cube);
    if (intersects.length > 0) {
        // Ajusta la posición de la bolita al centro del cursor
        intersection.copy(intersects[0].point);

        // Adicionalmente, puedes ajustar la altura de la bolita
        // según la posición del cursor en el eje Y (si lo deseas)
        //intersection.y = mouse.y * 5; // Ajusta el factor según tus necesidades
    }
  });

  // Actualización de la posición de la bolita
  var updateBallPosition = function () {
    requestAnimationFrame(updateBallPosition);

    // Actualiza la posición de la bolita según la intersección
    ball.position.copy(intersection);

    // Renderiza la escena
    renderer.render(scene, camera);
  };
  updateBallPosition();

  function resizeCanvas() {
      var canvasSize = Math.min(400, window.innerWidth, window.innerHeight);

      camera.aspect = 1;
      camera.updateProjectionMatrix();

      renderer.setSize(canvasSize, canvasSize);

      var canvasLeft = (window.innerWidth - canvasSize) / 2;
      var canvasTop = (window.innerHeight - canvasSize) / 2;

      renderer.domElement.style.left = canvasLeft + 'px';
      renderer.domElement.style.top = canvasTop + 'px';
  }

  // Crear botones y agregarlos al cuerpo del documento
  var buttonContainer = document.createElement('div');
  buttonContainer.style.position = 'absolute';
  buttonContainer.style.bottom = '20px';
  buttonContainer.style.left = canvasLeft + 'px';

  var rotateXButton = createButton('Rotar X', function () {
      rotateCube('x');
  });
  var rotateYButton = createButton('Rotar Y', function () {
      rotateCube('y');
  });
  var rotateZButton = createButton('Rotar Z', function () {
      rotateCube('z');
  });
  var pauseButton = createButton('Pausa/Rotar', function () {
      pauseRotateCube();
  });

  // Botón para seleccionar video para cada cara
  var selectVideoButton = createButton('Seleccionar Videos', function () {
      selectVideos();
  });

  buttonContainer.appendChild(rotateXButton);
  buttonContainer.appendChild(rotateYButton);
  buttonContainer.appendChild(rotateZButton);
  buttonContainer.appendChild(pauseButton);
  buttonContainer.appendChild(selectVideoButton);

  document.body.appendChild(buttonContainer);

  // Función para crear botones
  function createButton(text, clickHandler) {
      var button = document.createElement('button');
      button.textContent = text;
      button.addEventListener('click', clickHandler);
      return button;
  }

  // Función para seleccionar videos para cada cara
  function selectVideos() {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = 'video/*';
      input.multiple = true;
      input.addEventListener('change', handleVideoSelection);
      input.click();
  }

  var currentVideoIndex = 0;

  function handleVideoSelection(event) {
      console.log("Videos seleccionados");

      var files = event.target.files;
      if (files.length > 0) {
          for (var i = 0; i < Math.min(6, files.length); i++) {
              // Crea un elemento de video único para cada cara
              var video = document.createElement('video');
              video.src = URL.createObjectURL(files[i]);
              video.loop = true;
              video.muted = true;
              video.play();

              // Crea una textura de video única para cada cara
              var videoTexture = new THREE.VideoTexture(video);
              videoTexture.minFilter = THREE.LinearFilter;

              // Almacena la textura de video en el arreglo
              textures[currentVideoIndex] = videoTexture;

              // Actualiza el material de la cara correspondiente del cubo
              cube.material[currentVideoIndex].map = videoTexture;
              cube.material[currentVideoIndex].needsUpdate = true;

              // Incrementa el índice para la siguiente cara
              currentVideoIndex = (currentVideoIndex + 1) % 6;
          }

          // Reprende el renderizado para actualizar los cambios
          renderer.render(scene, camera);
      }
  }
  function applyBlurToBall() {
    // Obtener la posición de la bolita en coordenadas de pantalla
    var screenPosition = intersection.clone().project(camera);
    var canvasX = (screenPosition.x + 1) / 2 * window.innerWidth;
    var canvasY = (-screenPosition.y + 1) / 2 * window.innerHeight;

    // Definir las dimensiones de la región alrededor de la bolita para aplicar desenfoque
    var regionWidth = 100;
    var regionHeight = 100;

    // Obtener la matriz de píxeles de la escena
    var imageData = new Uint8Array(renderer.domElement.width * renderer.domElement.height * 4);
    renderer.domElement.getContext('webgl').readPixels(
        canvasX - regionWidth / 2, renderer.domElement.height - canvasY - regionHeight / 2,
        regionWidth, regionHeight, 
        renderer.domElement.getContext('webgl').RGBA, renderer.domElement.getContext('webgl').UNSIGNED_BYTE, imageData
    );

    // Crear una imagen OpenCV desde los datos de píxeles
    var src = cv.matFromImageData(new ImageData(new Uint8ClampedArray(imageData), regionWidth, regionHeight));
    var dst = new cv.Mat();

    // Crear un kernel para el desenfoque
    let kernel = new cv.Mat(5, 5, cv.CV_32F);
kernel.data32F.set([
    0.04, 0.04, 0.04, 0.04, 0.04,
    0.04, 0.04, 0.04, 0.04, 0.04,
    0.04, 0.04, 0.04, 0.04, 0.04,
    0.04, 0.04, 0.04, 0.04, 0.04,
    0.04, 0.04, 0.04, 0.04, 0.04
]);

    // Normalizar el kernel para que la suma sea 1
    cv.normalize(kernel, kernel, 1, 0, cv.NORM_L1, -1);

    // Aplicar el kernel al área de interés
    cv.filter2D(src, dst, cv.CV_8U, kernel);

    // Dibujar la imagen desenfocada en el contexto temporal
    cv.imshow(renderer.domElement, dst);

    // Liberar memoria
    src.delete();
    dst.delete();
    kernel.delete();
}

// Llamar a la función de desenfoque en cada fotograma
var blurAnimation = function () {
    requestAnimationFrame(blurAnimation);
    applyBlurToBall();
};

  
});
