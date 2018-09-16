'use strict';
function initApp() {
	const [app] = document.getElementsByClassName('app'),
				[menu] = app.getElementsByClassName('menu'),
				[newImgBtn] = menu.getElementsByClassName('new'),
				[commentsBtn] = menu.getElementsByClassName('comments'),
				[commentsTools] = menu.getElementsByClassName('comments-tools'),
				[drawBtn] = menu.getElementsByClassName('draw'),
				[drawTools] = menu.getElementsByClassName('draw-tools'),
				[shareBtn] = menu.getElementsByClassName('share'),
				[shareTools] = menu.getElementsByClassName('share-tools'),
        [image] = app.getElementsByClassName('current-image'),
        [preloader] = app.getElementsByClassName('image-loader'),
        [errorMsg] = app.getElementsByClassName('error'),
        [errorHeader] = errorMsg.getElementsByClassName('error__header'),
      	[errorText] = errorMsg.getElementsByClassName('error__message');

  const burgerBtn = menu.removeChild(menu.getElementsByClassName('burger')[0]),
  			commentsForm = app.removeChild(app.getElementsByClassName('comments__form')[0]);   	
  
  const apiURL = 'https://neto-api.herokuapp.com/pic';

  /////////////////////////////////////////////////////////////////

  const throttle = (cb) => {
    let isWaiting = false;
    return function (...args) {
      if (!isWaiting) {
        cb.apply(this, args);
        isWaiting = true;
        requestAnimationFrame(() => isWaiting = false);
      }
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

  ///////////////////////////////////////////////////////////////////

  const showElement = ( el ) => {
    el.style.display = '';
  };

  const hideElement = ( el ) => {
    el.style.display = 'none';
  };

  const selectMenuModeTo = ( mode, selectedItemType ) => {
  	switch(mode) {
		  case 'initial':
		    menu.dataset.state = 'initial';
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
		    break;
		}

		sessionStorage.menuStateSettings = JSON.stringify( {mode: mode, selectItemType: selectedItemType} );
	};

  const selectMenuMode = event => {
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

		image.src = imageSettings ? imageSettings.url : '';

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

  //////////////////////////////////////////////////////////////////

  const checkResponseStatus = ( resp ) => {
  	if (200 <= resp.status && resp.status < 300) {
			return resp.json();
		} else {
			hideElement(preloader);
			errorHeader.textContent = 'Ошибка: ' + resp.status;
			throw new Error(`${resp.statusText}`);
		}
  };

  const postError = ( header, message ) => {
  	errorHeader.textContent = header;
	  errorText.textContent = message;
	  showElement(errorMsg);
  }

  const showImage = ( imgData ) => {
		image.src = imgData.url;
		image.dataset.status = 'load';
		sessionStorage.imageSettings = JSON.stringify(imgData);
 	};

  const loadImage = ( {id} ) => {
  	fetch(apiURL + '/' + id)
  	.then(checkResponseStatus)
		.then(showImage)
		.catch(err => postError(errorHeader.textContent, err.message));
  };

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

			input.addEventListener('change', event => postImage( apiURL, event.currentTarget.files[0] ));
			input.dispatchEvent( new MouseEvent(event.type, event) );
		} 
	};

	const uploadNewByDrop = ( event ) => {
    event.preventDefault();
    if (errorMsg.style.display !== 'none') { hideElement(errorMsg); }

    if (event.target === event.currentTarget || event.target === image || event.target === errorMsg || event.target.parentElement === errorMsg) {
    	if (image.dataset.status !== 'load') {
	      const file = event.dataTransfer.files[0];
	      
	      if (/^image\/[(jpeg) | (png)]/.test(file.type)) {
	        postImage(apiURL, file);
	      } else {
	      	postError('Ошибка', 'Неверный формат файла. Пожалуйста, выберите изображение в формате .jpg или .png.');
	      }
    	} else {
    		postError('Ошибка', 'Чтобы загрузить новое изображение, пожалуйста, воспользуйтесь пунктом "Загрузить новое" в меню');
    	}
    }
  };

  /////////////////////////////////////////////////////////

  let dragged = null,
  		draggedSettings = null;

	const putMenu = event => {
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

	const dragMenu = (pageX, pageY) => {
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

	const dropMenu = event => {
	  if (dragged) { 
	  	dragged.style.pointerEvents = '';
	  	sessionStorage.menuPositionSettings = JSON.stringify( {left: dragged.offsetLeft, top: dragged.offsetTop} );
	  	dragged = null; 
	  }
	}

	/////////////////////////////////////////////////////////////////////////////
	
  //Загрузка файла на сервер:
	menu.addEventListener('click', uploadNewByInput);
  app.addEventListener('dragover', event => event.preventDefault());
  app.addEventListener('drop', uploadNewByDrop);
  image.addEventListener('load', () => {
  	hideElement(preloader);
		menu.insertBefore(burgerBtn, newImgBtn);
		selectMenuModeTo('selected', 'share');
  });

	//Перемещение меню:
	const moveMenu = throttle( (...coords) => dragMenu(...coords) );

  document.addEventListener('mousedown', putMenu);
	document.addEventListener('mousemove', event => moveMenu(event.pageX, event.pageY));
	document.addEventListener('mouseup', dropMenu);

	//Переключение пунктов меню:
	menu.addEventListener('click', selectMenuMode);
}

document.addEventListener('DOMContentLoaded', initApp);