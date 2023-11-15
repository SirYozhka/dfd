"use strict"; //строгий режим

const MOBILE = (navigator.maxTouchPoints > 0) && ('orientation' in window) // mobile | desktop
//MOBILE = (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
//TODO нужна доп проверка (можно включить тачскрин на ноуте и поставить верт ориентацию)

const img_width = 1920; // (px)
const img_height = 616; // (px)
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

var House; //class - объект домиков/backgroumd
var Doors; //class - объект дверей/object (слайдер, изменение)
var Images; //class - объект загрузки файлов
var Frame; //class - кадры (повороты)

const container = document.querySelector(".container"); //контейнер всей сцены
const mouse_area = document.querySelector(".mouse-area"); //область реакции на мышку
const bgr = document.querySelector(".img-bgr");

//***************** CLASS домиков/background *************************/
class HouseObject {
    constructor(params) {
        this.img = []; //массив Image объектов изображений двери (фреймов)
        this.fld = params.folder || "background";
        this.sub = params.sub - 1 || 0; //тут нумерация с НУЛЯ !!!
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
        this.list_houses = document.querySelectorAll('.decor_house');
        this.list_houses.forEach((btn, i) => btn.addEventListener('click', () => { this.check(i) }));
        mouse_area.addEventListener('click', () => {
            this.list_houses[this.sub].removeAttribute("data-selected");
            this.sub++;
            if (this.sub > this.arr_houses.length - 1) this.sub = 0;
            this.check(this.sub);
        });
        this.init();
    }
    init() {
        this.list_houses[this.sub].setAttribute("data-selected", null);
        document.querySelector(".control_decor_title span").textContent = this.arr_houses[this.sub].name;
        Images.load(this, frame_start, frame_end);  //предзагрузка кадров текущего мотания
        Images.load(this, frame_start - frames_povorot, frame_end + frames_povorot); //предзагрузка кадров поворота 
    }
    check(new_sub) {
        this.list_houses[this.sub].removeAttribute("data-selected");
        this.sub = new_sub;
        this.img = []; //очистка массива изображений
        this.init();
        window.setTimeout(() => { Frame.Moving(frame_current) }, 100);
    }
}

//***************** CLASS дверей/object *************************/
class DoorsObject {
    constructor(params) {
        this.img = []; //массив  Image объектов изображений двери (фреймов)
        this.fld = params.folder || "object";
        this.sub = params.sub - 1 || 0; //нумерация с НУЛЯ !!!
        this.ext = ".png";
        this.slider = document.querySelector('.slider');
        this.sliderLine = document.querySelector('.slider-line');
        this.sliderNumb = document.querySelectorAll('.slider-item').length;
        this.sliderWidth;
        this.doorarea = document.querySelector(".door_area");
        this.title = document.querySelector(".control_door_title span")
        document.querySelector(".door_prev").addEventListener("click",
            () => { this.check(-1) });
        document.querySelectorAll('.door_next').forEach((button) => button.addEventListener('click',
            () => { this.check(+1) }));

        window.addEventListener("resize", this.initSlider());
        this.initSlider();
        this.init();
    }
    initSlider() {
        this.sliderWidth = this.slider.clientWidth;
        this.sliderLine.style.width = this.sliderWidth * this.sliderNumb + 'px';
        this.roll();
    }
    roll() {
        this.sliderLine.style.transform = 'translate(-' + this.sub * this.sliderWidth + 'px)';
    }
    init() {
        this.roll();
        this.title.textContent = this.sub;
        Images.load(this, frame_start, frame_end);  //предзагрузка кадров текущего мотания
        Images.load(this, frame_start - frames_povorot, frame_end + frames_povorot); //предзагрузка кадров поворота 
    }
    check(dir) { // if (!dir) dir = 0;
        this.sub += dir;
        if (this.sub < 0) this.sub = 2;
        if (this.sub > 2) this.sub = 0;
        this.img = []; //обнулить массив изображений
        this.init();
        window.setTimeout(() => { Frame.Moving(frame_current) }, 100);
    }
    display(m) { //блок клацанья по двери в сцене включать только для центральных кадров (где видна дверь)
        if (m) this.doorarea.style.display = "block";
        else this.doorarea.style.display = "none";
    }
}

// инициализация при загрузке 
window.addEventListener("load", () => {
    Frame = new FramesScene();
    Images = new ImagesLoader();
    House = new HouseObject({ folder: "background", sub: 1 });
    Doors = new DoorsObject({ folder: "object", sub: 1 });
    resizeScene();
});

