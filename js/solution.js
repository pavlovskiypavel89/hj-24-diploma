'use strict';
function initApp() {
	const [app] = document.getElementsByClassName('app'),
				[menu] = app.getElementsByClassName('menu'),
				[newImgBtn] = menu.getElementsByClassName('new'),
        [image] = app.getElementsByClassName('current-image'),
        [preloader] = app.getElementsByClassName('image-loader'),
        [errorMsg] = app.getElementsByClassName('error'),
        [errorHeader] = errorMsg.getElementsByClassName('error__header'),
      	[errorText] = errorMsg.getElementsByClassName('error__message');
  
  const apiURL = 'https://neto-api.herokuapp.com/pic';   

  ////////////////////////////////////////////////////////////////////
  const burger = menu.removeChild(menu.getElementsByClassName('burger')[0]),
  			commentsForm = app.removeChild(app.getElementsByClassName('comments__form')[0]);
  (() => menu.dataset.state = 'initial')();
  const imageSettings = (() => {
  	try {
	    if (sessionStorage.imageSettings) { 
	      return JSON.parse(sessionStorage.imageSettings);
	    }
	  } catch (err) {
	    console.error(`${err}`);
	  }
  })();
  image.src = imageSettings ? imageSettings.url : '';

  ////////////////////////////////////////////////////////////////////

  const showElement = ( el ) => {
    el.style.display = '';
  };

  const hideElement = ( el ) => {
    el.style.display = 'none';
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

  const postError = ( header, message ) => {
  	errorHeader.textContent = header;
	  errorText.textContent = message;
	  showElement(errorMsg);
  }

  const loadImage = ( {id} ) => {
  	fetch(apiURL + '/' + id)
  	.then(checkResponseStatus)
		.then(imgData => {
			image.addEventListener('load', () => hideElement(preloader));

			image.src = imgData.url;
			image.dataset.status = 'load';
			sessionStorage.imageSettings = JSON.stringify(imgData);
		})
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

  //Загрузка файла на сервер:
	menu.addEventListener('click', uploadNewByInput);
  app.addEventListener('dragover', event => event.preventDefault());
  app.addEventListener('drop', uploadNewByDrop);
}

document.addEventListener('DOMContentLoaded', initApp);