"use strict";
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
 
const markerBounds = app.getElementsByClassName("comments__marker")[0].getBoundingClientRect();
const formBounds = app.getElementsByClassName("comments__form")[0].getBoundingClientRect();	
const defaultMenuHeight = menu.offsetHeight;      
const clickPointShifts = {
  left: markerBounds.left - formBounds.left + markerBounds.width / 2,
  top: markerBounds.top - formBounds.top + markerBounds.height
};
 
const apiURL = "//neto-api.herokuapp.com/pic";

const picture = document.createElement("div");
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");  

/********************** Отрисовка запуска приложения *************************/

const renderApp = () => {
  console.log('renderapp')
  app.removeChild(app.getElementsByClassName("comments__form")[0]);
 
  image.addEventListener("load", () => {
   picture.style.width = image.width + "px";
   picture.style.height = image.height + "px";
   picture.classList.add("current-image", "picture-wrap");

   canvas.width = image.width;
   canvas.height = image.height;
   canvas.classList.add("current-image", "mask-canvas");

   picture.appendChild(image);
   picture.insertBefore(canvas, image.nextElementSibling);
   app.insertBefore(picture, menu.nextElementSibling);
   console.log('imgload');
 }); 

  const urlParamID = new URL(`${window.location.href}`).searchParams.get("id");  
  const menuSettings = getSessionSettings("menuSettings");

  if (menuSettings) {
    if (urlParamID) {
      selectMenuModeTo(menuSettings.mode, menuSettings.selectItemType);

      if (menuSettings.selectItemType === "draw") {
        image.addEventListener("load", initDraw);
      }
    } else {
      delete sessionStorage.imageSettings;
      selectMenuModeTo("initial");
    }

    menu.style.left = menuSettings.left + "px";
    menu.style.top = menuSettings.top + "px";

    commentsOff.checked = menuSettings.displayComments === "hidden" ? true : false; 
  } else {
    selectMenuModeTo("initial");
  }

  const imageSettings = getSessionSettings("imageSettings");
  image.src = "";
 console.log(imageSettings);

  if (imageSettings && urlParamID) {
    image.dataset.status = "load";
    image.src = imageSettings.url;
    urlTextarea.value = imageSettings.path;

    try {
      console.log('initwss by initApp');
      initWSSConnection(imageSettings.id);
    } catch (err) {
      renderComments(imageSettings);
    }

  } else if (urlParamID) {
    isLinkedFromShare = true;
    loadImage({ id: urlParamID });
  } 
};

document.addEventListener("DOMContentLoaded", renderApp);

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
        tools.classList.contains(`${selectedItemType}-tools`)
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