// resize сцены
window.addEventListener("resize", () => setTimeout(() => { resizeScene() }, 100));
function resizeScene() {
    Frame.resize();
    Frame.Moving(frame_current);
}

//мотание 
var lastX, newX, dX; //предыдущееи и новое положение мышки/тача
if (MOBILE) { //TODO доработать
    document.addEventListener('touchstart', (e) => {
        lastX = e.changedTouches[0].clientX;
    });
    document.addEventListener('touchend', (e) => {
        newX = e.changedTouches[0].clientX;
        dX = newX - lastX;
        if (Math.abs(dX) < 5)
            return;
        if (Math.abs(dX) < innerWidth / 3)
            Motion(dX);
        else
            if (dX < 0) MoveForward();
            else MoveBackward();
    });
} else {
    mouse_area.addEventListener("mousemove", (e) => {
        newX = e.clientX;
        if (!lastX) lastX = newX; //инициализация начального положения
        dX = newX - lastX;
        Motion(dX);
        lastX = newX;
    });
}

function Motion(dir) {
    if (Frame.amination_started || !dir) return; //не реагировать если в процессе поворота или нет перемещения по Х
    if (Math.abs(dir) > 3) { //переместили мышь/тач более чем на 3 пиксела
        if (dir > 0)
            Frame.Moving(frame_start, frame_end, delay_motanie);
        else
            Frame.Moving(frame_end, frame_start, delay_motanie);
    }
};

// поворот вперёд 
document.querySelector(".move_forward").addEventListener("click", () => { MoveForward() });
function MoveForward() {
    Frame.StopMoving(); //остановить мотание (иначе будет накладка анимаций)
    Frame.Moving(frame_current, frame_end + frames_povorot + 1); //анимация мотания до конца + поворот
    if (frame_end < frame_total) {
        frame_start += n_pm; //старт следующего мотания
        frame_end += n_pm; //конец следующего мотания
        Images.loadall(frame_start, frame_end + frames_povorot); //загрузка следующего мотания!
    }
};

// поворот назад 
document.querySelector(".move_backward").addEventListener("click", () => { MoveBackward() });
function MoveBackward() {
    Frame.StopMoving(); //остановить мотание (иначе будет накладка анимаций)
    Frame.Moving(frame_current, frame_start - frames_povorot - 1);
    if (1 < frame_start) {
        frame_start -= n_pm; //старт следующего мотания
        frame_end -= n_pm; //конец следующего мотания
        Images.loadall(frame_start - frames_povorot, frame_end); //загрузка следующего мотания!
    }
};

// центрировать
document.querySelector(".move_center").addEventListener("click", () => {
    Frame.StopMoving(); //остановить мотание (иначе будет накладка анимаций)
    Frame.Moving(frame_current, frame_center);
    frame_start = 61; //старт первичного мотания
    frame_end = 75; //конец первичного мотания
});


/************************** CLASS АНИМАЦИЯ ********************************/
class FramesScene {
    constructor() {
        this.width;
        this.height;
        this.canvas = document.querySelector("canvas"); // "экранный" канвас
        this.context = this.canvas.getContext("2d", { willReadFrequently: true });
        this.bgr_sx = 0; //для смещения-движения фона (деревья)
        this.animationID; // requestID анимации, для остановки
        this.amination_started = false; //флаг, true - анимация происходит в настоящий момент
        this.img_sx; //смещение кадра(фона) для вертик режима
        this.imgnum = []; //массив соответствия номера кадра и номера изображения и задержки кадров
        this.init_imgnum();
    }
    init_imgnum() {
        //TODO можно попробовать решить вопрос с переходом через ноль прямо в функции Moving()
        for (let frm = 1; frm <= frame_total; frm++) {
            let center = (frame_total - frames_motanie) / 2; //надо правильно рассчитать центровой кадр
            let img = (frm > center ? frm - center : frm + center);
            let chet = ~~(~~(frm / 15) % 2); // ~~ целая часть  % остаток от деления
            let del = (chet ? delay_povorot : delay_motanie_fast); //задержка кадра в зависимости от номера кадра
            this.imgnum[frm] = { image: img, delay: del }; //каждому кадру соответствует номер изображения и задержка анимации
        }
    }
    resize() {
        let modeVertical = (innerWidth < innerHeight)  //вертикальная ориентация (если iframe надо бы .visualViewport )
        this.img_sx = (modeVertical ? Math.round(container.clientHeight * 0.3) : 0); //смещение кадра(фона) для вертик режима
        this.height = this.canvas.height = img_height; //вертикальное разрешение
        this.width = this.canvas.width = img_height * (container.clientWidth / container.clientHeight);  //горизонтальное разрешение
    }

