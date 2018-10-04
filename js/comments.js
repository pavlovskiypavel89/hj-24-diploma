/*********************** Создание и рендеринг комментариев *************************/
const getDate = timestamp => {
 const date = new Date(timestamp);
 const options = {
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
     el("div", {class: "comments__body", style: "overflow-y: auto;"}, [
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
 console.log(picture.firstElementChild);
 if (!picture.firstElementChild) {return;}
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
 console.log(imgData.comments);
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

 if (getSessionSettings("menuSettings").displayComments === "hidden") {
   toggleCommentsForm(commentsOff);
   commentsOff.checked = true;
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
   const prevCommentsFormCheckbox = picture.querySelector(`.comments__marker-checkbox[disabled=""]`);

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
