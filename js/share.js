/************************ Копирование ссылки в режиме "Поделиться" *************************/
const checkSelectionResult = () => {
  try {
    const done = document.execCommand("copy");
    console.log( `Копирование ссылки: ${urlTextarea.value}${ (done ? " " : " не") }выполнено`);
  } catch (err) {
    console.error(`Не удалось скопировать ссылку. Ошибка: ${err}`);
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
