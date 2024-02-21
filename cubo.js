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

  // Arreglo para almacenar las texturas de cada cara
  var textures = Array(6).fill(null);

  // Colores iniciales para cada cara del cubo
  var materials = [
    new THREE.MeshBasicMaterial({ color: 0xFFFFFF }),  // Derecha // Blanco
    new THREE.MeshBasicMaterial({ color: 0xFF0000 }),   // Izquierda // Rojo
    new THREE.MeshBasicMaterial({ color: 0x808000 }),    // Superior // Oliva
    new THREE.MeshBasicMaterial({ color: 0x008080}),    // Inferior // Turquesa
    new THREE.MeshBasicMaterial({ color: 0xb9eac8 }),    // Frontal // Picker
    new THREE.MeshBasicMaterial({ color: 0x333333 })     // Posterior // Gris Oscuro
  ];

  var cube = new THREE.Mesh(geometry, materials);
  cube.scale.set(3, 3, 3);
  scene.add(cube);

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

  var animate = function () {
    requestAnimationFrame(animate);

    if (isRotating) {
      cube.rotation.x += 0.01;
      cube.rotation.y += 0.01;
    }

    renderer.render(scene, camera);
  };

  animate();

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

  // Botón para seleccionar imagen para cada cara
  var selectImageButton = createButton('Seleccionar Imagen', function () {
    selectImage();
  });

  buttonContainer.appendChild(rotateXButton);
  buttonContainer.appendChild(rotateYButton);
  buttonContainer.appendChild(rotateZButton);
  buttonContainer.appendChild(pauseButton);
  buttonContainer.appendChild(selectImageButton);

  document.body.appendChild(buttonContainer);

  // Función para crear botones
  function createButton(text, clickHandler) {
    var button = document.createElement('button');
    button.textContent = text;
    button.addEventListener('click', clickHandler);
    return button;
  }

  // Función para seleccionar una nueva imagen para cada cara
  function selectImage() {
    // Abre el diálogo de selección de archivos para cada cara
    for (var i = 0; i < 6; i++) {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.dataset.index = i;
      input.addEventListener('change', handleImageSelection);
      input.click();
    }
  }

  // Manejador de eventos para la selección de imágenes
  function handleImageSelection(event) {
    console.log("Imagen seleccionada para la cara:", this.dataset.index);
    var files = event.target.files;
    if (files.length > 0) {
      var index = parseInt(this.dataset.index);

      // Carga la imagen seleccionada como textura
      var texture = new THREE.TextureLoader().load(URL.createObjectURL(files[0]));
      textures[index] = texture;

      // Crea un nuevo material con la textura seleccionada
      var newMaterial = new THREE.MeshBasicMaterial({ map: texture });

      // Asigna el nuevo material solo a la cara correspondiente
      cube.material[index] = newMaterial;

      // Reprende el renderizado para actualizar los cambios
      renderer.render(scene, camera);
    }
  }
});
