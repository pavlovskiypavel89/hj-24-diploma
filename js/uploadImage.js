/********************** Загрузка изображения *************************/
let isLinkedFromShare = false;

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
  console.log('upload');
  console.log(picture.children);
  renderComments(imgData); 
  
  image.addEventListener("load", () => {
    hideElement(preloader);

    const menuSettings = getSessionSettings("menuSettings");
    delete menuSettings.displayComments;
    sessionStorage.menuSettings = JSON.stringify(menuSettings);
    sessionStorage.wssReload ? delete sessionStorage.wssReload : "";
    
    selectMenuModeTo("selected", isLinkedFromShare ? "comments" : "share");
    commentsOn.checked = true;
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
  .then(showImage)
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
