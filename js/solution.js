"use strict";
function initApp() {
  const [app] = document.getElementsByClassName("app"),
	[menu] = app.getElementsByClassName("menu"),
	[burgerBtn] = menu.getElementsByClassName("burger"),
	[newImgBtn] = menu.getElementsByClassName("new"),
	[commentsBtn] = menu.getElementsByClassName("comments"),
	[commentsTools] = menu.getElementsByClassName("comments-tools"),
	commentsOn = document.getElementById("comments-on"),
	commentsOff = document.getElementById("comments-off"),
	[drawBtn] = menu.getElementsByClassName("draw"),
	[drawTools] = menu.getElementsByClassName("draw-tools"),
	[shareBtn] = menu.getElementsByClassName("share"),
	[shareTools] = menu.getElementsByClassName("share-tools"),
	[urlTextarea] = shareTools.getElementsByClassName("menu__url"),
	[image] = app.getElementsByClassName("current-image"),
	[preloader] = app.getElementsByClassName("image-loader"),
	[errorMsg] = app.getElementsByClassName("error"),
	[errorHeader] = errorMsg.getElementsByClassName("error__header"),
	[errorText] = errorMsg.getElementsByClassName("error__message"),
	markerBounds = app.getElementsByClassName("comments__marker")[0].getBoundingClientRect(),
	formBounds = app.getElementsByClassName("comments__form")[0].getBoundingClientRect(),
	defaultCommentsForm = app.removeChild(app.getElementsByClassName("comments__form")[0]);
  
  const defaultMenuHeight = menu.offsetHeight;

  const clickPointShifts = (() => {
    const pointShifts = {
      left: markerBounds.left - formBounds.left + markerBounds.width / 2,
      top: markerBounds.top - formBounds.top + markerBounds.height
    };
    return pointShifts;
  })();

  const apiURL = "//neto-api.herokuapp.com/pic";
        
  let socket,
      isLinkedFromShare = false;

  /********************** Общие функции *************************/

  /*function debounce(cb, delay) {
	  let id = null;
	  return function (...args) {
	    const ready = () => {
	      cb.apply(this, args);
	      id = null;
	    }
	    
	    if (id) {
	      clearTimeout(id);
	    }
	    id = setTimeout(ready, delay);
	  }
	}*/

  function throttle(cb, isAnimation, delay) {
    let isWaiting = false;
    return function(...args) {
      if (!isWaiting) {
        cb.apply(this, args);
        isWaiting = true;
        if (isAnimation) {
          requestAnimationFrame(() => (isWaiting = false));
        } else {
          setTimeout(() => (isWaiting = false), delay);
        }
      }
    };
  };

  const getSessionSettings = key => {
    try {
      if (sessionStorage[key]) {
        return JSON.parse(sessionStorage[key]);
      }
    } catch (err) {
      console.error(`${err}`);
    }
  };

  const checkResponseStatus = resp => {
    if (200 <= resp.status && resp.status < 300) {
      return resp.json();
    } else {
      errorHeader.textContent = "Ошибка: " + resp.status;
      throw new Error(`${resp.statusText}`);
    }
  };

  const saveImageSettings = imgData => {
    urlTextarea.value = imgData.path = window.location.href.replace(/\?id=.*$/, "") + "?id=" + imgData.id;
    sessionStorage.imageSettings = JSON.stringify(imgData);
  };

  const showElement = el => {
    el.style.display = "";
  }

  const hideElement = el => {
    el.style.display = "none";
  }

  const toggleComments = radioBtn => {
    Array.from(app.getElementsByClassName("comments__form")).forEach(comments => {
        if (radioBtn.value === "on") {
          showElement(comments);
        } else {
          hideElement(comments);
        }
      }
    );
  };

  const getDate = timestamp => {
    const date = new Date(timestamp),
	  options = {
	    day: "2-digit",
	    month: "2-digit",
	    year: "2-digit",
	    hour: "numeric",
	    minute: "2-digit",
	    second: "2-digit"
	  };
    return date.toLocaleString("ru-RU", options);
  };

  const el = (name, attrs, childs) => {
    const element = document.createElement(name || "div");

    if (typeof attrs === "object" && attrs) {
      Object.keys(attrs).forEach(key => element.setAttribute(key, attrs[key]));
    }
    if (Array.isArray(childs)) {
      element.appendChild(
        childs.reduce((f, child) => {
          f.appendChild(child);
          return f;
        }, document.createDocumentFragment())
      );
    } else if (typeof childs === "string" || typeof childs === "number") {
      element.appendChild(document.createTextNode(childs));
    }

    return element;
  };

  /********************** Переключение меню *************************/

  const selectMenuModeTo = (mode, selectedItemType) => {
    switch (mode) {
      case "initial":
        menu.dataset.state = "initial";
        hideElement(burgerBtn);
      break;

      case "default":
        menu.dataset.state = "default";
        Array.from(menu.querySelectorAll(`[data-state='selected']`)).forEach(
          el => (el.dataset.state = "")
        );
        drawBtn.addEventListener("click", initDraw);
      break;

      case "selected":
        menu.dataset.state = "selected";
        [commentsBtn, drawBtn, shareBtn].find(btn =>
          btn.classList.contains(selectedItemType)
        ).dataset.state = "selected";
        [commentsTools, drawTools, shareTools].find(tools =>
          tools.classList.contains(selectedItemType + "-tools")
        ).dataset.state = "selected";
        showElement(burgerBtn);
      break;
    }

    const menuSettings = getSessionSettings("menuSettings");
    if (menuSettings) {
      menuSettings.mode = mode;
      menuSettings.selectItemType = selectedItemType;
      sessionStorage.menuSettings = JSON.stringify(menuSettings);
    } else {
      sessionStorage.menuSettings = JSON.stringify({
        mode: mode,
        selectItemType: selectedItemType
      });
    }
  };

  const selectMenuMode = event => {
    if (burgerBtn === event.target || burgerBtn === event.target.parentElement) {
      selectMenuModeTo("default");
    } else if (drawBtn === event.target || drawBtn === event.target.parentElement) {
      selectMenuModeTo("selected", "draw");
    } else if (commentsBtn === event.target || commentsBtn === event.target.parentElement) {
      selectMenuModeTo("selected", "comments");
    } else if (shareBtn === event.target || shareBtn === event.target.parentElement) {
      selectMenuModeTo("selected", "share");
    }
  };

  /********************** Drag'n'Drop меню *************************/

  let dragged = null,
      draggedSettings = null;

  const putMenu = event => {
    if (event.target.classList.contains("drag")) {
      dragged = event.currentTarget;

      const draggedBounds = event.target.getBoundingClientRect(),
	    draggedCSS = getComputedStyle(dragged);

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
      let X = pageX - draggedSettings.shiftX,
          Y = pageY - draggedSettings.shiftY;

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

  /********************** Загрузка изображения *************************/

  const postError = (header, message) => {
    errorHeader.textContent = header;
    errorText.textContent = message;
    showElement(errorMsg);
  };

  const showImage = imgData => {
    image.dataset.status = "load";
    image.src = imgData.url;
    saveImageSettings(imgData);
    window.history.pushState({ path: urlTextarea.value }, "", urlTextarea.value);

    initWSSConnection(imgData.id);
    if (isLinkedFromShare) {
    	socket.addEventListener('error', () => renderComments(imgData));
    } else {
    	renderComments(imgData);
    }
	  
    image.addEventListener("load", () => {
      hideElement(preloader);

      picture.style.width = image.width + 'px';
      picture.style.height = image.height + 'px';

      delete sessionStorage.menuSettings;
      selectMenuModeTo("selected", isLinkedFromShare ? "comments" : "share");
      commentsOn.checked = true;

      refreshCanvas(image);
      isLinkedFromShare = false;
    });
  };

  const loadImage = ({ id }) => {
    fetch("https:" + apiURL + "/" + id)
    .then(checkResponseStatus)
    .then(showImage)
    .catch(err => postError(errorHeader.textContent, err.message));
  };

  const postImage = (path, file) => {
    const formData = new FormData(),
	  name = file.name.replace(/\.\w*$/, "");

    formData.append("title", name);
    formData.append("image", file);

    showElement(preloader);
    fetch(path, {
      body: formData,
      method: "POST"
    })
    .then(checkResponseStatus)
    .then(loadImage)
    .catch(err => postError(errorHeader.textContent, err.message));
  };

  const uploadNewByInput = event => {
    if (errorMsg.style.display !== "none") {
      hideElement(errorMsg);
    }

    if (newImgBtn === event.target || newImgBtn === event.target.parentElement) {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/jpeg, image/png";

      input.addEventListener("change", event => postImage("https:" + apiURL, event.currentTarget.files[0]));
      input.dispatchEvent(new MouseEvent(event.type, event));
    }
  };

  const uploadNewByDrop = event => {
    event.preventDefault();
    if (errorMsg.style.display !== "none") { hideElement(errorMsg); }

    if (event.target === event.currentTarget || event.target === canvas || event.target === errorMsg || event.target.parentElement === errorMsg) {
      if (image.dataset.status !== "load") {
        const file = event.dataTransfer.files[0];

        if (/^image\/[(jpeg) | (png)]/.test(file.type)) {
          postImage("https:" + apiURL, file);
        } else {
          postError("Ошибка", "Неверный формат файла. Пожалуйста, выберите изображение в формате .jpg или .png.");
        }
      } else {
        postError("Ошибка", 'Чтобы загрузить новое изображение, пожалуйста, воспользуйтесь пунктом "Загрузить новое" в меню');
      }
    }
  };

	/********************** Отрисовка запуска приложения *************************/

	const createPicture = (() => {
    const picture = document.createElement("div"),
	  canvas = document.createElement("canvas");

    picture.id = "picture";
    picture.classList.add("current-image");
    picture.appendChild(image);

    canvas.classList.add("current-image");
    picture.insertBefore(canvas, image.nextElementSibling);
    hideElement(canvas);

    app.insertBefore(picture, menu.nextElementSibling);
    return picture;
  })();
	const picture = document.getElementById("picture");
  const canvas = picture.querySelector("canvas.current-image");

  function refreshCanvas(img) {
    //canvas.style.background = "";
    canvas.width = img.width;
    canvas.height = img.height;
    showElement(canvas);
  };

  const renderApp = () => {
    let imageSettings = getSessionSettings("imageSettings"),
	 menuSettings = getSessionSettings("menuSettings"),
	 urlParamID = new URL(`${window.location.href}`).searchParams.get("id");
    
    image.src = "";
    if (imageSettings && urlParamID) {
      hideElement(picture);
      image.dataset.status = "load";
      image.src = imageSettings.url;

      urlTextarea.removeAttribute("value");
      urlTextarea.value = imageSettings.path;

      initWSSConnection(imageSettings.id);
      socket.addEventListener('error', () => {
    	renderComments(imageSettings);
    	if (menuSettings.displayComments === "hidden") { toggleComments(commentsOff);	}
      });

      image.addEventListener("load", () => {
      	picture.style.width = image.width + 'px';
        picture.style.height = image.height + 'px';
        showElement(picture);
      	refreshCanvas(image);
      });
    } else {
      if (urlParamID) {
        isLinkedFromShare = true;
        loadImage({ id: urlParamID });
      } else {
      	if (menuSettings) {
      	  menu.style.left = menuSettings.left + "px";
      	  menu.style.top = menuSettings.top + "px";
      	}
        delete sessionStorage.imageSettings;
        delete sessionStorage.menuSettings;
        menuSettings = null;
      }
    }

    if (menuSettings) {
      menu.style.left = menuSettings.left + "px";
      menu.style.top = menuSettings.top + "px";
      selectMenuModeTo(menuSettings.mode, menuSettings.selectItemType);

      if (menuSettings.selectItemType === "draw") {
        image.addEventListener("load", initDraw);
      }
      if (menuSettings.displayComments === "hidden") {
        commentsOff.checked = true;
      }
    } else {
      selectMenuModeTo("initial");
    }
  };

  renderApp();

  /********************** Копирование ссылки в режиме "Поделиться" *************************/

  const checkSelectionResult = () => {
    try {
      const done = document.execCommand("copy");
      console.log( "Копирование ссылки: " + urlTextarea.value + (done ? " " : " не") + "выполнено");
    } catch (err) {
      console.error("Не удалось скопировать ссылку. Ошибка: " + err);
    }
  };

  const clearSelection = () => {
    try {
      window.getSelection().removeAllRanges();
    } catch (err) {
      document.selection.empty();
      console.error(err);
    }
  };

  const copyURL = event => {
    if (event.target.classList.contains("menu_copy")) {
      urlTextarea.select();
      checkSelectionResult();
      clearSelection();
    }
  };

  /********************** Создание и рендеринг комментариев *************************/

  function crtNewCommentNode(date, message) {
    return el("div", { class: "comment" }, [
      el("p", { class: "comment__time" }, date),
      el("p", {class: "comment__message", style: "white-space: pre;" }, message)
    ]);
  }

  function crtNewCommentsFormNode(left, top) {
    return el("form", {class: "comments__form", style: `left: ${left}px; top: ${top}px;`}, [
        el("span", {class: "comments__marker"}, null),
        el("input", {type: "checkbox", class: "comments__marker-checkbox"}, null),
        el("div", {class: "comments__body", style: "overflow-y: auto"}, [
          el("div", {class: "comment"}, [
            el("div", {class: "loader", style: "display: none;"}, [
          el("span", null, null), el("span", null, null), el("span", null, null), el("span", null, null), el("span", null, null)
            ])
          ]),
          el("textarea", {class: "comments__input", type: "text", placeholder: "Напишите ответ..."}, null),
          el("input", {class: "comments__close", type: "button", value: "Закрыть"}, null),
          el("input", {class: "comments__submit", type: "submit", value: "Отправить"}, null)
        ])
      ]);
  }

  function crtNewCommentsForm(left, top) {
    const newCommentsForm = crtNewCommentsFormNode(left, top);

    newCommentsForm.firstElementChild.dataset.left = parseInt(newCommentsForm.style.left);
    newCommentsForm.firstElementChild.dataset.top = parseInt(newCommentsForm.style.top);
    return newCommentsForm;
  }

  function appendNewComment(comment, commentsForm) {
    const [commentsBody] = commentsForm.getElementsByClassName("comments__body"),
	  comments = Array.from(commentsBody.getElementsByClassName("comment")),
	  commentDate = getDate(comment.timestamp).replace(",", ""),
	  newComment = crtNewCommentNode(commentDate, comment.message),
	  nextComment = comments.find(curComment => Number(curComment.dataset.timestamp) > comment.timestamp);

    newComment.dataset.timestamp = comment.timestamp;
    commentsBody.insertBefore(newComment, nextComment ? nextComment : comments[comments.length - 1]);
  }

  function parseNewCommentsForm(comment) {
    const newCommentsForm = crtNewCommentsForm(comment.left, comment.top),
	  [commentsBody] = newCommentsForm.getElementsByClassName("comments__body"),
	  [loader] = newCommentsForm.getElementsByClassName("loader"),
	  commentDate = getDate(comment.timestamp).replace(",", ""),
	  newComment = crtNewCommentNode(commentDate, comment.message);

    newComment.dataset.timestamp = comment.timestamp;
    picture.appendChild(newCommentsForm);
    commentsBody.insertBefore(newComment, loader.parentElement);
    return newCommentsForm;
  }

  function renderComments(imgData) {
    if (imgData.comments) {
      const Forms = Object.keys(imgData.comments).reduce((forms, id) => {
        const commentsMarker = forms.querySelector(`.comments__marker[data-left="${imgData.comments[id].left}"][data-top="${imgData.comments[id].top}"]`);

        if (forms && commentsMarker) {
          appendNewComment(imgData.comments[id], commentsMarker.parentElement);
          return forms;
        } else {
          const newCommentsForm = parseNewCommentsForm(imgData.comments[id], id);
          forms.appendChild(newCommentsForm);
          return forms;
        }
      }, document.createDocumentFragment());

      picture.appendChild(Forms);
    } else {
      while (picture.hasChildNodes() && picture.lastElementChild.classList.contains("comments__form")) {
        picture.removeChild(picture.lastElementChild);
      }
    }
    return imgData;
  }

  /********************** Отправка и добавление комментариев *************************/

  const loadComment = (imgData, left, top) => {
    const commentForm = app.querySelector(`.comments__marker[data-left="${left}"][data-top="${top}"]`).parentElement,
      	  [loader] = commentForm.getElementsByClassName("loader");

    for (const id in imgData.comments) {
      const comment = imgData.comments[id],
	  isPostedComment = app.querySelector(`.comment[data-timestamp="${comment.timestamp}"]`);

      if (comment.left === left && comment.top === top && !isPostedComment) {
        appendNewComment(comment, commentForm);
        hideElement(loader);
        break;
      }
    }

    const menuSettings = getSessionSettings("menuSettings");
    if (menuSettings.displayComments === "hidden") { toggleComments(commentsOff); }

    return imgData;
  };

  const postComment = (message, left, top) => {
    const id = getSessionSettings("imageSettings").id,
      	  body = "message=" + encodeURIComponent(message) + "&left=" + encodeURIComponent(left) + "&top=" + encodeURIComponent(top);

    return fetch("https:" + apiURL + "/" + id + "/comments", {
      body: body,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    })
    .then(checkResponseStatus)
    .then(data => loadComment(data, left, top))
    .then(saveImageSettings)
    .catch(err => console.error(err));
  };

  const sendComment = event => {
    if (event.target.classList.contains("comments__submit")) {
      event.preventDefault();
      const crntCommentsForm = event.target.parentElement.parentElement,
	    [loader] = crntCommentsForm.getElementsByClassName("loader"),
	    [input] = crntCommentsForm.getElementsByClassName("comments__input"),
	    left = parseInt(crntCommentsForm.style.left),
	    top = parseInt(crntCommentsForm.style.top);

      showElement(loader);
      postComment(input.value ? input.value : "\n", left, top);
      input.value = "";
    }
  };

  const pressEnter = event => {
    if (!event.repeat && !event.shiftKey && event.code === "Enter" && event.target.classList.contains("comments__input")) {
      const submit = event.target.nextElementSibling.nextElementSibling;
      submit.dispatchEvent(new MouseEvent("click", event));
      event.target.blur();
    }
  };

  /********************** Работа с формой комментария *************************/

  const toggleCommentsShow = event => {
    if (event.target.classList.contains("menu__toggle")) {
      toggleComments(event.target);

      const menuSettings = getSessionSettings("menuSettings");
      menuSettings.displayComments = menuSettings.displayComments ? "" : "hidden";
      sessionStorage.menuSettings = JSON.stringify(menuSettings);
    }
  };

  const toggleDisplayCommentsForm = (commentsFormCheckbox, isClosedByBtn) => {
    if (commentsFormCheckbox) {
      const [comment] = commentsFormCheckbox.parentElement.getElementsByClassName("comment");

      if (comment.firstElementChild.classList.contains("loader")) {
        picture.removeChild(commentsFormCheckbox.parentElement);
      }
      if (!isClosedByBtn || !comment.firstElementChild.classList.contains("loader")) {
        commentsFormCheckbox.parentElement.style.zIndex = "";
        commentsFormCheckbox.checked = commentsFormCheckbox.disabled = false;
      }
    }
  };

  const addNewCommentsForm = event => {
    if (event.target.classList.contains("current-image") && commentsBtn.dataset.state === "selected") {
      const prevCommentsFormCheckbox = picture.querySelector('.comments__marker-checkbox[disabled=""]');
      toggleDisplayCommentsForm(prevCommentsFormCheckbox, false);

      const newCommentsForm = crtNewCommentsForm(event.offsetX - clickPointShifts.left, event.offsetY - clickPointShifts.top);
      picture.appendChild(newCommentsForm);
      newCommentsForm.getElementsByClassName("comments__marker-checkbox")[0].checked = true;
      newCommentsForm.getElementsByClassName("comments__marker-checkbox")[0].disabled = true;
      newCommentsForm.style.zIndex = "5";
    }
  };

  const openCommentsForm = event => {
    if (event.target.classList.contains("comments__marker-checkbox") && event.target.checked) {
      const prevCommentsFormCheckbox = picture.querySelector('.comments__marker-checkbox[disabled=""]');

      toggleDisplayCommentsForm(prevCommentsFormCheckbox, false);
      event.target.disabled = true;
      event.target.parentElement.style.zIndex = "5";
    }
  };

  const typeComment = event => {
    if (event.target.classList.contains("comments__input")) {
      event.target.focus();
    }
  };

  const closeCommentsForm = event => {
    if (event.target.classList.contains("comments__close")) {
      const [checkbox] = event.target.parentElement.parentElement.getElementsByClassName("comments__marker-checkbox");
      toggleDisplayCommentsForm(checkbox, true);
    }
  };

  /********************** Рисование в канвас *************************/

  const penWidth = 4;

  let canvasCtx,
      checkedColorBtn = menu.querySelector('.menu__color[checked=""]'),
      strokes = [],
      firstDraw = null,
      needsRendering = false;
	
  const drawPoint = (ctx, point) => {
      ctx.beginPath();
      ctx.arc(...point, penWidth / 2, 0, 2 * Math.PI);
      ctx.fill();
  };

  const drawStroke = (ctx, points) => {
    ctx.beginPath();
    ctx.lineCap = ctx.lineJoin = "round";
    ctx.moveTo(...points[0]);
    for (let i = 1; i < points.length - 1; i++) {
      ctx.lineTo(...points[i], ...points[i + 1]);
    }
    ctx.stroke();
  };

  const makePoint = (x, y) => {
    return [x, y];
  };

  const draw = ctx => {
    strokes.forEach(stroke => {
      drawPoint(ctx, stroke[0]);
      drawStroke(ctx, stroke);
    });
  };

  const sendMask = () => {
    canvas.toBlob(blob => {console.log('blob');socket.send(blob);});
  };

  function initDraw(event) {
    canvasCtx = canvas.getContext("2d");
    canvasCtx.strokeStyle = canvasCtx.fillStyle = getComputedStyle(checkedColorBtn.nextElementSibling).backgroundColor;
    canvasCtx.lineWidth = penWidth;

    let penColor = getComputedStyle(checkedColorBtn.nextElementSibling).backgroundColor,
	isDrawing = false;

    const changeColor = event => {
      if (event.target.checked) {
        checkedColorBtn.removeAttribute("checked");
        checkedColorBtn = event.target;
        event.target.setAttribute("checked", "");

        canvasCtx.strokeStyle = canvasCtx.fillStyle = penColor = getComputedStyle(event.target.nextElementSibling).backgroundColor;
        canvasCtx.globalCompositeOperation = "source-over";
      }
    };

    drawTools.addEventListener("change", changeColor);

	 function mouseMove(event) {
	 
	 if (isDrawing) {
        const stroke = strokes[0];
        stroke.push(makePoint(event.offsetX, event.offsetY));
        needsRendering = true;
        //debounceSendMask();
	 }
	 }
	  
         function mouseDown(event) {
	 
	 if (drawBtn.dataset.state === "selected") {
        isDrawing = true;
        
	const stroke = [];
        stroke.push(makePoint(event.offsetX, event.offsetY));
        strokes.push(stroke);
        needsRendering = true;
	//debounceSendMask();
	 }
	 }
		 
   function mouseUp(event) {
   if (drawBtn.dataset.state === "selected") {
        isDrawing = false;
        strokes = [];
	console.log('mouseup done')
	setTimeout(sendMask, 1000); 
   }
   }
	  
	  canvas.removeEventListener("mousedown", mouseDown);
	  canvas.removeEventListener("mousemove", mouseMove);
          canvas.removeEventListener("mouseup", mouseUp);
    canvas.addEventListener("mousedown", mouseDown);

    canvas.addEventListener("mousemove", mouseMove);

    canvas.addEventListener("mouseup", mouseUp);

    //canvas.addEventListener("mouseleave", () => (isDrawing = false));
  }

  /********************** Обработчики событий *************************/

  //Загрузка файла на сервер:
  menu.addEventListener("click", uploadNewByInput);
  app.addEventListener("dragover", event => event.preventDefault());
  app.addEventListener("drop", uploadNewByDrop);

  //Перемещение меню:
  const moveMenu = throttle((...coords) => dragMenu(...coords), true);
  menu.addEventListener("mousedown", putMenu);
  app.addEventListener("mousemove", event => moveMenu(event.pageX, event.pageY));
  app.addEventListener("mouseup", dropMenu);

  //Переключение пунктов меню:
  menu.addEventListener("click", selectMenuMode);

  //Копирование ссылки в режиме "Поделиться":
  shareTools.addEventListener("click", copyURL);

  //Переключатели отображаения комментариев на странице:
  commentsTools.addEventListener("change", toggleCommentsShow);

  //Работа с формой комментариев:
  picture.addEventListener("click", addNewCommentsForm);
  picture.addEventListener("change", openCommentsForm);
  picture.addEventListener("click", typeComment);
  picture.addEventListener("click", sendComment);
  picture.addEventListener("keydown", pressEnter);
  picture.addEventListener("click", closeCommentsForm);

  //Инициализация режима рисования:
  drawBtn.addEventListener("click", initDraw);

  //Инициализация и логика работы вебсокет соединения:
  function initWSSConnection(id) {
    socket = new WebSocket("wss:" + apiURL + "/" + id );

    const addCommentInDirectory = (comment, directory) => {
      directory[comment.id] = {
        left: comment.left,
        top: comment.top,
        message: comment.message,
        timestamp: comment.timestamp
      };
    };

    const updatePic = event => {
      const wssResponse = JSON.parse(event.data);

      switch (wssResponse.event) {
        case "pic":
          if (wssResponse.pic.mask) {
            console.log(wssResponse.pic.mask);
            canvas.style.background = `url(${wssResponse.pic.mask})`;
          } else {
            canvas.style.background = "";
          }
		      
          if (wssResponse.pic.comments) {
            renderComments(wssResponse.pic);
            if (getSessionSettings("menuSettings").displayComments === "hidden") { toggleComments(commentsOff); }
          }
        break;

        case "comment":
          const imageSettings = getSessionSettings("imageSettings"),
		commentsMarker = app.querySelector(`.comments__marker[data-left="${wssResponse.comment.left}"][data-top="${wssResponse.comment.top}"]`);

          if (imageSettings.comments) {
            addCommentInDirectory(wssResponse.comment, imageSettings.comments);
          } else {
            imageSettings.comments = {};
            addCommentInDirectory(wssResponse.comment, imageSettings.comments);
          }

          if (commentsMarker) {
            loadComment(imageSettings, wssResponse.comment.left, wssResponse.comment.top);
          } else {
            picture.appendChild(crtNewCommentsForm(wssResponse.comment.left, wssResponse.comment.top));
            loadComment(imageSettings, wssResponse.comment.left, wssResponse.comment.top);
          }
        break;

        case "mask":
	   console.log(wssResponse.url);
           canvas.style.background = `url(${wssResponse.url})`;
	   canvas.getContext('2d').clearRect(0, 0, image.width, image.height);	      
        break;
      }
    };

    socket.addEventListener("message", updatePic);
    socket.addEventListener("open", event => console.log("Вебсокет соединение установлено"));
    socket.addEventListener("close", event => console.log(event.wasClean ? '"Чистое закрытие" соединения' : `Обрыв связи. Причина: ${event.reason}`));
    window.addEventListener("beforeunload", () => socket.close(1000, "Сессия успешно завершена"));
    socket.addEventListener("error", error => console.error(`Ошибка: ${error.message}`));
  }

  /******************** Плавная отрисовка линий при рисовании и коррекция положения меню по ширине *****************/

  (function tick() {
    if (needsRendering) {
      draw(canvasCtx);
      needsRendering = false;
    }
	  
    let crntMenuLeftPos = menu.getBoundingClientRect().left;
    while (menu.offsetHeight > defaultMenuHeight) {
      menu.style.left = (--crntMenuLeftPos) + "px";
    } 
	  
    window.requestAnimationFrame(tick);
  })();
}

document.addEventListener("DOMContentLoaded", initApp);
