"use strict"; //строгий режим
/************* начальные настройки выбора ***********************/
var s_house = 1;
var s_door = 1;

/*********** настройка стилей выбора дома *************************/
const arr_houses = [
    { src: "images/fence_color/fence_color_yellow.png", name: "Сосна" }, //prefix: "_1"
    { src: "images/fence_color/fence_color_brown.png", name: "Лиственница" }, //prefix: "_2"
    { src: "images/fence_color/fence_color_brown_black.png", name: "Палисандр" } //prefix: "_3"
];
const div_cdh = document.querySelector(".control_decor_house");
for (let i = 0; i < arr_houses.length; i++) {
    let dh = document.createElement("div");
    dh.classList.add('decor_house');
    dh.style.background = "url(" + arr_houses[i].src + ") left top / cover no-repeat";
    dh.setAttribute("data-text", arr_houses[i].name);
    div_cdh.appendChild(dh);
    dh.addEventListener("click", (e) => { checkHouse(i) });
};
const list_houses = document.getElementsByClassName("decor_house");
checkHouse(s_house);

function checkHouse(i) {
    list_houses[s_house].removeAttribute("data-selected");
    s_house = i;
    list_houses[s_house].setAttribute("data-selected", null);
    document.querySelector(".control_decor_title span").textContent = arr_houses[s_house].name;
}


/******************************************************************/
//TODO добавить пиксельный поиск двери - для клика
//надо только для центральных кадров ?
//можно просто обозначить прямоугольник примерно в районе двери

const img_width = 1920;
const img_height = 616;
const img_rate = img_width / img_height;
const img_total = 120 //количество изображений в каталоге

const delay_povorot = 50; //задержка кадров поворота (ms) ps. при fps = 60 минимально выходит 16.67 ms
const delay_motanie = 30; //задержка кадров мотания (ms)
const delay_motanie_fast = 1; //задержка кадров мотания при поворотах (ms)
const frames_motanie = 15; //количество кадров мотания
const frames_povorot = 15; //количество кадров поворота
const n_pm = frames_povorot + frames_motanie;

const btn_forw = document.querySelector(".move_forward"); //кнопка - вперёд
const btn_back = document.querySelector(".move_backward"); //кнопка - назад
const btn_center = document.querySelector(".move_center"); //кнопка - центр

var frame_total = img_total + frames_motanie; //общее количество кадров + ещё одно мотание (15 кадров) в конце
var frame_start = 61; //начальный кадр мотания (изображение 61.jpg)
var frame_end = 75;   //начальный кадр мотания (изображение 75.jpg)
var frame_center = frame_start + Math.round(frames_motanie / 2);
var frame_current = frame_center; //текущий кадр анимации (при запуске - центр)
var frame_sx = 0.25; //горизонтальное смещение кадра в вертикальном режиме (мобила) - привязать к высоте канваса
var animationID; // requestID анимации, для остановки
var started = false; //флаг, true - анимация происходит в настоящий момент

var imgnum = []; //массив соответствия номера кадра и номера изображения + вставка задаржки кадров
//TODO можно попробовать решить вопрос с переходом через ноль в функции Moving()
for (let frm = 1; frm <= frame_total; frm++) { //начало=0, конец +1, так как в анимации может выскочить undefined
    let center = (frame_total - frames_motanie) / 2; //TODO важно правильно рассчитать центровой кадр
    let img = (frm > center ? frm - center : frm + center);
    let chet = ~~(~~(frm / 15) % 2); // ~~ целая часть  % остаток от деления
    let del = (chet ? delay_povorot : delay_motanie_fast); //задержка кадра в зависимости от номера кадра
    imgnum[frm] = { image: img, delay: del }; //каждому кадру соответствует номер изображения и задержка анимации
}

/**************** Объекты изображений домика и дверей *****************/
// src- массив изображений, fld- каталог, sub- подкаталог, ext- расширение файла изображения 
var house = { src: [], fld: "background", sub: "_1", ext: ".jpg" }; //объект домик (background)
var doors = { src: [], fld: "object", sub: "_2", ext: ".png" }; //объект дверь (object)

/*********************** canvas init ***********************/
const container = document.querySelector(".container");
const canvas = document.querySelector("canvas");
canvas.height = img_height; //вертикальное разрешение постоянное (горизонтальное меняется в вертикальном режиме)
var context = canvas.getContext("2d");
var canvas_mode = true;  // true - горизонтальный режим (canvas включен), false - вертикальная ориентация

