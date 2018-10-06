/******************** Плавная отрисовка линий при рисовании и коррекция положения меню по ширине *****************/
const tick = () => {
  if (needsRendering) {
    draw(ctx);
    needsRendering = false;
  }

  const crntMenuLeftPos = menu.getBoundingClientRect().left;
  while (menu.offsetHeight > defaultMenuHeight) {
    menu.style.left = (crntMenuLeftPos - 1) + "px";
  }

  window.requestAnimationFrame(tick);
};
tick();
