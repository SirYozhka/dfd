"use strict"; //строгий режим

//MOBILE = (innerWidth + innerHeight) < 1400;
//MOBILE = (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
const MOBILE = (navigator.maxTouchPoints > 0) && ('orientation' in window) // mobile : desktop
//TODO нужна доп проверка (можно включить тачскрин на ноуте и поставить верт ориентацию)

const img_width = 1920;
const img_height = 616;
const img_total = 120 //количество изображений в каталоге

const delay_povorot = 50; //задержка кадров поворота (ms) p.s. при fps = 60 минимально выходит 16.67 ms
const delay_motanie = 30; //задержка кадров мотания (ms)
const delay_motanie_fast = 1; //задержка кадров мотания при поворотах (ms)
const frames_motanie = 15; //количество кадров мотания
const frames_povorot = 15; //количество кадров поворота
const n_pm = frames_povorot + frames_motanie;

var frame_total = img_total + frames_motanie; //общее количество кадров + ещё одно мотание в конце
var frame_start = 61; //начальный кадр мотания (изображение 61.jpg)
var frame_end = 75;   //конечный кадр мотания (изображение 75.jpg)
var frame_center = frame_start + Math.round(frames_motanie / 2);
var frame_current = frame_center; //текущий кадр анимации (при запуске - центр)
var imgnum = []; //массив соответствия номера кадра и номера изображения и задержки кадров
var animationID; // requestID анимации, для остановки
var amination_started = false; //флаг, true - анимация происходит в настоящий момент

var House; //class - объект домиков/backgroumd
var Doors; //class - объект дверей/object (слайдер, изменение)

const container = document.querySelector(".container"); //контейнер всей сцены
const canvas = document.querySelector("canvas");
var context = canvas.getContext("2d");
var modeVertical = false;  // true - вертикальная ориентация, false - горизонтальный режим
var canvasSX; //смещение кадра(фона) для вертик режима

const mouse_area = document.querySelector(".mouse-area"); //область реакции на мышку


//***************** CLASS домиков/background *************************/
class HouseObject {
    constructor(params) {
        this.img = []; //массив Image объектов изображений двери (фреймов)
        this.fld = params.folder || "background";
        this.sub = params.sub || "1";
        this.ext = ".jpg";
        this.arr_houses = [
            { src: "fence_color_yellow.png", name: "Сосна" }, //prefix: "_1"
            { src: "fence_color_brown.png", name: "Лиственница" }, //prefix: "_2"
            { src: "fence_color_brown_black.png", name: "Палисандр" } //prefix: "_3"
        ];
        //HTML инициализация кнопок изменения декора домика
        for (let i = 0; i < this.arr_houses.length; i++) {
            let decor_house = document.createElement("div");
            document.querySelector(".control_decor_house").appendChild(decor_house);
            decor_house.classList.add('decor_house');
            decor_house.style.background = "url(images/fence_color/" + this.arr_houses[i].src + ") left top / cover no-repeat";
            decor_house.setAttribute("data-text", this.arr_houses[i].name);
        };
        this.list_houses = document.querySelectorAll('.decor_house'); //выбора дома
        this.list_houses.forEach((b, i) => b.addEventListener('click', () => { this.check(i) }));
        mouse_area.addEventListener('click', () => { this.check(this.sub); });
    }
    check(i) { //нумерация с нуля todo - исправить?
        if (i == undefined) i = this.sub - 1; //для начальной инициализации todo упростить
        if (i > this.arr_houses.length - 1) i = 0;
        this.list_houses[this.sub - 1].removeAttribute("data-selected");
        this.list_houses[i].setAttribute("data-selected", null);
        document.querySelector(".control_decor_title span").textContent = this.arr_houses[i].name;
        this.sub = i + 1; //т.к. нумерация с нуля
        this.img = []; //очистил массив изображений...
        loadingImages(House, frame_start, frame_end);  //предзагрузка кадров текущего мотания
        loadingImages(House, frame_start - frames_povorot, frame_end + frames_povorot); //предзагрузка кадров поворота 
        window.setTimeout(() => { Moving(frame_current) }, 100);
    }
}

//***************** CLASS дверей/object *************************/
class DoorsObject {
    constructor(params) {
        this.img = []; //массив  Image объектов изображений двери (фреймов)
        this.fld = params.folder || "object";
        this.sub = params.sub || "1";
        this.ext = ".png";
        this.slider = document.querySelector('.slider');
        this.sliderLine = document.querySelector('.slider-line');
        this.sliderNumb = document.querySelectorAll('.slider-item').length;
        this.sliderWidth;
        this.doorarea = document.querySelector(".door_area");
        document.querySelector(".door_prev").addEventListener("click",
            () => { this.check(-1) });
        document.querySelectorAll('.door_next').forEach(
            (button) => button.addEventListener('click', () => { this.check(+1) }));
    }
    initSlider() {
        this.sliderWidth = this.slider.clientWidth;
        this.sliderLine.style.width = this.sliderWidth * this.sliderNumb + 'px';
        this.roll();
    }
    roll() {
        this.sliderLine.style.transform = 'translate(-' + (this.sub - 1) * this.sliderWidth + 'px)';
    }
    check(dir) {
        if (!dir) dir = 0;
        this.sub += dir;
        if (this.sub < 1) this.sub = 3;
        if (this.sub > 3) this.sub = 1;
        document.querySelector(".control_door_title span").textContent = this.sub;
        this.roll();
        this.img = []; //обнулить массив изображений
        loadingImages(Doors, frame_start, frame_end);  //предзагрузка кадров текущего мотания
        loadingImages(Doors, frame_start - frames_povorot, frame_end + frames_povorot); //предзагрузка кадров поворота 
        window.setTimeout(() => { Moving(frame_current) }, 100);
    }
    hide(m) { //блок клацанья по двери в сцене включать только для центральных кадров (где видна дверь)
        if (m) this.doorarea.style.display = "block";
        else this.doorarea.style.display = "none";
    }
}

