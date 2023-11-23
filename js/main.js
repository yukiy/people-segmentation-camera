import { startCamera, stopCamera } from './webcam.js';
import { segmentationSetup, drawMaskUpdate } from './segmentation.js';
import { threeSetup, drawOutput3D, threeReset } from './threejs.js';

let isCameraOn = false;
let animationId = null;
let webcamStartButton = null;
let localFileInput = null;
let originalVideoEl = null;
let maskedVideoEl = null;
let output2DEl = null;
let resultWidth = 320;
let resultHeight = 240;

document.addEventListener('DOMContentLoaded', setup);

async function setup () {
  webcamStartButton = document.getElementById('start-button');
  webcamStartButton.addEventListener('click', onClidckCameraButton);

  localFileInput = document.getElementById('file-input');
  localFileInput.addEventListener('change', onLoadFileInput);

  /** WebCamの映像またはローカルのファイルが表示されるCanvas */
  originalVideoEl = document.getElementById('original-video');
  /** Segmentationのマスク画像が表示されるCanvas */
  maskedVideoEl = document.getElementById('maskoutput');
  /** ピクセル値を処理した画像が表示される2DのCanvas */
  output2DEl = document.getElementById('output2');

  await segmentationSetup();
}

async function onClidckCameraButton() {
  if(isCameraOn){
    webcamStartButton.innerText = 'Camera Start';
    isCameraOn = false;
  } else {
    webcamStartButton.innerText = 'Loading';
    webcamStartButton.disabled = true;
    await startCamera(originalVideoEl, resultWidth, resultHeight);
  }
  start();
}

async function onLoadFileInput () {
  if(isCameraOn){
    webcamStartButton.innerText = 'Camera Start';
    isCameraOn = false;
  } else {
    webcamStartButton.innerText = 'Loading';
    webcamStartButton.disabled = true;

    const file = localFileInput.files[0];
    const fileUrl = URL.createObjectURL(file);
    originalVideoEl.src = fileUrl;
    originalVideoEl.loop = true;
    originalVideoEl.load();
    await new Promise((resolve) => {
      originalVideoEl.onloadeddata = () => {
        resolve(originalVideoEl);
      };
    });
    originalVideoEl.width = originalVideoEl.videoWidth;;
    originalVideoEl.height = originalVideoEl.videoHeight;;
  }
  start();
}

async function start() {
  if(isCameraOn){
    cancelAnimationFrame(animationId);
    stopCamera(originalVideoEl);
    threeReset();
    clearCanvas(maskedVideoEl);
    clearCanvas(output2DEl);
  } else {
    threeSetup(resultWidth, resultHeight);
    webcamStartButton.innerText = 'Camera Stop';
    webcamStartButton.disabled = false;
    isCameraOn = true;

    function renderFrame() {

      /** 動画の解像度を揃える */
      const downscaledCanvas = getDownscaledCanvas(originalVideoEl, resultWidth, resultHeight);

      /** segmentationによるマスク */
      drawMaskUpdate(downscaledCanvas, maskedVideoEl);

      /** segmentationによるマスク画像から各ピクセル値を取得 */
      const rgbaArray = getRgbaFromCanvas(maskedVideoEl);

      /** 黒色のピクセルをフィルター（透明にする）*/
      const filteredRgbaArray = rgbaArray.map((rgb) => rgb[0]==0 && rgb[1]==0 && rgb[2]==0 ? [0, 0, 0, 0] : rgb);

      /** ピクセル値をCanvasに描画 */
      drawOutput2D(filteredRgbaArray, output2DEl);
      drawOutput3D(filteredRgbaArray);

      animationId = requestAnimationFrame(renderFrame);
    }
    renderFrame();
  }
}

function clearCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function getDownscaledCanvas (videoEl, newWidth, newHeight) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = newWidth;
  canvas.height = newHeight;
  ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** VideoのフレームをキャプチャしてピクセルのRGBA値を取得する関数 */
function getRgbaFromVideo(inputVideo) {
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = inputVideo.width;
  tempCanvas.height = inputVideo.height;
  const tempContext = tempCanvas.getContext('2d');
  tempContext.drawImage(inputVideo, 0, 0, tempCanvas.width, tempCanvas.height);
  return getRgbaFromCanvas(tempCanvas);
}

/** CanvasをキャプチャしてピクセルのRGBA値を取得する関数 */
function getRgbaFromCanvas(inputCanvas) {
  const ctx = inputCanvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, inputCanvas.width, inputCanvas.height);
  const pixels = imageData.data;
  const rgbaArray = [];
  for (let i = 0; i < pixels.length; i += 4) {
    const red = pixels[i];
    const green = pixels[i + 1];
    const blue = pixels[i + 2];
    const alpha = pixels[i + 3];
    rgbaArray.push([red, green, blue, alpha]);
  }
  return rgbaArray;
}

/** ピクセル値をCanvasに再描画 */
function drawOutput2D(rgbArray, outputEl) {
  const outputCtx = outputEl.getContext('2d');
  const width = outputEl.width;
  const height = outputEl.height;
  const flatArray = rgbArray.flat();
  const dst = outputCtx.createImageData(width, height);
  for(let i=0; i<dst.data.length; i++) {
    dst.data[i] = flatArray[i];
  }
  outputCtx.putImageData(dst, 0, 0);
}
