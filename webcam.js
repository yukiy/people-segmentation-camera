export async function startCamera(inputVideoEl, canvasW, canvasH) {
  const stream = await navigator.mediaDevices.getUserMedia({
    'video': {
      width: canvasW,
      height: canvasH
    },
    'audio': false,
  });

  inputVideoEl.srcObject = stream;

  const playPromise = new Promise((resolve) => {
    inputVideoEl.onloadedmetadata = () => {
      inputVideoEl.play();
      resolve();
    };
  });

  return playPromise;
}

export function stopCamera(inputVideoEl) {
  inputVideoEl.pause();
  inputVideoEl.srcObject = null;
}