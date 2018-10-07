/********************** Рисование в канвас *************************/
const penWidth = 4;

let checkedColorBtn = menu.querySelector(`.menu__color[checked=""]`);
let penColor = getComputedStyle(checkedColorBtn.nextElementSibling).backgroundColor;
let strokes = [];
let isDrawing = false;
let needsRendering = false;

const drawPoint = point => {
  ctx.beginPath();
  ctx.arc(...point, penWidth / 2, 0, 2 * Math.PI);
  ctx.fill();
};

const drawStroke = points => {
  ctx.beginPath();
  ctx.lineCap = ctx.lineJoin = "round";
  ctx.moveTo(...points[0]);
  for (let i = 1; i < points.length - 1; i++) {
    ctx.lineTo(...points[i], ...points[i + 1]);
  }
  ctx.stroke();
};

const makePoint = (x, y) => [x, y];

const draw = () => {
  strokes.forEach(stroke => {
    drawPoint(stroke[0]);
    drawStroke(stroke);
  });
};

const sendMask = () => {
  canvas.toBlob(blob => socket.send(blob));
};

const mouseDown = event => {
  if (drawBtn.dataset.state === "selected") {
    isDrawing = true;

    const stroke = [];
    stroke.push(makePoint(event.offsetX, event.offsetY));
    strokes.push(stroke);
    needsRendering = true;
  }
};

const mouseMove = event => {
  if (isDrawing) {
    const stroke = strokes[0];
    stroke.push(makePoint(event.offsetX, event.offsetY));
    needsRendering = true;
  }
};

const mouseUp = event => {
  if (drawBtn.dataset.state === "selected") {
    isDrawing = false;
    strokes = [];
    setTimeout(sendMask, 1000);
  }
};

const initDraw = event => {
  ctx.strokeStyle = ctx.fillStyle = getComputedStyle(checkedColorBtn.nextElementSibling).backgroundColor;
  ctx.lineWidth = penWidth;

  const changeColor = event => {
    if (event.target.checked) {
      checkedColorBtn.removeAttribute("checked");
      checkedColorBtn = event.target;
      event.target.setAttribute("checked", "");

      ctx.strokeStyle = ctx.fillStyle = penColor = getComputedStyle(event.target.nextElementSibling).backgroundColor;
    }
  };

  drawTools.addEventListener("change", changeColor);
  canvas.addEventListener("mousedown", mouseDown);
  canvas.addEventListener("mousemove", mouseMove);
  canvas.addEventListener("mouseup", mouseUp);
  canvas.addEventListener("mouseleave", () => (isDrawing = false));
};

//Инициализация режима рисования:
drawBtn.addEventListener("click", initDraw);
