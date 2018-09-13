'use strict';
function initApp() {
	const [app] = document.getElementsByClassName('app'),
				[menu] = app.getElementsByClassName('menu'),
				[newImg] = app.getElementsByClassName('new');

	const uploadNewByInput = ( event ) => {
		if (newImg === event.target || event.target.parentElement) {
			const btn = event.target,
						input = document.createElement('input');
			input.type = 'file';
			input.name = 'new';
			input.accept = 'image/jpeg, image/png';

			input.addEventListener('change', event => {
				const formData = new FormData(),
							name = event.currentTarget.files[0].name.replace(/\.\w*$/, '');
				
				formData.append('title', name);
				formData.append('image', event.currentTarget.files[0]);

				fetch('https://neto-api.herokuapp.com/pic', {
					body: formData,
					method: 'POST'
				})
				.then(res => {
					if (200 <= res.status < 300) {
						return res.json();
					} else {
						throw new Error(`${res.statusText}`);
					}
				})
				.then(data => console.log(data))
				.catch(err => console.error(`${err}`));	
			});

			input.dispatchEvent( new MouseEvent(event.type, event) );
		}
	};

	menu.addEventListener('click', uploadNewByInput);
}

document.addEventListener('DOMContentLoaded', initApp);