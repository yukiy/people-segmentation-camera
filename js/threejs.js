import * as THREE from 'three';
let scene, camera, renderer, clock;
let geometry, material, mesh;
let vertices, colors;
let rot = 0;
let videoWidth;
let videoHeight;

export function threeSetup(width, height){
  videoWidth = width;
  videoHeight = height;
  const threeContainerEl = document.getElementById('three-container');
  const threeCanvasEl = document.getElementById('three-canvas');

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.x = 0;
  camera.position.y = 0;
  camera.position.z = 1000;
  camera.lookAt(new THREE.Vector3(0, 0, 0));

  renderer = new THREE.WebGLRenderer({ canvas: threeCanvasEl });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(threeCanvasEl.width, threeCanvasEl.height);
  threeContainerEl.appendChild(renderer.domElement);
  renderer.render(scene, camera);

  clock = new THREE.Clock();

  createMesh(width, height);
}

function createMesh (width, height) {
  const length = width * height;

  vertices = [];
  for (let i = 0; i < length; i++) {
    const x = i % width -width/2;
    const y = -Math.floor(i / width) + height/2;
    const z = 0;
    vertices.push(x, y, z);
  }

  colors = [];
  for (let i = 0; i < length; i++) {
    const r = Math.random();
    const g = Math.random();
    const b = Math.random();
    colors.push(r, g, b);
  }

  geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

  material = new THREE.PointsMaterial({
    size: 1,
    vertexColors: true,
    transparent: true, 
    side: THREE.DoubleSide,
  });

  mesh = new THREE.Points(geometry, material);
  scene.add(mesh);
}

export function drawOutput3D(rgbaArray) {
  updateMeshColors(videoWidth, videoHeight, rgbaArray);

  // -- カメラの回転
  let cameraRadius = 1000;
  rot += 1;
  const radian = (rot * Math.PI) / 180;
  cameraRadius = 5000 * (Math.sin(radian)/10) + 1000;
  camera.position.x = cameraRadius * (Math.sin(radian)/5);
  camera.position.z = cameraRadius * (Math.cos(radian)/5);
  camera.lookAt(new THREE.Vector3(0, 0, 0));

  renderer.render(scene, camera);
}

function updateMeshColors (width, height, rgbaArray) {
  const length = width * height;
  const newColors = [];
  for (let i = 0; i < length; i++) {
    let r, g, b = 0;
    // -- 境界線のぼかしは黒にして隠す
    if(i<width*4 || i%width < 10 || i%width > width-10 || i>length-width*4) {
      r = 0;
      g = 0;
      b = 0;
    }else{
      r = rgbaArray[i][0] / 255;
      g = rgbaArray[i][1] / 255;
      b = rgbaArray[i][2] / 255;  
    }
    newColors.push(r, g, b);
  }
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(newColors, 3));
  colors = newColors;
  geometry.attributes.color.needsUpdate = true;
}

export function threeReset () {
  while (scene.children.length > 0) {
    scene.remove(scene.children[0]);
  }
  scene.clear();
  renderer.clear();

  scene = null;
  camera = null;
  renderer = null;
  clock = null;
  geometry = null;
  material = null;
  mesh = null;
  vertices = null;
  colors = null;
  rot = 0;
}