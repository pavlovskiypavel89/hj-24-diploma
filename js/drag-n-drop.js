/*********************** Drag'n'Drop меню *************************/
let dragged = null;
let draggedSettings = null;

const throttle = cb => {
  let isWaiting = false;
  return function(...args) {
    if (!isWaiting) {
      cb.apply(this, args);
      isWaiting = true;
      requestAnimationFrame(() => (isWaiting = false));
    }
  };
};

const putMenu = event => {
  if (event.target.classList.contains("drag")) {
    dragged = event.currentTarget;

    const draggedBounds = event.target.getBoundingClientRect();
    const draggedCSS = getComputedStyle(dragged);

    draggedSettings = {
      shiftX: draggedBounds.width / 2,
      shiftY: draggedBounds.height / 2,
      minX: app.offsetLeft,
      maxX: app.offsetWidth - Number(draggedCSS.width.replace("px", "")),
      minY: app.offsetTop,
      maxY: app.offsetHeight - Number(draggedCSS.height.replace("px", ""))
    };
  }
};

const dragMenu = (pageX, pageY) => {
  if (dragged) {
    event.preventDefault();
    let X = pageX - draggedSettings.shiftX;
    let Y = pageY - draggedSettings.shiftY;

    X = Math.min(X, draggedSettings.maxX);
    Y = Math.min(Y, draggedSettings.maxY);
    X = Math.max(X, draggedSettings.minX);
    Y = Math.max(Y, draggedSettings.minY);

    dragged.style.left = X + "px";
    dragged.style.top = Y + "px";
    dragged.style.pointerEvents = "none";
  }
};

const dropMenu = () => {
  if (dragged) {
    const menuSettings = getSessionSettings("menuSettings");

    dragged.style.pointerEvents = "";
    if (menuSettings) {
      menuSettings.left = dragged.offsetLeft;
      menuSettings.top = dragged.offsetTop;
      sessionStorage.menuSettings = JSON.stringify(menuSettings);
    } else {
      sessionStorage.menuSettings = JSON.stringify({
        left: dragged.offsetLeft,
        top: dragged.offsetTop
      });
    }
    dragged = null;
  }
};

const moveMenu = throttle((...coords) => dragMenu(...coords), true);
menu.addEventListener("mousedown", putMenu);
app.addEventListener("mousemove", event => moveMenu(event.pageX, event.pageY));
app.addEventListener("mouseup", dropMenu);