    Moving(first, last, delay) { //first - первый кадр, last - последений кадр, delay - задержка кадра
        var THIS = this;
        if (this.amination_started) return; //блокирование повторного запуска анимации
        else this.amination_started = true;
        let time_start = performance.now(); //время старта отрисовки кадра
        let error_timer = 0; //защита от бесконечного цикла попытки скачать несуществующий файл изображения
        if (!last) last = first; //если undefined - отобразить только один first кадр
        let direction = (first <= last ? +1 : -1); //направление анимации
        let frame;

        animate();

        function animate(time) {
            frame = THIS.imgnum[frame_current];
            delay = (delay ? delay_motanie : frame.delay);
            if (time - time_start > delay) {
                time_start = time;
                LAB(`${(MOBILE ? "mobile" : "desktop")} : ${frame.image}.jpg : ${delay}ms`); //DEBUG
                let H = House.img[frame_current];
                let D = Doors.img[frame_current];
                if (H && D) { //если оба слайда загружены
                    if (MOBILE) { //режим background-image (в мобильном режиме canvas тормозит)
                        container.style.background = "url(" + D.src + ") left top / cover";
                        container.style.background += ", url(" + H.src + ") left top / cover";
                        container.style.backgroundPosition = -this.img_sx + "px";
                    } else { //режим canvas
                        THIS.context.drawImage(H, THIS.img_sx, 0, THIS.width, THIS.height, 0, 0, THIS.width, THIS.height);
                        THIS.context.drawImage(D, THIS.img_sx, 0, THIS.width, THIS.height, 0, 0, THIS.width, THIS.height);
                    }
                    frame_current += direction; //примечание: в конце номер будет на 1 отличаться от текущего положения
                } else { //ждём когда загрузится нужный кадр
                    Images.loadall(frame_current); //на всяк случай кидаем этот кадр в загрузку
                    error_timer++;
                    if (error_timer > 50) {  //если кадр таки не загрузится
                        console.log("error animation frame:" + frame_current + " not found!");
                        THIS.StopMoving();
                    }
                }
            }

            THIS.animationID = requestAnimationFrame(animate);
            if (frame_current == last + direction || frame_current < 1 || frame_current > frame_total) {
                frame_current -= direction; // откат на один шаг
                THIS.StopMoving();
            }
        };

    }

    StopMoving() {
        cancelAnimationFrame(this.animationID);
        Doors.display(60 < frame_current && frame_current < 76);
        this.amination_started = false;
    }
}

/************* CLASS загрузка файлов **************/
class ImagesLoader {
    constructor() {
        this.count = 0; // счётчик запущеных загрузок файлов
        this.div_ind = document.querySelector(".loader");
    }
    loadall(start, end) { //start, end - номера первого и последнего кадра
        if (!end) end = start; //если задан один параметр - грузим один (start) кадр
        this.load(House, start, end);   //загрузка кадров домика
        this.load(Doors, start, end);   //загрузка кадров двери
    }
    load(obj, start, end) { //obj = текущий объект - House или Doors
        if (end > frame_total) end = frame_total; //foolproof ограничить верхний предел
        if (start < 0) start = 1; //foolproof ограничить нижний предел
        this.display(end - start + 1);  //добавить в счетчик новые кадры
        for (let frm = start; frm <= end; frm++) {
            if (obj.img[frm] != undefined) { //если уже загружен (=image) или грузится (= 0)
                this.display(-1);
                continue;
            }
            obj.img[frm] = 0; //флаг - ставим файл в загрузку
            let image = new Image();
            image.src = "./scene/" + obj.fld + "_" + (obj.sub + 1) + "/" + Frame.imgnum[frm].image + obj.ext; //загрузка изображения
            image.onload = () => {
                obj.img[frm] = image;
                this.display(-1);
            }
            image.onerror = () =>
                this.display(-1);
        }
    }
    display(dif) {
        this.count += dif;
        if (this.count > 0)
            this.div_ind.style.visibility = "visible";
        else {
            this.div_ind.style.visibility = "hidden";
            this.count = 0; //на всякий случай
        }
    }
}
