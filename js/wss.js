/**************** Инициализация и логика работы вебсокет соединения: *************/
let socket;

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
        canvas.style.background = `url("${wssResponse.pic.mask}")`;
      } else {
        canvas.style.background = ""; 
      }
      
      if (wssResponse.pic.comments) {
        renderComments(wssResponse.pic);
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
      canvas.style.background = `url("${wssResponse.url}")`;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!sessionStorage.wssReload) {
	console.log("Для корректной склейки текущего изображения требуется перезапуск вебсокет соединения");
        sessionStorage.wssReload = 1;
        socket.close(1000, `Выполнено ${sessionStorage.wssReload} плановое закрытие соединения`);
        initWSSConnection(getSessionSettings("imageSettings").id);
      } 
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