/*********************** Listeners ***********************/
// запуск при загрузке 
window.addEventListener("load", () => {
    canvasResize();  //там же есть первый Moving(frame_current); //отображение центрального кадра (загрузка запустится при анимации)
    loadingAll(frame_start, frame_end); //предзагрузка первых кадров мотания
    loadingAll(frame_end + 1, frame_end + frames_povorot); //предзагрузка кадров поворота вправо
    loadingAll(frame_start - frames_povorot, frame_start - 1); //предзагрузка кадров поворота влево
});

// resize window
window.addEventListener("resize", () => { canvasResize() });
function canvasResize() {
    canvas_mode = (innerWidth > innerHeight)  //горизонтальная ориентация
    let rate = (canvas_mode ? img_rate : 1.2); //соотношение сторон канваса в гориз. или вертик. режимах
    container.style.height = container.offsetWidth / rate + "px";
    if (canvas_mode) container.style.background = "url('./images/bg.jpg') left top / cover no-repeat";
    canvas.width = img_height * rate;  //горизонтальное разрешение канваса (это также ширина кадра)
    window.setTimeout(() => { Moving(frame_current) }, 500); //при поворотах мобилы resize() срабатывает дважды
}

//мотание 
//todo сделать только для мобильного режима 
var mpos_last; //предыдущее положение курсора мышки
container.addEventListener("mousemove", (e) => {
    if (!canvas_mode) return;
    let mpos = mouseXY(e); //получить текущее положение мышки внутри container
    if (!mpos_last) { mpos_last = mpos; return; } //инициализация начального положения
    if (started) return; //если в процессе поворота то не реагировать
    let dir = mpos.x - mpos_last.x;
    if (dir > 0)
        Moving(frame_start, frame_end, delay_motanie);
    else
        Moving(frame_end, frame_start, delay_motanie);
    mpos_last = mpos;
});

// поворот вперёд 
btn_forw.addEventListener("click", () => {
    StopMoving(); //остановить мотание (иначе будет накладка анимаций)
    Moving(frame_current, frame_end + frames_povorot + 1); //анимация мотания до конца + поворота
    if (frame_end < frame_total) {
        frame_start += n_pm; //старт следующего мотания
        frame_end += n_pm; //конец следующего мотания
        loadingAll(frame_start, frame_end); //загрузка следующего мотания!
    }
});

// поворот назад 
btn_back.addEventListener("click", () => {
    StopMoving(); //остановить мотание (иначе будет накладка анимаций)
    Moving(frame_current, frame_start - frames_povorot - 1);
    if (1 < frame_start) {
        frame_start -= n_pm; //старт следующего мотания
        frame_end -= n_pm; //конец следующего мотания
        loadingAll(frame_start, frame_end); //загрузка следующего мотания!
    }
});

// центрировать
btn_center.addEventListener("click", () => {
    StopMoving(); //остановить мотание (иначе будет накладка анимаций)
    Moving(frame_current, frame_center);
});


