'use strict';
function initApp() {
	const [app] = document.getElementsByClassName('app'),
				[menu] = app.getElementsByClassName('menu'),
				[burgerBtn] = menu.getElementsByClassName('burger'),
				[newImgBtn] = menu.getElementsByClassName('new'),
				[commentsBtn] = menu.getElementsByClassName('comments'),
				[commentsTools] = menu.getElementsByClassName('comments-tools'),
				[drawBtn] = menu.getElementsByClassName('draw'),
				[drawTools] = menu.getElementsByClassName('draw-tools'),
				[shareBtn] = menu.getElementsByClassName('share'),
				[shareTools] = menu.getElementsByClassName('share-tools'),
				[urlTextarea] = shareTools.getElementsByClassName('menu__url'),
        [image] = app.getElementsByClassName('current-image'),
        [preloader] = app.getElementsByClassName('image-loader'),
        [errorMsg] = app.getElementsByClassName('error'),
        [errorHeader] = errorMsg.getElementsByClassName('error__header'),
      	[errorText] = errorMsg.getElementsByClassName('error__message');

  const apiURL = '//neto-api.herokuapp.com/pic';

  let isLinkedFromShare = false;

  ////////////////////////////////////////////////////////////////////////

  const throttle = ( cb ) => {
    let isWaiting = false;
    return function (...args) {
      if (!isWaiting) {
        cb.apply(this, args);
        isWaiting = true;
        requestAnimationFrame(() => isWaiting = false);
      }
    }
  };

  const checkResponseStatus = ( resp ) => {
  	if (200 <= resp.status && resp.status < 300) {
			return resp.json();
		} else {
			hideElement(preloader);
			errorHeader.textContent = 'Ошибка: ' + resp.status;
			throw new Error(`${resp.statusText}`);
		}
  };

  const getSessionSettings = ( key ) => {
  	try {
			if (sessionStorage[key]) { 
				return JSON.parse(sessionStorage[key]);
			}
		} catch (err) {
			console.error(`${err}`);
		}
	};

  const el = ( name, attrs, childs ) => {
 	  const element = document.createElement(name || 'div');
  
    if (typeof attrs === 'object' && attrs) {
     Object.keys(attrs).forEach(key => element.setAttribute(key, attrs[key]));
    }
    if (Array.isArray(childs)) {
     element.appendChild(
        childs.reduce(( f, child ) => {
          f.appendChild(child);
          return f;
        }, document.createDocumentFragment())
      );
    } else if (typeof childs === 'string' || typeof childs === 'number') {
    	element.appendChild(document.createTextNode(childs));
    } 
  
    return element;
  };
 
	const getDate = ( timestamp ) => {
	  const date = new Date(timestamp);
	  const options = { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' };
	  return date.toLocaleString('ru-RU', options);
	};

  ////////////////////////////////////////////////////////////////////////

  const showElement = ( el ) => {
    el.style.display = '';
  };

  const hideElement = ( el ) => {
    el.style.display = 'none';
  };

  const postError = ( header, message ) => {
  	errorHeader.textContent = header;
	  errorText.textContent = message;
	  showElement(errorMsg);
  };

  const changeUI = () => {
  	image.dataset.status = 'load';
	  hideElement(preloader);
		selectMenuModeTo('selected', isLinkedFromShare ? 'comments' : 'share');
		
		isLinkedFromShare = false;
  };

  const showImage = ( imgData ) => {
  	image.addEventListener('load', changeUI);
		image.src = imgData.url;
		return imgData;
 	};

 	const saveImageSettings = ( imgData ) => {
		imgData.path = window.location.href.replace(/\?id=.*$/, '') + '?id=' + imgData.id;   
    sessionStorage.imageSettings = JSON.stringify(imgData);
		urlTextarea.value = getSessionSettings('imageSettings').path;
    //return imgData; вот это спорно надо смотреть дает ли эффект при переходе по ссылке (добавлено для промиса)
  };

  const loadImage = ( { id } ) => {
  	fetch('https:' + apiURL + '/' + id)
  	.then(checkResponseStatus)
		.then(showImage)
    .then(renderComments) //вот это спорно, надо смотреть дает ли эффект при переходе по ссылке 
		.then(saveImageSettings)
		.catch(err => postError(errorHeader.textContent, err.message));

		initWSSConnection(id);
  };

  ////////////////////////////////////////////////////////////////////////

  const selectMenuModeTo = ( mode, selectedItemType ) => {
  	switch(mode) {
		  case 'initial':
		    menu.dataset.state = 'initial';
        app.removeChild(app.getElementsByClassName('comments__form')[0]);
		    hideElement(burgerBtn);
		  break;

		  case 'default':
		    menu.dataset.state = 'default';
		    Array.from(menu.querySelectorAll(`[data-state='selected']`)).forEach(el => el.dataset.state = '');
		  break;

		  case 'selected':
		    menu.dataset.state = 'selected';
		    [commentsBtn, drawBtn, shareBtn].find(
		  		btn => btn.classList.contains(selectedItemType)
		  	).dataset.state = 'selected';
		  	[commentsTools, drawTools, shareTools].find(
		  		tools => tools.classList.contains(selectedItemType + '-tools')
		  	).dataset.state = 'selected';
		  	showElement(burgerBtn);
		  break;
		}

		sessionStorage.menuStateSettings = JSON.stringify({ mode: mode, selectItemType: selectedItemType });
	};

  const selectMenuMode = ( event ) => {
  	if (burgerBtn === event.target || burgerBtn === event.target.parentElement) {
  		selectMenuModeTo('default');
  	} else if (drawBtn === event.target || drawBtn === event.target.parentElement) {
  		selectMenuModeTo('selected', 'draw');	
  	} else if (commentsBtn === event.target || commentsBtn === event.target.parentElement) {
  		selectMenuModeTo('selected', 'comments');
  	} else if (shareBtn === event.target || shareBtn === event.target.parentElement) {
  		selectMenuModeTo('selected', 'share');
  	} 
  }	

  const renderApp = () => {
  	const imageSettings = getSessionSettings('imageSettings'),
					menuStateSettings = getSessionSettings('menuStateSettings'),
					menuPositionSettings = getSessionSettings('menuPositionSettings');

	  if (imageSettings) {
      image.src = imageSettings.url;
      urlTextarea.value = getSessionSettings('imageSettings').path;

      renderComments(imageSettings);
      initWSSConnection(imageSettings.id);
	  } else {
      image.src = '';
            
      const urlParamID = new URL(`${window.location.href}`).searchParams.get('id');
      if (urlParamID) { 
      	isLinkedFromShare = true;
      	loadImage( {id: urlParamID} );
      } 
    }

	  if (menuStateSettings) {
	  	selectMenuModeTo(menuStateSettings.mode, menuStateSettings.selectItemType);
	  } else {
	  	selectMenuModeTo('initial');
	  }

	  if (menuPositionSettings) {
	  	menu.style.left = menuPositionSettings.left + 'px';
			menu.style.top = menuPositionSettings.top + 'px';
	  }  
  };	

  renderApp();

  ////////////////////////////////////////////////////////////////////////

  const postImage = ( path, file ) => {
    const formData = new FormData(),
					name = file.name.replace(/\.\w*$/, '');
				
		formData.append('title', name);
		formData.append('image', file);

		showElement(preloader);
    fetch(path, {
			body: formData,
			method: 'POST'
		})
    .then(checkResponseStatus)
		.then(loadImage)
		.catch(err => postError(errorHeader.textContent, err.message));
  };

	const uploadNewByInput = ( event ) => {
		if (errorMsg.style.display !== 'none') { hideElement(errorMsg); }
		
		if (newImgBtn === event.target || newImgBtn === event.target.parentElement) {
			const input = document.createElement('input');
			input.type = 'file';
			input.accept = 'image/jpeg, image/png';

			input.addEventListener('change', event => postImage('https:' + apiURL, event.currentTarget.files[0]));
			input.dispatchEvent(new MouseEvent(event.type, event));
		} 
	};

	const uploadNewByDrop = ( event ) => {
    event.preventDefault();
    if (errorMsg.style.display !== 'none') { hideElement(errorMsg); }

    if (event.target === event.currentTarget || event.target === image || event.target === errorMsg || event.target.parentElement === errorMsg) {
    	if (image.dataset.status !== 'load') {
	      const file = event.dataTransfer.files[0];
	      
	      if (/^image\/[(jpeg) | (png)]/.test(file.type)) {
	        postImage('https:' + apiURL, file);
	      } else {
	      	postError('Ошибка', 'Неверный формат файла. Пожалуйста, выберите изображение в формате .jpg или .png.');
	      }
    	} else {
    		postError('Ошибка', 'Чтобы загрузить новое изображение, пожалуйста, воспользуйтесь пунктом "Загрузить новое" в меню');
    	}
    }
  };

  ////////////////////////////////////////////////////////////////////////

  let dragged = null,
  		draggedSettings = null;

	const putMenu = ( event ) => {
		event.preventDefault();
		if (event.target.classList.contains('drag')) {
			dragged = event.target.parentElement;
			
			const draggedBounds = event.target.getBoundingClientRect(),
			      draggedCSS = getComputedStyle(dragged);

			draggedSettings = { 
				shiftX: draggedBounds.width / 2,
				shiftY: draggedBounds.height / 2,
				minX: app.offsetLeft,
				maxX: app.offsetWidth - Number(draggedCSS.width.replace('px', '')),
				minY: app.offsetTop,
				maxY: app.offsetHeight - Number(draggedCSS.height.replace('px', ''))
			};
		}
	}

	const dragMenu = ( pageX, pageY ) => {
		if (dragged) {
	    event.preventDefault();
	    let X = pageX - draggedSettings.shiftX,
	    		Y = pageY - draggedSettings.shiftY;

	    X = Math.min(X, draggedSettings.maxX);
	    Y = Math.min(Y, draggedSettings.maxY);
	    X = Math.max(X, draggedSettings.minX);
	    Y = Math.max(Y, draggedSettings.minY);
		
	   	dragged.style.left = X + 'px';
			dragged.style.top = Y + 'px';
			dragged.style.pointerEvents = 'none';
		}
	}

	const dropMenu = ( event ) => {
	  if (dragged) { 
	  	dragged.style.pointerEvents = '';
	  	sessionStorage.menuPositionSettings = JSON.stringify({ left: dragged.offsetLeft, top: dragged.offsetTop });
	  	dragged = null; 
	  }
	}

  ////////////////////////////////////////////////////////////////////////

	const checkSelectionResult = () => {
    try {
      const done = document.execCommand('copy');
      console.log('Копирование ссылки: ' + urlTextarea.value + (done ? ' ' : ' не') + 'выполнено');
    } catch(err) {
      console.error('Не удалось скопировать ссылку. Ошибка: ' + err);
    }
	};

	const clearSelection = () => {
	  try {
      window.getSelection().removeAllRanges();
    } catch(err) {
      document.selection.empty();
      console.error(err);
    }
	};
        
  const copyURL = () => {  
    if (event.target.classList.contains('menu_copy')) {
      urlTextarea.select();
      urlTextarea.blur();
      checkSelectionResult();
      clearSelection();	
    }
  }

	////////////////////////////////////////////////////////////////////////

  const toggleCommentsShow = ( event ) => {
	  if (event.target.classList.contains('menu__toggle')) {
	    Array.from(app.getElementsByClassName('comments__form')).forEach(
	    	comments => comments.style.display = (event.target.value === 'on') ? '' : 'none'
	    ); 
    }
	};

	////////////////////////////////////////////////////////////////////////

	function crtNewCommentsForm( left, top ) {
	  return el('form', { class: 'comments__form', style: `left: ${ left - 22 }px; top: ${ top - 15 }px;` }, [
		 	el('span', { class: 'comments__marker' }, null),
	    el('input', { type: 'checkbox', class: 'comments__marker-checkbox' }, null),
	    el('div', { class: 'comments__body' }, [
        el('div', { class: 'comment' }, [ 
		      el('div', { class: 'loader', style: 'display: none;' }, [ el('span', null, null), el('span', null, null), el('span', null, null), el('span', null, null), el('span', null, null) ])
		    ]),
		    el('textarea', { class: 'comments__input', type: 'text', placeholder: 'Напишите ответ...' }, null),
		    el('input', { class: 'comments__close', type: 'button', value: 'Закрыть' }, null),
		    el('input', { class: 'comments__submit', type: 'submit', value: 'Отправить' }, null)
    	])
    ]);	       
	};
  
	function crtNewComment( date, message ) {
		return el('div', { class: 'comment' }, [ 
		  el('p', { class: 'comment__time' }, date), 
		  el('p', { class: 'comment__message' }, message) 
		]);
	};
  
  function loadComment( imgData, left, top ) {
  	//if (!imgData) { return ; }
  	const commentForm = app.querySelector(`.comments__marker[data-left="${left}"][data-top="${top}"]`).parentElement,
  				[loader] = commentForm.getElementsByClassName('loader');

	  for (const id in imgData.comments) {
	    const comment = imgData.comments[id],
	    			isPostedComment = app.querySelector(`.comment[data-timestamp="${comment.timestamp}"]`);

	    if (comment.left === left && comment.top === top && !isPostedComment) {
	    	appendNewComment(comment, commentForm);
	    	loader.style.display = 'none';
	    	break ;
	    }
	  }
	  return imgData;  	
  };
  
  const postComment = ( message, left, top ) => {
    const id = getSessionSettings('imageSettings').id,
          body = 'message=' + encodeURIComponent(message) + '&left=' + encodeURIComponent(left) + '&top=' + encodeURIComponent(top);
    
    return fetch('https:' + apiURL + '/' + id + '/comments', {
			body: body,
			method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
		})
    .then(checkResponseStatus)
    .then(data => loadComment(data, left, top))
    .then(saveImageSettings)
    .catch(err => console.error(err));
  };

  const sendComment = ( event ) => {
    if (event.target.classList.contains('comments__submit')) {
 			event.preventDefault();
      
      const crntCommentsForm = event.target.parentElement.parentElement,
            [loader] = crntCommentsForm.getElementsByClassName('loader'),
            [message] = crntCommentsForm.getElementsByClassName('comments__input'),
            left = parseInt(crntCommentsForm.style.left),
            top = parseInt(crntCommentsForm.style.top);
      
      loader.style.display = '';
      postComment(message.value ? message.value: '\n', left, top);
      message.value = '';
    } 
  };

  const sendCommentByEnter = ( event ) => {
    if (!event.repeat && event.code === 'Enter' && event.target.classList.contains('comments__input')) {
      const submit = event.target.nextElementSibling.nextElementSibling; 
      submit.dispatchEvent(new MouseEvent('click', event));
      event.target.blur();
    }
  };

  /********************************************************************* */

  function parseNewCommentsForm( comment, id ) {
    const newCommentsForm = crtNewCommentsForm(comment.left + 22, comment.top + 15),
          [commentsBody] = newCommentsForm.getElementsByClassName('comments__body'),
          [loader] = newCommentsForm.getElementsByClassName('loader');
    newCommentsForm.firstElementChild.dataset.left = parseInt(newCommentsForm.style.left);
    newCommentsForm.firstElementChild.dataset.top = parseInt(newCommentsForm.style.top);

    const commentDate = getDate(comment.timestamp).replace(',', ''),
          newComment = crtNewComment(commentDate, comment.message);
          newComment.dataset.timestamp = comment.timestamp;
          
    commentsBody.insertBefore(newComment, loader.parentElement);
    return newCommentsForm;
  };
  
  function appendNewComment( comment, commentsForm ) {
    const [commentsBody] = commentsForm.getElementsByClassName('comments__body'),
          comments = Array.from(commentsBody.getElementsByClassName('comment')),
          commentDate = getDate(comment.timestamp).replace(',', ''),
          newComment = crtNewComment( commentDate, comment.message ),
          nextComment = comments.find(curComment => Number(curComment.dataset.timestamp) > comment.timestamp);
                
    newComment.dataset.timestamp = comment.timestamp;
    commentsBody.insertBefore(newComment, nextComment ? nextComment : comments[comments.length - 1]);
  };

  function renderComments( imgData ) {
    const defaultComments = app.getElementsByClassName('comments__form')[0]; //Удаляет дефолтную форму, но надо посмотреть как это на всех режимах будет работать
    if (defaultComments) { app.removeChild(defaultComments); }

    if (imgData.comments) {
      const Forms = Object.keys(imgData.comments).reduce(( forms, id ) => {
        imgData.comments[id].id = id;
        
        if (!forms) {
          const newCommentsForm = parseNewCommentsForm(imgData.comments[id], id);
          forms.appendChild(newCommentsForm);
          return forms;
        } 

        const commentsMarker = forms.querySelector(`.comments__marker[data-left="${imgData.comments[id].left}"][data-top="${imgData.comments[id].top}"]`);

        if (commentsMarker) {
          appendNewComment(imgData.comments[id], commentsMarker.parentElement);
          return forms;
        } else {
          const newCommentsForm = parseNewCommentsForm(imgData.comments[id], id);
          forms.appendChild(newCommentsForm);
          return forms;
        }
      }, document.createDocumentFragment());

      app.appendChild(Forms);
    }
    return imgData;
  };

  /********************************************************************* */

  function addNewCommentsForm( event ) {
	  if (event.target === event.currentTarget && commentsBtn.dataset.state === 'selected') {
      const newCommentsForm = crtNewCommentsForm(event.pageX, event.pageY);
      
      newCommentsForm.firstElementChild.dataset.left = parseInt(newCommentsForm.style.left);
      newCommentsForm.firstElementChild.dataset.top = parseInt(newCommentsForm.style.top);
      app.appendChild(newCommentsForm);
      
      newCommentsForm.getElementsByClassName('comments__marker-checkbox')[0].checked = true;
      newCommentsForm.getElementsByClassName('comments__marker-checkbox')[0].disabled = true;
    }
  };

  const openCommentsForm = ( event ) => {
  	if (event.target.classList.contains('comments__marker-checkbox') && event.target.checked) {
  		event.target.disabled = true;
    } 
  };

  const typeComment = ( event ) => {
  	if (event.target.classList.contains('comments__input')) {
      event.target.focus();    
    }
  };
  
  const closeCommentsForm = ( event ) => {   
    if (event.target.classList.contains('comments__close')) {
      const crntCommentsForm = event.target.parentElement.parentElement, 
            [commentsContainer] = crntCommentsForm.getElementsByClassName('comment');

      if (commentsContainer.firstElementChild.classList.contains('loader')) {
        app.removeChild(crntCommentsForm);
      } else {
        const [checkbox] = crntCommentsForm.getElementsByClassName('comments__marker-checkbox'); 
  		  checkbox.checked = checkbox.disabled = false;
      }
    } 
  };

  ////////////////////////////////////////////////////////////////////////
	
  //Загрузка файла на сервер:
	menu.addEventListener('click', uploadNewByInput);
  app.addEventListener('dragover', ( event ) => event.preventDefault());
  app.addEventListener('drop', uploadNewByDrop);

	//Перемещение меню:
	const moveMenu = throttle(( ...coords )=> dragMenu(...coords) );

  document.addEventListener('mousedown', putMenu);
	document.addEventListener('mousemove', ( event ) => moveMenu(event.pageX, event.pageY));
	document.addEventListener('mouseup', dropMenu);

	//Переключение пунктов меню:
	menu.addEventListener('click', selectMenuMode);

	//Копирование ссылки в режиме "Поделиться":
	shareTools.addEventListener('click', copyURL);

	//Работа с формой комментариев:
	app.addEventListener('mousedown', addNewCommentsForm);
  app.addEventListener('change', openCommentsForm);
  app.addEventListener('click', typeComment);
	app.addEventListener('click', sendComment);
  app.addEventListener('keydown', sendCommentByEnter);
	app.addEventListener('click', closeCommentsForm);
  
	//Переключатели отображаения комментариев на странице:
	commentsTools.addEventListener('change', toggleCommentsShow);

	//Инициализация и логика работы вебсокет соединения:
	function initWSSConnection( id ) {
  	const socket = new WebSocket('wss:' + apiURL + '/' + id);

  	const addCommentInDirectory = (	comment, directory ) => {
  		directory[comment.id] = {
	      left: comment.left,
	      top: comment.top,
	      message: comment.message,
	      timestamp: comment.timestamp
	    };
  	}

    const updateApp = ( event ) => {
    	const wssResponse = JSON.parse(event.data);

    	switch(wssResponse.event) {
			  case 'pic':
			  	console.log(wssResponse.pic);
			  break;

			  case 'comment':  
          //const imageSettings = getSessionSettings('imageSettings') ? getSessionSettings('imageSettings') : {};
          const imageSettings = getSessionSettings('imageSettings'),
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
			      const newCommentsForm = crtNewCommentsForm(wssResponse.comment.left, wssResponse.comment.top);
			      
			      newCommentsForm.firstElementChild.dataset.left = parseInt(newCommentsForm.style.left);
			      newCommentsForm.firstElementChild.dataset.top = parseInt(newCommentsForm.style.top);
			      app.appendChild(newCommentsForm);
			      
			      loadComment(imageSettings, wssResponse.comment.left, wssResponse.comment.top);
			    }
			  break;

			  case 'mask':
			  	console.log(wssResponse.mask);
			  break;
			}
    };

    socket.addEventListener('message', updateApp);
    socket.addEventListener('open', ( event ) => console.log('Установлено вебсокет соединение'));
    socket.addEventListener('close', ( event ) => console.log(event.wasClean ? '"Чистое закрытие" соединения' : `Обрыв связи. Причина: ${event.reason}`));
    window.addEventListener('beforeunload', () => socket.close(1000, 'Сессия успешно завершена'));
    socket.addEventListener('error', ( error ) => console.error(`Ошибка: ${error.message}`));
  }
}

document.addEventListener('DOMContentLoaded', initApp);