// инициализация при загрузке 
window.addEventListener("load", () => {
    //TODO можно попробовать решить вопрос с переходом через ноль прямо в функции Moving()
    for (let frm = 1; frm <= frame_total; frm++) { //начало=0, конец +1, так как в анимации может выскочить undefined
        let center = (frame_total - frames_motanie) / 2; //надо правильно рассчитать центровой кадр
        let img = (frm > center ? frm - center : frm + center);
        let chet = ~~(~~(frm / 15) % 2); // ~~ целая часть  % остаток от деления
        let del = (chet ? delay_povorot : delay_motanie_fast); //задержка кадра в зависимости от номера кадра
        imgnum[frm] = { image: img, delay: del }; //каждому кадру соответствует номер изображения и задержка анимации
    }
    House = new HouseObject({ folder: "background", sub: "1" });
    House.check();
    Doors = new DoorsObject({ folder: "object", sub: "1" });
    Doors.check();
    resizeScene();
});

// resize сцены
window.addEventListener("resize", () => setTimeout(() => { resizeScene() }, 100));
function resizeScene() {
    Doors.initSlider();
    modeVertical = (innerWidth < innerHeight)  //вертикальная ориентация (сверить в .visualViewport если iframe)
    //let rate = (modeVertical ? 1.2 : img_width / img_height); //соотношение сторон канваса в гориз. или вертик. режимах
    //    container.style.height = container.offsetWidth / rate + "px"; //подгоняем высоту контейнера
    canvasSX = Math.round(container.clientHeight * 0.3); //смещение кадра(фона) для вертик режима
    let rate = container.clientWidth / container.clientHeight; //соотношение сторон канваса
    canvas.height = img_height; //вертикальное разрешение
    canvas.width = img_height * rate;  //горизонтальное разрешение
    Moving(frame_current);
}

//мотание TODO 
var lastX, newX, dX; //предыдущееи и новое положение мышки/тача
if (MOBILE) {
    document.addEventListener('touchstart', (e) => {
        lastX = e.changedTouches[0].clientX;
    });
    document.addEventListener('touchend', (e) => {
        newX = e.changedTouches[0].clientX;
        dX = newX - lastX;
        if (Math.abs(dX) < 5) {
            return;
        }
        if (Math.abs(dX) < 30)
            Motion(dX);
        else
            if (dX < 0)
                MoveForward();
            else
                MoveBackward();
    });
} else
    mouse_area.addEventListener("mousemove", (e) => {
        newX = e.clientX;
        if (!lastX) lastX = newX; //инициализация начального положения
        dX = newX - lastX;
        Motion(dX);
        lastX = newX;
    });

function Motion(dir) {
    if (amination_started || !dir) return; //не реагировать если в процессе поворота или нет перемещения
    if (Math.abs(dir) > 3) { //переместили мышь/тач более чем на 3 пиксела
        if (dir > 0)
            Moving(frame_start, frame_end, delay_motanie);
        else
            Moving(frame_end, frame_start, delay_motanie);
    }
};

// поворот вперёд 
document.querySelector(".move_forward").addEventListener("click", () => { MoveForward() });
function MoveForward() {
    StopMoving(); //остановить мотание (иначе будет накладка анимаций)
    Moving(frame_current, frame_end + frames_povorot + 1); //анимация мотания до конца + поворот
    if (frame_end < frame_total) {
        frame_start += n_pm; //старт следующего мотания
        frame_end += n_pm; //конец следующего мотания
        loadingAll(frame_start, frame_end + frames_povorot); //загрузка следующего мотания!
    }
};

// поворот назад 
document.querySelector(".move_backward").addEventListener("click", () => { MoveBackward() });
function MoveBackward() {
    StopMoving(); //остановить мотание (иначе будет накладка анимаций)
    Moving(frame_current, frame_start - frames_povorot - 1);
    if (1 < frame_start) {
        frame_start -= n_pm; //старт следующего мотания
        frame_end -= n_pm; //конец следующего мотания
        loadingAll(frame_start - frames_povorot, frame_end); //загрузка следующего мотания!
    }
};