/*************************** АНИМАЦИЯ ********************************/
function Moving(first, last, delay) { //first - первый кадр, last - последений кадр
    if (started) return; //блокирование повторного запуска анимации
    else started = true;
    let time_start = performance.now(); //время старта отрисовки кадра
    let error_timer = 0; //защита от бесконечного цикла попытки скачать несуществующий файл изображения
    if (!last) last = first; //если undefined - отобразить только один first кадр
    let direction = (first <= last ? +1 : -1); //направление анимации
    BtnOpasity(0.3); //притушить кнопки

    requestAnimationFrame(animate);
    function animate(time) {
        let frame_delay = (delay ? delay_motanie : imgnum[frame_current].delay);
        if (time - time_start > frame_delay) {
            time_start = time;
            let S = house.src[frame_current];
            let D = doors.src[frame_current];
            if (S && D) { //если оба слайда существюет в массиве - то отрисовываем его
                label("mode:" + (canvas_mode ? "canvas" : "background") + " " + frame_current + "(" + imgnum[frame_current].image + ".jpg) delay:" + frame_delay + "ms"); //DEBUG
                let sx; //смещение кадра/фона в вертик. режиме
                if (canvas_mode) {
                    //sx = canvas.height * 0.25; //смещение кадра в вертик. режиме
                    sx = 0;
                    context.drawImage(S, sx, 0, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
                    context.drawImage(D, sx, 0, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
                } else { //вместо canvas использовать style.background (для ускорения мобильного режима)
                    sx = container.clientHeight * 0.25; //смещение фона в вертик. режиме
                    container.style.background = "url(" + D.src + ") left top / cover no-repeat ";
                    container.style.background += ", url(" + S.src + ") left top / cover no-repeat ";
                    container.style.backgroundPosition = -sx + "px";
                }
                frame_current += direction; //примечание: в конце номер будет на 1 отличаться от текущего положения
            } else {
                //console.log("waiting: no data yet to draw frame: " + frame_current); //ждём когда загрузится нужный кадр (если ещё не загрузился)
                loadingAll(frame_current); //на всяк случай кидаем этот кадр в загрузку
                error_timer++;
                if (error_timer > 500) {  //если кадр таки не загрузится
                    console.log("error animation, frame:" + frame_current + " not found!");
                    frame_current += direction; //пропускаем кадр
                    error_timer = 0;
                }
            }
        }
        animationID = requestAnimationFrame(animate);
        if (frame_current == last + direction || frame_current < 1 || frame_current > frame_total) {
            frame_current -= direction; // откат на один шаг
            StopMoving();
        }
    };
}

function StopMoving() {
    cancelAnimationFrame(animationID);
    started = false;
    BtnOpasity(1.0); //засветить кнопки
}

function BtnOpasity(opacity) { //засветить-погасить кнопки во время анимации ?
    //временно убрал - раздражает блыманье при мотании
    //btn_back.style.opacity = opacity;
    //btn_forw.style.opacity = opacity;
}

/*********************** Загрузка кадров ****************************/
function loadingAll(start, end) { //start, end - номера первого и последнего кадра
    if (!end) end = start; //если задан один параметр - грузим один (start) кадр
    loadingImages(house, start, end);   //загрузка кадров домика
    loadingImages(doors, start, end);   //загрузка кадров двери
}
function loadingImages(obj, start, end) { //obj = текущий объект - house или doors
    if (end > frame_total) end = frame_total; //foolproof ограничить верхний предел
    if (start < 0) start = 1; //foolproof ограничить нижний предел
    for (let frm = start; frm <= end; frm++) {
        if (obj.src[frm] != undefined) continue; //если уже загружен или грузится в другом потоке
        obj.src[frm] = 0; //флаг - ставим файл в загрузку
        let fname = "./" + obj.fld + obj.sub + "/" + imgnum[frm].image + obj.ext;
        fetch(fname)
            .then((response) => {
                if (!response.ok)
                    throw console.log("ERROR loading: (" + fname + ") " + response.statusText);
                return response.blob(); //дальше передаём blob объект!
            })
            .then((img_blob) => {
                const objectURL = URL.createObjectURL(img_blob);
                return objectURL;
            })
            .then((objectURL) => {
                let image = new Image();
                image.src = objectURL;
                obj.src[frm] = image; //загрузка в массив house или doors
                //console.log("ready: " + fname); //DEBUG вывод лога загрузки файлов
            })
            .catch((error) => {
                console.log("ERROR fetch: " + error);
            });
    }

}


/********************* СЕРВИСНЫЕ функции *****************************/
function mouseXY(mouse_event) {
    let posx = mouse_event.clientX;
    let posy = mouse_event.clientY;
    return { x: posx, y: posy }
}

/******************** DEBUG функции ***********************************/
function label(message) { //DEBUG отразить номер кадра, номер изображения, задержка кадра анимации
    document.querySelector(".label").textContent = message;
}


/*********************************************************************************
 ВАРИАНТ РЕШЕНИЯ без необходимости перехода через нулевой кадр при поворотах
 проще в обработке кадров, но если не предполагается полное вращение по кругу
 при загрузке изображений сдвигаем все кадры на центр, т.е. первое мотание кадры 60-75 (это изображения 1-15)
 добавляем в конце 121-135 кадры мотания из начала (изображения 1.jpg - 15.jpg)
 при повороте влево концевые кадры мотания 1(61/jpg) - 15(75.jpg)
 при повороте вправо концевые кадры мотания 121(61.jpg) - 135(75.jpg)
 p.s. как вариант можно заранее сразу записывать кадры мотания с 1 го по 120(135) с центральным мотанием в середине
 *********************************************************************************/
