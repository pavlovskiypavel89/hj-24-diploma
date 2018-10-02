"use strict";
const initApp = () => {
  const [app] = document.getElementsByClassName("app");
  const [menu] = app.getElementsByClassName("menu");
  const [burgerBtn] = menu.getElementsByClassName("burger");
  const [newImgBtn] = menu.getElementsByClassName("new");
  const [commentsBtn] = menu.getElementsByClassName("comments");
  const [commentsTools] = menu.getElementsByClassName("comments-tools");
  const commentsOn = document.getElementById("comments-on");
  const commentsOff = document.getElementById("comments-off");
  const [drawBtn] = menu.getElementsByClassName("draw");
  const [drawTools] = menu.getElementsByClassName("draw-tools");
  const [shareBtn] = menu.getElementsByClassName("share");
  const [shareTools] = menu.getElementsByClassName("share-tools");
  const [urlTextarea] = shareTools.getElementsByClassName("menu__url");
  const [image] = app.getElementsByClassName("current-image");
  const [preloader] = app.getElementsByClassName("image-loader");
  const [errorMsg] = app.getElementsByClassName("error");
  const [errorHeader] = errorMsg.getElementsByClassName("error__header");
  const [errorText] = errorMsg.getElementsByClassName("error__message");
   
  const picture = document.createElement("div");
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const markerBounds = app.getElementsByClassName("comments__marker")[0].getBoundingClientRect();
  const formBounds = app.getElementsByClassName("comments__form")[0].getBoundingClientRect();	
  const defaultMenuHeight = menu.offsetHeight;      
  const clickPointShifts = {
    left: markerBounds.left - formBounds.left + markerBounds.width / 2,
    top: markerBounds.top - formBounds.top + markerBounds.height
  };
   
  const apiURL = "//neto-api.herokuapp.com/pic";
        
  let socket;
  let isLinkedFromShare = false;

  app.removeChild(app.getElementsByClassName("comments__form")[0]);

  /*********************** Общие функции *************************/

  const showElement = el => {
    el.style.display = "";
  };

  const hideElement = el => {
    el.style.display = "none";
  };

  const toggleCommentsForm = radioBtn => {
    Array.from(app.getElementsByClassName("comments__form")).forEach(comments => {
        if (radioBtn.value === "on") {
          showElement(comments);
        } else {
          hideElement(comments);
        }
      }
    );
  };

  const saveImageSettings = imgData => {
    urlTextarea.value = imgData.path = `${window.location.href.replace(/\?id=.*$/, "")}?id=${imgData.id}`;
    sessionStorage.imageSettings = JSON.stringify(imgData);
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
      errorHeader.textContent = `Ошибка: ${resp.status}`;
      throw new Error(`${resp.statusText}`);
    }
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

  const throttle = (cb, isAnimation, delay) => {
    let isWaiting = false;
    return function(...args) {
      if (!isWaiting) {
        cb.apply(this, args);
        isWaiting = true;
        requestAnimationFrame(() => (isWaiting = false));
      }
    };
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

  /*********************** Переключение пунктов меню *************************/

  const selectMenuModeTo = (mode, selectedItemType) => {
    switch (mode) {
      case "initial":
        menu.dataset.state = "initial";
        hideElement(burgerBtn);
      break;

      case "default":
        menu.dataset.state = "default";
        Array.from(menu.querySelectorAll(`[data-state="selected"]`)).forEach(
          el => (el.dataset.state = "")
        );
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
	
  menu.addEventListener("click", selectMenuMode);

  /*********************** Drag'n'Drop меню *************************/

  let dragged = null;
  let draggedSettings = null;

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

  /************************ Копирование ссылки в режиме "Поделиться" *************************/

  const checkSelectionResult = () => {
    try {
      const done = document.execCommand("copy");
      console.log( `Копирование ссылки: ${urlTextarea.value}(done ? " " : " не")выполнено`);
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

  shareTools.addEventListener("click", copyURL);

  /*********************** Создание и рендеринг комментариев *************************/

  const crtNewCommentNode = (date, message) => {
    return el("div", { class: "comment" }, [
      el("p", { class: "comment__time" }, date),
      el("p", {class: "comment__message", style: "white-space: pre;" }, message)
    ]);
  };

  const crtNewCommentsFormNode = (left, top) => {
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
  };

  const crtNewCommentsForm = (left, top) => {
    const newCommentsForm = crtNewCommentsFormNode(left, top);

    newCommentsForm.firstElementChild.dataset.left = parseInt(newCommentsForm.style.left);
    newCommentsForm.firstElementChild.dataset.top = parseInt(newCommentsForm.style.top);
    return newCommentsForm;
  };

  const parseNewCommentsForm = comment => {
    const newCommentsForm = crtNewCommentsForm(comment.left, comment.top);
    const [commentsBody] = newCommentsForm.getElementsByClassName("comments__body");
    const [loader] = newCommentsForm.getElementsByClassName("loader");
    const commentDate = getDate(comment.timestamp).replace(",", "");
    const newComment = crtNewCommentNode(commentDate, comment.message);

    newComment.dataset.timestamp = comment.timestamp;
    picture.appendChild(newCommentsForm);
    commentsBody.insertBefore(newComment, loader.parentElement);
    return newCommentsForm;
  };

  const appendNewComment = (comment, commentsForm) => {
    const [commentsBody] = commentsForm.getElementsByClassName("comments__body");
    const comments = Array.from(commentsBody.getElementsByClassName("comment"));
    const commentDate = getDate(comment.timestamp).replace(",", "");
    const newComment = crtNewCommentNode(commentDate, comment.message);
    const nextComment = comments.find(curComment => Number(curComment.dataset.timestamp) > comment.timestamp);

    newComment.dataset.timestamp = comment.timestamp;
    commentsBody.insertBefore(newComment, nextComment ? nextComment : comments[comments.length - 1]);
  };

  const renderComments = imgData => {
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
	console.log('Проверка работает ли вообще очистка в рендер комментс и нужна ли');
        picture.removeChild(picture.lastElementChild);
      }
    }
    return imgData;
  };

  /********************** Работа с формой комментариев *************************/

  const toggleCommentsFormShow = event => {
    if (event.target.classList.contains("menu__toggle")) {
      toggleCommentsForm(event.target);

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
	
  //Переключатель отображаения комментариев:
  commentsTools.addEventListener("change", toggleCommentsFormShow);

  const addNewCommentsForm = event => {
    if (event.target.classList.contains("current-image") && commentsBtn.dataset.state === "selected") {
      const prevCommentsFormCheckbox = picture.querySelector(`.comments__marker-checkbox[disabled=""]`);
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
	
  const loadComment = (imgData, left, top) => {
    const commentForm = app.querySelector(`.comments__marker[data-left="${left}"][data-top="${top}"]`).parentElement;
    const [loader] = commentForm.getElementsByClassName("loader");

    for (const id in imgData.comments) {
      const comment = imgData.comments[id];
      const isPostedComment = app.querySelector(`.comment[data-timestamp="${comment.timestamp}"]`);

      if (comment.left === left && comment.top === top && !isPostedComment) {
        appendNewComment(comment, commentForm);
        hideElement(loader);
        break;
      }
    }

    const menuSettings = getSessionSettings("menuSettings");
    if (menuSettings.displayComments === "hidden") { toggleCommentsForm(commentsOff); }

    return imgData;
  };

  const postComment = (message, left, top) => {
    const id = getSessionSettings("imageSettings").id;
    const body = `message=${encodeURIComponent(message)}&left=${encodeURIComponent(left)}&top=${encodeURIComponent(top)}`;

    return fetch(`https:${apiURL}/${id}/comments`, {
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
      const crntCommentsForm = event.target.parentElement.parentElement;
      const [loader] = crntCommentsForm.getElementsByClassName("loader");
      const [input] = crntCommentsForm.getElementsByClassName("comments__input");
      const left = parseInt(crntCommentsForm.style.left);
      const top = parseInt(crntCommentsForm.style.top);

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
 
  const closeCommentsForm = event => {
    if (event.target.classList.contains("comments__close")) {
      const [checkbox] = event.target.parentElement.parentElement.getElementsByClassName("comments__marker-checkbox");
      toggleDisplayCommentsForm(checkbox, true);
    }
  };

  //Работа с формой комментариев:
  picture.addEventListener("click", addNewCommentsForm);
  picture.addEventListener("change", openCommentsForm);
  picture.addEventListener("click", typeComment);
  picture.addEventListener("click", sendComment);
  picture.addEventListener("keydown", pressEnter);
  picture.addEventListener("click", closeCommentsForm);

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

  const makePoint = (x, y) => {
    return [x, y];
  };

  const draw = () => {
    strokes.forEach(stroke => {
      drawPoint(stroke[0]);
      drawStroke(stroke);
    });
  };

  const sendMask = () => {
    canvas.toBlob(blob => { console.log('blob'); socket.send(blob); });
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
      console.log('mouseup done')   
      setTimeout(sendMask, 1000);  
    };
  }	
	
  const initDraw = event => {
    ctx.strokeStyle = ctx.fillStyle = getComputedStyle(checkedColorBtn.nextElementSibling).backgroundColor;
    ctx.lineWidth = penWidth;

    const changeColor = event => {
      if (event.target.checked) {
        checkedColorBtn.removeAttribute("checked");
        checkedColorBtn = event.target;
        event.target.setAttribute("checked", "");

        ctx.strokeStyle = ctx.fillStyle = penColor = getComputedStyle(event.target.nextElementSibling).backgroundColor;
        ctx.globalCompositeOperation = "source-over";
      }
    };

    drawTools.addEventListener("change", changeColor);
    canvas.addEventListener("mousedown", mouseDown);
    canvas.addEventListener("mousemove", mouseMove);
    canvas.addEventListener("mouseup", mouseUp);
    canvas.addEventListener("mouseleave", () => (isDrawing = false));
  }

  //Инициализация режима рисования:
  drawBtn.addEventListener("click", initDraw);

  /**************** Инициализация и логика работы вебсокет соединения: *************/

  const addCommentInDirectory = (comment, directory) =>  {
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
          canvas.style.background = `url("${wssResponse.pic.mask}")`;
        } else {
          console.log(canvas)
          canvas.style.background = `url(" ")`; 
        }
	      
        if (wssResponse.pic.comments) {
          renderComments(wssResponse.pic);
          if (getSessionSettings("menuSettings").displayComments === "hidden") { toggleCommentsForm(commentsOff); }
        }
      break;

      case "comment":
        const imageSettings = getSessionSettings("imageSettings");
	const commentsMarker = app.querySelector(`.comments__marker[data-left="${wssResponse.comment.left}"][data-top="${wssResponse.comment.top}"]`);

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
	canvas.style.background = `url("${wssResponse.url}")`; 
        ctx.clearRect(0, 0, canvas.width, canvas.height); 
        
	/*if (!sessionStorage.reload){
	  sessionStorage.reload = 1;
	  window.location.reload();
	}*/
      break;
    }
  };

  const initWSSConnection = id => {
    socket = new WebSocket(`wss:${apiURL}/${id}`);
 
    socket.addEventListener("message", updatePic);
    socket.addEventListener("open", event => console.log("Вебсокет соединение установлено"));
    socket.addEventListener("close", event => console.log(event.wasClean ? `"Чистое закрытие" соединения` : `Обрыв связи. Причина: ${event.reason}`));
    window.addEventListener("beforeunload", () => socket.close(1000, "Сессия успешно завершена"));
    socket.addEventListener("error", error => console.error(`Ошибка: ${error.message}`));
  };

  /********************** Загрузка изображения *************************/

  const postError = (header, message) => {
    errorHeader.textContent = header;
    errorText.textContent = message;
    showElement(errorMsg);
  };

  const showImage = imgData => {
    console.log('showImage');
    image.dataset.status = "load";
    image.src = imgData.url;
    saveImageSettings(imgData);
    window.history.pushState({ path: urlTextarea.value }, "", urlTextarea.value);

    initWSSConnection(imgData.id);
    if (isLinkedFromShare) {
      socket.addEventListener("error", () => renderComments(imgData));
    } else {
      renderComments(imgData);
    }
	  
    image.addEventListener("load", () => {
      hideElement(preloader);

      delete sessionStorage.menuSettings;
      selectMenuModeTo("selected", isLinkedFromShare ? "comments" : "share");
      commentsOn.checked = true;

      //delete sessionStorage.reload;
      
      isLinkedFromShare = false;
    });
  };

  const loadImage = ({ id }) => {
    fetch(`https:${apiURL}/${id}`)
    .then(checkResponseStatus)
    .then(showImage)
    .catch(err => postError(errorHeader.textContent, err.message));
  };

  const postImage = (path, file) => {
    const formData = new FormData();
    const name = file.name.replace(/\.\w*$/, "");

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

      input.addEventListener("change", event => postImage(`https:${apiURL}`, event.currentTarget.files[0]));
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
          postImage(`https:${apiURL}`, file);
        } else {
          postError("Ошибка", "Неверный формат файла. Пожалуйста, выберите изображение в формате .jpg или .png.");
        }
      } else {
        postError("Ошибка", `Чтобы загрузить новое изображение, пожалуйста, воспользуйтесь пунктом "Загрузить новое" в меню`);
      }
    }
  };

  //Загрузка файла на сервер:
  menu.addEventListener("click", uploadNewByInput);
  app.addEventListener("dragover", event => event.preventDefault());
  app.addEventListener("drop", uploadNewByDrop);

  image.addEventListener("load", () => {
    picture.style.width = image.width + "px";
    picture.style.height = image.height + "px";
    picture.classList.add("current-image", "picture-wrap");

    canvas.width = image.width;
    canvas.height = image.height;
    canvas.style.background = 'url(" ")'; 
    canvas.classList.add("current-image", "mask-canvas");
    
    console.log(canvas, image);

    picture.appendChild(image);
    picture.insertBefore(canvas, image.nextElementSibling);
    app.insertBefore(picture, menu.nextElementSibling);
  });

  /********************** Отрисовка запуска приложения *************************/
	
  const renderApp = () => {
    const urlParamID = new URL(`${window.location.href}`).searchParams.get("id");  
    const imageSettings = getSessionSettings("imageSettings");
    let menuSettings = getSessionSettings("menuSettings");
    
    image.src = "";
    if (imageSettings && urlParamID) {
      console.log('renderApp est id i imgset')
      image.dataset.status = "load";
      image.src = imageSettings.url;

      urlTextarea.removeAttribute("value");
      urlTextarea.value = imageSettings.path;

      initWSSConnection(imageSettings.id);
      socket.addEventListener("error", () => {
    	renderComments(imageSettings);
    	if (menuSettings.displayComments === "hidden") { toggleCommentsForm(commentsOff); }
      });
    } else {
      if (urlParamID) {
      	console.log('renderApp est id ')
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
      	console.log('vkladka draw activate paint mode')
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

  /******************** Плавная отрисовка линий при рисовании и коррекция положения меню по ширине *****************/

  const tick = () => {
    if (needsRendering) {
      draw(ctx);
      needsRendering = false;
    }
	  
    let crntMenuLeftPos = menu.getBoundingClientRect().left;
    while (menu.offsetHeight > defaultMenuHeight) {
      menu.style.left = (--crntMenuLeftPos) + "px";
    } 
	  
    window.requestAnimationFrame(tick);
  };
  tick();
}

document.addEventListener("DOMContentLoaded", initApp);
