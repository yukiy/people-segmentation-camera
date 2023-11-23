let segmenter;

export async function segmentationSetup () {
  const model = bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation; // or 'BodyPix'
  const segmenterConfig = {
    runtime: 'mediapipe', // or 'tfjs'
    solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation',
    modelType: 'general'// or 'landscape'
  }
  segmenter = await bodySegmentation.createSegmenter(model, segmenterConfig);
}

async function getSegmenter() {
  if (!segmenter) await segmentationSetup();
  return segmenter;
}

export async function drawMaskUpdate (input, output) {
  const segmenter = await getSegmenter();
  const segmentPeople = await segmenter.segmentPeople(input);
  const foregroundColor = {r: 0, g: 0, b: 0, a: 0};
  const backgroundColor = {r: 0, g: 0, b: 0, a: 255};
  const drawContour = false;
  const foregroundThreshold = 0.6;  
  const backgroundDarkeningMask = await bodySegmentation.toBinaryMask(segmentPeople, foregroundColor, backgroundColor, drawContour, foregroundThreshold);
  const opacity = 1;
  const maskBlurAmount = 2; // Number of pixels to blur by.  
  await bodySegmentation.drawMask(output, input, backgroundDarkeningMask, opacity, maskBlurAmount);
}

/** bodypix is deprecated */
async function segmentBody(input, output) {
  const bodypixnet = await bodyPix.load();

  async function renderFrame() {
    const segmentPerson = await bodypixnet.segmentPerson(input);

    /** Draw bokeh effect */
    const backgroundBlurAmount = 3;
    const edgeBlurAmount = 3;
    const flipHorizontal = true;
    bodyPix.drawBokehEffect(
      output, input, segmentPerson, backgroundBlurAmount,
      edgeBlurAmount, flipHorizontal
    );

    /** extract unmasked pixels */
    const rgbaArray = getRgbaFromVideo(input);
    const filteredRgbaArray = rgbaArray.map((rgb, i) => {
      if (segmentPerson.data[i] === 0) {
        return [0, 0, 0, 0];
      } else {
        return rgb;
      }
    });
    drawPerson2D(filteredRgbaArray, ctx2, cvs2.width, cvs2.height);
    requestAnimationFrame(renderFrame);
  }
  renderFrame();
}