// центрировать
document.querySelector(".move_center").addEventListener("click", () => {
    StopMoving(); //остановить мотание (иначе будет накладка анимаций)
    Moving(frame_current, frame_center);
    frame_start = 61; //старт первичного мотания
    frame_end = 75; //конец первичного мотания
});

/*************************** АНИМАЦИЯ ********************************/
function Moving(first, last, delay) { //first - первый кадр, last - последений кадр
    if (amination_started) return; //блокирование повторного запуска анимации
    else amination_started = true;
    let time_start = performance.now(); //время старта отрисовки кадра
    let error_timer = 0; //защита от бесконечного цикла попытки скачать несуществующий файл изображения
    if (!last) last = first; //если undefined - отобразить только один first кадр
    let direction = (first <= last ? +1 : -1); //направление анимации

    animationID = requestAnimationFrame(animate);
    function animate(time) {
        let frame_delay = (delay ? delay_motanie : imgnum[frame_current].delay);
        if (time - time_start > frame_delay) {
            time_start = time;
            LAB(`${(MOBILE ? "mobile" : "desktop")} | ${imgnum[frame_current].image}.jpg | ${frame_delay}ms`); //DEBUG
            let S = House.img[frame_current];
            let D = Doors.img[frame_current];
            if (S && D) { //если оба слайда загружены
                let sx = (modeVertical ? canvasSX : 0); //смещение кадра(фона) для вертик режима
                if (MOBILE) { //режим background-image (в мобильном режиме быстрее)
                    container.style.background = "url(" + D.src + ") left top / cover";
                    container.style.background += ", url(" + S.src + ") left top / cover";
                    container.style.backgroundPosition = -sx + "px";
                } else { //режим canvas (можно сделать opacity: 0.8 и добавить фон)
                    context.drawImage(S, sx, 0, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
                    context.drawImage(D, sx, 0, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
                }
                frame_current += direction; //примечание: в конце номер будет на 1 отличаться от текущего положения
            } else {
                //ждём когда загрузится нужный кадр (если ещё не загрузился)
                loadingAll(frame_current); //на всяк случай кидаем этот кадр в загрузку
                error_timer++;
                if (error_timer > 500) {  //если кадр таки не загрузится
                    console.log("error animation frame:" + frame_current + " not found!");
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
    Doors.hide(60 < frame_current && frame_current < 76);
    amination_started = false;
}

/*********************** Загрузка кадров ****************************/
function loadingAll(start, end) { //start, end - номера первого и последнего кадра
    if (!end) end = start; //если задан один параметр - грузим один (start) кадр
    loadingImages(House, start, end);   //загрузка кадров домика
    loadingImages(Doors, start, end);   //загрузка кадров двери
}

class LoaderIndicator { //индикатор загрузки
    constructor() {
        this.count = 0; // счётчик запущеных загрузок файлов
        this.div_ind = document.querySelector(".loader");
    }
    upd(dif) {
        this.loader_count += dif;
        if (this.loader_count > 0)
            this.div_ind.style.visibility = "visible";
        else {
            this.div_ind.style.visibility = "hidden";
            this.loader_count = 0; //на всякий случай
        }
    }
}
var loader = new LoaderIndicator();

function loadingImages(obj, start, end) { //obj = текущий объект - House или Doors
    if (end > frame_total) end = frame_total; //foolproof ограничить верхний предел
    if (start < 0) start = 1; //foolproof ограничить нижний предел
    loader.upd(end - start + 1);  //добавить в счетчик новые кадры
    for (let frm = start; frm <= end; frm++) {
        if (obj.img[frm] != undefined) { loader.upd(-1); continue; } //если уже загружен (=image) или грузится (= 0)
        obj.img[frm] = 0; //флаг - ставим файл в загрузку
        let fname = "./scene/" + obj.fld + "_" + obj.sub + "/" + imgnum[frm].image + obj.ext;
        let image = new Image();
        image.src = fname; //загрузка изображения
        image.onload = () => {
            obj.img[frm] = image; //загрузка в массив House или Doors
            loader.upd(-1);
            //LOG(image.src);
        }
        image.onerror = () => {
            loader.upd(- 1);
        }
    }
}

//********** вычисление области двери *****************************
//в файле PNG пиксели двери > 0  (остальная область - прозрачная)
function scan(pic) {
    let mask_canvas = document.createElement('canvas');
    let mask_context = mask_canvas.getContext('2d');
    mask_canvas.width = pic.width / 4;
    mask_canvas.height = pic.height / 4;

    mask_context.drawImage(pic, 0, 0, mask_canvas.width, mask_canvas.height);
    let P = mask_context.getImageData(0, 0, mask_canvas.width, mask_canvas.height);

    let x1, y1;
    let w, h;
    let bg = true;
    for (let x = 0; x < mask_canvas.width / 2; x++)
        for (let y = 0; y < mask_canvas.height; y++) {
            let num = (y * mask_canvas.width + x) * 4;
            if (P.data[num + 3] > 0) { //не пустая часть = дверь
                x1 = x;
                y1 = y;
                break;
            }
        }
    return { x: x1, y: y1, w: (x2 - x1), h: (y2 - y1) };
}
